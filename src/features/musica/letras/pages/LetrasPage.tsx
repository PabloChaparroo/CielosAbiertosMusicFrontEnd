import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import {
  Check,
  FileDown,
  ImageIcon,
  Maximize2,
  Pencil,
  Search,
  Type as TypeIcon,
  Upload,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, FavButton } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { lyricsLines, plainLyrics } from "@/lib/chords";
import { exportLyricsPdf } from "@/lib/pdf";
import { StorageClient } from "@/lib/storage-client";
import { validateImageFile } from "@/features/canciones/lib/image-validation";
import { SongsService } from "@/features/canciones/services/songs.service";
import type { Song } from "@/types";

export function LetrasPage() {
  const { songs, can, updateSong } = useApp();
  const { songId: requestedSongId, songIds } = useSearch({ from: "/letras" });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const scopedSongIds = useMemo(() => (songIds ? new Set(songIds.split(",")) : null), [songIds]);
  const availableSongs = useMemo(
    () => (scopedSongIds ? songs.filter((item) => scopedSongIds.has(item.id)) : songs),
    [songs, scopedSongIds],
  );

  useEffect(() => {
    if (!requestedSongId || !availableSongs.some((song) => song.id === requestedSongId)) return;
    setSelected(requestedSongId);
    setDraft("");
  }, [requestedSongId, availableSongs]);

  const filtered = useMemo(
    () =>
      availableSongs.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())),
      ),
    [availableSongs, query],
  );

  const song = availableSongs.find((s) => s.id === selected) ?? null;

  return (
    <AppLayout title="Letras" subtitle="Buscá por nombre o tema">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="surface-card order-2 flex max-h-[70vh] flex-col overflow-hidden lg:order-1 lg:sticky lg:top-24">
          <div className="relative border-b border-border/60 p-3">
            <Search className="absolute top-1/2 left-6 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Saltar a canción…"
              className="w-full rounded-full border border-border bg-secondary py-2 pr-3 pl-10 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Sin resultados</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelected(item.id);
                    setDraft("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                    item.id === song?.id ? "bg-primary/15 text-primary" : "hover:bg-elevated/70"
                  }`}
                >
                  <Cover song={item} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.artist}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="order-1 min-w-0 lg:order-2">
          {song ? (
            <SongLyricsDetail
              song={song}
              draft={draft}
              setDraft={setDraft}
              canEdit={can("editSongs")}
              onSave={updateSong}
            />
          ) : (
            <div className="surface-card flex min-h-[420px] flex-col items-center justify-center gap-3 p-10 text-center">
              <TypeIcon className="h-8 w-8 text-primary" />
              <p className="font-medium">Seleccioná una canción</p>
              <p className="text-sm text-muted-foreground">La letra aparecerá acá.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function ModeBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function SongLyricsDetail({
  song,
  draft,
  setDraft,
  canEdit,
  onSave,
}: {
  song: Song;
  draft: string;
  setDraft: (v: string) => void;
  canEdit: boolean;
  onSave: (s: Song) => void;
}) {
  // Si ya tiene foto cargada, arranca mostrándola — es lo más útil; si no,
  // arranca en texto. El texto (chordpro) nunca se borra al subir una foto:
  // conviven, se cambia de vista con el toggle, no se reemplaza uno al otro.
  const [mode, setMode] = useState<"texto" | "imagen">(song.lyricsImageKey ? "imagen" : "texto");
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [imgLoadError, setImgLoadError] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lyricsInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setEditing(false);
    setFullscreen(false);
    setDraft("");
    setMode(song.lyricsImageKey ? "imagen" : "texto");
    setSaveError(null);
  }, [song.id, song.lyricsImageKey, setDraft]);

  useEffect(() => {
    setResolvedUrl(null);
    setImgLoadError(false);
    if (!song.lyricsImageKey) return;
    let cancelled = false;
    StorageClient.getDownloadUrl(song.lyricsImageKey)
      .then((res) => {
        if (!cancelled) setResolvedUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setImgLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [song.lyricsImageKey]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleFileChange = (file: File | null) => {
    setFileError(null);
    if (!file) {
      setImageFile(null);
      return;
    }
    const validationError = validateImageFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }
    setImageFile(file);
  };

  const handleUpload = async () => {
    if (!imageFile) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { uploadUrl, key } = await StorageClient.getUploadUrl("letras", imageFile.type);
      const controller = new AbortController();
      abortRef.current = controller;
      setUploadPct(0);
      await StorageClient.uploadFileWithProgress(
        uploadUrl,
        imageFile,
        imageFile.type,
        setUploadPct,
        controller.signal,
      );
      setUploadPct(null);
      const updated = await SongsService.updateSong(song.id, { lyricsImageKey: key });
      onSave(updated);
      setImageFile(null);
      setSaving(false);
    } catch (e) {
      setUploadPct(null);
      if (e instanceof DOMException && e.name === "AbortError") return;
      setSaveError(e instanceof Error ? e.message : "No se pudo subir la imagen");
      setSaving(false);
    }
  };

  const uploading = uploadPct !== null;

  const renderLyrics = (className: string) => (
    <div className={className}>
      {lyricsLines(song.chordpro).map((line, index) =>
        line.kind === "section" ? (
          <div key={index} className="mt-6 mb-3 text-xl font-semibold tracking-widest text-primary">
            {line.value}
          </div>
        ) : (
          <div key={index} className="min-h-[1.5em]">
            {line.value || " "}
          </div>
        ),
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background px-5 py-8 sm:px-10 sm:py-10">
        <button
          type="button"
          onClick={() => setFullscreen(false)}
          aria-label="Salir de pantalla completa"
          className="fixed top-4 right-4 rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mx-auto max-w-5xl pb-10">
          <div className="mb-8 pr-12">
            <p className="text-sm text-muted-foreground">{song.artist}</p>
            <h2 className="font-display text-3xl font-semibold">{song.title}</h2>
          </div>
          {mode === "texto" ? (
            renderLyrics("text-lg leading-relaxed sm:text-xl sm:leading-relaxed")
          ) : resolvedUrl ? (
            <img
              src={resolvedUrl}
              alt={`Letra de ${song.title}`}
              className="mx-auto max-h-[calc(100vh-150px)] w-auto object-contain"
            />
          ) : (
            <p className="py-14 text-center text-sm text-muted-foreground">
              No hay una imagen disponible para esta letra.
            </p>
          )}
        </div>
      </div>
    );
  }

  const handleStartEditing = () => {
    setDraft(plainLyrics(song.chordpro));
    setEditing(true);
    setSaveError(null);
  };

  const handleCancelEditing = () => {
    setEditing(false);
    setDraft("");
    setSaveError(null);
  };

  const handleSaveLyrics = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await SongsService.updateSong(song.id, { chordpro: draft });
      onSave(updated);
      setEditing(false);
      setDraft("");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "No se pudo guardar la letra");
    } finally {
      setSaving(false);
    }
  };

  const insertSection = (label: string) => {
    const input = lyricsInputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const before = draft.slice(0, start);
    const after = draft.slice(end);
    const prefix = before && !before.endsWith("\n") ? "\n" : "";
    const suffix = after && !after.startsWith("\n") ? "\n" : "";
    const inserted = `${prefix}[${label}]${suffix}`;
    const nextDraft = `${before}${inserted}${after}`;
    setDraft(nextDraft);

    requestAnimationFrame(() => {
      if (!input) return;
      const cursor = before.length + inserted.length;
      input.focus();
      input.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="space-y-5">
      <div className="surface-card flex flex-wrap items-center gap-3 p-4">
        <div className="mr-auto flex min-w-0 items-center gap-3">
          <Cover song={song} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-display text-2xl font-semibold">{song.title}</h2>
              <FavButton songId={song.id} />
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {song.artist} · original {song.key} · {song.compas}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2">
          {mode === "texto" ? (
            <button
              onClick={() => exportLyricsPdf(song)}
              className="flex items-center justify-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <ModeBtn
            active={mode === "texto"}
            onClick={() => setMode("texto")}
            icon={<TypeIcon className="h-3.5 w-3.5" />}
          >
            Texto
          </ModeBtn>
          <ModeBtn
            active={mode === "imagen"}
            onClick={() => setMode("imagen")}
            icon={<ImageIcon className="h-3.5 w-3.5" />}
          >
            Imagen
          </ModeBtn>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pantalla completa</span>
          </button>
        </div>
        {mode === "texto" && canEdit && !editing ? (
          <button
            type="button"
            onClick={handleStartEditing}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
        ) : null}
      </div>

      {mode === "texto" ? (
        editing ? (
          <>
            <div className="surface-card flex flex-wrap items-center gap-2 p-3">
              <span className="mr-1 text-xs font-semibold text-muted-foreground">
                Agregar sección:
              </span>
              {[
                "INTRO",
                "ESTROFA 1",
                "ESTROFA 2",
                "CORO",
                "PRE-CORO",
                "PUENTE",
                "INTERLUDIO",
                "FINAL",
                "SOLO",
              ].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => insertSection(label)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              ref={lyricsInputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[420px] w-full rounded-2xl border border-border bg-card p-6 font-sans text-lg leading-relaxed whitespace-pre-wrap outline-none focus:border-primary/50"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={saving}
                className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveLyrics()}
                disabled={saving}
                className="flex items-center gap-2 rounded-full border border-primary/50 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </>
        ) : (
          <article className="surface-card p-6 text-lg leading-relaxed sm:p-10">
            {renderLyrics("")}
          </article>
        )
      ) : song.lyricsImageKey ? (
        <div className="surface-card overflow-auto p-3 sm:p-6">
          {imgLoadError ? (
            <p className="py-14 text-center text-sm text-destructive">
              No se pudo cargar la imagen.
            </p>
          ) : resolvedUrl ? (
            <a href={resolvedUrl} target="_blank" rel="noreferrer" className="block">
              <img
                src={resolvedUrl}
                alt={`Letra de ${song.title}`}
                className="mx-auto max-h-[75vh] w-auto rounded-xl object-contain"
              />
            </a>
          ) : (
            <div className="h-72 animate-pulse rounded-xl bg-secondary/60" />
          )}
          {canEdit ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Click en la imagen para verla en tamaño completo. Elegí otro archivo abajo para
              reemplazarla.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="surface-card flex flex-col items-center justify-center gap-3 p-14 text-center">
          <Upload className="h-6 w-6 text-primary" />
          <p className="font-medium">Todavía no hay una foto de la letra</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {canEdit
              ? "Subí una foto del cancionero para tenerla a mano acá."
              : "Ningún administrador cargó una foto todavía."}
          </p>
        </div>
      )}

      {mode === "imagen" && canEdit ? (
        <div className="surface-card mt-4 space-y-3 p-5">
          {uploading ? (
            <div className="rounded-xl border border-border bg-secondary px-3 py-3">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span>Subiendo…</span>
                <span className="font-semibold text-primary">{uploadPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full gradient-gold transition-all"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
              <Upload className="h-4 w-4" />
              {imageFile ? imageFile.name : "Elegir imagen"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={saving}
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          {fileError ? (
            <p role="alert" className="text-xs text-destructive">
              {fileError}
            </p>
          ) : null}
          {saveError ? (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          ) : null}
          <button
            disabled={!imageFile || saving}
            onClick={() => void handleUpload()}
            className="flex w-full items-center justify-center gap-2 rounded-full gradient-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Subiendo…" : saving ? "Guardando…" : "Guardar imagen"}
          </button>
        </div>
      ) : null}

      {mode === "texto" && saveError ? (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
