import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ExternalLink,
  Guitar,
  Layers,
  MessageSquareText,
  Music2,
  Pause,
  Play,
  Rocket,
} from "lucide-react";
import { Cover } from "@/components/common/ui-bits";
import { YoutubeIcon } from "@/components/common/YoutubeEmbed";
import { useApp } from "@/hooks/useApp";
import { displayLyricsLines, isChartMarker, parseChordPro } from "@/lib/chords";
import { parseYoutubeVideoId } from "@/lib/youtube";
import { AnnotationsService } from "@/features/canciones/services/annotations.service";
import { AudioTracksService } from "@/features/canciones/services/audio-tracks.service";
import { SongLinksService } from "@/features/canciones/services/song-links.service";
import type { AudioTrack } from "@/features/canciones/types/audio-track";
import type { SongLink } from "@/features/canciones/types/song-link";
import type { Annotation, Song } from "@/types";

/** "8 de octubre": desde cuándo está marcada */
const markedSince = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long" }) : null;

/** Las primeras líneas de letra (sin secciones ni acordes) */
const lyricsPreview = (chordpro: string, lines = 4) =>
  displayLyricsLines(chordpro)
    .filter((l) => l.kind === "text" && l.value.trim())
    .slice(0, lines)
    .map((l) => l.value);

/** Acordes de la canción, en el orden en que aparecen y sin repetir */
const songChords = (chordpro: string, key: string) => {
  const seen = new Set<string>();
  for (const line of parseChordPro(chordpro, 0, key)) {
    if (line.kind !== "line") continue;
    for (const pair of line.pairs) {
      const chord = pair.chord.trim();
      if (chord && chord !== "%" && !isChartMarker(chord)) seen.add(chord);
    }
  }
  return [...seen];
};

/**
 * Canciones "próximas a sacar", destacadas en Inicio. Tarjeta compacta: portada chica, datos y
 * botones arriba; abajo, lo que el equipo necesita para prepararla (letra, acordes, notas del
 * equipo, links y pistas). En celular (donde más se usa) se pasan deslizando de costado si son
 * varias; en compu, una debajo de otra. No se muestra si no hay ninguna.
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

      {/* celular: carrusel con snap (la siguiente asoma); compu: una debajo de otra */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-col lg:snap-none lg:overflow-visible lg:px-0">
        {songs.map((song) => (
          <ProximaCard key={song.id} song={song} single={single} />
        ))}
      </div>
    </section>
  );
}

function ProximaCard({ song, single }: { song: Song; single: boolean }) {
  const { play, toggle, current, isPlaying, users } = useApp();
  const playing = current?.id === song.id && isPlaying;
  const since = markedSince(song.proximaDesde);
  const lyrics = useMemo(() => lyricsPreview(song.chordpro), [song.chordpro]);
  const chords = useMemo(() => songChords(song.chordpro, song.key), [song.chordpro, song.key]);

  // lo de la canción que no viene en la lista: se pide al mostrar la tarjeta. Si no hay permiso
  // (ej. un invitado), ese bloque simplemente no aparece
  const [notes, setNotes] = useState<Annotation[]>([]);
  const [links, setLinks] = useState<SongLink[]>([]);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  useEffect(() => {
    AnnotationsService.listBySong(song.id)
      .then(setNotes)
      .catch(() => setNotes([]));
    SongLinksService.listBySong(song.id)
      .then(setLinks)
      .catch(() => setLinks([]));
    AudioTracksService.listBySong(song.id)
      .then(setTracks)
      .catch(() => setTracks([]));
  }, [song.id]);

  const latestNotes = [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 2);
  const canPlay = Boolean(song.audioKey || song.youtubeVideoId);

  return (
    <article
      className={`relative shrink-0 snap-center overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-[0_0_40px_-16px] shadow-primary/40 ${
        single ? "w-full" : "w-[88%] sm:w-[70%] lg:w-full"
      }`}
    >
      {/* brillo dorado de fondo, sutil */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />

      {/* encabezado compacto: portada chica + datos + botones */}
      <div className="relative flex gap-4 p-4 sm:items-center sm:p-5">
        <Cover
          song={song}
          size="lg"
          className="h-20 w-20 shrink-0 rounded-2xl shadow-none sm:h-24 sm:w-24"
        />
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Próxima a sacar
          </span>
          <h3 className="mt-1 truncate font-display text-lg leading-tight font-bold sm:text-xl">
            {song.title}
          </h3>
          <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            Tono <span className="font-semibold text-foreground">{song.key}</span> · {song.compas} ·{" "}
            {song.bpm} BPM{since ? <> · desde el {since}</> : null}
          </p>
        </div>
        {/* en compu, los botones a la derecha */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <Actions
            song={song}
            canPlay={canPlay}
            playing={playing}
            onPlay={() => (current?.id === song.id ? toggle() : play(song))}
          />
        </div>
      </div>
      {/* en celular, los botones debajo del encabezado, de ancho completo */}
      <div className="relative -mt-1 flex gap-2 px-4 pb-3 sm:hidden">
        <Actions
          song={song}
          canPlay={canPlay}
          playing={playing}
          onPlay={() => (current?.id === song.id ? toggle() : play(song))}
        />
      </div>

      {/* lo que hay que preparar */}
      <div className="relative grid gap-px border-t border-border/60 bg-border/60 sm:grid-cols-2 xl:grid-cols-4">
        {lyrics.length ? (
          <Panel icon={<Music2 className="h-3.5 w-3.5" />} title="Letra">
            <p className="line-clamp-4 text-sm leading-relaxed whitespace-pre-line text-foreground/85 italic">
              {lyrics.join("\n")}
            </p>
          </Panel>
        ) : null}

        {chords.length ? (
          <Panel icon={<Guitar className="h-3.5 w-3.5" />} title={`Acordes en ${song.key}`}>
            <div className="flex flex-wrap gap-1.5">
              {chords.slice(0, 12).map((chord) => (
                <span
                  key={chord}
                  className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary"
                >
                  {chord}
                </span>
              ))}
              {chords.length > 12 ? (
                <span className="px-1 text-xs text-muted-foreground">+{chords.length - 12}</span>
              ) : null}
            </div>
          </Panel>
        ) : null}

        {latestNotes.length ? (
          <Panel
            icon={<MessageSquareText className="h-3.5 w-3.5" />}
            title={notes.length > 2 ? `Notas del equipo (${notes.length})` : "Notas del equipo"}
          >
            <ul className="space-y-2">
              {latestNotes.map((note) => (
                <li key={note.id} className="text-sm">
                  <span className="line-clamp-2 text-foreground/85">{note.text}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {users.find((u) => u.id === note.authorId)?.name ?? "Equipo"}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {links.length || tracks.length ? (
          <Panel icon={<Layers className="h-3.5 w-3.5" />} title="Links y pistas">
            <div className="flex flex-wrap gap-1.5">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {parseYoutubeVideoId(link.url) ? (
                    <YoutubeIcon />
                  ) : (
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">{link.label}</span>
                </a>
              ))}
              {tracks.map((track) => (
                <span
                  key={track.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs text-foreground/85"
                >
                  <Layers className="h-3 w-3 shrink-0 text-primary" />
                  <span className="truncate">{track.label}</span>
                </span>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>
    </article>
  );
}

function Actions({
  song,
  canPlay,
  playing,
  onPlay,
}: {
  song: Song;
  canPlay: boolean;
  playing: boolean;
  onPlay: () => void;
}) {
  return (
    <>
      {canPlay ? (
        <button
          type="button"
          onClick={onPlay}
          className="flex flex-1 items-center justify-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95 sm:flex-none"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          {playing ? "Pausar" : "Escuchar"}
        </button>
      ) : null}
      <Link
        to="/acordes"
        search={{ songId: song.id }}
        className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-background/50 px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary sm:flex-none"
      >
        <Guitar className="h-4 w-4" /> Acordes
      </Link>
    </>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 bg-card p-4">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        <span className="text-primary">{icon}</span> {title}
      </p>
      {children}
    </div>
  );
}
