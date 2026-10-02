import { useRef, type TouchEvent } from "react";

const distance = (e: TouchEvent) => {
  const [a, b] = [e.touches[0]!, e.touches[1]!];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
};

/**
 * Zoom con dos dedos (pellizco) que cambia el tamaño de letra en vez de agrandar la página:
 * el texto se reacomoda y sigue entrando a lo ancho. Con un dedo se desplaza normal.
 */
export function usePinchZoom(
  size: number,
  onChange: (size: number) => void,
  min: number,
  max: number,
) {
  const start = useRef<{ dist: number; size: number } | null>(null);
  return {
    // el navegador no hace su propio zoom: solo deja desplazar
    style: { touchAction: "pan-x pan-y" } as const,
    onTouchStart: (e: TouchEvent) => {
      if (e.touches.length === 2) start.current = { dist: distance(e), size };
    },
    onTouchMove: (e: TouchEvent) => {
      if (e.touches.length !== 2 || !start.current) return;
      const next = Math.round(start.current.size * (distance(e) / start.current.dist));
      const clamped = Math.max(min, Math.min(max, next));
      if (clamped !== size) onChange(clamped);
    },
    onTouchEnd: (e: TouchEvent) => {
      if (e.touches.length < 2) start.current = null;
    },
  };
}
