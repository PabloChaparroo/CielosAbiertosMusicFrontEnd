export const EVENT_TYPES = [
  "Culto Domingo a la mañana",
  "Culto Domingo a la tarde",
  "Culto Miércoles",
  "Culto Sábado Jóvenes",
  "Ensayo",
  "Evento Especial",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface SetlistItem {
  songId: string;
  key: string;
  note?: string;
}

export interface Setlist {
  id: string;
  title: string;
  date: string; // ISO
  isUpcoming: boolean;
  createdAt?: string; // ISO; fallback para datos antiguos sin fecha de alta
  type: EventType;
  leaderId: string;
  items: SetlistItem[];
  teamIds: string[];
}
