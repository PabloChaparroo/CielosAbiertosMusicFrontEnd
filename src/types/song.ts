/**
 * Tema de una canción. El catálogo vive en el backend (GET /tags) y crece con migraciones —
 * ya no es una lista fija en el frontend.
 */
export type Tag = string;

export interface Song {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: number;
  compas: string;
  duration: number; // seconds
  tags: Tag[];
  /** Tipo de canción (GET /tipos-cancion): id y nombre ("Alabanza" = rápida, "Adoración" = lenta) */
  tipoId: string;
  /** Cantidad de pistas relacionadas (secuencia / multitracks). 0 = sin secuencia */
  trackCount: number;
  tipo: string;
  cover: string; // css gradient — placeholder mientras no haya portada real (coverKey)
  /**
   * Video de YouTube de la canción: el del primer link relacionado que sea de YouTube. Se usa
   * como portada (su miniatura). null si no tiene ningún link de YouTube.
   */
  youtubeVideoId: string | null;
  /** Portada real: key de la imagen en S3/MinIO (carpeta "portadas"), mismo criterio que audioKey. null = se muestra `cover`. */
  coverKey: string | null;
  /** Key del objeto en S3/MinIO, no una URL reproducible — hay que resolverla con StorageClient.getDownloadUrl() antes de reproducir. null si la canción no tiene audio cargado. */
  audioKey: string | null;
  /** ChordPro-style body: chords inside [] before the syllable */
  chordpro: string;
  /** Key del objeto en S3/MinIO, no una URL — mismo criterio que audioKey. null si la canción no tiene foto de letra cargada. */
  lyricsImageKey: string | null;
  addedAt: string;
  playsByMonth: Record<string, number>; // "2026-03" -> plays
}
