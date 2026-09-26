import { apiRequest } from "@/lib/api-client";
import type { Annotation } from "@/types";

export interface RawAuthor {
  id: string;
}

/** Espejo exacto de la entidad Annotation real. GET /anotaciones no carga la relación `song` (el caller ya sabe el songId que pidió). */
export interface RawAnnotation {
  id: string;
  text: string;
  fechaHoraAlta: string;
  author: RawAuthor;
}

export function mapAnnotation(raw: RawAnnotation, songId: string): Annotation {
  return {
    id: raw.id,
    songId,
    authorId: raw.author.id,
    text: raw.text,
    createdAt: raw.fechaHoraAlta,
  };
}

export const AnnotationsService = {
  async listBySong(songId: string): Promise<Annotation[]> {
    const raw = await apiRequest<RawAnnotation[]>(`/anotaciones?songId=${songId}`);
    return raw.map((a) => mapAnnotation(a, songId));
  },

  /**
   * POST /anotaciones no devuelve el `author` completo (solo se persiste
   * `{id}`, sin recargar la relación) — por eso no se usa el resultado para
   * insertar "optimista": el caller siempre refresca la lista de la canción
   * después de crear.
   */
  create: (songId: string, text: string) =>
    apiRequest<unknown>("/anotaciones", { method: "POST", body: { songId, text } }),

  update: (id: string, text: string) =>
    apiRequest<unknown>(`/anotaciones/${id}`, { method: "PATCH", body: { text } }),

  remove: (id: string) => apiRequest<void>(`/anotaciones/${id}`, { method: "DELETE" }),
};
