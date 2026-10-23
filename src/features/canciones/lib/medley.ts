import type { Song } from "@/types";
import { sequenceDuration } from "./sequence-duration";

/** Una alabanza de más de 10 minutos se considera enganchado (varios temas en un audio) */
export const MEDLEY_MIN_SECONDS = 10 * 60;

/**
 * Enganchado según la duración (pedido de Pablo): solo las alabanzas; las adoraciones nunca.
 * null = no se pudo medir (sin audio ni video con duración).
 */
export function medleyFromDuration(tipo: string, seconds: number | null): boolean | null {
  if (tipo === "Adoración") return false;
  if (seconds === null) return null;
  return seconds > MEDLEY_MIN_SECONDS;
}

/**
 * true/false si la canción ya lo tiene decidido (a mano o medido antes); si no, lo mide con la
 * duración de su secuencia (primer track, audio principal o, si no hay, YouTube). null si no se
 * puede saber.
 */
export async function resolveMedley(song: Song): Promise<boolean | null> {
  if (song.enganchado !== null) return song.enganchado;
  if (song.tipo === "Adoración") return false;
  return medleyFromDuration(song.tipo, await sequenceDuration(song));
}
