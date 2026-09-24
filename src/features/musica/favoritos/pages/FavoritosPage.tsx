import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Play, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState, FavButton, formatDuration, TagChip } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";

export function FavoritosPage() {
  const { songs, favorites, play } = useApp();
  const [query, setQuery] = useState("");
  const favoriteSongs = songs.filter((s) => favorites.includes(s.id));
  const list = favoriteSongs.filter((song) => {
    const text = `${song.title} ${song.artist}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <AppLayout title="Favoritos" subtitle={`${favoriteSongs.length} canciones guardadas`}>
      {favoriteSongs.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-6 w-6" />}
          title="Todavía no marcaste favoritos"
          description="Tocá el corazón en cualquier canción para tenerla siempre a mano."
          action={
            <Link
              to="/escuchar"
              className="rounded-full gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              Explorar repertorio
            </Link>
          }
        />
      ) : (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar favorito por nombre..."
              className="w-full rounded-full border border-border bg-card py-2.5 pr-4 pl-10 text-sm outline-none focus:border-primary/60"
            />
          </div>
          {list.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="No encontramos favoritos"
              description="Probá con otro nombre o artista."
            />
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
            {list.map((song) => (
              <div
                key={song.id}
                className="surface-card group relative p-2.5 hover:-translate-y-1 hover:border-primary/40"
              >
                <div
                  className="mb-2 aspect-square w-full rounded-lg"
                  style={{ backgroundImage: song.cover }}
                />
                <p className="truncate text-sm font-semibold">{song.title}</p>
                <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {song.tags.map((t) => (
                    <TagChip key={t} tag={t} />
                  ))}
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {song.key} · {formatDuration(song.duration)}
                  </span>
                  <FavButton songId={song.id} />
                </div>
                <button
                  onClick={() => play(song)}
                  aria-label={`Reproducir ${song.title}`}
                  className="absolute top-[40%] right-6 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full gradient-gold text-primary-foreground opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100"
                >
                  <Play className="ml-0.5 h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </AppLayout>
  );
}
