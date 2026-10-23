export const EVENT_TYPES = [
  "Culto Domingo a la mañana",
  "Culto Domingo a la tarde",
  "Culto Miércoles",
  "Culto Sábado Jóvenes",
  "Ensayo",
  "Evento Especial",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Sección del orden del servicio (Cultos y Ensayos); ver features/musica/setlists/lib/sections */
export type SetlistSection = "alabanza" | "adoracion" | "ofrenda";

/** Integrante tal como viene con la lista: nombre, foto e instrumentos (sin email ni roles) */
export interface TeamMember {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  avatarKey: string | null;
  instruments?: string[];
}

export interface SetlistItem {
  songId: string;
  key: string;
  note?: string;
  /** sin sección: Evento Especial, o listas anteriores (se agrupan por el tipo de la canción) */
  section?: SetlistSection;
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
  /** Los integrantes de teamIds con sus datos básicos, para verlos sin el módulo "Equipo" */
  team?: TeamMember[];
  /** Qué toca cada miembro del equipo en esta lista: { [userId]: instrumentos } */
  teamInstruments: Record<string, string[]>;
  /** Notas del líder para el equipo (van al final de "Copiar equipo") */
  notes?: string;
}
