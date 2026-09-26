import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  FileDown,
  ImageIcon,
  Maximize2,
  Pause,
  Pencil,
  Play,
  Search,
  Type as TypeIcon,
  Upload,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, FavButton } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { displayLyricsLines } from "@/lib/chords";
import { exportLyricsPdf } from "@/lib/pdf";
import { StorageClient } from "@/lib/storage-client";
import { validateImageFile } from "@/features/canciones/lib/image-validation";
import { SongsService } from "@/features/canciones/services/songs.service";
import type { Song } from "@/types";
import {
  enterBrowserFullscreen,
  exitBrowserFullscreen,
  isBrowserFullscreen,
} from "@/lib/browser-fullscreen";

export function LetrasPage() {
  const { songs, can, updateSong, current, isPlaying, play, toggle } = useApp();
  const { songId: requestedSongId, songIds } = useSearch({ from: "/letras" });
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const searchPanelRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const closeOnOutsideTap = (event: PointerEvent) => {
      if (searchPanelRef.current && !searchPanelRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideTap);
    return () => document.removeEventListener("pointerdown", closeOnOutsideTap);
  }, []);
  const scopedSongIds = useMemo(() => (songIds ? new Set(songIds.split(",")) : null), [songIds]);
  const availableSongs = useMemo(
    () => (scopedSongIds ? songs.filter((item) => scopedSongIds.has(item.id)) : songs),
    [songs, scopedSongIds],
  );

  useEffect(() => {
    if (!requestedSongId || !availableSongs.some((song) => song.id === requestedSongId)) return;
    setSelected(requestedSongId);
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
  const visibleSongs = useMemo(
    () =>
      query
        ? filtered
        : [...filtered].sort((a, b) => Number(b.id === selected) - Number(a.id === selected)),
    [filtered, query, selected],
  );

  const song = availableSongs.find((s) => s.id === selected) ?? null;

  return (
    <AppLayout title="Letras" subtitle="Buscá por nombre o tema">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside
          ref={searchPanelRef}
          className="surface-card order-1 flex max-h-[55vh] flex-col overflow-hidden lg:order-1 lg:sticky lg:top-24 lg:max-h-[70vh]"
        >
          <div className="relative border-b border-border/60 p-3">
            <Search className="absolute top-1/2 left-6 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Saltar a canción…"
              className="w-full rounded-full border border-border bg-secondary py-2 pr-3 pl-10 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out lg:flex-1 lg:grid-rows-[1fr] lg:opacity-100 ${searchOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="min-h-0 overflow-y-auto p-2 lg:max-h-[65vh]">
              {!query && (
                <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recientes
                </p>
              )}
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Sin resultados</p>
              ) : (
                visibleSongs.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelected(item.id);
                      setSearchOpen(false);
                      play(item);
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors ${
                      item.id === song?.id ? "bg-primary/15 text-primary" : "hover:bg-elevated/70"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelected(item.id);
                        setSearchOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Cover song={item} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.artist}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSearchOpen(false);
                        if (current?.id === item.id && isPlaying) toggle();
                        else play(item);
                      }}
                      aria-label={
                        current?.id === item.id && isPlaying
                          ? `Pausar ${item.title}`
                          : `Reproducir ${item.title}`
                      }
                      title={current?.id === item.id && isPlaying ? "Pausar" : "Reproducir"}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-primary"
                    >
                      {current?.id === item.id && isPlaying ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="ml-0.5 h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <div className="order-2 min-w-0 lg:order-2">
          {song ? (
            <SongLyricsDetail song={song} canEdit={can("editSongs")} onSave={updateSong} />
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
  canEdit,
  onSave,
}: {
  song: Song;
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
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const syncFullscreen = () => {
      if (!isBrowserFullscreen()) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, []);
  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setFullscreen(false);
    setMode(song.lyricsImageKey ? "imagen" : "texto");
    setSaveError(null);
  }, [song.id, song.lyricsImageKey]);

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
      {displayLyricsLines(song.chordpro).map((line, index) =>
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
          onClick={() => {
            setFullscreen(false);
            void exitBrowserFullscreen();
          }}
          aria-label="Salir de pantalla completa"
          className="fixed top-4 right-4 rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        {/* Bloque centrado en la pantalla (horizontal, y vertical si la letra es corta), con el
            texto alineado a la izquierda adentro */}
        <div className="flex min-h-full flex-col">
          <div className="m-auto w-fit max-w-full pb-10">
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
      </div>
    );
  }

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
            onClick={() => {
              void enterBrowserFullscreen();
              setFullscreen(true);
            }}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pantalla completa</span>
          </button>
        </div>
        {/* La letra se edita en Acordes: editar acá solo la letra y guardarla como chordpro
            borraba todos los acordes de la canción (ver docs/estado-actual.md del backend) */}
        {mode === "texto" && canEdit ? (
          <button
            type="button"
            onClick={() => navigate({ to: "/acordes", search: { songId: song.id, editar: true } })}
            title="Se edita en Acordes, con la vista previa en vivo"
            className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
        ) : null}
      </div>

      {mode === "texto" ? (
        <article className="surface-card p-6 text-lg leading-relaxed sm:p-10">
          {renderLyrics("")}
        </article>
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
    </div>
  );
}
