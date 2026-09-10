export type SystemRole = "admin" | "lider" | "musico";

export interface User {
  id: string;
  name: string;
  role: SystemRole;
  ministryRole: string;
  instruments: string[];
  avatarColor: string;
  initials: string;
  email: string;
  joinedAt: string;
}

export type Tag =
  | "Adoración"
  | "Júbilo"
  | "Navidad"
  | "Sanidad"
  | "Bautismo"
  | "Comunión"
  | "Entrega"
  | "Gratitud";

export interface Annotation {
  id: string;
  songId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

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

export type EventType = "Culto Domingo" | "Ensayo" | "Evento Especial";

export interface SetlistItem {
  songId: string;
  key: string;
  note?: string;
}

export interface Setlist {
  id: string;
  title: string;
  date: string; // ISO
  type: EventType;
  leaderId: string;
  items: SetlistItem[];
  teamIds: string[];
}
