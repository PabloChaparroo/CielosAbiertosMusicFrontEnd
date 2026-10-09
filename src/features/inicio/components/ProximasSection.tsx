import { Link } from "@tanstack/react-router";
import { Guitar, Pause, Play, Rocket } from "lucide-react";
import { Cover } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import type { Song } from "@/types";

/** "8 de octubre": desde cuándo está marcada */
const markedSince = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long" }) : null;

/**
 * Canciones "próximas a sacar", destacadas en Inicio. En celular (donde más se usa) son tarjetas
 * que se pasan deslizando de costado, la siguiente asomando a la derecha; si hay una sola, ocupa
 * todo el ancho. En compu, una grilla. No se muestra si no hay ninguna.
 */
export function ProximasSection({ songs }: { songs: Song[] }) {
  const { play, toggle, current, isPlaying } = useApp();
  if (songs.length === 0) return null;
  const single = songs.length === 1;

  return (
    <section aria-labelledby="proximas-title">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-primary uppercase">
            <Rocket className="h-3.5 w-3.5" /> Próximamente
          </p>
          <h2 id="proximas-title" className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            {single ? "Próxima a sacar" : "Próximas a sacar"}
          </h2>
        </div>
        {!single ? (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {songs.length} canciones
          </span>
        ) : null}
      </div>

      {/* celular: carrusel con snap (el -mx/px deja que la tarjeta llegue al borde de la pantalla) */}
      <div
        className={`-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:snap-none lg:overflow-visible lg:px-0 ${
          single ? "lg:grid-cols-1" : "lg:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {songs.map((song) => {
          const playing = current?.id === song.id && isPlaying;
          const since = markedSince(song.proximaDesde);
          return (
            <article
              key={song.id}
              className={`group relative shrink-0 snap-center overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-[0_0_40px_-12px] shadow-primary/40 ${
                single ? "w-full" : "w-[85%] sm:w-[60%] lg:w-auto"
              }`}
            >
              {/* portada grande, fundida con la tarjeta */}
              <div
                className={`relative w-full overflow-hidden ${single ? "aspect-[16/10] sm:aspect-[21/9]" : "aspect-[16/10]"}`}
              >
                <Cover
                  song={song}
                  // "lg": la miniatura de YouTube en alta (el tamaño lo da className)
                  size="lg"
                  className="h-full w-full rounded-none shadow-none transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                <span className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-[11px] font-semibold tracking-wide text-primary backdrop-blur">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Próxima a sacar
                </span>
              </div>

              <div className="relative -mt-12 p-5 pt-0">
                <h3 className="truncate font-display text-2xl leading-tight font-bold">
                  {song.title}
                </h3>
                <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tono <span className="font-semibold text-foreground">{song.key}</span> ·{" "}
                  {song.compas} · {song.bpm} BPM
                  {since ? <> · desde el {since}</> : null}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  {song.audioKey || song.youtubeVideoId ? (
                    <button
                      type="button"
                      onClick={() => (current?.id === song.id ? toggle() : play(song))}
                      className="flex items-center gap-2 rounded-full gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
                    >
                      {playing ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="ml-0.5 h-4 w-4" />
                      )}
                      {playing ? "Pausar" : "Escuchar"}
                    </button>
                  ) : null}
                  <Link
                    to="/acordes"
                    search={{ songId: song.id }}
                    className="flex items-center gap-2 rounded-full border border-border bg-background/50 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
                  >
                    <Guitar className="h-4 w-4" /> Acordes
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
