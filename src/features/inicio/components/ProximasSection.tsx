import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Guitar, Pause, Pin, Play, Rocket } from "lucide-react";
import { Cover } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { displayLyricsLines } from "@/lib/chords";
import { AnnotationsService } from "@/features/canciones/services/annotations.service";
import type { Annotation, Song } from "@/types";

/** Cuánto dura cada renglón de la letra "cantándose" */
const LINE_MS = 2800;

/** "8 de octubre": desde cuándo está marcada */
const markedSince = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long" }) : null;

/** Los primeros renglones de letra (sin secciones ni acordes) */
const lyricsPreview = (chordpro: string, lines = 8) =>
  displayLyricsLines(chordpro)
    .filter((l) => l.kind === "text" && l.value.trim())
    .slice(0, lines)
    .map((l) => l.value.trim());

/**
 * Canciones "próximas a sacar", destacadas en Inicio como un post: encabezado del ministerio,
 * portada con el título y la tonalidad, la letra "cantándose" y la nota del equipo si la hay.
 * En celular (donde más se usa) se pasan deslizando si son varias; en compu van de a 2 o 3 por
 * fila. No se muestra si no hay ninguna.
 */
export function ProximasSection({ songs }: { songs: Song[] }) {
  if (songs.length === 0) return null;
  const single = songs.length === 1;

  return (
    <section aria-labelledby="proximas-title">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.25em] text-primary uppercase">
            <Rocket className="h-3.5 w-3.5" /> Próximamente
          </p>
          <h2 id="proximas-title" className="mt-0.5 font-display text-xl font-bold sm:text-2xl">
            {single ? "Próxima a sacar" : "Próximas a sacar"}
          </h2>
        </div>
        {!single ? (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {songs.length} canciones
          </span>
        ) : null}
      </div>

      {/* celular: carrusel con snap (la siguiente asoma); compu: posts de a 2 o 3 por fila */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-2 lg:overflow-visible lg:px-0 2xl:grid-cols-3">
        {songs.map((song) => (
          <ProximaPost key={song.id} song={song} single={single} />
        ))}
      </div>
    </section>
  );
}

function ProximaPost({ song, single }: { song: Song; single: boolean }) {
  const { play, toggle, current, isPlaying, users } = useApp();
  const playing = current?.id === song.id && isPlaying;
  const since = markedSince(song.proximaDesde);
  const canPlay = Boolean(song.audioKey || song.youtubeVideoId);
  const onPlay = () => (current?.id === song.id ? toggle() : play(song));
  const lyrics = useMemo(() => lyricsPreview(song.chordpro), [song.chordpro]);

  // la nota del equipo más reciente (si no hay o no hay permiso, el apartado no aparece)
  const [note, setNote] = useState<Annotation | null>(null);
  useEffect(() => {
    AnnotationsService.listBySong(song.id)
      .then((notes) =>
        setNote([...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null),
      )
      .catch(() => setNote(null));
  }, [song.id]);
  const noteAuthor = note ? users.find((u) => u.id === note.authorId) : undefined;

  return (
    <article
      className={`relative flex shrink-0 snap-center flex-col overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-[0_0_50px_-18px] shadow-primary/50 ${
        single ? "w-full sm:w-[70%] lg:w-auto" : "w-[86%] sm:w-[60%] lg:w-auto"
      }`}
    >
      {/* encabezado del post */}
      <header className="flex items-center gap-3 px-4 py-3">
        <img
          src="/icon-192.png"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 rounded-full ring-2 ring-primary/40"
        />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">Cielos Abiertos</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Próxima a sacar{since ? ` · desde el ${since}` : ""}
          </p>
        </div>
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
      </header>

      {/* portada: grande, pero contenida */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <Cover
          song={song}
          size="lg"
          className="h-full w-full rounded-none shadow-none transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <span className="absolute top-3 right-3 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          Tono <span className="text-primary">{song.key}</span>
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-2xl leading-tight font-bold text-white">
              {song.title}
            </h3>
            <p className="truncate text-sm text-white/75">{song.artist}</p>
          </div>
          {canPlay ? (
            <button
              type="button"
              onClick={onPlay}
              aria-label={playing ? `Pausar ${song.title}` : `Escuchar ${song.title}`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full gradient-gold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
            </button>
          ) : null}
        </div>
      </div>

      {/* la letra, cantándose */}
      <SingingLyrics lines={lyrics} />

      {/* nota del equipo (ej. "se acorta el puente", "la tocamos en C") */}
      {note ? (
        <div className="mx-4 mb-3 rounded-2xl border border-primary/25 bg-primary/5 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-primary uppercase">
            <Pin className="h-3 w-3" /> Nota del equipo
          </p>
          <p className="line-clamp-3 text-sm text-foreground/90">{note.text}</p>
          {noteAuthor ? (
            <p className="mt-1 text-[11px] text-muted-foreground">— {noteAuthor.name}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex gap-2 border-t border-border/60 p-3">
        {canPlay ? (
          <button
            type="button"
            onClick={onPlay}
            className="flex flex-1 items-center justify-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            {playing ? "Pausar" : "Escuchar"}
          </button>
        ) : null}
        <Link
          to="/acordes"
          search={{ songId: song.id }}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-background/50 px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          <Guitar className="h-4 w-4" /> Acordes
        </Link>
      </div>
    </article>
  );
}

/**
 * Unos renglones de la letra pasando de a uno, como si se estuvieran cantando: el renglón actual
 * se pinta de dorado de izquierda a derecha; arriba queda el anterior y abajo asoma el siguiente.
 */
function SingingLyrics({ lines }: { lines: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    if (lines.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % lines.length), LINE_MS);
    return () => clearInterval(id);
  }, [lines]);
  if (lines.length === 0) return null;

  const prev = lines.length > 1 ? lines[(index - 1 + lines.length) % lines.length] : null;
  const next = lines.length > 1 ? lines[(index + 1) % lines.length] : null;

  return (
    <div className="px-4 py-4 text-center" aria-label="Parte de la letra">
      <p className="truncate text-xs text-muted-foreground/60">{prev ?? " "}</p>
      {/* key: cambia el renglón → arranca de nuevo la animación */}
      <div
        key={index}
        className="relative my-1.5 animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
      >
        <p className="truncate font-display text-lg font-semibold text-foreground/35">
          {lines[index]}
        </p>
        <p
          aria-hidden="true"
          className="karaoke-fill absolute inset-0 truncate font-display text-lg font-semibold text-gradient-gold"
          style={{ animationDuration: `${LINE_MS - 300}ms` }}
        >
          {lines[index]}
        </p>
      </div>
      <p className="truncate text-xs text-muted-foreground/60">{next ?? " "}</p>
    </div>
  );
}
