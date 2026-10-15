import type { Setlist, Song } from "@/types";
import { groupBySection, usesSections } from "./sections";

const WEEKDAYS = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];

/**
 * Setlist como texto para pegar en WhatsApp (negritas con *…*):
 *
 *   *DOMINGO 4/10*
 *   *Alabanzas*
 *   • Glorioso
 *   *Adoración*
 *   • Este es mi deseo
 *   *Ofrenda*
 *   • Hossana
 *
 * Con secciones guardadas (Cultos y Ensayos): cada canción en la suya. Listas anteriores, sin
 * secciones: primero las alabanzas, después las adoraciones, y la última canción como ofrenda.
 * Evento Especial: una detrás de otra, sin títulos. Si se toca en otro tono que el original, va
 * entre paréntesis: "Alaba (C)".
 */
export function setlistToWhatsapp(setlist: Setlist, songs: Song[]): string {
  const nameOf = (songId: string, key: string) => {
    const song = songs.find((s) => s.id === songId);
    if (!song) return null;
    return key && key !== song.key ? `${song.title} (${key})` : song.title;
  };

  const d = new Date(setlist.date);
  const lines = [`*${WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}*`];
  const block = (title: string | null, names: string[]) => {
    if (!names.length) return;
    if (title) lines.push(`*${title}*`);
    lines.push(...names.map((n) => `• ${n}`));
  };
  const names = (items: Setlist["items"]) =>
    items.flatMap((item) => nameOf(item.songId, item.key) ?? []);

  if (!usesSections(setlist.type)) {
    block(null, names(setlist.items));
    return lines.join("\n");
  }
  if (setlist.items.some((item) => item.section)) {
    groupBySection(setlist.items, songs).forEach((group) => block(group.label, names(group.items)));
    return lines.join("\n");
  }

  // lista anterior a las secciones: se deducen
  const rows = setlist.items.flatMap((item) => {
    const song = songs.find((s) => s.id === item.songId);
    const name = nameOf(item.songId, item.key);
    return song && name ? [{ name, adoracion: song.tipo === "Adoración" }] : [];
  });
  const ofrenda = rows.length > 1 ? rows[rows.length - 1] : undefined;
  const rest = ofrenda ? rows.slice(0, -1) : rows;
  block(
    "Alabanzas",
    rest.filter((r) => !r.adoracion).map((r) => r.name),
  );
  block(
    "Adoración",
    rest.filter((r) => r.adoracion).map((r) => r.name),
  );
  block("Ofrenda", ofrenda ? [ofrenda.name] : []);
  return lines.join("\n");
}
