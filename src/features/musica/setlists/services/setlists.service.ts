import { apiRequest } from "@/lib/api-client";
import type { EventType, Setlist, SetlistItem } from "@/types";

interface RawRef {
  id: string;
}

interface RawSetlistItem {
  key: string;
  note: string | null;
  position: number;
  song: RawRef;
}

/** Espejo exacto de la entidad Setlist real (GET /setlists). */
interface RawSetlist {
  id: string;
  title: string;
  date: string;
  isUpcoming?: boolean;
  fechaHoraAlta?: string;
  type: EventType;
  leader: RawRef;
  team: RawRef[];
  items: RawSetlistItem[];
}

export interface UpsertSetlistItemInput {
  songId: string;
  key: string;
  note?: string;
}

export interface UpsertSetlistInput {
  title: string;
  date: string;
  isUpcoming?: boolean;
  isUpcoming?: boolean;
  type: EventType;
  leaderId: string;
  teamIds: string[];
  items: UpsertSetlistItemInput[];
}

/**
 * El backend no garantiza el orden de `items` por `position` en la
 * respuesta (se vio en datos reales: position 1 antes que position 0) —
 * hay que ordenar client-side siempre después de cada fetch.
 */
function mapSetlist(raw: RawSetlist): Setlist {
  const items: SetlistItem[] = [...raw.items]
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      songId: item.song.id,
      key: item.key,
      ...(item.note ? { note: item.note } : {}),
    }));

  return {
    id: raw.id,
    title: raw.title,
    date: raw.date,
    isUpcoming: raw.isUpcoming ?? false,
    ...(raw.fechaHoraAlta ? { createdAt: raw.fechaHoraAlta } : {}),
    type: raw.type,
    leaderId: raw.leader.id,
    teamIds: raw.team.map((u) => u.id),
    items,
  };
}

export const SetlistsService = {
  async listAll(): Promise<Setlist[]> {
    const raw = await apiRequest<RawSetlist[]>("/setlists");
    return raw.map(mapSetlist);
  },

  async createSetlist(input: UpsertSetlistInput): Promise<Setlist> {
    const created = await apiRequest<RawSetlist>("/setlists", { method: "POST", body: input });
    return mapSetlist(created);
  },

  /**
   * No existe un endpoint de "solo reordenar" ni de "un item a la vez": el
   * service real borra todos los SetlistItem del setlist y los recrea con
   * position = índice del array que se manda. Por eso reordenar, cambiar la
   * tonalidad de un item o sacar una canción mandan siempre el array
   * `items` completo (no un diff) en una única llamada atómica.
   */
  async updateSetlist(id: string, input: UpsertSetlistInput): Promise<Setlist> {
    const updated = await apiRequest<RawSetlist>(`/setlists/${id}`, {
      method: "PATCH",
      body: input,
    });
    return mapSetlist(updated);
  },
};
