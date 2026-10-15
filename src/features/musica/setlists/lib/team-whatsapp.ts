import { INSTRUMENTS } from "@/lib/instruments";
import type { Setlist, User } from "@/types";

/** Instrumentos que no van en la lista de arriba: las voces van en su bloque, y Sonido/Multimedia al final */
const SEPARATE = new Set<string>(["Voz", "Sonido", "Multimedia"]);

/**
 * El equipo de una lista como texto para WhatsApp, como lo arma el líder (pedido de Pablo):
 *
 *   *Domingo 18/10*
 *   Bajo: Beto
 *   Guitarra eléctrica:
 *   Teclado: Josué
 *   …
 *
 *   *Voces:*
 *   • Josué
 *   • Ale
 *
 *   Sonido: Rodrigo
 *   Multimedia:
 *
 *   (las notas del líder)
 *
 * Todos los instrumentos aparecen aunque nadie los toque (queda el lugar para completar, como en
 * su mensaje). Van los nombres de pila. Las notas, tal cual las escribió.
 */
export function teamToWhatsapp(setlist: Setlist, users: Pick<User, "id" | "name">[]): string {
  const firstName = (id: string) => users.find((u) => u.id === id)?.name.split(" ")[0] ?? "";
  const playing = (instrument: string) =>
    setlist.teamIds
      .filter((id) => (setlist.teamInstruments[id] ?? []).includes(instrument))
      .map(firstName)
      .filter(Boolean);
  const line = (instrument: string) => {
    const names = playing(instrument);
    return names.length ? `${instrument}: ${names.join(", ")}` : `${instrument}:`;
  };

  const lines = [`*${setlist.title}*`];
  lines.push(...INSTRUMENTS.filter((i) => !SEPARATE.has(i)).map(line));
  lines.push("", "*Voces:*");
  lines.push(...playing("Voz").map((name) => `• ${name}`));
  lines.push("", line("Sonido"), line("Multimedia"));
  const notes = setlist.notes?.trim();
  if (notes) lines.push("", notes);
  return lines.join("\n");
}
