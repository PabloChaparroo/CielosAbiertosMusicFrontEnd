import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FileDown,
  ImageIcon,
  Search,
  Type as TypeIcon,
  Upload,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, EmptyState, FavButton, TagChip } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { plainLyrics } from "@/lib/chords";
import { exportLyricsPdf } from "@/lib/pdf";
import { StorageClient } from "@/lib/storage-client";
import { validateImageFile } from "@/features/canciones/lib/image-validation";
import { SongsService } from "@/features/canciones/services/songs.service";
import type { Song } from "@/types";

export function LetrasPage() {
  const { songs, can, updateSong } = useApp();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const filtered = useMemo(
    () =>
      songs.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())),
      ),
    [songs, query],
  );

  const song = songs.find((s) => s.id === selected) ?? null;

  if (song) {
    return (
      <SongLyricsDetail
        song={song}
        draft={draft}
        setDraft={setDraft}
        canEdit={can("editSongs")}
        onBack={() => setSelected(null)}
        onSave={updateSong}
      />
    );
  }

  return (
    <AppLayout title="Letras" subtitle="Buscá por nombre o tema">
      <div className="relative mb-6 max-w-md">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por canción o tema…"
          className="w-full rounded-full border border-border bg-card py-2.5 pr-4 pl-10 text-sm outline-none focus:border-primary/60"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<TypeIcon className="h-6 w-6" />}
          title="Sin resultados"
          description="No hay letras que coincidan con tu búsqueda."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelected(s.id);
                setDraft("");
              }}
              className="surface-card group p-4 text-left hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <Cover song={s} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{s.artist}</p>
                </div>
                <FavButton songId={s.id} />
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                {plainLyrics(s.chordpro)
                  .replace(/\[.*?\]/g, "")
                  .trim()}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.tags.map((t) => (
                  <TagChip key={t} tag={t} />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
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
  onBack,
  onSave,
}: {
  song: Song;
  draft: string;
  setDraft: (v: string) => void;
  canEdit: boolean;
  onBack: () => void;
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
  const abortRef = useRef<AbortController | null>(null);

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

  return (
    <AppLayout
      title={song.title}
      subtitle={`${song.artist} · Tonalidad ${song.key}`}
      actions={
        mode === "texto" ? (
          <button
            onClick={() => exportLyricsPdf(song)}
            className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">Exportar PDF</span>
          </button>
        ) : (
          <button
            disabled
            title="Exportar a PDF una letra en foto queda para un ticket aparte."
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground opacity-50"
          >
            <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">Exportar PDF</span>
          </button>
        )
      }
    >
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a letras
      </button>

      <div className="mb-4 flex gap-2">
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
      </div>

      {mode === "texto" ? (
        canEdit ? (
          <textarea
            value={draft || plainLyrics(song.chordpro)}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[420px] w-full rounded-2xl border border-border bg-card p-6 font-sans text-lg leading-relaxed whitespace-pre-wrap outline-none focus:border-primary/50"
          />
        ) : (
          <article className="surface-card p-6 text-lg leading-relaxed whitespace-pre-wrap sm:p-10">
            {plainLyrics(song.chordpro)}
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
    </AppLayout>
  );
}
