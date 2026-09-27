import { useEffect, useRef, useState, type RefObject } from "react";
import {
  ChevronDown,
  ChevronRight,
  Music2,
  Pause,
  Play,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { Cover, FavButton, formatDuration, TagChip } from "@/components/common/ui-bits";
import { YoutubeIcon } from "@/components/common/YoutubeEmbed";
import type { QueueFilter } from "@/lib/queue";
import type { Song } from "@/types";

/** Un audio del tema actual: el video principal, el audio subido, una pista o un video extra */
export interface AudioOption {
  key: string;
  label: string;
  kind: "youtube" | "audio";
  active: boolean;
}

const FILTERS: Array<{ value: QueueFilter; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "Alabanza", label: "Alabanzas" },
  { value: "Adoración", label: "Adoraciones" },
];

/**
 * Reproductor a pantalla completa (diseño tomado del mockup de Figma que eligió Pablo, con los
 * colores de la app): a la izquierda el tema (título grande, reproducir, favorito), las pestañas
 * Todas / Alabanzas / Adoraciones, la lista para seguir escuchando (el tema actual se despliega
 * con sus otros audios) y los controles abajo; a la derecha "Reproduciendo" con el video o la
 * portada y las características del tema. En celular, una sola columna.
 */
export function FullPlayer({
  current,
  isPlaying,
  closing,
  onClose,
  onToggle,
  onBack,
  onNext,
  onPlaySong,
  queue,
  filter,
  onFilterChange,
  shuffle,
  onShuffleChange,
  progress,
  seconds,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  useYoutube,
  videoAnchorRef,
  audioOptions,
  onChooseAudio,
  titleLabel,
  subtitleLabel,
}: {
  current: Song;
  isPlaying: boolean;
  closing: boolean;
  onClose: () => void;
  onToggle: () => void;
  onBack: () => void;
  onNext: () => void;
  onPlaySong: (song: Song) => void;
  queue: Song[];
  filter: QueueFilter;
  onFilterChange: (filter: QueueFilter) => void;
  shuffle: boolean;
  onShuffleChange: (shuffle: boolean) => void;
  progress: number;
  seconds: number;
  duration: number;
  onSeek: (value: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  useYoutube: boolean;
  videoAnchorRef: RefObject<HTMLDivElement | null>;
  audioOptions: AudioOption[];
  onChooseAudio: (key: string) => void;
  titleLabel: string;
  subtitleLabel: string;
}) {
  // el tema actual arranca desplegado con sus audios (si tiene más de uno)
  const [audiosOpen, setAudiosOpen] = useState(true);
  // la lista se desplaza sola hasta el tema que suena (al abrir y al cambiar de tema o de pestaña)
  // (solo la lista por dentro: scrollIntoView movería toda la pantalla y en celular taparía el video)
  const listRef = useRef<HTMLOListElement | null>(null);
  const currentRowRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    const list = listRef.current;
    const row = currentRowRef.current;
    if (!list || !row) return;
    // la lista es "relative": offsetTop de la fila ya es relativo a ella
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top - 8;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight + 8;
  }, [current.id, filter]);
  const currentInQueue = queue.some((song) => song.id === current.id);

  const shuffleButton = (
    <button
      type="button"
      onClick={() => onShuffleChange(!shuffle)}
      aria-pressed={shuffle}
      aria-label={shuffle ? "Desactivar modo aleatorio" : "Activar modo aleatorio"}
      title="Aleatorio"
      className={`rounded-full p-2 transition-colors ${
        shuffle ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Shuffle className="h-5 w-5" />
    </button>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reproductor"
      className={`fixed inset-0 z-50 overflow-y-auto bg-background gradient-sky p-2 md:p-4 ${
        closing
          ? "animate-out fill-mode-forwards duration-250 ease-in slide-out-to-bottom"
          : "animate-in duration-300 ease-out slide-in-from-bottom"
      }`}
    >
      <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-3 lg:h-full lg:min-h-0">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar reproductor"
            className="rounded-full bg-background/40 p-2 text-muted-foreground backdrop-blur hover:text-foreground"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
          <span className="text-xs font-semibold tracking-widest text-foreground/70 uppercase">
            Reproduciendo
          </span>
          <span className="w-10" />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:grid-rows-[minmax(0,1fr)]">
          {/* ---------- derecha (arriba en celular): lo que suena ---------- */}
          <aside className="flex min-h-0 flex-col gap-3 lg:order-2 lg:overflow-y-auto">
            <section className="surface-card overflow-hidden rounded-3xl">
              <p className="pt-4 text-center text-sm font-semibold text-foreground/90">
                Reproduciendo ahora
              </p>
              <div className="p-4">
                {useYoutube ? (
                  // acá se ubica el video (YoutubeStage): el mismo iframe que en la barra
                  <div ref={videoAnchorRef} className="aspect-video w-full rounded-2xl bg-black" />
                ) : (
                  <Cover
                    song={current}
                    size="none"
                    className="aspect-square w-full rounded-2xl shadow-none"
                  />
                )}
              </div>
              <div className="flex items-center gap-3 border-t border-border/60 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-semibold">{titleLabel}</p>
                  <p className="truncate text-sm text-muted-foreground">{subtitleLabel}</p>
                </div>
                <FavButton songId={current.id} />
              </div>
            </section>

            <section className="surface-card grid grid-cols-4 gap-2 rounded-3xl p-4 lg:grid-cols-2">
              {[
                ["Tono", current.key],
                ["Compás", current.compas],
                ["BPM", String(current.bpm)],
                ["Duración", formatDuration(duration)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border bg-background/40 px-2 py-2.5 text-center"
                >
                  <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
                    {label}
                  </p>
                  <p className="mt-0.5 text-base font-semibold">{value}</p>
                </div>
              ))}
            </section>
          </aside>

          {/* ---------- izquierda: tema, lista para seguir escuchando y controles ---------- */}
          <section className="surface-card flex min-h-0 flex-col rounded-3xl lg:order-1">
            {/* encabezado del tema, con los círculos decorativos del mockup */}
            <div className="relative overflow-hidden rounded-t-3xl px-5 pt-6 pb-5 md:px-8 md:pt-8">
              <div className="pointer-events-none absolute -top-40 right-[-6rem] h-96 w-96 rounded-full border border-white/10 bg-white/[0.02]" />
              <div className="pointer-events-none absolute -bottom-24 left-24 h-56 w-56 rounded-full border border-white/5" />
              <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                  {current.tipo ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-primary uppercase">
                      <Music2 className="h-3 w-3" /> {current.tipo}
                    </span>
                  ) : null}
                  <h2 className="mt-2 truncate font-display text-4xl font-bold md:text-5xl">
                    {current.title}
                  </h2>
                  <p className="mt-1 truncate text-muted-foreground">{current.artist}</p>
                  {current.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {current.tags.map((tag) => (
                        <TagChip key={tag} tag={tag} />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={onToggle}
                    className="flex items-center gap-2 rounded-full gradient-gold px-7 py-3 font-semibold text-primary-foreground transition-transform hover:scale-105"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? "Pausar" : "Reproducir"}
                  </button>
                  <div className="rounded-full border border-border bg-background/40 px-2 py-1">
                    <FavButton songId={current.id} />
                  </div>
                </div>
              </div>
            </div>

            {/* pestañas: qué se sigue escuchando */}
            <div className="flex items-center gap-1 border-y border-border/60 bg-background/30 px-3 md:px-6">
              <div
                role="tablist"
                aria-label="Qué escuchar"
                className="flex flex-1 gap-1 overflow-x-auto"
              >
                {FILTERS.map((option) => {
                  const active = filter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => onFilterChange(option.value)}
                      className={`relative px-3 py-3.5 text-sm whitespace-nowrap transition-colors ${
                        active
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label}
                      {active ? (
                        <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* lista para seguir escuchando */}
            <ol
              ref={listRef}
              className="relative max-h-[55vh] min-h-0 overflow-y-auto px-2 py-2 md:px-4 lg:max-h-none lg:flex-1"
            >
              {!currentInQueue ? (
                <li className="px-3 pt-1 pb-2 text-xs text-muted-foreground">
                  El tema que suena no es {filter === "Alabanza" ? "una alabanza" : "una adoración"}
                  : al pasar al siguiente, sigue con esta lista.
                </li>
              ) : null}
              {queue.length === 0 ? (
                <li className="p-8 text-center text-sm text-muted-foreground">
                  No hay canciones para reproducir en esta lista.
                </li>
              ) : null}
              {queue.map((song, index) => {
                const isCurrent = song.id === current.id;
                const showAudios = isCurrent && audioOptions.length > 1;
                return (
                  <li
                    key={song.id}
                    ref={isCurrent ? currentRowRef : undefined}
                    className="border-b border-border/40 last:border-0"
                  >
                    <div
                      className={`group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors md:gap-4 ${
                        isCurrent ? "bg-primary/10" : "hover:bg-elevated/60"
                      }`}
                    >
                      <span className="flex w-7 shrink-0 items-end justify-center text-sm text-muted-foreground">
                        {isCurrent && isPlaying ? (
                          <span className="flex h-4 items-end gap-0.5" aria-label="Sonando">
                            {[0, 0.2, 0.4, 0.1].map((delay) => (
                              <span
                                key={delay}
                                className="eq-bar h-4 w-0.5 rounded-full bg-primary"
                                style={{ animationDelay: `${delay}s` }}
                              />
                            ))}
                          </span>
                        ) : (
                          <span className={isCurrent ? "text-primary" : ""}>{index + 1}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => (isCurrent ? onToggle() : onPlaySong(song))}
                        aria-label={
                          isCurrent
                            ? isPlaying
                              ? "Pausar"
                              : "Reproducir"
                            : `Reproducir ${song.title}`
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <Cover song={song} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate font-medium ${isCurrent ? "text-primary" : ""}`}
                          >
                            {song.title}
                          </span>
                          <span className="block truncate text-sm text-muted-foreground">
                            {song.artist}
                          </span>
                        </span>
                      </button>
                      <span className="hidden w-28 shrink-0 text-sm text-muted-foreground md:block">
                        {song.key} · {song.bpm} BPM
                      </span>
                      <span className="hidden w-12 shrink-0 text-sm text-muted-foreground sm:block">
                        {formatDuration(song.duration)}
                      </span>
                      <FavButton songId={song.id} />
                      {showAudios ? (
                        <button
                          type="button"
                          onClick={() => setAudiosOpen((open) => !open)}
                          aria-expanded={audiosOpen}
                          aria-label={
                            audiosOpen ? "Ocultar los audios del tema" : "Ver los audios del tema"
                          }
                          title="Audios del tema"
                          className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${audiosOpen ? "rotate-90" : ""}`}
                          />
                        </button>
                      ) : (
                        <span className="w-7 shrink-0" />
                      )}
                    </div>
                    {showAudios && audiosOpen ? (
                      <ul className="mb-2 ml-10 space-y-0.5 border-l border-primary/30 py-1 pl-3 md:ml-14">
                        {audioOptions.map((option) => (
                          <li key={option.key}>
                            <button
                              type="button"
                              onClick={() => onChooseAudio(option.key)}
                              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                                option.active
                                  ? "bg-primary/15 text-primary"
                                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                              }`}
                            >
                              {option.kind === "youtube" ? (
                                <YoutubeIcon />
                              ) : (
                                <Music2 className="h-3.5 w-3.5" />
                              )}
                              <span className="min-w-0 flex-1 truncate">{option.label}</span>
                              {option.active ? <span className="text-xs">Sonando</span> : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ol>

            {/* controles: fijos abajo mientras se recorre la lista */}
            <div className="sticky bottom-0 rounded-b-3xl border-t border-border/60 bg-card/95 px-4 pt-3 pb-4 backdrop-blur md:px-8">
              <div className="flex items-center justify-between gap-2">
                <div className="hidden w-40 items-center gap-2 md:flex">
                  <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume * 100}
                    aria-label="Volumen"
                    onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                  />
                </div>
                <div className="flex flex-1 items-center justify-center gap-6 md:gap-8">
                  <button
                    type="button"
                    onClick={onBack}
                    aria-label="Volver al principio (dos toques: canción anterior)"
                    className="rounded-full p-2 text-foreground"
                  >
                    <SkipBack className="h-7 w-7 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={onToggle}
                    aria-label={isPlaying ? "Pausar" : "Reproducir"}
                    className="flex h-16 w-16 items-center justify-center rounded-full gradient-gold text-primary-foreground transition-transform hover:scale-105"
                  >
                    {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    aria-label="Siguiente canción"
                    className="rounded-full p-2 text-foreground"
                  >
                    <SkipForward className="h-7 w-7 fill-current" />
                  </button>
                </div>
                <div className="flex w-10 justify-end md:w-40">{shuffleButton}</div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="w-10 text-right">{formatDuration(seconds)}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  aria-label="Progreso"
                  onChange={(e) => onSeek(Number(e.target.value))}
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                />
                <span className="w-10">{formatDuration(duration)}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
