import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Guitar, Heart, Play, Search, Type } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, EmptyState, FavButton, formatDuration, TagChip } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";

type Destino = "letras" | "acordes";
const DESTINO_KEY = "favoritos:destino";

/** Última elección de "Letra / Acordes" de este navegador (preferencia local; si no se puede leer, Acordes) */
function readDestino(): Destino {
  try {
    return localStorage.getItem(DESTINO_KEY) === "letras" ? "letras" : "acordes";
  } catch {
    return "acordes";
  }
}

export function FavoritosPage() {
  const { songs, favorites, play } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  // Al tocar una tarjeta se abre la canción en Letras o en Acordes, según este selector
  const [destino, setDestino] = useState<Destino>(readDestino);
  const changeDestino = (value: Destino) => {
    setDestino(value);
    try {
      localStorage.setItem(DESTINO_KEY, value);
    } catch {
      // sin almacenamiento local (modo privado, etc.): solo dura mientras la página esté abierta
    }
  };
  const openSong = (songId: string) =>
    void navigate({ to: destino === "letras" ? "/letras" : "/acordes", search: { songId } });
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
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar favorito por nombre..."
                className="w-full rounded-full border border-border bg-card py-2.5 pr-4 pl-10 text-sm outline-none focus:border-primary/60"
              />
            </div>
            <div
              role="radiogroup"
              aria-label="Al tocar un favorito, abrir"
              className="flex items-center gap-1 rounded-full border border-border p-0.5"
            >
              <span className="px-2 text-xs text-muted-foreground">Abrir en:</span>
              {(
                [
                  ["letras", "Letra", Type],
                  ["acordes", "Acordes", Guitar],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={destino === value}
                  onClick={() => changeDestino(value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    destino === value
                      ? "gradient-gold text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>
          {list.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="No encontramos favoritos"
              description="Probá con otro nombre o artista."
            />
          ) : null}
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7 2xl:grid-cols-9">
            {list.map((song) => (
              <div
                key={song.id}
                role="link"
                tabIndex={0}
                onClick={() => openSong(song.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") openSong(song.id);
                }}
                aria-label={`Abrir ${destino === "letras" ? "la letra" : "los acordes"} de ${song.title}`}
                className="surface-card group relative cursor-pointer p-2 hover:-translate-y-1 hover:border-primary/40"
              >
                <Cover song={song} size="none" className="mb-2 aspect-square w-full shadow-none" />
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
                  {/* el corazón y el ▶ no abren la canción */}
                  <span onClick={(e) => e.stopPropagation()}>
                    <FavButton songId={song.id} />
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    play(song);
                  }}
                  aria-label={`Reproducir ${song.title}`}
                  className="absolute top-[40%] right-4 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full gradient-gold text-primary-foreground opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100"
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
