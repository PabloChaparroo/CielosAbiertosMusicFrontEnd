/** "3:45" → 225, "225" → 225, "1:02:05" → 3725; null si no es un tiempo válido */
export function parseTime(value: string): number | null {
  const text = value.trim();
  if (!/^\d+(?::[0-5]?\d){0,2}$/.test(text)) return null;
  return text.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

/** 225 → "3:45" (redondea hacia abajo) */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Tramo a repetir (en segundos) */
export interface LoopRange {
  start: number;
  end: number;
}

/**
 * Valida el tramo "desde"–"hasta" escrito por el usuario. Devuelve el tramo o el motivo por el
 * que no sirve (para mostrarlo tal cual).
 */
export function validateLoop(
  from: string,
  to: string,
  duration: number,
): { loop: LoopRange } | { error: string } {
  const start = parseTime(from);
  const end = parseTime(to);
  if (start === null || end === null) return { error: "Escribí los tiempos como 3:45" };
  if (end - start < 1) return { error: '"Hasta" tiene que ser después de "Desde"' };
  if (duration > 0 && start >= duration) return { error: '"Desde" pasa del final de la canción' };
  return { loop: { start, end: duration > 0 ? Math.min(end, duration) : end } };
}
