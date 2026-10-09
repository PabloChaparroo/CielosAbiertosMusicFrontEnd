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
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, EmptyState, FavButton, formatDuration, TagChip } from "@/components/common/ui-bits";
import { TagList } from "@/components/common/TagList";
import { hasSequence } from "@/features/canciones/lib/sequence";
import { useApp } from "@/hooks/useApp";
import { Pager, usePaged } from "@/components/common/Pager";
import type { Song, Tag } from "@/types";
import { AudioTracksModal } from "../components/AudioTracksModal";
import { ProximaButton } from "../components/ProximaButton";
import { SongLinksModal } from "../components/SongLinksModal";
import { UploadModal } from "../components/UploadModal";
import { matchesSearch } from "@/lib/search";

/** Desplegable de filtro: dorado si tiene algo elegido */
const filterSelectClass = (active: boolean) =>
  `h-9 rounded-full border px-3 text-sm font-semibold outline-none transition-colors focus:border-primary/60 ${
    active
      ? "border-primary/50 bg-primary/15 text-primary"
      : "border-border bg-card text-muted-foreground hover:text-foreground"
  }`;

export function EscucharPage() {
  const { songs, play, current, can, addSong, updateSong } = useApp();
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
      {/* celular: buscador + vista en una fila, y los filtros en otra que se desliza de costado;
          compu: todo en una fila */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar canción o artista…"
              className="h-9 w-full rounded-full border border-border bg-card pr-4 pl-10 text-sm outline-none transition-colors focus:border-primary/60"
            />
          </div>
          {renderViewToggle("flex sm:hidden")}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-1 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {tipos.length ? (
            <select
              value={tipo ?? ""}
              onChange={(e) => setTipo(e.target.value || null)}
              aria-label="Filtrar por tipo"
              className={`shrink-0 ${filterSelectClass(tipo !== null)}`}
            >
              <option value="">Tipo: todos</option>
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : null}
          <select
            value={secuencia ?? ""}
            onChange={(e) => setSecuencia((e.target.value || null) as "con" | "sin" | null)}
            aria-label="Filtrar por secuencia"
            className={`shrink-0 ${filterSelectClass(secuencia !== null)}`}
          >
            <option value="">Secuencia: todas</option>
            <option value="con">Con secuencia</option>
            <option value="sin">Sin secuencia</option>
          </select>
          {/* temas: son muchos (catálogo del backend), van en un desplegable */}
          <select
            value={tag ?? ""}
            onChange={(e) => setTag(e.target.value || null)}
            aria-label="Filtrar por tema"
            className={`shrink-0 ${filterSelectClass(tag !== null)}`}
          >
            <option value="">Tema: todos</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {renderViewToggle("ml-auto hidden sm:flex")}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Music4 className="h-6 w-6" />}
          title="No encontramos canciones"
          description="Probá con otro nombre o quitá el filtro de tema."
        />
      ) : view === "cards" ? (
        // tarjetas como en Favoritos: tocar la tarjeta reproduce
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7 2xl:grid-cols-9">
          {paged.pageItems.map((song) => (
            <div
              key={song.id}
              role="button"
              tabIndex={0}
              onClick={() => play(song)}
              onKeyDown={(e) => {
                if (e.key === "Enter") play(song);
              }}
              aria-label={`Reproducir ${song.title}`}
              className={`surface-card group relative cursor-pointer rounded-lg p-2 hover:-translate-y-1 hover:border-primary/40 ${
                current?.id === song.id ? "border-primary/60" : ""
              }`}
            >
              <Cover
                song={song}
                size="none"
                className="mb-2 aspect-square w-full rounded-md shadow-none"
              />
              <p
                className={`truncate text-sm font-semibold ${current?.id === song.id ? "text-primary" : ""}`}
              >
                {song.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {song.key} · {formatDuration(song.duration)}
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
              className={`group relative grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-2.5 transition-colors hover:bg-elevated/70 md:grid-cols-[40px_minmax(0,1fr)_100px_80px_150px_56px_176px] 2xl:grid-cols-[40px_minmax(220px,1fr)_200px_100px_80px_150px_56px_176px] ${
                current?.id === song.id ? "bg-elevated/60" : ""
              }`}
            >
              <button
                onClick={() => play(song)}
                aria-label={`Reproducir ${song.title}`}
                className="hidden h-8 w-8 items-center justify-center rounded-full text-sm text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground md:flex"
              >
                <span className="group-hover:hidden">{paged.start + i + 1}</span>
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
                  {/* sin columna de temas (celular y pantallas medianas): van debajo del artista */}
                  {/* en celular entra 1 tema (y "+N"); en pantallas medianas, 2 */}
                  <div className="mt-1 sm:hidden">
                    <TagList tags={song.tags} max={1} />
                  </div>
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
                className="rounded-full p-2 text-muted-foreground transition-colors hover:text-primary md:hidden"
              >
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
