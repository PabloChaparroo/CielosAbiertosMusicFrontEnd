import { apiRequest } from "@/lib/api-client";
import type { AudioTrack } from "../types/audio-track";

export interface CreateAudioTrackInput {
  label: string;
  audioKey: string;
  order: number;
}

export const AudioTracksService = {
  listBySong: (songId: string) => apiRequest<AudioTrack[]>(`/canciones/${songId}/pistas`),

  create: (songId: string, dto: CreateAudioTrackInput) =>
    apiRequest<AudioTrack>(`/canciones/${songId}/pistas`, { method: "POST", body: dto }),

  remove: (id: string) => apiRequest<void>(`/pistas/${id}`, { method: "DELETE" }),
};
