import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronUp,
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { AudioTracksService } from "@/features/canciones/services/audio-tracks.service";
import { SongLinksService } from "@/features/canciones/services/song-links.service";
import { YoutubeEmbed, YoutubeIcon } from "@/components/common/YoutubeEmbed";
import { parseYoutubeVideoId } from "@/lib/youtube";
import type { AudioTrack } from "@/features/canciones/types/audio-track";
import { useApp } from "@/hooks/useApp";
import { FADE_MS, fadeVolume } from "@/lib/fade";
import { Cover, FavButton, formatDuration } from "@/components/common/ui-bits";
import { StorageClient } from "@/lib/storage-client";
import { loadYoutubeApi } from "@/lib/youtube-api";
import { YoutubeStage, type YoutubeStageHandle } from "./YoutubeStage";
import { FullPlayer, type AudioOption } from "./FullPlayer";
import { RepeatControls } from "./RepeatControls";
import type { LoopRange } from "@/lib/time";
import { buildQueue, pickNext, type QueueFilter } from "@/lib/queue";

/** Evento para abrir "Pistas relacionadas" desde otra pantalla (ej. el título en Acordes, en celular) */
export const OPEN_RELATED_TRACKS_EVENT = "miniplayer:open-related";

export function MiniPlayer() {
  const { current, isPlaying, play, toggle, audioRef, songs } = useApp();
  const [expanded, setExpanded] = useState(false);
  // true mientras corre la animación de cierre (baja la pantalla y recién ahí se desmonta)
  const [closing, setClosing] = useState(false);
  const lastBackRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  // URL firmada del audio y de qué key es: al cambiar de canción el <audio> conserva la anterior
  // hasta que baja con el fundido (sacarle el src de golpe hacía un "crack")
  const [resolved, setResolved] = useState<{ key: string; url: string } | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [tracksOpen, setTracksOpen] = useState(false);
  // videos de YouTube: los links relacionados de la canción cuya URL es de YouTube
  const [videos, setVideos] = useState<Array<{ id: string; label: string; videoId: string }>>([]);
  const [openVideo, setOpenVideo] = useState<{ videoId: string; label: string } | null>(null);
  const [mainAudioKey, setMainAudioKey] = useState<string | null>(null);
  // Qué suena: si la canción tiene video de YouTube, YouTube (decisión de Pablo: YouTube antes
  // que el audio subido); "audio" = el usuario eligió el audio subido o una pista.
  const [source, setSource] = useState<"auto" | "audio">("auto");
  const [ytDuration, setYtDuration] = useState(0);
  const stageRef = useRef<YoutubeStageHandle | null>(null);
  // lugar de la portada en la pantalla completa: ahí se ubica el video
  const videoAnchorRef = useRef<HTMLDivElement | null>(null);
  // cola de la pantalla completa: qué tipo se sigue escuchando y si va en aleatorio
  const [filter, setFilter] = useState<QueueFilter>("todas");
  const [shuffle, setShuffle] = useState(false);
  // repetir la canción al terminar, y repetir un tramo (ej. un solo, para practicarlo)
  const [repeatOne, setRepeatOne] = useState(false);
  const [loop, setLoop] = useState<LoopRange | null>(null);
  const shuffleHistoryRef = useRef<string[]>([]);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentSongId = current?.id;
  const currentRef = useRef(current);
  currentRef.current = current;

  const ytId = current?.youtubeVideoId ?? null;
  const useYoutube = Boolean(ytId) && source === "auto";

  const activeTrack = tracks.find((track) => track.audioKey === current?.audioKey);
  const isMainAudio = Boolean(mainAudioKey && current?.audioKey === mainAudioKey);
  const activeAudioLabel = useYoutube
    ? undefined
    : isMainAudio
      ? current?.audioName || current?.title
      : activeTrack?.label;
  const localRef = useRef<HTMLAudioElement | null>(null);

  // `audioKey` es una key de S3/MinIO, no una URL reproducible — hay que
  // resolver una URL firmada de descarga cada vez que cambia la canción
  // actual. No se precachea al listar canciones (las URLs firmadas expiran
  // en 1h, y listar 21 canciones no debería disparar 21 pedidos que capaz
  // nunca se usan).
  useEffect(() => {
    setTracks([]);
    setVideos([]);
    setLoop(null);
    setSource("auto");
    setYtDuration(0);
    setTracksOpen(false);
    setMainAudioKey(currentRef.current?.audioKey ?? null);
    if (!currentSongId) return;
    AudioTracksService.listBySong(currentSongId)
      .then(setTracks)
      .catch(() => setTracks([]));
    SongLinksService.listBySong(currentSongId)
      .then((links) =>
        setVideos(
          links.flatMap((link) => {
            const videoId = parseYoutubeVideoId(link.url);
            return videoId ? [{ id: link.id, label: link.label, videoId }] : [];
          }),
        ),
      )
      .catch(() => setVideos([]));
  }, [currentSongId]);

  useEffect(() => {
    void loadYoutubeApi();
  }, []);

  useEffect(() => {
    const open = () => setTracksOpen(true);
    window.addEventListener(OPEN_RELATED_TRACKS_EVENT, open);
    return () => window.removeEventListener(OPEN_RELATED_TRACKS_EVENT, open);
  }, []);

  // otros videos de YouTube de la canción (el principal ya suena en el reproductor)
  const extraVideos = videos.filter((video) => video.videoId !== ytId);
  const hasRelated = tracks.length > 0 || extraVideos.length > 0 || Boolean(ytId);
  const openYoutube = (video: { videoId: string; label: string }) => {
    setTracksOpen(false);
    setOpenVideo(video);
  };

  useEffect(() => {
    setProgress(0);
    const key = current?.audioKey;
    if (!key) return;
    let cancelled = false;
    StorageClient.getDownloadUrl(key)
      .then((res) => {
        if (!cancelled) setResolved({ key, url: res.url });
      })
      .catch(() => {
        /* sin audio reproducible para esta canción; el <audio> sin src ya tolera esto */
      });
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.audioKey]);

  // play/pausa con un fundido corto (FADE_MS) en vez de cortar el sonido de golpe
  const fadeRef = useRef<(() => void) | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    const el = localRef.current;
    if (el && !fadeRef.current) el.volume = volume;
  }, [volume]);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    audioRef.current = el;
    const setVolume = (v: number) => (el.volume = Math.min(1, Math.max(0, v)));
    // el audio cargado es el de la canción actual (si no, todavía es el de la anterior)
    const ready = resolved !== null && resolved.key === current?.audioKey;
    if (isPlaying && ready && !useYoutube) {
      // si estaba bajando para pausar, se da vuelta desde donde quedó
      if (!el.paused && !fadeRef.current) return;
      fadeRef.current?.();
      if (el.paused) {
        el.volume = 0;
        void el.play().catch(() => undefined);
      }
      fadeRef.current = fadeVolume(el.volume, volumeRef.current, FADE_MS, setVolume, () => {
        fadeRef.current = null;
      });
    } else if (!el.paused) {
      fadeRef.current?.();
      fadeRef.current = fadeVolume(el.volume, 0, FADE_MS, setVolume, () => {
        el.pause();
        el.volume = volumeRef.current;
        fadeRef.current = null;
      });
    }
  }, [isPlaying, current, audioRef, resolved, useYoutube]);

  useEffect(() => () => fadeRef.current?.(), []);

  // controles comunes al audio y a YouTube
  const media = {
    time: () =>
      useYoutube ? (stageRef.current?.getTime() ?? 0) : (localRef.current?.currentTime ?? 0),
    duration: () =>
      (useYoutube ? stageRef.current?.getDuration() : localRef.current?.duration) ||
      current?.duration ||
      0,
    seek: (seconds: number) => {
      if (useYoutube) stageRef.current?.seek(seconds);
      else if (localRef.current) localRef.current.currentTime = seconds;
    },
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !current ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        toggle();
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const delta = event.key === "ArrowLeft" ? -5 : 5;
        const limit = media.duration();
        const next = Math.max(0, Math.min(limit, media.time() + delta));
        media.seek(next);
        setProgress(limit ? (next / limit) * 100 : 0);
        return;
      }

      if (event.key === "0" || event.key === "Home") {
        event.preventDefault();
        media.seek(0);
        setProgress(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // media depende de useYoutube (incluido)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, toggle, useYoutube]);

  const seekBy = (seconds: number) => {
    const limit = media.duration();
    const next = Math.max(0, Math.min(limit, media.time() + seconds));
    media.seek(next);
    setProgress(limit ? (next / limit) * 100 : 0);
  };

  const restart = () => {
    media.seek(0);
    setProgress(0);
  };

  // Siguiente / anterior: recorre la cola (solo las que se pueden reproducir, filtradas por tipo
  // en la pantalla completa: Todas / Alabanzas / Adoraciones), en orden o en aleatorio
  const queue = buildQueue(songs, filter);
  const playAt = (offset: 1 | -1) => {
    if (!current) return;
    // aleatorio: "anterior" vuelve a la que sonó antes (no a una al azar)
    if (offset === -1 && shuffle && shuffleHistoryRef.current.length) {
      const previousId = shuffleHistoryRef.current.pop();
      const previous = songs.find((s) => s.id === previousId);
      if (previous) {
        play(previous);
        return;
      }
    }
    const next = pickNext(queue, current.id, offset, shuffle);
    if (next && next.id !== current.id) {
      if (offset === 1)
        shuffleHistoryRef.current = [...shuffleHistoryRef.current, current.id].slice(-50);
      play(next);
    } else restart();
  };
  const playMedia = () => {
    if (useYoutube) stageRef.current?.play();
    else void localRef.current?.play().catch(() => undefined);
  };
  // al terminar: el tramo vuelve a empezar; "repetir" vuelve al principio; si no, sigue la cola
  const handleEnded = () => {
    if (loop) {
      media.seek(loop.start);
      playMedia();
    } else if (repeatOne) {
      media.seek(0);
      setProgress(0);
      playMedia();
    } else playAt(1);
  };
  // mientras suena: al llegar al final del tramo, vuelve al principio del tramo
  const keepInLoop = (time: number) => {
    if (loop && time >= loop.end) media.seek(loop.start);
  };
  // por ref: los eventos del audio y de YouTube llaman siempre a la versión de este render
  const playbackRef = useRef({ handleEnded, keepInLoop });
  playbackRef.current = { handleEnded, keepInLoop };

  // elegir un tramo: salta al principio del tramo y, si estaba en pausa, arranca
  const changeLoop = (next: LoopRange | null) => {
    setLoop(next);
    if (!next) return;
    media.seek(next.start);
    const limit = media.duration();
    setProgress(limit ? (next.start / limit) * 100 : 0);
    if (!isPlaying) toggle();
  };

  // "Atrás": un toque vuelve al principio del tema; dos toques seguidos van a la canción anterior
  const back = () => {
    const now = Date.now();
    if (now - lastBackRef.current < 1500) {
      lastBackRef.current = 0;
      playAt(-1);
      return;
    }
    lastBackRef.current = now;
    restart();
  };

  const seekTo = (value: number) => {
    setProgress(value);
    const limit = media.duration();
    if (limit) media.seek((value / 100) * limit);
  };

  const chooseAudio = (audioKey: string) => {
    setSource("audio");
    // play() con el mismo audio alterna play/pausa: si ya es el actual, solo se asegura que suene
    if (current?.audioKey === audioKey) {
      if (!isPlaying) toggle();
    } else {
      play({ ...current!, audioKey });
    }
  };
  const chooseYoutube = () => setSource("auto");

  // Tocar el tema (portada o nombre) abre el reproductor a pantalla completa (sube desde abajo)
  const openTitle = () => {
    setClosing(false);
    setExpanded(true);
  };
  const closeExpanded = () => {
    setClosing(true);
    window.setTimeout(() => {
      setExpanded(false);
      setClosing(false);
    }, 250);
  };

  // Escape cierra la pantalla completa
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeExpanded();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  // los mismos audios, para desplegarlos debajo del tema en la lista de la pantalla completa
  const fullAudioOptions: AudioOption[] = [
    ...(ytId
      ? [
          {
            key: "yt:main",
            label: "Video de YouTube",
            kind: "youtube" as const,
            active: useYoutube,
          },
        ]
      : []),
    ...(mainAudioKey && current
      ? [
          {
            key: mainAudioKey,
            label: current.audioName || `Original — ${current.title}`,
            kind: "audio" as const,
            active: isMainAudio && !useYoutube,
          },
        ]
      : []),
    ...tracks.map((track) => ({
      key: track.audioKey,
      label: track.label,
      kind: "audio" as const,
      active: !useYoutube && current?.audioKey === track.audioKey,
    })),
    ...extraVideos.map((video) => ({
      key: `yt:${video.id}`,
      label: `YouTube — ${video.label}`,
      kind: "youtube" as const,
      active: openVideo?.videoId === video.videoId,
    })),
  ];
  const chooseAudioOption = (key: string) => {
    const video = extraVideos.find((v) => `yt:${v.id}` === key);
    if (key === "yt:main") chooseYoutube();
    else if (video) openYoutube(video);
    else chooseAudio(key);
  };

  if (!current) return null;

  const duration = useYoutube && ytDuration ? ytDuration : current.duration;
  const seconds = (progress / 100) * duration;

  return (
    <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl lg:left-[272px]">
      <audio
        ref={localRef}
        src={resolved?.url}
        onEnded={() => playbackRef.current.handleEnded()}
        onTimeUpdate={(e) => {
          // la canción anterior todavía bajando: no mueve la barra de la nueva
          if (resolved?.key !== currentRef.current?.audioKey) return;
          const el = e.currentTarget;
          if (el.duration) setProgress((el.currentTime / el.duration) * 100);
          playbackRef.current.keepInLoop(el.currentTime);
        }}
      />
      {tracksOpen && hasRelated ? (
        // aparece subiendo desde el botón que lo abre
        <div className="absolute right-4 bottom-full mb-2 w-80 max-w-[calc(100vw-2rem)] origin-bottom-right rounded-2xl border border-border bg-card p-3 shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200">
          <p className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <ListMusic className="h-3.5 w-3.5" /> Pistas relacionadas
          </p>
          <div className="space-y-1">
            {ytId ? (
              <button
                type="button"
                onClick={() => {
                  chooseYoutube();
                  setTracksOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  useYoutube ? "bg-primary/15 text-primary" : "hover:bg-secondary"
                }`}
              >
                <YoutubeIcon />
                <span className="min-w-0 flex-1 truncate">Video de YouTube</span>
                {useYoutube ? <span className="text-xs">Activo</span> : null}
              </button>
            ) : null}
            {mainAudioKey ? (
              <button
                type="button"
                onClick={() => {
                  chooseAudio(mainAudioKey);
                  setTracksOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  isMainAudio && !useYoutube ? "bg-primary/15 text-primary" : "hover:bg-secondary"
                }`}
              >
                {isMainAudio && !useYoutube ? (
                  <Play className="h-3.5 w-3.5" />
                ) : (
                  <span className="w-3.5" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {current.audioName || current.title}
                </span>
                {isMainAudio && !useYoutube ? <span className="text-xs">Activo</span> : null}
              </button>
            ) : null}
            {tracks.map((track) => {
              const active = !useYoutube && current.audioKey === track.audioKey;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => {
                    chooseAudio(track.audioKey);
                    setTracksOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    active ? "bg-primary/15 text-primary" : "hover:bg-secondary"
                  }`}
                >
                  {active ? <Play className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
                  <span className="min-w-0 flex-1 truncate">{track.label}</span>
                  {active ? <span className="text-xs">Activo</span> : null}
                </button>
              );
            })}
            {extraVideos.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => openYoutube(video)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
              >
                <YoutubeIcon />
                <span className="min-w-0 flex-1 truncate">{video.label}</span>
                <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  YouTube
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <button
          type="button"
          onClick={openTitle}
          aria-label="Abrir reproductor"
          className="shrink-0"
        >
          <Cover song={current} size="sm" />
        </button>
        <button
          type="button"
          onClick={openTitle}
          className="min-w-0 w-40 cursor-pointer text-left sm:w-56"
          aria-label="Abrir reproductor a pantalla completa"
        >
          <p className="truncate text-sm font-semibold">{activeAudioLabel ?? current.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {activeAudioLabel && !isMainAudio
              ? `${current.title} · ${current.artist}`
              : current.artist}
          </p>
        </button>
        <FavButton songId={current.id} />
        {hasRelated ? (
          <button
            type="button"
            onClick={() => setTracksOpen((open) => !open)}
            aria-label={tracksOpen ? "Ocultar pistas relacionadas" : "Mostrar pistas relacionadas"}
            title="Pistas relacionadas"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
              tracksOpen
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-primary"
            }`}
          >
            {tracksOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        ) : null}

        <div className="hidden flex-1 items-center gap-3 sm:flex">
          <button
            onClick={() => seekBy(-5)}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            aria-label="Retroceder 5 segundos"
            title="Retroceder 5 segundos"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={toggle}
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
            className="flex h-10 w-10 items-center justify-center rounded-full gradient-gold text-primary-foreground transition-transform hover:scale-105"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <button
            onClick={() => seekBy(5)}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            aria-label="Avanzar 5 segundos"
            title="Avanzar 5 segundos"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <span className="w-10 text-right text-[11px] text-muted-foreground">
            {formatDuration(seconds)}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            aria-label="Progreso"
            onChange={(e) => seekTo(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
          />
          <span className="w-10 text-[11px] text-muted-foreground">{formatDuration(duration)}</span>
          <button
            type="button"
            onClick={restart}
            aria-label="Volver al inicio"
            title="Volver al inicio (0 o Home)"
            className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            0
          </button>
          <RepeatControls
            compact
            seconds={seconds}
            duration={duration}
            repeatOne={repeatOne}
            onRepeatOneChange={setRepeatOne}
            loop={loop}
            onLoopChange={changeLoop}
          />
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={100}
            value={volume * 100}
            aria-label="Volumen"
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
          />
        </div>

        <button
          onClick={toggle}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
          className="flex h-10 w-10 items-center justify-center rounded-full gradient-gold text-primary-foreground sm:hidden"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
      </div>

      {/* en un portal: el backdrop-blur de la barra encerraría al "fixed" dentro de ella */}
      {expanded
        ? createPortal(
            <FullPlayer
              current={current}
              isPlaying={isPlaying}
              closing={closing}
              onClose={closeExpanded}
              onToggle={toggle}
              onBack={back}
              onNext={() => playAt(1)}
              onPlaySong={(song) => play(song)}
              queue={queue}
              filter={filter}
              onFilterChange={setFilter}
              shuffle={shuffle}
              onShuffleChange={setShuffle}
              repeatOne={repeatOne}
              onRepeatOneChange={setRepeatOne}
              loop={loop}
              onLoopChange={changeLoop}
              progress={progress}
              seconds={seconds}
              duration={duration}
              onSeek={seekTo}
              volume={volume}
              onVolumeChange={setVolume}
              useYoutube={useYoutube}
              videoAnchorRef={videoAnchorRef}
              audioOptions={fullAudioOptions}
              onChooseAudio={chooseAudioOption}
              titleLabel={activeAudioLabel ?? current.title}
              subtitleLabel={
                activeAudioLabel && !isMainAudio
                  ? `${current.title} · ${current.artist}`
                  : current.artist
              }
            />,
            document.body,
          )
        : null}
      {useYoutube && ytId ? (
        <YoutubeStage
          ref={stageRef}
          videoId={ytId}
          title={current.title}
          playing={isPlaying}
          volume={volume}
          expanded={expanded && !closing}
          anchorRef={videoAnchorRef}
          onProgress={(time, total) => {
            if (total) {
              setYtDuration(Math.round(total));
              setProgress((time / total) * 100);
            }
            playbackRef.current.keepInLoop(time);
          }}
          onPlayingChange={(playing) => {
            // pausa/play desde los controles propios del video (o la X del flotante)
            if (playing !== isPlayingRef.current) toggle();
          }}
          onEnded={() => playbackRef.current.handleEnded()}
          onOpenFull={openTitle}
        />
      ) : null}
      {openVideo ? (
        <YoutubeEmbed
          videoId={openVideo.videoId}
          title={openVideo.label}
          onClose={() => setOpenVideo(null)}
        />
      ) : null}
    </div>
  );
}
