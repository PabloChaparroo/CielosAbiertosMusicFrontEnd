import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { SongsService } from "@/features/canciones/services/songs.service";
import { useApp } from "@/hooks/useApp";
import type { Song } from "@/types";

/**
 * Confirmación para eliminar una canción DEFINITIVAMENTE (solo Admin: cancion-definitiva:delete).
 * Para confirmar hay que escribir el título exacto de la canción: no hay vuelta atrás.
 */
export function DeleteSongModal({
  song,
  onClose,
  onDeleted,
}: {
  song: Song;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { removeSong, setlists } = useApp();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim() === song.title.trim();
  const inSetlists = setlists.filter((s) => s.items.some((item) => item.songId === song.id));

  const handleDelete = async () => {
    if (!matches) return;
    setDeleting(true);
    setError(null);
    try {
      await SongsService.deleteSongForever(song.id);
      removeSong(song.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la canción");
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Eliminar ${song.title}`}
    >
      <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-full bg-destructive/15 p-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Eliminar canción definitivamente</h2>
            <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
          </div>
        </div>

        <p className="text-sm">
          Se va a borrar <span className="font-semibold">{song.title}</span> con todo lo
          relacionado:
        </p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
          <li>letra y acordes</li>
          <li>audio, pistas (multitracks) y foto de letra, también de los archivos guardados</li>
          <li>links relacionados, anotaciones, favoritos y estadísticas</li>
          <li>
            {inSetlists.length
              ? `se saca de ${inSetlists.length === 1 ? "1 setlist" : `${inSetlists.length} setlists`}: ${inSetlists.map((s) => s.title).join(", ")}`
              : "no está en ningún setlist"}
          </li>
        </ul>

        <label className="mt-5 block text-sm">
          Para confirmar, escribí el título de la canción:
          <span className="mt-1 block font-mono text-xs text-muted-foreground select-all">
            {song.title}
          </span>
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleDelete();
              if (e.key === "Escape") onClose();
            }}
            aria-label="Título de la canción para confirmar"
            className="mt-2 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:border-destructive/60"
          />
        </label>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={!matches || deleting}
            className="flex items-center gap-2 rounded-full bg-destructive px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Eliminando…" : "Eliminar definitivamente"}
          </button>
        </div>
      </div>
    </div>
  );
}
