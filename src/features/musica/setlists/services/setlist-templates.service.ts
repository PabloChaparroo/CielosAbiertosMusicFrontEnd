import { apiRequest } from "@/lib/api-client";
import type { SetlistItem } from "@/types";

/** Lista predefinida: canciones reutilizables para armar un setlist, sin fecha ni equipo */
export interface SetlistTemplate {
  id: string;
  title: string;
  items: SetlistItem[];
}

interface RawSetlistTemplate {
  id: string;
  title: string;
  items: Array<{ songId: string; key: string; note?: string | null }>;
}

const mapTemplate = (raw: RawSetlistTemplate): SetlistTemplate => ({
  id: raw.id,
  title: raw.title,
  items: raw.items.map((it) => ({
    songId: it.songId,
    key: it.key,
    ...(it.note ? { note: it.note } : {}),
  })),
});

export const SetlistTemplatesService = {
  async listAll(): Promise<SetlistTemplate[]> {
    const raw = await apiRequest<RawSetlistTemplate[]>("/setlist-templates");
    return raw.map(mapTemplate);
  },

  async create(input: { title: string; items: SetlistItem[] }): Promise<SetlistTemplate> {
    const created = await apiRequest<RawSetlistTemplate>("/setlist-templates", {
      method: "POST",
      body: input,
    });
    return mapTemplate(created);
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/setlist-templates/${id}`, { method: "DELETE" });
  },
};
