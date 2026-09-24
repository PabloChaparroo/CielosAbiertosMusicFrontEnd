import { apiRequest } from "@/lib/api-client";
import type { SongLink } from "../types/song-link";

export interface CreateSongLinkInput {
  label: string;
  url: string;
  type?: string;
  order?: number;
}

export const SongLinksService = {
  async listBySong(songId: string): Promise<SongLink[]> {
    return apiRequest<SongLink[]>(`/canciones/${songId}/links`);
  },

  async create(songId: string, input: CreateSongLinkInput): Promise<SongLink> {
    return apiRequest<SongLink>(`/canciones/${songId}/links`, {
      method: "POST",
      body: input,
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/links/${id}`, { method: "DELETE" });
  },
};
