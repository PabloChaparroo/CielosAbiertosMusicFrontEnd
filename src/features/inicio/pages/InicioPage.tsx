import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, Flame, Heart, Play, Sparkles, TrendingUp } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, FavButton, formatDuration, Skeletons, TagChip } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { useAuth } from "@/core/auth/useAuth";
import { currentMonthKey } from "@/lib/month";
import { ProximasSection } from "../components/ProximasSection";
import { TagList } from "@/components/common/TagList";

/** Partículas doradas de la portada: posición (%), tamaño (px) y ritmo fijos, así no saltan */
const HERO_PARTICLES = [
  { x: 8, y: 22, size: 3, delay: 0, duration: 7 },
  { x: 18, y: 64, size: 2, delay: 1.5, duration: 9 },
  { x: 27, y: 12, size: 2, delay: 3, duration: 8 },
  { x: 36, y: 48, size: 3, delay: 0.8, duration: 10 },
  { x: 62, y: 18, size: 2, delay: 2.2, duration: 8 },
  { x: 71, y: 56, size: 3, delay: 4, duration: 9 },
  { x: 82, y: 30, size: 2, delay: 1, duration: 7 },
  { x: 91, y: 70, size: 3, delay: 2.8, duration: 10 },
  { x: 50, y: 6, size: 2, delay: 3.6, duration: 9 },
  { x: 44, y: 78, size: 2, delay: 5, duration: 8 },
];

/** Partículas que suben desde abajo por toda la página: columna (%), tamaño (px) y ritmo fijos */
const RISING_PARTICLES = [
  { x: 4, size: 3, delay: 0, duration: 16 },
  { x: 12, size: 2, delay: 6, duration: 20 },
  { x: 21, size: 3, delay: 11, duration: 18 },
  { x: 30, size: 2, delay: 3, duration: 22 },
  { x: 39, size: 3, delay: 9, duration: 17 },
  { x: 48, size: 2, delay: 14, duration: 21 },
  { x: 57, size: 3, delay: 1.5, duration: 19 },
  { x: 66, size: 2, delay: 7.5, duration: 23 },
  { x: 75, size: 3, delay: 12.5, duration: 16 },
  { x: 84, size: 2, delay: 4.5, duration: 20 },
  { x: 92, size: 3, delay: 10, duration: 18 },
  { x: 97, size: 2, delay: 16, duration: 22 },
];

/** "hoy", "mañana" o "en N días" hasta la fecha de la lista */
function daysUntilLabel(date: string): string {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(new Date(date)) - start(new Date())) / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "mañana";
  return `en ${days} días`;
}

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
  // próximas a sacar: las más recientemente marcadas primero
  // los invitados no ven las próximas a sacar (son del equipo: pedido de Pablo)
  const proximas = songs
    .filter((s) => !isGuest && s.esProxima)
    .sort((a, b) => (b.proximaDesde ?? "").localeCompare(a.proximaDesde ?? ""));

  const latestSection = (
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
            <div className="hidden sm:block">
              <TagList tags={song.tags} />
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
  );

  return (
    <AppLayout title="Inicio" subtitle={subtitle} bleed>
      {/* partículas doradas que suben desde abajo de la pantalla, por detrás de todo el contenido
          (la portada y las tarjetas van en "relative", así se dibujan encima) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden lg:left-[76px]">
        {RISING_PARTICLES.map((p, i) => (
          <span
            key={i}
            className="rising-particle absolute -bottom-2 rounded-full bg-primary"
            style={{
              left: `${p.x}%`,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>
      {/* Portada: cielo oscuro con un resplandor dorado desde arriba ("cielos abiertos"),
          partículas doradas que flotan, el logo centrado con un halo que respira, y la próxima
          lista en una tarjeta de vidrio. Las animaciones se apagan con "reducir movimiento". */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklch,var(--primary)_28%,transparent),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,oklch(0.3_0.08_285/0.35),transparent_75%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {HERO_PARTICLES.map((p, i) => (
            <span
              key={i}
              className="hero-particle absolute rounded-full bg-primary"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto flex max-w-2xl flex-col items-center px-4 pt-10 pb-14 text-center sm:px-8 sm:pt-14 sm:pb-20">
          <p className="mb-8 inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-foreground/90 backdrop-blur sm:self-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />{" "}
            {currentUser.roles.map((r) => r.name).join(" · ") || "Sin rol"}
          </p>

          <div className="relative">
            <div
              aria-hidden
              className="hero-halo absolute -inset-8 rounded-full bg-primary/30 blur-3xl"
            />
            <img
              src="/icon-512.png"
              alt="Cielos Abiertos"
              width={512}
              height={512}
              className="relative h-36 w-36 rounded-full shadow-[0_0_60px_-10px] shadow-primary/60 ring-1 ring-primary/30 sm:h-44 sm:w-44"
            />
          </div>

          <h2 className="mt-8 font-display text-5xl leading-none font-bold sm:text-6xl">
            Cielos <span className="text-gradient-gold">Abiertos</span>
          </h2>
          <p className="mt-3 text-xs tracking-[0.35em] text-foreground/60 uppercase sm:text-sm">
            Ministerio de Adoración
          </p>
          <p className="mt-4 font-display text-base text-foreground/75 italic sm:text-lg">
            “Adorando en espíritu y en verdad”
          </p>

          {canSeeSetlists &&
          upcoming &&
          new Date(upcoming.date).getTime() >= Date.now() - 86400000 ? (
            <Link
              to="/setlists"
              className="group mt-9 flex w-full max-w-md items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left shadow-2xl backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <CalendarDays className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold tracking-widest text-primary uppercase">
                  Próxima · {daysUntilLabel(upcoming.date)}
                </span>
                <span className="block truncate font-display text-lg font-semibold">
                  {upcoming.title}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {new Date(upcoming.date).toLocaleDateString("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  · {upcoming.items.length} canciones
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ) : null}
        </div>
      </section>

      <div className="relative space-y-10 px-4 py-8 sm:px-8">
        {/* con una sola próxima a sacar, en compu las 4 tarjetas van al lado del post (2 x 2)
            para no dejar vacío el costado; con varias, los posts llenan la fila y las tarjetas
            van abajo; sin ninguna, las tarjetas van a lo largo como siempre */}
        <div
          className={
            proximas.length === 1
              ? "space-y-10 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0"
              : "space-y-10"
          }
        >
          <ProximasSection songs={proximas} />
          {/* grid-cols-1 explícito: sin columnas definidas, la columna toma el ancho del texto
            "truncate" más largo (títulos de Últimas subidas / favoritos) y la página se desborda en celular */}
          <div className="space-y-10 lg:space-y-6">
            <section
              className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
                // alineadas con el post (debajo del título "Próxima a sacar")
                proximas.length === 1 ? "lg:content-start lg:pt-[3.75rem]" : "xl:grid-cols-4"
              }`}
            >
              {upcoming ? (
                <Link
                  to="/setlists"
                  className="surface-card group p-5 hover:-translate-y-1 hover:border-primary/40"
                >
                  <CalendarDays className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-xs tracking-widest text-muted-foreground uppercase">
                    Próxima lista
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
            {/* con una sola próxima, las últimas subidas completan la columna de la derecha */}
            {proximas.length === 1 ? latestSection : null}
          </div>
        </div>

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
                  {/* play abajo, al lado del corazón (no sobre la portada); siempre visible */}
                  <div className="flex items-center gap-1">
                    <FavButton songId={song.id} />
                    <button
                      onClick={() => play(song)}
                      aria-label={`Reproducir ${song.title}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full gradient-gold text-primary-foreground shadow-md transition-transform hover:scale-110 active:scale-95"
                    >
                      <Play className="ml-0.5 h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {proximas.length === 1 ? null : latestSection}
      </div>
    </AppLayout>
  );
}
