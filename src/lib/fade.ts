/** Duración del fundido al dar play/pausa: corto, para que no corte de golpe pero sin demora */
export const FADE_MS = 250;

/**
 * Lleva el volumen de `from` a `to` en `ms` (cuadro a cuadro), llamando a `apply` con cada valor;
 * al terminar llama a `done`. Devuelve una función que corta el fundido donde esté (sin `done`).
 */
export function fadeVolume(
  from: number,
  to: number,
  ms: number,
  apply: (volume: number) => void,
  done?: () => void,
): () => void {
  const start = performance.now();
  let frame = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    apply(from + (to - from) * t);
    if (t < 1) frame = requestAnimationFrame(step);
    else done?.();
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}
