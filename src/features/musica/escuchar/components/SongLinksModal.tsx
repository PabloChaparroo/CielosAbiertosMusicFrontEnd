import { useEffect, useState } from "react";
import { looksLikeYoutube, parseYoutubeVideoId } from "@/lib/youtube";
import { YoutubeIcon } from "@/components/common/YoutubeEmbed";
import { ExternalLink, Link2, Plus, Trash2, X } from "lucide-react";
import { useApp } from "@/hooks/useApp";
import {
  SongLinksService,
  type CreateSongLinkInput,
} from "@/features/canciones/services/song-links.service";
import type { SongLink } from "@/features/canciones/types/song-link";
import type { Song } from "@/types";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

export function SongLinksModal({ song, onClose }: { song: Song; onClose: () => void }) {
  const { can } = useApp();
  const [links, setLinks] = useState<SongLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEdit = can("editSongs");
  const canDelete = can("removeAudioTrack");

  useEffect(() => {
    SongLinksService.listBySong(song.id)
      .then(setLinks)
      .catch(() => setError("No se pudieron cargar los links"))
      .finally(() => setLoading(false));
  }, [song.id]);

  const handleCreate = async () => {
    if (!label.trim() || !url.trim()) return;
    // un link de YouTube que no lleva a un video no se guarda: no se podría reproducir en la app
    if (looksLikeYoutube(url) && !parseYoutubeVideoId(url)) {
      setError(
        "No reconocemos ese link de YouTube — pegá el link del video (youtube.com/watch?v=… o youtu.be/…).",
      );
      return;
    }
    setSaving(true);
    setError(null);
    const input: CreateSongLinkInput = {
      label: label.trim(),
      url: url.trim(),
      ...(type.trim() ? { type: type.trim() } : {}),
      order: links.length,
    };
    try {
      const created = await SongLinksService.create(song.id, input);
      setLinks((current) => [...current, created]);
      setLabel("");
      setUrl("");
      setType("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar el link");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await SongLinksService.remove(id);
      setLinks((current) => current.filter((link) => link.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar el link");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl border border-border bg-card p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Link2 className="h-5 w-5 text-primary" /> Links relacionados
            </h2>
            <p className="text-sm text-muted-foreground">{song.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="h-16 animate-pulse rounded-xl bg-secondary/60" />
        ) : links.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            Esta canción todavía no tiene links relacionados.
          </p>
        ) : (
          <ul className="space-y-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-3 py-2.5"
              >
                {parseYoutubeVideoId(link.url) ? (
                  <YoutubeIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <Link2 className="h-4 w-4 shrink-0 text-primary" />
                )}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 hover:text-primary"
                >
                  <span className="block truncate text-sm font-medium">{link.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {link.type ? `${link.type} · ` : ""}
                    {link.url}
                  </span>
                </a>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => void handleRemove(link.id)}
                    aria-label={`Borrar ${link.label}`}
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
              Agregar link
            </p>
            <input
              className={inputCls}
              placeholder="Nombre, ej. YouTube"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <input
              className={inputCls}
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Tipo opcional, ej. Video o Drive"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving || !label.trim() || !url.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-full gradient-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> {saving ? "Agregando…" : "Agregar link"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
