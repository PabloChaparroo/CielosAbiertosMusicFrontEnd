import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { loadYoutubeApi, YT_ENDED, YT_PAUSED, YT_PLAYING, type YTPlayer } from "@/lib/youtube-api";

/**
 * Reproductor principal con YouTube: el reproductor OFICIAL de YouTube (IFrame Player API),
 * manejado por los controles de la app (play/pausa, progreso, volumen, atrás/siguiente).
 * Nunca se descarga ni se procesa el audio.
 *
 * Las reglas de YouTube piden que el reproductor se vea mientras suena (no se puede usar oculto
 * para escuchar solo el audio): en la barra aparece como video flotante, y en la pantalla
 * completa ocupa el lugar de la portada (`anchorRef`). Es siempre el mismo iframe — solo cambia
 * de lugar —, así el video no se reinicia al abrir o cerrar la pantalla completa.
 */

export interface YoutubeStageHandle {
  seek(seconds: number): void;
  getTime(): number;
  getDuration(): number;
}

export const YoutubeStage = forwardRef<
  YoutubeStageHandle,
  {
    videoId: string;
    playing: boolean;
    /** 0–1, igual que el volumen del audio */
    volume: number;
    /** true = pantalla completa: el video se ubica sobre `anchorRef` */
    expanded: boolean;
    anchorRef: RefObject<HTMLElement | null>;
    onProgress: (seconds: number, duration: number) => void;
    /** el usuario pausó/reprodujo desde los controles propios del video */
    onPlayingChange: (playing: boolean) => void;
    onEnded: () => void;
    onOpenFull: () => void;
  }
>(function YoutubeStage(
  {
    videoId,
    playing,
    volume,
    expanded,
    anchorRef,
    onProgress,
    onPlayingChange,
    onEnded,
    onOpenFull,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  // callbacks siempre actuales, sin recrear el reproductor
  const cb = useRef({ onProgress, onPlayingChange, onEnded });
  cb.current = { onProgress, onPlayingChange, onEnded };
  const loadedVideoRef = useRef(videoId);
  // mientras carga un video nuevo, YouTube emite "pausado" por el cambio: no es el usuario pausando
  const switchingRef = useRef(false);

  useImperativeHandle(ref, () => ({
    seek: (seconds) => playerRef.current?.seekTo(seconds, true),
    getTime: () => playerRef.current?.getCurrentTime() ?? 0,
    getDuration: () => playerRef.current?.getDuration() ?? 0,
  }));

  // crea el reproductor una sola vez; el iframe va en un div propio (YouTube lo reemplaza)
  useEffect(() => {
    let cancelled = false;
    const target = document.createElement("div");
    hostRef.current?.appendChild(target);
    void loadYoutubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(target, {
        videoId: loadedVideoRef.current,
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            if (e.data === YT_PLAYING) {
              switchingRef.current = false;
              cb.current.onPlayingChange(true);
            } else if (e.data === YT_PAUSED && !switchingRef.current) {
              cb.current.onPlayingChange(false);
            } else if (e.data === YT_ENDED) cb.current.onEnded();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  // cambio de canción: carga el video nuevo (arranca solo si estaba sonando)
  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player || loadedVideoRef.current === videoId) return;
    loadedVideoRef.current = videoId;
    switchingRef.current = playing;
    if (playing) player.loadVideoById(videoId);
    else player.cueVideoById(videoId);
    // solo interesa el cambio de video
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, ready]);

  useEffect(() => {
    if (!ready) return;
    if (playing) playerRef.current?.playVideo();
    else playerRef.current?.pauseVideo();
  }, [playing, ready]);

  useEffect(() => {
    if (ready) playerRef.current?.setVolume(Math.round(volume * 100));
  }, [volume, ready]);

  // progreso para la barra de la app
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (player) cb.current.onProgress(player.getCurrentTime(), player.getDuration());
    }, 250);
    return () => window.clearInterval(id);
  }, [ready]);

  // pantalla completa: sigue el lugar de la portada (también durante la animación de subida)
  useEffect(() => {
    if (!expanded) {
      setRect(null);
      return;
    }
    let frame = 0;
    const follow = () => {
      const el = anchorRef.current;
      if (el) setRect(el.getBoundingClientRect());
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [expanded, anchorRef]);

  // flotante solo mientras suena (pausado no hace falta que se vea); en pantalla completa, siempre
  const visible = expanded ? rect !== null : playing;
  const style: React.CSSProperties =
    expanded && rect
      ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      : { right: 16, bottom: 96, width: "min(356px, calc(100vw - 32px))", aspectRatio: "16 / 9" };

  return createPortal(
    <div
      className={`group fixed overflow-hidden rounded-2xl bg-black shadow-2xl ${
        expanded ? "z-[55]" : "z-[45]"
      } ${visible ? "" : "pointer-events-none invisible"}`}
      style={style}
      aria-label="Video de YouTube"
    >
      <div ref={hostRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
      {!expanded ? (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
          <button
            type="button"
            onClick={onOpenFull}
            aria-label="Abrir reproductor a pantalla completa"
            className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => cb.current.onPlayingChange(false)}
            aria-label="Pausar y ocultar el video"
            className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  );
});
