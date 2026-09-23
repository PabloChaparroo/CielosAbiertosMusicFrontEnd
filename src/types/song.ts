export type Tag =
  "Adoración" | "Júbilo" | "Navidad" | "Sanidad" | "Bautismo" | "Comunión" | "Entrega" | "Gratitud";

export interface Song {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: number;
  duration: number; // seconds
  tags: Tag[];
  cover: string; // css gradient
  /** Key del objeto en S3/MinIO, no una URL reproducible — hay que resolverla con StorageClient.getDownloadUrl() antes de reproducir. null si la canción no tiene audio cargado. */
  audioKey: string | null;
  /** ChordPro-style body: chords inside [] before the syllable */
  chordpro: string;
  lyricsImage?: string;
  addedAt: string;
  playsByMonth: Record<string, number>; // "2026-03" -> plays
}
