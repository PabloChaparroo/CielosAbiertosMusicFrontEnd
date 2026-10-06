import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { FADE_MS, fadeVolume } from "@/lib/fade";
import { FloatingVideoFrame } from "@/components/common/FloatingVideoFrame";
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
  /** reanuda (para volver a empezar al repetir, aunque el video ya haya terminado) */
  play(): void;
  getTime(): number;
  getDuration(): number;
}

export const YoutubeStage = forwardRef<
  YoutubeStageHandle,
  {
    videoId: string;
    /** para la barra de la ventanita flotante */
    title: string;
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
    title,
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
    play: () => playerRef.current?.playVideo(),
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

  // play/pausa con un fundido corto (FADE_MS), igual que el audio
  const fadeRef = useRef<(() => void) | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  // volumen puesto ahora en el reproductor (0–1): de ahí arranca el fundido
  const appliedRef = useRef(volume);

  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player) return;
    const setVolume = (v: number) => {
      appliedRef.current = v;
      player.setVolume(Math.round(v * 100));
    };
    // si estaba en medio de un fundido, se da vuelta desde donde quedó
    const midFade = fadeRef.current !== null;
    fadeRef.current?.();
    if (playing) {
      if (!midFade) setVolume(0);
      player.playVideo();
      fadeRef.current = fadeVolume(
        appliedRef.current,
        volumeRef.current,
        FADE_MS,
        setVolume,
        () => {
          fadeRef.current = null;
        },
      );
    } else {
      fadeRef.current = fadeVolume(appliedRef.current, 0, FADE_MS, setVolume, () => {
        player.pauseVideo();
        setVolume(volumeRef.current);
        fadeRef.current = null;
      });
    }
  }, [playing, ready]);

  useEffect(() => {
    if (!ready || fadeRef.current) return;
    appliedRef.current = volume;
    playerRef.current?.setVolume(Math.round(volume * 100));
  }, [volume, ready]);

  useEffect(() => () => fadeRef.current?.(), []);

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

  // flotante en z-35: arriba del contenido y del encabezado (z-30), pero debajo de la barra del
  // reproductor y su panel de pistas (z-40), para no taparlo; en pantalla completa, arriba (z-55).
  // Siempre el mismo FloatingVideoFrame (flotante arrastrable o clavado sobre la portada): el
  // iframe no se vuelve a crear al abrir o cerrar la pantalla completa.
  return createPortal(
    <FloatingVideoFrame
      title={title}
      closeLabel="Pausar y cerrar el video"
      onClose={() => cb.current.onPlayingChange(false)}
      onOpenPlayer={onOpenFull}
      hidden={!visible}
      pinnedRect={expanded ? rect : null}
      className={expanded ? "z-[55] rounded-2xl border-0" : "z-[35]"}
    >
      <div ref={hostRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
    </FloatingVideoFrame>,
    document.body,
  );
});
