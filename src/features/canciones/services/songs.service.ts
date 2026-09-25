import { apiRequest } from "@/lib/api-client";
import type { Song, Tag } from "@/types";

export interface RawTag {
  id: string;
  valor: string;
}

export interface RawPlayStat {
  month: string;
  plays: number;
}

/** Espejo exacto de la entidad Song real (GET /canciones). */
export interface RawSong {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: number;
  compas: string;
  duration: number;
  cover: string;
  audioKey: string | null;
  chordpro: string;
  lyricsImageKey: string | null;
  tags: RawTag[];
  /** Ausente en la respuesta de POST /canciones (bug de backend, ver mapSong). Presente en GET. */
  playStats?: RawPlayStat[];
  fechaHoraAlta: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateSongInput {
  title: string;
  artist: string;
  key: string;
  bpm: number;
  compas: string;
  duration: number;
  cover: string;
  chordpro: string;
  tags: string[];
  audioKey?: string;
  lyricsImageKey?: string;
}

export type UpdateSongInput = Partial<CreateSongInput>;

/**
 * Normaliza el shape real del backend al `Song` que ya consume toda la UI
 * (Escuchar, Letras, Acordes, Favoritos, Estadísticas, MiniPlayer, Setlists)
 * — así ninguna de esas pantallas necesitó tocarse para pasar de mock a real.
 *
 * `raw.playStats` se trata como opcional a propósito: la respuesta real de
 * `POST /canciones` (alta) no incluye esa relación (solo `GET /canciones`
 * la carga) — es un bug del backend de Canciones descubierto en el ticket
 * de audio real, documentado en el changelog y no arreglado ahí porque
 * Canciones estaba fuera de alcance en ese ticket; acá alcanza con no
 * asumir que siempre viene.
 */
export function mapSong(raw: RawSong): Song {
  return {
    id: raw.id,
    title: raw.title,
    artist: raw.artist,
    key: raw.key,
    bpm: raw.bpm,
    compas: raw.compas ?? "4/4",
    duration: raw.duration,
    tags: raw.tags.map((t) => t.valor) as Tag[],
    cover: raw.cover,
    audioKey: raw.audioKey,
    chordpro: raw.chordpro,
    lyricsImageKey: raw.lyricsImageKey,
    addedAt: raw.fechaHoraAlta,
    playsByMonth: Object.fromEntries((raw.playStats ?? []).map((p) => [p.month, p.plays])),
  };
}

export const SongsService = {
  /** Trae todas las canciones reales en una sola página (hoy son 21, muy por debajo del límite de 100 del backend). */
  async listAll(): Promise<Song[]> {
    const result = await apiRequest<PaginatedResult<RawSong>>("/canciones?limit=100");
    return result.data.map(mapSong);
  },

  async createSong(dto: CreateSongInput): Promise<Song> {
    const created = await apiRequest<RawSong>("/canciones", { method: "POST", body: dto });
    return mapSong(created);
  },

  async updateSong(id: string, dto: UpdateSongInput): Promise<Song> {
    const updated = await apiRequest<RawSong>(`/canciones/${id}`, { method: "PATCH", body: dto });
    return mapSong(updated);
  },
};
