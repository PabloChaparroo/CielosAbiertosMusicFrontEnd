import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useApp } from "@/hooks/useApp";
import { Cover, FavButton, formatDuration } from "@/components/common/ui-bits";

export function MiniPlayer() {
  const { current, isPlaying, toggle, audioRef } = useApp();
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const localRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    audioRef.current = el;
    el.volume = volume;
    if (isPlaying) void el.play().catch(() => undefined);
    else el.pause();
  }, [isPlaying, current, volume, audioRef]);

  if (!current) return null;

  const duration = current.duration;
  const seconds = (progress / 100) * duration;

  return (
    <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl lg:left-[272px]">
      <audio
        ref={localRef}
        src={current.audioUrl}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress((el.currentTime / el.duration) * 100);
        }}
      />
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Cover song={current} size="sm" />
        <div className="min-w-0 w-40 sm:w-56">
          <p className="truncate text-sm font-semibold">{current.title}</p>
          <p className="truncate text-xs text-muted-foreground">{current.artist}</p>
        </div>
        <FavButton songId={current.id} />

        <div className="hidden flex-1 items-center gap-3 sm:flex">
          <button
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            aria-label="Anterior"
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
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            aria-label="Siguiente"
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
