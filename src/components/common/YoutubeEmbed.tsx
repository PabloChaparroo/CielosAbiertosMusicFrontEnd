import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useApp } from "@/hooks/useApp";
import { youtubeEmbedUrl } from "@/lib/youtube";

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

  // al abrir: si el reproductor de la app estaba sonando, se pausa
  useEffect(() => {
    if (!openedRef.current) {
      openedRef.current = true;
      if (isPlaying) toggle();
      return;
    }
    // ya abierto: si el reproductor de la app vuelve a sonar, se pausa el video
    if (isPlaying) {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
        "https://www.youtube.com",
      );
    }
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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Video de YouTube: ${title}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl animate-in zoom-in-95 fade-in duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar video"
            className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
          <iframe
            ref={iframeRef}
            src={youtubeEmbedUrl(videoId)}
            title={title}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>,
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
