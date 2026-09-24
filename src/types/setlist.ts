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
  createdAt?: string; // ISO; fallback para datos antiguos sin fecha de alta
  type: EventType;
  leaderId: string;
  items: SetlistItem[];
  teamIds: string[];
}
