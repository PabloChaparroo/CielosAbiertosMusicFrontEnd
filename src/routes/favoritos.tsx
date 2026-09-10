import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Play } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState, FavButton, formatDuration, TagChip } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Cielos Abiertos" },
      { name: "description", content: "Tus canciones favoritas del repertorio del ministerio." },
      { property: "og:title", content: "Favoritos — Cielos Abiertos" },
      { property: "og:description", content: "Acceso rápido a tus canciones marcadas." },
    ],
  }),
  component: Favoritos,
});

function Favoritos() {
  const { songs, favorites, play } = useApp();
  const list = songs.filter((s) => favorites.includes(s.id));

  return (
    <AppLayout title="Favoritos" subtitle={`${list.length} canciones guardadas`}>
      {list.length === 0 ? (
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {list.map((song) => (
            <div
              key={song.id}
              className="surface-card group relative p-4 hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="mb-3 aspect-square w-full rounded-xl" style={{ backgroundImage: song.cover }} />
              <p className="truncate font-semibold">{song.title}</p>
              <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {song.tags.map((t) => (
                  <TagChip key={t} tag={t} />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
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
      )}
    </AppLayout>
  );
}
