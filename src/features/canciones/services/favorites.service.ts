import { apiRequest } from "@/lib/api-client";

export const FavoritesService = {
  /** Devuelve solo los songIds del usuario logueado — hay que cruzarlos contra el listado de canciones ya cargado. */
  listMine: () => apiRequest<string[]>("/favoritos"),

  toggle: (songId: string) =>
    apiRequest<{ isFavorite: boolean }>(`/favoritos/${songId}/toggle`, { method: "POST" }),
};
