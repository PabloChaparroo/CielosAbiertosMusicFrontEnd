import { describe, expect, it } from "vitest";
import type { Setlist, Song } from "@/types";
import { setlistToWhatsapp } from "./whatsapp";

const song = (id: string, title: string, tipo: string, key = "D") =>
  ({ id, title, tipo, key }) as Song;

const songs = [
  song("a", "Glorioso", "Alabanza"),
  song("b", "Este es mi deseo", "Adoración"),
  song("c", "Alaba", "Alabanza", "E"),
  song("d", "Santo por siempre", "Adoración"),
  song("e", "Hossana", "Alabanza"),
];

const setlist = (ids: Array<[string, string]>): Setlist => ({
  id: "s",
  title: "Domingo",
  // domingo 4/10/2026 a las 10:30 (hora local)
  date: new Date(2026, 9, 4, 10, 30).toISOString(),
  isUpcoming: true,
  type: "Culto Domingo a la mañana",
  leaderId: "u",
  teamIds: [],
  items: ids.map(([songId, key]) => ({ songId, key })),
});

describe("setlistToWhatsapp", () => {
  it("alabanzas, después adoraciones, y la última canción como ofrenda", () => {
    const text = setlistToWhatsapp(
      setlist([
        ["a", "D"],
        ["b", "D"],
        ["c", "C"],
        ["d", "D"],
        ["e", "D"],
      ]),
      songs,
    );
    expect(text).toBe(
      [
        "*DOMINGO 4/10*",
        "*Alabanzas*",
        "• Glorioso",
        "• Alaba (C)",
        "*Adoración*",
        "• Este es mi deseo",
        "• Santo por siempre",
        "*Ofrenda*",
        "• Hossana",
      ].join("\n"),
    );
  });

  it("una sola canción no es ofrenda", () => {
    expect(setlistToWhatsapp(setlist([["a", "D"]]), songs)).toBe(
      "*DOMINGO 4/10*\n*Alabanzas*\n• Glorioso",
    );
  });
});
