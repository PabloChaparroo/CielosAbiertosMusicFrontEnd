import { useEffect, useMemo, useRef, useState } from "react";
import { SongsService } from "@/features/canciones/services/songs.service";
import {
  Check,
  LayoutGrid,
  Layers,
  Link2,
  List,
  Music4,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, EmptyState, FavButton, formatDuration, TagChip } from "@/components/common/ui-bits";
import { TagList } from "@/components/common/TagList";
import { RisingParticles } from "@/components/common/RisingParticles";
import { hasSequence } from "@/features/canciones/lib/sequence";
import { useApp } from "@/hooks/useApp";
import { Pager, usePaged } from "@/components/common/Pager";
import type { Song, Tag } from "@/types";
import { AudioTracksModal } from "../components/AudioTracksModal";
import { ProximaButton } from "../components/ProximaButton";
import { SongLinksModal } from "../components/SongLinksModal";
import { UploadModal } from "../components/UploadModal";
import { matchesSearch } from "@/lib/search";

/** Grupo de opciones del panel de filtros: pastillas para tocar, con "Todos" para no filtrar */
function FilterGroup({
  title,
  options,
  value,
  onChange,
  allLabel,
}: {
  title: string;
  options: ReadonlyArray<readonly [string, string]>;
  value: string | null;
  onChange: (value: string | null) => void;
  allLabel: string;
}) {
  const pill = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      active
        ? "border-primary/50 bg-primary/15 font-medium text-primary"
        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground"
    }`;
  return (
    <section>
      <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange(null)} className={pill(value === null)}>
          {allLabel}
        </button>
        {options.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(value === key ? null : key)}
            className={pill(value === key)}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function EscucharPage() {
  const { songs, play, current, isPlaying, can, addSong, updateSong } = useApp();
  // celular: fila con las acciones abiertas (una a la vez)
  const [actionsOpen, setActionsOpen] = useState<string | null>(null);
  // tocar en cualquier otro lado las cierra. Ese toque solo cierra: si cae sobre otra canción no
  // la reproduce (closedAtRef, lo mira el click de la fila)
  const closedAtRef = useRef(0);
  useEffect(() => {
    if (!actionsOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      const panel = document.querySelector(`[data-actions-panel="${actionsOpen}"]`);
      if (panel?.contains(event.target as Node)) return;
      closedAtRef.current = Date.now();
      setActionsOpen(null);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [actionsOpen]);
  const playRow = (song: Song) => {
    if (Date.now() - closedAtRef.current < 600) return;
    play(song);
  };
  const [query, setQuery] = useState("");
  // vista lista (con todos los datos) o tarjetas (portada, título y artista); se recuerda
  const [view, setView] = useState<"list" | "cards">(() => {
    try {
      return localStorage.getItem("escuchar-view") === "cards" ? "cards" : "list";
    } catch {
      return "list";
    }
  });
  const changeView = (next: "list" | "cards") => {
    setView(next);
    try {
      localStorage.setItem("escuchar-view", next);
    } catch {
      // sin almacenamiento: solo dura esta visita
    }
  };
  const [tag, setTag] = useState<Tag | null>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  // secuencia (multitracks): todas / con / sin
  const [secuencia, setSecuencia] = useState<"con" | "sin" | null>(null);
  // tipos para el filtro (Alabanza / Adoración), desde el backend: aparecen aunque ninguna
  // canción tenga todavía ese tipo
  const [tipos, setTipos] = useState<string[]>([]);
  // temas para el filtro: el catálogo del backend (crece con migraciones)
  const [allTags, setAllTags] = useState<Tag[]>([]);
  useEffect(() => {
    SongsService.listTags()
      .then(setAllTags)
      .catch(() => setAllTags([]));
  }, []);
  useEffect(() => {
    SongsService.listTipos()
      .then((list) => setTipos(list.map((t) => t.nombre)))
      .catch(() => setTipos([]));
  }, []);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Song | null>(null);
  const [managingTracks, setManagingTracks] = useState<Song | null>(null);
  const [managingLinks, setManagingLinks] = useState<Song | null>(null);

  const filtered = useMemo(
    () =>
      songs.filter(
        (s) =>
          (!tag || s.tags.includes(tag)) &&
          (!tipo || s.tipo === tipo) &&
          (!secuencia || (secuencia === "con") === hasSequence(s)) &&
          matchesSearch(query, s.title, s.artist),
      ),
    [songs, query, tag, tipo, secuencia],
  );
  // 30 por página; la búsqueda y los filtros miran todas las canciones
  const paged = usePaged(filtered, 30, `${query}|${tag}|${tipo}|${secuencia}`);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // filtros elegidos, para mostrarlos como pastillas que se quitan de un toque
  const activeFilters = [
    ...(tipo ? [{ label: tipo, clear: () => setTipo(null) }] : []),
    ...(secuencia
      ? [
          {
            label: secuencia === "con" ? "Con secuencia" : "Sin secuencia",
            clear: () => setSecuencia(null),
          },
        ]
      : []),
    ...(tag ? [{ label: tag, clear: () => setTag(null) }] : []),
  ];

  // lista / tarjetas: en celular va al lado del buscador, en compu al final de los filtros
  const renderViewToggle = (className: string) => (
    <div
      className={`shrink-0 rounded-full border border-border p-0.5 ${className}`}
      role="group"
      aria-label="Vista"
    >
      {(
        [
          ["list", List, "Vista en lista"],
          ["cards", LayoutGrid, "Vista en tarjetas"],
        ] as const
      ).map(([value, Icon, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => changeView(value)}
          aria-pressed={view === value}
          aria-label={label}
          title={label}
          className={`rounded-full p-1.5 transition-colors ${
            view === value
              ? "gradient-gold text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );

  return (
    <AppLayout
      title="Canciones"
      subtitle={`${songs.length} canciones en el repertorio`}
      actions={
        can("editSongs") ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal(true)}
              className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Subir canción</span>
            </button>
          </div>
        ) : null
      }
    >
      {/* fondo como el de Inicio: sombreado dorado y partículas que suben, por detrás de la lista */}
      <RisingParticles glow />
      <div className="relative">
        {/* buscador, vista y "Filtros" (abre un panel) en una fila; abajo, los filtros activos
          como pastillas doradas que se quitan con ✕ */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              {/* z-10: el input con backdrop-blur se pinta encima y tapaba la lupa */}
              <Search className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar canción o artista…"
                className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] pr-4 pl-10 text-sm backdrop-blur-xl outline-none transition-colors focus:border-primary/50 focus:bg-white/[0.06]"
              />
            </div>
            {renderViewToggle("flex")}
            {/* filtros a la derecha, en la misma fila que el buscador */}
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-label="Filtros"
              className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 sm:px-4 text-sm font-medium backdrop-blur-xl transition-colors ${
                activeFilters.length
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilters.length ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                  {activeFilters.length}
                </span>
              ) : null}
            </button>
          </div>
          {activeFilters.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters.map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  onClick={filter.clear}
                  aria-label={`Quitar filtro ${filter.label}`}
                  className="flex h-9 animate-in items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 pr-2.5 pl-3.5 text-sm text-primary fade-in-0 zoom-in-95 duration-200 hover:bg-primary/20"
                >
                  {filter.label} <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {filtersOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <div
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 animate-in bg-black/50 backdrop-blur-sm fade-in-0 duration-200"
            />
            <div
              role="dialog"
              aria-label="Filtros"
              className="relative flex max-h-[85vh] w-full max-w-lg animate-in flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-card/80 shadow-2xl backdrop-blur-2xl backdrop-saturate-150 duration-300 fade-in-0 slide-in-from-bottom-8 sm:rounded-3xl sm:zoom-in-95 sm:slide-in-from-bottom-0"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 -left-16 h-56 w-72 rounded-full bg-primary/10 blur-3xl"
              />
              <div className="relative flex items-center justify-between px-6 pt-5 pb-3">
                <h2 className="font-display text-lg font-semibold">Filtros</h2>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Cerrar filtros"
                  className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-4">
                {tipos.length ? (
                  <FilterGroup
                    title="Tipo"
                    options={tipos.map((t) => [t, t] as const)}
                    value={tipo}
                    onChange={setTipo}
                    allLabel="Todos"
                  />
                ) : null}
                <FilterGroup
                  title="Secuencia"
                  options={[
                    ["con", "Con secuencia"],
                    ["sin", "Sin secuencia"],
                  ]}
                  value={secuencia}
                  onChange={(v) => setSecuencia(v as "con" | "sin" | null)}
                  allLabel="Todas"
                />
                <FilterGroup
                  title="Tema"
                  options={allTags.map((t) => [t, t] as const)}
                  value={tag}
                  onChange={setTag}
                  allLabel="Todos"
                />
              </div>
              <div className="relative flex items-center gap-3 border-t border-white/10 px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setTipo(null);
                    setSecuencia(null);
                    setTag(null);
                  }}
                  disabled={!activeFilters.length}
                  className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="ml-auto h-10 rounded-full gradient-gold px-5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
                >
                  Ver {filtered.length} {filtered.length === 1 ? "canción" : "canciones"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Music4 className="h-6 w-6" />}
            title="No encontramos canciones"
            description="Probá con otro nombre o quitá el filtro de tema."
          />
        ) : view === "cards" ? (
          // tarjetas como en Favoritos: tocar la tarjeta reproduce
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7 2xl:grid-cols-9">
            {paged.pageItems.map((song, i) => (
              <div
                key={song.id}
                role="button"
                tabIndex={0}
                onClick={() => play(song)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") play(song);
                }}
                aria-label={`Reproducir ${song.title}`}
                // entran escalonadas; la que suena con borde y brillo dorados, y al pasar el mouse
                // un brillo dorado suave
                style={{ animationDelay: `${Math.min(i, 9) * 30}ms` }}
                className={`surface-card group relative animate-in cursor-pointer overflow-hidden rounded-xl p-2 transition-all fill-mode-both fade-in-0 zoom-in-95 duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_10px_30px_-12px] hover:shadow-primary/40 ${
                  current?.id === song.id
                    ? "border-primary/70 bg-gradient-to-b from-primary/[0.12] to-transparent shadow-[0_0_24px_-6px] shadow-primary/50"
                    : ""
                }`}
              >
                <div className="relative mb-2">
                  <Cover
                    song={song}
                    size="none"
                    className="aspect-square w-full rounded-lg shadow-none transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  {/* sobre la portada: ecualizador dorado si suena; si no, ▶︎ dorado al pasar el mouse */}
                  <span
                    aria-hidden
                    className={`absolute inset-0 flex items-center justify-center rounded-lg bg-gradient-to-t from-black/60 via-black/10 to-transparent transition-opacity ${
                      current?.id === song.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {current?.id === song.id ? (
                      <span className="flex h-5 items-end gap-0.5">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className={`h-5 w-1 rounded-full bg-primary shadow-[0_0_6px] shadow-primary ${isPlaying ? "eq-bar" : "scale-y-50"}`}
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </span>
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full gradient-gold text-primary-foreground shadow-lg shadow-primary/40">
                        <Play className="ml-0.5 h-4 w-4 fill-current" />
                      </span>
                    )}
                  </span>
                </div>
                <p
                  className={`truncate text-sm font-semibold ${current?.id === song.id ? "text-gradient-gold" : ""}`}
                >
                  {song.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  {/* solo la duración, como en el listado (sin tono) */}
                  <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatDuration(song.duration)}
                  </span>
                  {/* el corazón no reproduce */}
                  <span className="flex items-center" onClick={(e) => e.stopPropagation()}>
                    {can("editSongs") ? <ProximaButton song={song} /> : null}
                    <FavButton songId={song.id} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface-card overflow-x-auto">
            <div className="hidden grid-cols-[40px_minmax(0,1fr)_100px_80px_150px_56px_176px] 2xl:grid-cols-[40px_minmax(220px,1fr)_200px_100px_80px_150px_56px_176px] gap-4 border-b border-border/60 px-4 py-3 text-[11px] tracking-widest text-muted-foreground uppercase md:grid">
              <span>#</span>
              <span>Título</span>
              <span className="hidden 2xl:block">Temas</span>
              <span>Tipo</span>
              <span className="text-center">Secuencia</span>
              <span>Tono / Compás / BPM</span>
              <span className="text-right">Duración</span>
              <span className="text-right">Acciones</span>
            </div>
            {paged.pageItems.map((song, i) => (
              <div
                key={song.id}
                onClick={() => playRow(song)}
                // entran escalonadas (hasta 8 filas, después todas juntas)
                style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                className={`group relative grid animate-in grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors fill-mode-both fade-in-0 slide-in-from-bottom-1 duration-300 hover:bg-white/[0.03] md:grid-cols-[40px_minmax(0,1fr)_100px_80px_150px_56px_176px] md:gap-4 md:py-2.5 2xl:grid-cols-[40px_minmax(220px,1fr)_200px_100px_80px_150px_56px_176px] ${
                  current?.id === song.id ? "bg-white/[0.05]" : ""
                }`}
              >
                {/* la que suena: barra dorada a la izquierda */}
                {current?.id === song.id ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary shadow-[0_0_12px] shadow-primary/60"
                  />
                ) : null}
                <button
                  onClick={() => play(song)}
                  aria-label={`Reproducir ${song.title}`}
                  className="hidden h-8 w-8 items-center justify-center rounded-full text-sm text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground md:flex"
                >
                  <span className="group-hover:hidden">{paged.start + i + 1}</span>
                  <Play className="hidden h-3.5 w-3.5 group-hover:block" />
                </button>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative shrink-0">
                    <Cover
                      song={song}
                      size="sm"
                      className="h-14 w-14 rounded-xl md:h-11 md:w-11 md:rounded-lg"
                    />
                    {/* celular: sonando → ecualizador; si no, ▶︎ al tocar/pasar */}
                    <span
                      aria-hidden
                      className={`absolute inset-0 flex items-center justify-center rounded-xl bg-black/45 transition-opacity md:hidden ${
                        current?.id === song.id
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {current?.id === song.id ? (
                        <span className="flex h-4 items-end gap-0.5">
                          {[0, 150, 300].map((delay) => (
                            <span
                              key={delay}
                              className={`h-4 w-1 rounded-full bg-primary ${isPlaying ? "eq-bar" : "scale-y-50"}`}
                              style={{ animationDelay: `${delay}ms` }}
                            />
                          ))}
                        </span>
                      ) : (
                        <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
                      )}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`truncate text-[15px] font-semibold md:text-base md:font-medium ${current?.id === song.id ? "text-primary" : ""}`}
                    >
                      {song.title}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
                    {/* sin columna de temas (celular y pantallas medianas): van debajo del artista */}
                    {/* en celular entra 1 tema (y "+N"); en pantallas medianas, 2 */}
                    {/* celular: temas como texto liviano ("Fe · Restauración"), sin pastillas */}
                    {song.tags.length ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground/70 sm:hidden">
                        {song.tags.slice(0, 2).join(" · ")}
                      </p>
                    ) : null}
                    <div className="mt-1 hidden sm:block 2xl:hidden">
                      <TagList tags={song.tags} />
                    </div>
                  </div>
                </div>
                <div className="hidden min-w-0 2xl:block">
                  <TagList tags={song.tags} />
                </div>
                <span className="hidden truncate text-sm text-muted-foreground md:block">
                  {song.tipo}
                </span>
                {/* secuencia: check amarillo si tiene pistas (multitracks), "-" si no */}
                <span className="hidden justify-center md:flex">
                  {hasSequence(song) ? (
                    <Check
                      className="h-5 w-5 text-primary"
                      strokeWidth={3}
                      aria-label="Con secuencia (tiene audio cargado)"
                    />
                  ) : (
                    <span className="text-base text-foreground" aria-label="Sin secuencia">
                      -
                    </span>
                  )}
                </span>
                <span className="hidden whitespace-nowrap text-sm text-muted-foreground md:block">
                  {song.key} · {song.compas} · {song.bpm} BPM
                </span>
                <span className="hidden text-right text-sm text-muted-foreground tabular-nums md:block">
                  {formatDuration(song.duration)}
                </span>
                {/* celular: un solo botón "⋯"; al tocarlo, las acciones entran desde la derecha
                  sobre la fila. Compu: siempre a la vista */}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActionsOpen(song.id);
                  }}
                  aria-label={`Acciones de ${song.title}`}
                  aria-expanded={actionsOpen === song.id}
                  className="flex items-center gap-2 rounded-full py-1 pr-1 pl-2 text-muted-foreground transition-colors hover:text-primary md:hidden"
                >
                  {/* duración a la vista, como en un reproductor */}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDuration(song.duration)}
                  </span>
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                <div
                  data-actions-panel={song.id}
                  onClick={(event) => event.stopPropagation()}
                  className={`items-center justify-end gap-1 whitespace-nowrap md:static md:flex md:animate-none md:bg-transparent md:p-0 md:shadow-none ${
                    actionsOpen === song.id
                      ? "absolute inset-y-0 right-0 z-10 flex animate-in rounded-l-2xl bg-card/95 pr-2 pl-3 shadow-[-18px_0_24px_-14px_rgba(0,0,0,0.7)] backdrop-blur fade-in-0 slide-in-from-right-full duration-300"
                      : "hidden"
                  }`}
                >
                  {can("editSongs") ? <ProximaButton song={song} /> : null}
                  <FavButton songId={song.id} />
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setManagingTracks(song);
                    }}
                    aria-label={`Pistas adicionales de ${song.title}`}
                    className="rounded-full p-2 text-muted-foreground hover:text-primary"
                  >
                    <Layers className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setManagingLinks(song);
                    }}
                    aria-label={`Links relacionados de ${song.title}`}
                    title="Links relacionados"
                    className="rounded-full p-2 text-muted-foreground hover:text-primary"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                  {can("editSongs") ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditing(song);
                      }}
                      aria-label={`Editar ${song.title}`}
                      className="rounded-full p-2 text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      play(song);
                    }}
                    aria-label={`Reproducir ${song.title}`}
                    className="rounded-full p-2 text-muted-foreground hover:text-primary md:hidden"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionsOpen(null)}
                    aria-label="Cerrar acciones"
                    className="ml-1 rounded-full bg-secondary p-2 text-foreground md:hidden"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pager page={paged.page} pages={paged.pages} onChange={paged.setPage} />
      </div>

      {modal ? <UploadModal onClose={() => setModal(false)} onSave={addSong} /> : null}
      {editing ? (
        <UploadModal song={editing} onClose={() => setEditing(null)} onSave={updateSong} />
      ) : null}
      {managingTracks ? (
        <AudioTracksModal song={managingTracks} onClose={() => setManagingTracks(null)} />
      ) : null}
      {managingLinks ? (
        <SongLinksModal song={managingLinks} onClose={() => setManagingLinks(null)} />
      ) : null}
    </AppLayout>
  );
}
