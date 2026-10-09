import { useEffect, useRef, useState } from "react";
import { announcePlaying, onOtherPlaying } from "@/lib/exclusive-audio";
import { Check, Pause, Pencil, Play, Plus, Star, Trash2, Upload, X } from "lucide-react";
import { StorageClient } from "@/lib/storage-client";
import { validateAudioFile } from "@/features/canciones/lib/audio-validation";
import { SongsService } from "@/features/canciones/services/songs.service";
import {
  AudioTracksService,
  type CreateAudioTrackInput,
} from "@/features/canciones/services/audio-tracks.service";
import type { AudioTrack } from "@/features/canciones/types/audio-track";
import { useApp } from "@/hooks/useApp";
import type { Song } from "@/types";
import { trackNameFromFile } from "@/features/canciones/lib/track-name";
import { ConfirmTypedDeleteModal } from "./ConfirmTypedDeleteModal";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

type LoadState = "loading" | "ready" | "error";

export function AudioTracksModal({ song, onClose }: { song: Song; onClose: () => void }) {
  const { can, isPlaying: mainIsPlaying, toggle: toggleMain, updateSong, songs } = useApp();
  // la canción más reciente de la lista (el prop puede haber quedado viejo tras otro cambio)
  const latestSong = () => songs.find((s) => s.id === song.id) ?? song;

  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const [label, setLabel] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [confirmTrack, setConfirmTrack] = useState<AudioTrack | null>(null);
  // renombrar una pista: id de la que se edita y el nombre nuevo
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const canEdit = can("editSongs");
  const canDelete = can("removeAudioTrack");
  const uploading = uploadPct !== null;

  useEffect(() => {
    AudioTracksService.listBySong(song.id)
      .then((fetched) => {
        setTracks(fetched);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, [song.id]);

  // Un audio a la vez, en el otro sentido: si arranca el reproductor principal (audio o YouTube)
  // o un video de YouTube extra, se pausa la pista que estaba sonando acá
  const stopTrack = () => {
    audioRef.current?.pause();
    setPlayingId(null);
  };
  useEffect(() => {
    if (mainIsPlaying) stopTrack();
  }, [mainIsPlaying]);
  useEffect(() => onOtherPlaying("pista", stopTrack), []);

  // Mismo criterio de cierre-cancela que UploadModal: si se cierra el modal
  // (o se desmonta) a mitad de una subida, se aborta — nunca sigue en
  // segundo plano.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleClose = () => {
    if (uploading) abortRef.current?.abort();
    const el = audioRef.current;
    if (el) el.pause();
    onClose();
  };

  const handleFileChange = (file: File | null) => {
    setFileError(null);
    if (!file) {
      setAudioFile(null);
      return;
    }
    const validationError = validateAudioFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }
    setAudioFile(file);
    // el nombre se completa con el del archivo (se puede cambiar antes de subir)
    if (!label.trim()) setLabel(trackNameFromFile(file.name));
  };

  const handleUpload = async () => {
    if (!audioFile || !label.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { uploadUrl, key } = await StorageClient.getUploadUrl("audios", audioFile.type);
      const controller = new AbortController();
      abortRef.current = controller;
      setUploadPct(0);
      await StorageClient.uploadFileWithProgress(
        uploadUrl,
        audioFile,
        audioFile.type,
        setUploadPct,
        controller.signal,
      );
      setUploadPct(null);

      const dto: CreateAudioTrackInput = {
        label: label.trim(),
        audioKey: key,
        order: tracks.length,
      };
      const created = await AudioTracksService.create(song.id, dto);
      setTracks((prev) => {
        const next = [...prev, created];
        updateSong({ ...latestSong(), trackCount: next.length });
        return next;
      });
      setLabel("");
      setAudioFile(null);
      setSaving(false);
    } catch (e) {
      setUploadPct(null);
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "No se pudo subir la pista");
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
    // los errores los muestra el modal de confirmación
    await AudioTracksService.remove(id);
    setTracks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      updateSong({ ...latestSong(), trackCount: next.length });
      return next;
    });
  };

  const startRename = (track: AudioTrack) => {
    setRenamingId(track.id);
    setRenameValue(track.label);
  };

  const handleRename = async (track: AudioTrack) => {
    const label = renameValue.trim();
    setRenamingId(null);
    if (!label || label === track.label) return;
    setError(null);
    try {
      const updated = await AudioTracksService.rename(track.id, label);
      setTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, label: updated.label } : t)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el nombre");
    }
  };

  const handleSetPrimary = async (track: AudioTrack) => {
    if (song.audioKey === track.audioKey) return;
    setError(null);
    try {
      const updated = await SongsService.updateSong(song.id, { audioKey: track.audioKey });
      updateSong(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo definir el audio principal");
    }
  };

  // audio principal como una fila más (para escucharlo), salvo que ya sea una de las pistas
  const mainKey = latestSong().audioKey;
  const mainTrack: AudioTrack | null =
    mainKey && !tracks.some((t) => t.audioKey === mainKey)
      ? ({ id: "principal", label: song.title, audioKey: mainKey, order: -1 } as AudioTrack)
      : null;

  const handlePlay = async (track: AudioTrack) => {
    const el = audioRef.current;
    if (!el) return;

    if (playingId === track.id) {
      el.pause();
      setPlayingId(null);
      return;
    }

    // Un audio a la vez en toda la app: si el principal está sonando en el
    // MiniPlayer, se pausa al arrancar una pista.
    if (mainIsPlaying) toggleMain();

    setResolvingId(track.id);
    try {
      const { url } = await StorageClient.getDownloadUrl(track.audioKey);
      el.src = url;
      await el.play();
      announcePlaying("pista");
      setPlayingId(track.id);
    } catch {
      setPlayingId(null);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg animate-in slide-in-from-bottom-6 overflow-y-auto rounded-t-3xl border border-border bg-card p-6 sm:max-h-[85vh] sm:rounded-2xl">
        <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Pistas adicionales</h2>
            <p className="text-sm text-muted-foreground">{song.title}</p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Cerrar"
            className="rounded-full p-2 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* el audio principal (el de Editar canción) también se ve acá, primero; si además es
            una de las pistas, ya aparece en la lista con su check */}
        {loadState === "ready" && mainTrack ? (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
            <button
              onClick={() => void handlePlay(mainTrack)}
              disabled={resolvingId === mainTrack.id}
              aria-label={
                playingId === mainTrack.id
                  ? `Pausar ${mainTrack.label}`
                  : `Reproducir ${mainTrack.label}`
              }
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-elevated hover:text-primary disabled:opacity-50"
            >
              {playingId === mainTrack.id ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
            <span className="flex-1 truncate text-sm font-medium">{mainTrack.label}</span>
            <span className="text-[10px] font-semibold tracking-wide text-primary uppercase">
              Audio principal
            </span>
          </div>
        ) : null}
        {loadState === "loading" ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary/60" />
            ))}
          </div>
        ) : loadState === "error" ? (
          <p className="text-sm text-destructive">No se pudieron cargar las pistas.</p>
        ) : tracks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            Sin pistas adicionales todavía.
          </p>
        ) : (
          <ul className="space-y-2">
            {tracks.map((track) => (
              <li
                key={track.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-3 py-2.5"
              >
                <button
                  onClick={() => void handlePlay(track)}
                  disabled={resolvingId === track.id}
                  aria-label={
                    playingId === track.id ? `Pausar ${track.label}` : `Reproducir ${track.label}`
                  }
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-elevated hover:text-primary disabled:opacity-50"
                >
                  {playingId === track.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                {renamingId === track.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => void handleRename(track)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    aria-label={`Nuevo nombre de ${track.label}`}
                    className="min-w-0 flex-1 rounded-lg border border-primary/50 bg-secondary px-2 py-1 text-sm outline-none"
                  />
                ) : (
                  <span className="flex-1 truncate text-sm font-medium">{track.label}</span>
                )}
                {canEdit && renamingId !== track.id ? (
                  <button
                    type="button"
                    onClick={() => startRename(track)}
                    aria-label={`Cambiar el nombre de ${track.label}`}
                    title="Cambiar nombre"
                    className="rounded-full p-2 text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => void handleSetPrimary(track)}
                    aria-label={
                      song.audioKey === track.audioKey
                        ? `${track.label} es el audio principal`
                        : `Usar ${track.label} como audio principal`
                    }
                    title={
                      song.audioKey === track.audioKey ? "Audio principal" : "Usar como principal"
                    }
                    className={`rounded-full p-2 transition-colors ${
                      song.audioKey === track.audioKey
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {song.audioKey === track.audioKey ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Star className="h-4 w-4" />
                    )}
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    onClick={() => setConfirmTrack(track)}
                    aria-label={`Borrar ${track.label}`}
                    className="rounded-full p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canEdit ? (
          <div className="mt-5 space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Agregar pista
            </p>
            <input
              className={inputCls}
              placeholder="Nombre de la pista, ej. Batería, Guitarra, Click y guía"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={saving}
            />

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
                {audioFile ? audioFile.name : "Elegir archivo de audio"}
                <input
                  type="file"
                  accept="audio/*"
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
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <button
              disabled={!label.trim() || !audioFile || saving}
              onClick={() => void handleUpload()}
              className="flex w-full items-center justify-center gap-2 rounded-full gradient-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              {uploading ? "Subiendo…" : saving ? "Guardando…" : "Agregar pista"}
            </button>
          </div>
        ) : null}
      </div>
      {confirmTrack ? (
        <ConfirmTypedDeleteModal
          title="Eliminar pista definitivamente"
          confirmText={confirmTrack.label}
          confirmLabel="el nombre de la pista"
          onClose={() => setConfirmTrack(null)}
          onConfirm={async () => {
            await handleRemove(confirmTrack.id);
            setConfirmTrack(null);
          }}
        >
          Se va a borrar la pista <span className="font-semibold">{confirmTrack.label}</span>,
          también del archivo guardado.
          {latestSong().audioKey === confirmTrack.audioKey
            ? " Es el audio principal de la canción: el archivo se conserva para el principal."
            : null}
        </ConfirmTypedDeleteModal>
      ) : null}
    </div>
  );
}
