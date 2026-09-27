/**
 * Cola del reproductor: qué canciones se recorren con siguiente/anterior y en qué orden.
 * Funciones puras (sin estado de React) para poder probarlas.
 */

export type QueueFilter = "todas" | "Alabanza" | "Adoración";

interface QueueSong {
  id: string;
  tipo: string;
  audioKey: string | null;
  youtubeVideoId?: string | null;
}

/** Canciones que se pueden reproducir (audio subido o video de YouTube), filtradas por tipo */
export function buildQueue<T extends QueueSong>(songs: T[], filter: QueueFilter): T[] {
  return songs.filter(
    (song) =>
      Boolean(song.audioKey || song.youtubeVideoId) && (filter === "todas" || song.tipo === filter),
  );
}

/**
 * La canción siguiente (offset 1) o anterior (-1) en la cola, dando la vuelta al llegar al final.
 * Si la actual no está en la cola (ej. se cambió el filtro), la siguiente es la primera.
 * En aleatorio, "siguiente" es cualquier otra de la cola (`random` inyectable para los tests);
 * "anterior" en aleatorio lo resuelve el historial del reproductor, no esta función.
 */
export function pickNext<T extends { id: string }>(
  queue: T[],
  currentId: string | null,
  offset: 1 | -1,
  shuffle = false,
  random: () => number = Math.random,
): T | null {
  if (queue.length === 0) return null;
  const index = queue.findIndex((song) => song.id === currentId);
  if (shuffle && offset === 1) {
    const others = queue.filter((song) => song.id !== currentId);
    if (others.length === 0) return queue[0]!;
    return others[Math.floor(random() * others.length)]!;
  }
  if (index === -1) return offset === 1 ? queue[0]! : queue[queue.length - 1]!;
  return queue[(index + offset + queue.length) % queue.length]!;
}
