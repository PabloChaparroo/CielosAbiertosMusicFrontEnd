import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Columns2,
  FileDown,
  Maximize2,
  Pause,
  Pencil,
  Play,
  RectangleVertical,
  Search,
  Heart,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, FavButton } from "@/components/common/ui-bits";
import { usePinchZoom } from "@/hooks/usePinchZoom";
import { useApp } from "@/hooks/useApp";
import { Pager, usePaged } from "@/components/common/Pager";
import { displayLyricsLines } from "@/lib/chords";
import { exportLyricsPdf } from "@/lib/pdf";
import type { Song } from "@/types";
import {
  enterBrowserFullscreen,
  exitBrowserFullscreen,
  isBrowserFullscreen,
} from "@/lib/browser-fullscreen";
import { GoldParticles } from "@/components/common/GoldParticles";
import { ListNav, listNeighbors } from "@/components/common/ListNav";
import { canRotateScreen } from "@/lib/screen-orientation";
import { matchesSearch } from "@/lib/search";
import { useScrollToPicked } from "@/hooks/useScrollToPicked";

export function LetrasPage() {
  const { songs, can, current, isPlaying, play, toggle, favorites } = useApp();
  const { songId: requestedSongId, songIds } = useSearch({ from: "/letras" });
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const searchPanelRef = useRef<HTMLElement | null>(null);
  // al elegir una canción, la página baja hasta su letra (ver useScrollToPicked)
  const { ref: detailRef, request: scrollToDetail } = useScrollToPicked<HTMLDivElement>();
  const openSong = (id: string) => {
    setSelected(id);
    scrollToDetail();
  };
  useEffect(() => {
    const closeOnOutsideTap = (event: PointerEvent) => {
      if (searchPanelRef.current && !searchPanelRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideTap);
    return () => document.removeEventListener("pointerdown", closeOnOutsideTap);
  }, []);
  // abierta desde una lista de canciones: solo esas, EN EL ORDEN DE LA LISTA (el equipo la sigue
  // mientras toca), y la canción abierta no se mueve de lugar
  // favoritos (en el orden en que se marcaron): se muestran cuando no hay canción elegida
  const favoriteSongs = useMemo(
    () => favorites.flatMap((id) => songs.find((s) => s.id === id) ?? []),
    [favorites, songs],
  );
  const scopedOrder = useMemo(() => (songIds ? songIds.split(",") : null), [songIds]);
  const scopedSongIds = useMemo(() => (scopedOrder ? new Set(scopedOrder) : null), [scopedOrder]);
  const availableSongs = useMemo(
    () =>
      scopedOrder ? scopedOrder.flatMap((id) => songs.find((item) => item.id === id) ?? []) : songs,
    [songs, scopedOrder],
  );

  useEffect(() => {
    if (!requestedSongId || !availableSongs.some((song) => song.id === requestedSongId)) return;
    setSelected(requestedSongId);
  }, [requestedSongId, availableSongs]);

  const filtered = useMemo(
    () =>
      availableSongs.filter(
        (s) => matchesSearch(query, s.title) || matchesSearch(query, ...s.tags),
      ),
    [availableSongs, query],
  );
  const visibleSongs = useMemo(
    () =>
      query || scopedSongIds
        ? filtered
        : [...filtered].sort((a, b) => Number(b.id === selected) - Number(a.id === selected)),
    [filtered, query, selected, scopedSongIds],
  );
  // el buscador muestra de a 15: con muchas canciones no dibuja la lista entera
  const pagedList = usePaged(visibleSongs, 15, query);

  const song = availableSongs.find((s) => s.id === selected) ?? null;

  return (
    <AppLayout title="Letras" subtitle="Buscá por nombre o tema">
      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside
          ref={searchPanelRef}
          className="surface-card relative order-1 flex max-h-[55vh] flex-col overflow-hidden xl:order-1 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7.5rem)]"
        >
          {/* partículas doradas detrás del buscador y la lista */}
          <GoldParticles />
          <div className="relative border-b border-border/60 p-3">
            <Search className="absolute top-1/2 left-6 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              // desde una lista son pocas canciones: tocar el buscador solo abre la lista, sin
              // escribir (así el celular no abre el teclado)
              readOnly={Boolean(scopedSongIds)}
              inputMode={scopedSongIds ? "none" : undefined}
              onClick={() => setSearchOpen(true)}
              placeholder={scopedSongIds ? "Canciones de la lista" : "Saltar a canción…"}
              className="w-full rounded-full border border-border bg-secondary py-2 pr-3 pl-10 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div
            className={`relative grid transition-[grid-template-rows,opacity] duration-200 ease-out xl:flex-1 xl:grid-rows-[1fr] xl:opacity-100 ${searchOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="min-h-0 overflow-y-auto p-2 xl:h-full">
              {!query && (
                <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {scopedSongIds ? "Orden de la lista" : "Recientes"}
                </p>
              )}
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Sin resultados</p>
              ) : (
                pagedList.pageItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      openSong(item.id);
                      setSearchOpen(false);
                      play(item);
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors ${
                      item.id === song?.id ? "bg-primary/15 text-primary" : "hover:bg-elevated/70"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openSong(item.id);
                        setSearchOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Cover song={item} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.artist}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSearchOpen(false);
                        if (current?.id === item.id && isPlaying) toggle();
                        else play(item);
                      }}
                      aria-label={
                        current?.id === item.id && isPlaying
                          ? `Pausar ${item.title}`
                          : `Reproducir ${item.title}`
                      }
                      title={current?.id === item.id && isPlaying ? "Pausar" : "Reproducir"}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-primary"
                    >
                      {current?.id === item.id && isPlaying ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="ml-0.5 h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))
              )}
              <Pager
                page={pagedList.page}
                pages={pagedList.pages}
                onChange={pagedList.setPage}
                compact
              />
            </div>
          </div>
        </aside>

        <div ref={detailRef} className="order-2 min-w-0 xl:order-2">
          {song ? (
            <SongLyricsDetail
              song={song}
              canEdit={can("editSongs")}
              {...listNeighbors(scopedOrder ? availableSongs : null, song.id, setSelected)}
            />
          ) : (
            // sin canción elegida: tus favoritos, para abrir su letra de un toque
            <div className="surface-card p-4 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Tus favoritos</h2>
              </div>
              {favoriteSongs.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Todavía no tenés favoritos. Tocá el corazón de una canción para tenerla acá.
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {favoriteSongs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openSong(item.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-elevated/70"
                    >
                      <Cover song={item} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.title}</span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {item.artist}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function SongLyricsDetail({
  song,
  canEdit,
  onPrev,
  onNext,
}: {
  song: Song;
  canEdit: boolean;
  /** canción anterior/siguiente de la lista (solo si se entró desde una lista) */
  onPrev?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
}) {
  const { current, isPlaying, play, toggle } = useApp();
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const syncFullscreen = () => {
      if (!isBrowserFullscreen()) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, []);
  const navigate = useNavigate();

  // tamaño de la letra en pantalla completa: se cambia pellizcando con dos dedos
  const [lyricsSize, setLyricsSize] = useState(20);
  const pinch = usePinchZoom(lyricsSize, setLyricsSize, 12, 56);

  // En vivo: una columna o dos (como el PDF). Se recuerda.
  const [twoColumns, setTwoColumns] = useState(() => {
    try {
      return localStorage.getItem("letras-columns") === "2";
    } catch {
      return false;
    }
  });
  const toggleColumns = () =>
    setTwoColumns((v) => {
      try {
        localStorage.setItem("letras-columns", v ? "1" : "2");
      } catch {
        // sin almacenamiento: solo dura esta visita
      }
      return !v;
    });

  /**
   * Letra agrupada por sección. En dos columnas (`columns`), cada sección va entera en una de dos
   * columnas lado a lado, repartidas para que tengan una cantidad de renglones parecida, y los
   * renglones no se cortan: si no entran en la pantalla, se desplaza de costado con el dedo o se
   * aleja pellizcando (pedido de Pablo: antes la letra se apretaba para entrar).
   */
  const renderLyrics = (className: string, fontSize?: number, columns = false) => {
    const blocks: Array<{ title: string | null; lines: string[] }> = [];
    displayLyricsLines(song.chordpro).forEach((line) => {
      if (line.kind === "section") blocks.push({ title: line.value, lines: [] });
      else {
        if (!blocks.length) blocks.push({ title: null, lines: [] });
        blocks[blocks.length - 1]!.lines.push(line.value);
      }
    });
    const renderBlock = (block: (typeof blocks)[number], b: number) => (
      <div key={b} className="break-inside-avoid">
        {block.title ? (
          <div className="mt-6 mb-3 text-xl font-semibold tracking-widest text-primary">
            {block.title}
          </div>
        ) : null}
        {block.lines.map((line, i) => (
          <div key={i} className="min-h-[1.5em] whitespace-pre">
            {line || " "}
          </div>
        ))}
      </div>
    );
    if (columns) {
      // la primera columna se llena hasta la mitad de los renglones (contando los títulos)
      const size = (block: (typeof blocks)[number]) => block.lines.length + (block.title ? 2 : 0);
      const total = blocks.reduce((sum, block) => sum + size(block), 0);
      let acc = 0;
      let split = blocks.length;
      for (let b = 0; b < blocks.length; b += 1) {
        if (acc >= total / 2) {
          split = b;
          break;
        }
        acc += size(blocks[b]!);
      }
      return (
        <div
          className={`flex w-max items-start gap-16 ${className}`}
          style={fontSize ? { fontSize } : undefined}
        >
          <div>{blocks.slice(0, split).map(renderBlock)}</div>
          <div>{blocks.slice(split).map((block, b) => renderBlock(block, b + split))}</div>
        </div>
      );
    }
    return (
      <div className={className} style={fontSize ? { fontSize } : undefined}>
        {blocks.map((block, b) => (
          <div key={b} className="break-inside-avoid">
            {block.title ? (
              <div className="mt-6 mb-3 text-xl font-semibold tracking-widest text-primary">
                {block.title}
              </div>
            ) : null}
            {block.lines.map((line, i) => (
              <div key={i} className="min-h-[1.5em]">
                {line || " "}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  if (fullscreen) {
    return (
      <div
        // key: al pasar a otra canción de la lista, arranca desde arriba
        key={song.id}
        className="fixed inset-0 z-50 overflow-auto bg-background px-5 py-8 sm:px-10 sm:py-10"
        {...pinch}
      >
        <button
          type="button"
          onClick={() => {
            setFullscreen(false);
            void exitBrowserFullscreen();
          }}
          aria-label="Salir de pantalla completa"
          className="fixed top-4 right-4 rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <ListNav onPrev={onPrev} onNext={onNext} className="fixed top-4 left-4" />
        <button
          type="button"
          onClick={toggleColumns}
          aria-label={twoColumns ? "Ver en una columna" : "Ver en dos columnas"}
          title={twoColumns ? "Ver en una columna" : "Ver en dos columnas"}
          className="fixed top-4 right-16 rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {twoColumns ? (
            <RectangleVertical className="h-5 w-5" />
          ) : (
            <Columns2 className="h-5 w-5" />
          )}
        </button>
        {/* Bloque centrado en la pantalla (horizontal, y vertical si la letra es corta), con el
            texto alineado a la izquierda adentro */}
        {/* "safe": si la letra es más ancha que la pantalla (dos columnas), arranca desde el borde
            izquierdo y se desplaza, en vez de quedar cortada de los dos lados */}
        <div className="flex min-h-full flex-col items-center-safe">
          <div className={`my-auto pb-10 ${twoColumns ? "w-max" : "w-fit max-w-full"}`}>
            <div className={`mb-8 pr-12 ${onPrev || onNext || canRotateScreen() ? "pt-10" : ""}`}>
              <p className="text-sm text-muted-foreground">{song.artist}</p>
              <h2 className="font-display text-3xl font-semibold">{song.title}</h2>
            </div>
            {renderLyrics("leading-relaxed", lyricsSize, twoColumns)}
          </div>
        </div>
      </div>
    );
  }

  const isCurrent = current?.id === song.id;
  return (
    <div className="space-y-5">
      {/* Tarjeta como la de Acordes: la canción (favorito y reproducir) y abajo las acciones */}
      <div className="surface-card divide-y divide-border/60">
        <div className="flex items-center gap-3 p-4">
          <Cover song={song} size="sm" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-2xl font-semibold">{song.title}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {song.artist} · original {song.key} · {song.compas}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <FavButton songId={song.id} />
            {/* en celular y tablet la lista (con su botón de reproducir) queda plegada: se reproduce desde acá */}
            <button
              type="button"
              onClick={() => (isCurrent ? toggle() : play(song))}
              aria-label={
                isCurrent && isPlaying ? `Pausar ${song.title}` : `Reproducir ${song.title}`
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-gold text-primary-foreground xl:hidden"
            >
              {isCurrent && isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* "En vivo", PDF y Editar, igual que en Acordes */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:p-4">
          <button
            type="button"
            onClick={() => {
              void enterBrowserFullscreen();
              setFullscreen(true);
            }}
            className="flex h-10 items-center gap-2 rounded-full gradient-gold px-4 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <Maximize2 className="h-4 w-4" /> En vivo
          </button>
          <button
            type="button"
            onClick={() => exportLyricsPdf(song)}
            className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <FileDown className="h-4 w-4" /> PDF
          </button>
          {/* La letra se edita en Acordes: editar acá solo la letra y guardarla como chordpro
              borraba todos los acordes de la canción (ver docs/estado-actual.md del backend) */}
          {canEdit ? (
            <button
              type="button"
              onClick={() =>
                navigate({ to: "/acordes", search: { songId: song.id, editar: true } })
              }
              title="Se edita en Acordes, con la vista previa en vivo"
              className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Pencil className="h-4 w-4" /> Editar
            </button>
          ) : null}
        </div>
      </div>

      <article className="surface-card p-6 text-lg leading-relaxed sm:p-10">
        {renderLyrics("")}
      </article>
    </div>
  );
}
