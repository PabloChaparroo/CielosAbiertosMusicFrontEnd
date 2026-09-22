import { useMemo, useState } from "react";
import { Music4, Play, Plus, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, EmptyState, FavButton, formatDuration, TagChip } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import type { Tag } from "@/types";
import { UploadModal } from "../components/UploadModal";

const ALL_TAGS: Tag[] = [
  "Adoración",
  "Júbilo",
  "Navidad",
  "Sanidad",
  "Bautismo",
  "Comunión",
  "Entrega",
  "Gratitud",
];

export function EscucharPage() {
  const { songs, play, current, can, addSong } = useApp();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<Tag | null>(null);
  const [modal, setModal] = useState(false);

  const filtered = useMemo(
    () =>
      songs.filter(
        (s) =>
          (!tag || s.tags.includes(tag)) &&
          (s.title.toLowerCase().includes(query.toLowerCase()) ||
            s.artist.toLowerCase().includes(query.toLowerCase())),
      ),
    [songs, query, tag],
  );

  return (
    <AppLayout
      title="Escuchar y Subir"
      subtitle={`${songs.length} canciones en el repertorio`}
      actions={
        can("editSongs") ? (
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Subir canción</span>
          </button>
        ) : null
      }
    >
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar canción o artista…"
            className="w-full rounded-full border border-border bg-card py-2.5 pr-4 pl-10 text-sm outline-none transition-colors focus:border-primary/60"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTag(null)}>
            <TagChip tag="Todas" active={tag === null} />
          </button>
          {ALL_TAGS.map((t) => (
            <button key={t} onClick={() => setTag(t === tag ? null : t)}>
              <TagChip tag={t} active={tag === t} />
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Music4 className="h-6 w-6" />}
          title="No encontramos canciones"
          description="Probá con otro nombre o quitá el filtro de tema."
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="hidden grid-cols-[40px_1fr_180px_120px_90px] gap-4 border-b border-border/60 px-4 py-3 text-[11px] tracking-widest text-muted-foreground uppercase md:grid">
            <span>#</span>
            <span>Título</span>
            <span>Temas</span>
            <span>Tono / BPM</span>
            <span className="text-right">Duración</span>
          </div>
          {filtered.map((song, i) => (
            <div
              key={song.id}
              onDoubleClick={() => play(song)}
              className={`group grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-2.5 transition-colors hover:bg-elevated/70 md:grid-cols-[40px_1fr_180px_120px_90px] ${
                current?.id === song.id ? "bg-elevated/60" : ""
              }`}
            >
              <button
                onClick={() => play(song)}
                aria-label={`Reproducir ${song.title}`}
                className="hidden h-8 w-8 items-center justify-center rounded-full text-sm text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground md:flex"
              >
                <span className="group-hover:hidden">{i + 1}</span>
                <Play className="hidden h-3.5 w-3.5 group-hover:block" />
              </button>
              <div className="flex min-w-0 items-center gap-3">
                <Cover song={song} size="sm" />
                <div className="min-w-0">
                  <p
                    className={`truncate font-medium ${current?.id === song.id ? "text-primary" : ""}`}
                  >
                    {song.title}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
                </div>
              </div>
              <div className="hidden flex-wrap gap-1.5 md:flex">
                {song.tags.map((t) => (
                  <TagChip key={t} tag={t} />
                ))}
              </div>
              <span className="hidden text-sm text-muted-foreground md:block">
                {song.key} · {song.bpm} BPM
              </span>
              <div className="flex items-center justify-end gap-1">
                <FavButton songId={song.id} />
                <span className="hidden w-12 text-right text-sm text-muted-foreground md:inline">
                  {formatDuration(song.duration)}
                </span>
                <button
                  onClick={() => play(song)}
                  aria-label={`Reproducir ${song.title}`}
                  className="rounded-full p-2 text-muted-foreground hover:text-primary md:hidden"
                >
                  <Play className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal ? <UploadModal onClose={() => setModal(false)} onSave={addSong} /> : null}
    </AppLayout>
  );
}
