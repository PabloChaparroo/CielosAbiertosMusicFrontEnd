import type { Setlist, Song } from "@/types";

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
 * Primero las alabanzas, después las adoraciones (cada grupo en el orden del setlist). La última
 * canción del setlist es siempre la ofrenda (el cierre). Las que no tienen tipo van con las
 * alabanzas. Si se toca en otro tono que el original, va entre paréntesis: "Alaba (C)".
 */
export function setlistToWhatsapp(setlist: Setlist, songs: Song[]): string {
  const rows = setlist.items.flatMap((item) => {
    const song = songs.find((s) => s.id === item.songId);
    if (!song) return [];
    const name = item.key && item.key !== song.key ? `${song.title} (${item.key})` : song.title;
    return [{ name, adoracion: song.tipo === "Adoración" }];
  });
  const ofrenda = rows.length > 1 ? rows[rows.length - 1] : undefined;
  const rest = ofrenda ? rows.slice(0, -1) : rows;

  const d = new Date(setlist.date);
  const lines = [`*${WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}*`];
  const block = (title: string, names: string[]) => {
    if (names.length) lines.push(`*${title}*`, ...names.map((n) => `• ${n}`));
  };
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
