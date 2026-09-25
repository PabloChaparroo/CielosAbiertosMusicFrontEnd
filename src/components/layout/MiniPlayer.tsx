import { useEffect, useRef, useState } from "react";
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
import type { AudioTrack } from "@/features/canciones/types/audio-track";
import { useApp } from "@/hooks/useApp";
import { Cover, FavButton, formatDuration } from "@/components/common/ui-bits";
import { StorageClient } from "@/lib/storage-client";

export function MiniPlayer() {
  const { current, isPlaying, play, toggle, audioRef } = useApp();
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [tracksOpen, setTracksOpen] = useState(false);
  const [mainAudioKey, setMainAudioKey] = useState<string | null>(null);
  const currentSongId = current?.id;
  const currentRef = useRef(current);
  currentRef.current = current;

  const activeTrack = tracks.find((track) => track.audioKey === current?.audioKey);
  const isMainAudio = Boolean(mainAudioKey && current?.audioKey === mainAudioKey);
  const activeAudioLabel = isMainAudio ? current?.title : activeTrack?.label;
  const localRef = useRef<HTMLAudioElement | null>(null);

  // `audioKey` es una key de S3/MinIO, no una URL reproducible — hay que
  // resolver una URL firmada de descarga cada vez que cambia la canción
  // actual. No se precachea al listar canciones (las URLs firmadas expiran
  // en 1h, y listar 21 canciones no debería disparar 21 pedidos que capaz
  // nunca se usan).
  useEffect(() => {
    setTracks([]);
    setTracksOpen(false);
    setMainAudioKey(currentRef.current?.audioKey ?? null);
    if (!currentSongId) return;
    AudioTracksService.listBySong(currentSongId)
      .then(setTracks)
      .catch(() => setTracks([]));
  }, [currentSongId]);

  useEffect(() => {
    setResolvedUrl(null);
    setProgress(0);
    if (!current?.audioKey) return;
    let cancelled = false;
    StorageClient.getDownloadUrl(current.audioKey)
      .then((res) => {
        if (!cancelled) setResolvedUrl(res.url);
      })
      .catch(() => {
        /* sin audio reproducible para esta canción; el <audio> sin src ya tolera esto */
      });
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.audioKey]);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    audioRef.current = el;
    el.volume = volume;
    if (isPlaying && resolvedUrl) void el.play().catch(() => undefined);
    else el.pause();
  }, [isPlaying, current, volume, audioRef, resolvedUrl]);

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

      const el = localRef.current;
      if (!el) return;

      if (event.code === "Space") {
        event.preventDefault();
        toggle();
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const delta = event.key === "ArrowLeft" ? -5 : 5;
        const limit = el.duration || current.duration;
        el.currentTime = Math.max(0, Math.min(limit, el.currentTime + delta));
        setProgress(limit ? (el.currentTime / limit) * 100 : 0);
        return;
      }

      if (event.key === "0" || event.key === "Home") {
        event.preventDefault();
        el.currentTime = 0;
        setProgress(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current, toggle]);

  const seekBy = (seconds: number) => {
    const el = localRef.current;
    if (!el) return;
    const limit = el.duration || current?.duration || 0;
    el.currentTime = Math.max(0, Math.min(limit, el.currentTime + seconds));
    setProgress(limit ? (el.currentTime / limit) * 100 : 0);
  };

  const restart = () => {
    const el = localRef.current;
    if (!el) return;
    el.currentTime = 0;
    setProgress(0);
  };

  if (!current) return null;

  const duration = current.duration;
  const seconds = (progress / 100) * duration;

  return (
    <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl lg:left-[272px]">
      <audio
        ref={localRef}
        src={resolvedUrl ?? undefined}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress((el.currentTime / el.duration) * 100);
        }}
      />
      {tracksOpen && tracks.length > 0 ? (
        <div className="absolute right-4 bottom-full mb-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-3 shadow-2xl">
          <p className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <ListMusic className="h-3.5 w-3.5" /> Pistas relacionadas
          </p>
          <div className="space-y-1">
            {mainAudioKey ? (
              <button
                type="button"
                onClick={() => {
                  play({ ...current, audioKey: mainAudioKey });
                  setTracksOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  isMainAudio ? "bg-primary/15 text-primary" : "hover:bg-secondary"
                }`}
              >
                {isMainAudio ? <Play className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
                <span className="min-w-0 flex-1 truncate">{current.title}</span>
                {isMainAudio ? <span className="text-xs">Activo</span> : null}
              </button>
            ) : null}
            {tracks.map((track) => {
              const active = current.audioKey === track.audioKey;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => {
                    play({ ...current, audioKey: track.audioKey });
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
          </div>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Cover song={current} size="sm" />
        <button
          type="button"
          onClick={() => {
            if (!isPlaying) toggle();
          }}
          className="min-w-0 w-40 cursor-pointer text-left sm:w-56"
          aria-label="Reproducir canción actual"
        >
          <p className="truncate text-sm font-semibold">{activeAudioLabel ?? current.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {activeAudioLabel ? `${current.title} · ${current.artist}` : current.artist}
          </p>
        </button>
        <FavButton songId={current.id} />
        {tracks.length > 0 ? (
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
            onChange={(e) => {
              const v = Number(e.target.value);
              setProgress(v);
              const el = localRef.current;
              if (el?.duration) el.currentTime = (v / 100) * el.duration;
            }}
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
    </div>
  );
}
