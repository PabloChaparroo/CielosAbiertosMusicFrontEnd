import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FloatingVideoFrame } from "./FloatingVideoFrame";
import { useApp } from "@/hooks/useApp";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { announcePlaying, onOtherPlaying } from "@/lib/exclusive-audio";

/**
 * Video de YouTube embebido dentro de la app, con el reproductor oficial (sus propios controles).
 * Nunca se descarga ni se procesa el audio: es solo el iframe de youtube.com/embed.
 *
 * Un solo audio a la vez: al abrirse pausa el reproductor de la app, y si después se le da play
 * al reproductor, se le pide al video que se pause (API oficial del iframe, por postMessage).
 */
export function YoutubeEmbed({
  videoId,
  title,
  onClose,
}: {
  videoId: string;
  title: string;
  onClose: () => void;
}) {
  const { isPlaying, toggle } = useApp();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const openedRef = useRef(false);

  const pauseVideo = () =>
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
      "https://www.youtube.com",
    );

  // si arranca una pista subida (AudioTracksModal), se pausa el video
  useEffect(() => onOtherPlaying("youtube-extra", pauseVideo), []);

  // al abrir: si el reproductor de la app o una pista subida estaban sonando, se pausan
  useEffect(() => {
    if (!openedRef.current) {
      openedRef.current = true;
      if (isPlaying) toggle();
      announcePlaying("youtube-extra");
      return;
    }
    // ya abierto: si el reproductor de la app vuelve a sonar, se pausa el video
    if (isPlaying) pauseVideo();
    // toggle es estable a los fines de este efecto; solo interesa el cambio de isPlaying
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ventanita flotante chica y arrastrable (no un modal): no tapa la letra ni los acordes
  return createPortal(
    <FloatingVideoFrame
      title={title}
      closeLabel="Cerrar video"
      onClose={onClose}
      className="z-[36]"
    >
      <iframe
        ref={iframeRef}
        src={youtubeEmbedUrl(videoId)}
        title={title}
        className="h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </FloatingVideoFrame>,
    document.body,
  );
}

/** Ícono de YouTube (logo simplificado, rojo), para distinguir los videos de los audios */
export function YoutubeIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#FF0000" />
      <path d="M10 8.8v6.4l5.6-3.2z" fill="#fff" />
    </svg>
  );
}
