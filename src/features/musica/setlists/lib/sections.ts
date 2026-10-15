import type { EventType, SetlistItem, SetlistSection, Song } from "@/types";

/**
 * Secciones del orden del servicio (pedido de Pablo, como arman las listas sus líderes): en Cultos
 * y Ensayos las canciones van en Alabanzas, Adoración y Ofrenda; en Evento Especial, una detrás
 * de otra, sin secciones.
 */
export const SECTIONS: ReadonlyArray<{ id: SetlistSection; label: string }> = [
  { id: "alabanza", label: "Alabanzas" },
  { id: "adoracion", label: "Adoración" },
  { id: "ofrenda", label: "Ofrenda" },
];

export function usesSections(type: EventType): boolean {
  return type !== "Evento Especial";
}

/** Sección al agregar una canción: las adoraciones a Adoración; el resto (alabanzas y sin tipo) a Alabanzas */
export function defaultSection(song: Pick<Song, "tipo"> | undefined): SetlistSection {
  return song?.tipo === "Adoración" ? "adoracion" : "alabanza";
}

/** Sección de una canción de la lista: la guardada o, en listas anteriores, la de su tipo */
export function sectionOf(item: SetlistItem, song: Pick<Song, "tipo"> | undefined): SetlistSection {
  return item.section ?? defaultSection(song);
}

/**
 * Canciones agrupadas por sección, en el orden de las secciones y, dentro de cada una, en el
 * orden de la lista. Solo las secciones con canciones.
 */
export function groupBySection<T extends SetlistItem>(
  items: T[],
  songs: Pick<Song, "id" | "tipo">[],
): Array<{ id: SetlistSection; label: string; items: T[] }> {
  return SECTIONS.map((section) => ({
    ...section,
    items: items.filter(
      (item) =>
        sectionOf(
          item,
          songs.find((s) => s.id === item.songId),
        ) === section.id,
    ),
  })).filter((group) => group.items.length > 0);
}

/**
 * Ítems listos para guardar: con secciones, ordenados por sección (así `position` sigue el orden
 * que se ve) y cada uno con su sección; sin secciones (Evento Especial), en su orden y sin sección.
 */
export function itemsForType<T extends SetlistItem>(
  items: T[],
  type: EventType,
  songs: Pick<Song, "id" | "tipo">[],
): T[] {
  if (!usesSections(type)) {
    return items.map(({ section: _, ...rest }) => rest as T);
  }
  return groupBySection(items, songs).flatMap((group) =>
    group.items.map((item) => ({ ...item, section: group.id })),
  );
}
