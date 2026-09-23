import { apiRequest } from "@/lib/api-client";
import type { Song, Tag } from "@/types";

interface RawTag {
  id: string;
  valor: string;
}

interface RawPlayStat {
  month: string;
  plays: number;
}

/** Espejo exacto de la entidad Song real (GET /canciones). */
interface RawSong {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: number;
  duration: number;
  cover: string;
  audioKey: string | null;
  chordpro: string;
  lyricsImageKey: string | null;
  tags: RawTag[];
  playStats: RawPlayStat[];
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
  duration: number;
  cover: string;
  chordpro: string;
  tags: string[];
}

/**
 * Normaliza el shape real del backend al `Song` que ya consume toda la UI
 * (Escuchar, Letras, Acordes, Favoritos, Estadísticas, MiniPlayer, Setlists)
 * — así ninguna de esas pantallas necesitó tocarse para pasar de mock a real.
 *
 * `audioUrl` queda "" cuando `audioKey` es null (el caso de las 21 canciones
 * reales hoy): no existe todavía un endpoint que resuelva audioKey → URL
 * reproducible (StorageService.getDownloadUrl está escrito pero no expuesto
 * por ningún controller). Ver gap documentado en docs/estado-actual.md.
 */
function mapSong(raw: RawSong): Song {
  return {
    id: raw.id,
    title: raw.title,
    artist: raw.artist,
    key: raw.key,
    bpm: raw.bpm,
    duration: raw.duration,
    tags: raw.tags.map((t) => t.valor) as Tag[],
    cover: raw.cover,
    audioUrl: raw.audioKey ?? "",
    chordpro: raw.chordpro,
    ...(raw.lyricsImageKey ? { lyricsImage: raw.lyricsImageKey } : {}),
    addedAt: raw.fechaHoraAlta,
    playsByMonth: Object.fromEntries(raw.playStats.map((p) => [p.month, p.plays])),
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
};
