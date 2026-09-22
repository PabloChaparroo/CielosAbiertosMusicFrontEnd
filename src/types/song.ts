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
  audioUrl: string;
  /** ChordPro-style body: chords inside [] before the syllable */
  chordpro: string;
  lyricsImage?: string;
  addedAt: string;
  playsByMonth: Record<string, number>; // "2026-03" -> plays
}
