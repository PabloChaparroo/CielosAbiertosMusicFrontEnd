import { Link } from "@tanstack/react-router";
import { CalendarDays, Flame, Heart, Play, Sparkles, TrendingUp } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, FavButton, formatDuration, Skeletons, TagChip } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { useAuth } from "@/core/auth/useAuth";
import { currentMonthKey } from "@/lib/month";

export function InicioPage() {
  const { currentUser, songs, songsLoadState, setlists, setlistsLoadState, favorites, play } =
    useApp();
  const { hasAnyPermission, isGuest } = useAuth();
  // Cada bloque se muestra solo si el usuario puede verlo (un invitado ve canciones y nada más)
  const canSeeSetlists = hasAnyPermission(["setlist:read"]);
  const canSeeStats = hasAnyPermission(["estadisticas:read"]);
  const subtitle = isGuest
    ? "Bienvenido/a"
    : `Bienvenido/a de nuevo, ${currentUser.name.split(" ")[0]}`;

  // Antes esperaba a que hubiera al menos un setlist: sin setlists visibles (un invitado, o
  // todavía ninguno cargado) se quedaba cargando para siempre. Ahora espera a que terminen de cargar.
  if (songsLoadState !== "ready" || (canSeeSetlists && setlistsLoadState === "loading")) {
    return (
      <AppLayout title="Inicio" subtitle={subtitle}>
        <Skeletons rows={5} />
      </AppLayout>
    );
  }

  const sortedLists = [...setlists].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const upcoming =
    sortedLists.find((s) => new Date(s.date).getTime() >= Date.now() - 86400000) ??
    sortedLists[sortedLists.length - 1];
  // antes fijo en "2026-09": desde octubre mostraba datos viejos o vacíos
  const month = currentMonthKey();
  const top = [...songs]
    .sort((a, b) => (b.playsByMonth[month] ?? 0) - (a.playsByMonth[month] ?? 0))
    .slice(0, 8);
  const latest = [...songs].slice(0, 5);
  const songOfMonth = top[0];
  const favSongs = songs.filter((s) => favorites.includes(s.id));

  return (
    <AppLayout title="Inicio" subtitle={subtitle} bleed>
      <section className="relative overflow-hidden">
        <div className="gradient-sky absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="relative px-4 py-16 sm:px-8 sm:py-24">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs text-foreground/90 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />{" "}
            {currentUser.roles.map((r) => r.name).join(" · ") || "Sin rol"}
          </p>
          <h2 className="font-display text-5xl leading-[0.95] font-bold sm:text-7xl">
            Cielos
            <br />
            <span className="text-gradient-gold">Abiertos</span>
          </h2>
          <p className="mt-4 max-w-md text-base text-foreground/80 sm:text-lg">
            Adorando en espíritu y en verdad. Todo el repertorio del ministerio, listo para el
            próximo servicio.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/acordes"
              className="rounded-full gradient-gold px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              Ir a Acordes
            </Link>
            {canSeeSetlists ? (
              <Link
                to="/setlists"
                className="rounded-full border border-border bg-background/50 px-6 py-3 text-sm font-semibold backdrop-blur transition-colors hover:bg-secondary"
              >
                Ver setlists
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="space-y-10 px-4 py-8 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {upcoming ? (
            <Link
              to="/setlists"
              className="surface-card group p-5 hover:-translate-y-1 hover:border-primary/40"
            >
              <CalendarDays className="mb-3 h-5 w-5 text-primary" />
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Próximo setlist
              </p>
              <p className="mt-1 font-display text-lg font-semibold">{upcoming.title}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(upcoming.date).toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}{" "}
                · {upcoming.items.length} canciones
              </p>
            </Link>
          ) : null}

          {songOfMonth ? (
            <div className="surface-card p-5">
              <Flame className="mb-3 h-5 w-5 text-primary" />
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Canción del mes
              </p>
              <div className="mt-2 flex items-center gap-3">
                <Cover song={songOfMonth} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{songOfMonth.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{songOfMonth.artist}</p>
                </div>
              </div>
            </div>
          ) : null}

          <Link
            to="/escuchar"
            className="surface-card p-5 hover:-translate-y-1 hover:border-primary/40"
          >
            <TrendingUp className="mb-3 h-5 w-5 text-primary" />
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              Últimas subidas
            </p>
            <p className="mt-1 font-display text-3xl font-semibold">{latest.length}</p>
            <p className="truncate text-sm text-muted-foreground">
              {latest.map((s) => s.title).join(" · ")}
            </p>
          </Link>

          {isGuest ? null : (
            <Link
              to="/favoritos"
              className="surface-card p-5 hover:-translate-y-1 hover:border-primary/40"
            >
              <Heart className="mb-3 h-5 w-5 text-primary" />
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Tus favoritos
              </p>
              <p className="mt-1 font-display text-3xl font-semibold">{favSongs.length}</p>
              <p className="truncate text-sm text-muted-foreground">
                {favSongs.length
                  ? favSongs.map((s) => s.title).join(" · ")
                  : "Todavía sin favoritos"}
              </p>
            </Link>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <h3 className="font-display text-2xl font-semibold">Más tocadas este mes</h3>
            {canSeeStats ? (
              <Link to="/estadisticas" className="text-sm text-primary hover:underline">
                Ver estadísticas
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
            {top.map((song) => (
              <div
                key={song.id}
                className="surface-card group relative p-2.5 hover:-translate-y-1 hover:border-primary/40"
              >
                <Cover song={song} size="none" className="mb-2 aspect-square w-full shadow-none" />
                <p className="truncate text-sm font-semibold">{song.title}</p>
                <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(song.duration)} · {song.key}
                  </span>
                  <FavButton songId={song.id} />
                </div>
                <button
                  onClick={() => play(song)}
                  aria-label={`Reproducir ${song.title}`}
                  className="absolute top-[46%] right-6 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full gradient-gold text-primary-foreground opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100"
                >
                  <Play className="ml-0.5 h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-4 font-display text-2xl font-semibold">Últimas canciones subidas</h3>
          <div className="surface-card divide-y divide-border/60">
            {latest.map((song) => (
              <div
                key={song.id}
                className="flex items-center gap-4 p-3 transition-colors hover:bg-elevated/60"
              >
                <Cover song={song} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{song.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
                </div>
                <div className="hidden gap-1.5 sm:flex">
                  {song.tags.map((t) => (
                    <TagChip key={t} tag={t} />
                  ))}
                </div>
                <FavButton songId={song.id} />
                <button
                  onClick={() => play(song)}
                  aria-label={`Reproducir ${song.title}`}
                  className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-primary"
                >
                  <Play className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
