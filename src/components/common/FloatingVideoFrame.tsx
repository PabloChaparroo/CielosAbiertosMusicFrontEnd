import type { ReactNode } from "react";
import { ChevronUp, GripHorizontal, Maximize2, Minimize2, X } from "lucide-react";
import { FLOAT_SMALL, floatLargeStyle, useFloatingWindow } from "@/hooks/useFloatingWindow";

/**
 * Ventanita flotante de un video de YouTube: chica por defecto, arrastrable desde su barra a
 * cualquier lugar de la pantalla (sin salirse), con botones para agrandarla/achicarla y cerrarla.
 * El video (children) se ve siempre en miniatura: nunca se tapa ni se oculta mientras suena.
 */
export function FloatingVideoFrame({
  title,
  onClose,
  closeLabel,
  onOpenPlayer,
  className = "",
  hidden = false,
  pinnedRect = null,
  children,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
  /** opcional: abrir el reproductor de la app a pantalla completa */
  onOpenPlayer?: () => void;
  className?: string;
  hidden?: boolean;
  /** si viene, la ventanita se clava sobre ese rectángulo, sin barra (pantalla completa del
   *  reproductor). La estructura no cambia, así el iframe de adentro no se vuelve a crear. */
  pinnedRect?: DOMRect | null;
  children: ReactNode;
}) {
  const { ref, positionStyle, handleProps, large, setLarge } = useFloatingWindow();
  const btn = "rounded-full p-1.5 text-white/80 hover:bg-white/15 hover:text-white";

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Video de YouTube: ${title}`}
      className={`fixed flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl ${
        hidden ? "pointer-events-none invisible" : ""
      } ${className}`}
      style={
        pinnedRect
          ? {
              top: pinnedRect.top,
              left: pinnedRect.left,
              width: pinnedRect.width,
              height: pinnedRect.height,
            }
          : positionStyle
      }
    >
      {/* la zona de arrastre (grip + título) va separada de los botones: con touch-action: none
          sobre los botones, el celular a veces no convertía el toque en click.
          w-0 + min-w-full: la barra toma el ancho del video y no al revés; si no, un título largo
          ensanchaba la ventanita y quedaba una franja negra a la derecha del video */}
      <div
        className={`${pinnedRect ? "hidden" : "flex"} w-0 min-w-full items-center gap-1 bg-neutral-900 py-1 pr-1 text-white`}
      >
        <div
          {...handleProps}
          data-drag-handle
          className="flex min-w-0 flex-1 cursor-grab items-center gap-1 self-stretch pl-2 select-none active:cursor-grabbing"
        >
          <GripHorizontal className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-white/85">{title}</p>
        </div>
        {onOpenPlayer ? (
          <button
            type="button"
            onClick={onOpenPlayer}
            aria-label="Abrir el reproductor"
            title="Abrir el reproductor"
            className={btn}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setLarge(!large)}
          aria-label={large ? "Achicar el video" : "Agrandar el video"}
          title={large ? "Achicar" : "Agrandar"}
          className={btn}
        >
          {large ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          title="Cerrar"
          className={btn}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div
        className={pinnedRect ? "h-full w-full" : "relative overflow-hidden"}
        style={pinnedRect ? undefined : large ? floatLargeStyle : FLOAT_SMALL}
      >
        {/* chica: el video 16:9 cubre el cuadrado recortando los costados, sin franjas negras
            arriba y abajo (el iframe mide 356×200, sigue cumpliendo el mínimo de YouTube). Siempre
            el mismo div, solo cambian las clases: así el iframe no se vuelve a crear */}
        <div
          className={
            pinnedRect || large
              ? "h-full w-full"
              : "absolute inset-y-0 left-1/2 aspect-video h-full -translate-x-1/2"
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
