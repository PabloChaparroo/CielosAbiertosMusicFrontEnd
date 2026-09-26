import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Ventanita flotante arrastrable (los videos de YouTube): se arrastra desde su barra con Pointer
 * Events (mouse, touch y lápiz con el mismo código, sin biblioteca) y nunca sale de la pantalla.
 *
 * La posición se recuerda mientras la app está abierta (compartida por todas las ventanitas: se
 * vuelve a abrir donde se dejó la última) y se resetea al recargar la página — igual que el video,
 * que al recargar también se corta.
 */

export interface Point {
  x: number;
  y: number;
}

/** Margen mínimo contra los bordes de la pantalla */
export const FLOAT_MARGIN = 8;

/** Encierra la ventanita (esquina superior izquierda `pos`, tamaño `size`) dentro de la pantalla */
export function clampToViewport(
  pos: Point,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = FLOAT_MARGIN,
): Point {
  const maxX = viewport.width - size.width - margin;
  const maxY = viewport.height - size.height - margin;
  return {
    x: Math.round(Math.max(margin, Math.min(pos.x, maxX))),
    y: Math.round(Math.max(margin, Math.min(pos.y, maxY))),
  };
}

let lastPosition: Point | null = null;
let lastLarge = false;

export function useFloatingWindow() {
  const ref = useRef<HTMLDivElement | null>(null);
  // null = lugar por defecto (abajo a la derecha, arriba de la barra del reproductor)
  const [pos, setPos] = useState<Point | null>(lastPosition);
  const [large, setLargeState] = useState(lastLarge);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);

  const clampNow = useCallback((next: Point) => {
    const el = ref.current;
    if (!el) return next;
    return clampToViewport(
      next,
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );
  }, []);

  const place = useCallback(
    (next: Point) => {
      const clamped = clampNow(next);
      lastPosition = clamped;
      setPos(clamped);
    },
    [clampNow],
  );

  // al cambiar de tamaño (de la ventanita o de la pantalla, ej. girar el celular) sigue adentro
  useLayoutEffect(() => {
    if (pos) place(pos);
    // solo al cambiar el tamaño de la ventanita
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [large]);
  useEffect(() => {
    const onResize = () => {
      if (lastPosition) place(lastPosition);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [place]);

  const setLarge = (value: boolean) => {
    lastLarge = value;
    setLargeState(value);
  };

  // se engancha a la barra de la ventanita; los botones de la barra no arrastran
  const handleProps = {
    style: { touchAction: "none" } as React.CSSProperties,
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).closest("button") || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      drag.current = {
        id: event.pointerId,
        dx: event.clientX - rect.left,
        dy: event.clientY - rect.top,
      };
      // la captura hace que el arrastre siga aunque el dedo pase por encima del iframe del video
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || d.id !== event.pointerId) return;
      place({ x: event.clientX - d.dx, y: event.clientY - d.dy });
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      if (drag.current?.id === event.pointerId) drag.current = null;
    },
    onPointerCancel: () => {
      drag.current = null;
    },
    // si el navegador suelta la captura por su cuenta, el arrastre termina ahí (no queda "pegado")
    onLostPointerCapture: () => {
      drag.current = null;
    },
  };

  const positionStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { right: 16, bottom: 96 };

  return { ref, positionStyle, handleProps, large, setLarge };
}

/**
 * Tamaños: YouTube exige que el reproductor embebido mida al menos 200×200px, así que el chico es
 * 260×200 (el video queda con franjas negras arriba y abajo); el grande, 16:9 hasta 640px de ancho.
 */
export const FLOAT_SMALL = { width: 260, height: 200 };
export const floatLargeStyle: React.CSSProperties = {
  width: "min(640px, calc(100vw - 16px))",
  aspectRatio: "16 / 9",
  minHeight: 200,
};
