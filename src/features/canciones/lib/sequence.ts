import type { Song } from "@/types";

/**
 * "Tiene secuencia" (criterio de Pablo): al menos un audio cargado, el principal o una pista.
 * Un link (YouTube, etc.) no cuenta. Solo estas canciones entran en las estadísticas, en las
 * listas de canciones y en las sugerencias.
 */
export function hasSequence(song: Pick<Song, "audioKey" | "trackCount">): boolean {
  return Boolean(song.audioKey) || song.trackCount > 0;
}
