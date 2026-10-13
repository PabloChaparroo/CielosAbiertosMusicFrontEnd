import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { canRotateScreen, toggleScreenOrientation } from "@/lib/screen-orientation";
import type { Song } from "@/types";

/**
 * Anterior/siguiente de una lista de canciones, para la pantalla completa de Letras y Acordes:
 * se cambia de canción sin salir. `songs` es null si no se entró desde una lista (sin botones).
 * `ListNav` suma además el botón para girar la pantalla.
 */
export function listNeighbors(
  songs: Song[] | null,
  currentId: string,
  select: (id: string) => void,
): { onPrev?: () => void; onNext?: () => void } {
  if (!songs) return {};
  const index = songs.findIndex((s) => s.id === currentId);
  const prev = index > 0 ? songs[index - 1] : undefined;
  const next = index >= 0 ? songs[index + 1] : undefined;
  return {
    ...(prev ? { onPrev: () => select(prev.id) } : {}),
    ...(next ? { onNext: () => select(next.id) } : {}),
  };
}

export function ListNav({
  onPrev,
  onNext,
  dark,
  className = "",
}: {
  onPrev?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
  /** fondo negro (modo En vivo de Acordes) */
  dark?: boolean;
  className?: string;
}) {
  // girar la pantalla (vertical ↔ horizontal), si el navegador lo permite
  const [canRotate] = useState(canRotateScreen);
  const [rotateFailed, setRotateFailed] = useState(false);
  const hasList = Boolean(onPrev || onNext);
  if (!hasList && !canRotate) return null;
  const btn = `rounded-full border p-2 transition-colors disabled:opacity-30 ${
    dark
      ? "border-white/20 text-white/70 hover:text-white"
      : "border-border bg-card text-muted-foreground hover:text-foreground"
  }`;
  return (
    <div className={`z-10 flex items-center gap-2 ${className}`}>
      {canRotate ? (
        <button
          type="button"
          onClick={() => void toggleScreenOrientation().then((ok) => setRotateFailed(!ok))}
          aria-label="Girar la pantalla"
          title={rotateFailed ? "Este navegador no deja girar la pantalla" : "Girar la pantalla"}
          className={btn}
        >
          <RotateCw className="h-5 w-5" />
        </button>
      ) : null}
      {hasList ? (
        <>
          <button
            type="button"
            onClick={onPrev}
            disabled={!onPrev}
            aria-label="Canción anterior de la lista"
            title="Canción anterior"
            className={btn}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!onNext}
            aria-label="Canción siguiente de la lista"
            title="Canción siguiente"
            className={btn}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}
    </div>
  );
}
