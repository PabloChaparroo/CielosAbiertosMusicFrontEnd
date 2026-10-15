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
  teamInstruments: {},
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

  it("con secciones guardadas: cada canción en la suya (la ofrenda puede ser cualquiera)", () => {
    const list = setlist([
      ["a", "D"],
      ["c", "C"],
      ["b", "D"],
    ]);
    list.items = [
      { songId: "a", key: "D", section: "alabanza" },
      { songId: "b", key: "D", section: "adoracion" },
      { songId: "c", key: "C", section: "ofrenda" },
    ];
    expect(setlistToWhatsapp(list, songs)).toBe(
      [
        "*DOMINGO 4/10*",
        "*Alabanzas*",
        "• Glorioso",
        "*Adoración*",
        "• Este es mi deseo",
        "*Ofrenda*",
        "• Alaba (C)",
      ].join("\n"),
    );
  });

  it("Evento Especial: una detrás de otra, sin títulos de sección", () => {
    const list = {
      ...setlist([
        ["b", "D"],
        ["a", "D"],
      ]),
      type: "Evento Especial" as const,
    };
    expect(setlistToWhatsapp(list, songs)).toBe(
      ["*DOMINGO 4/10*", "• Este es mi deseo", "• Glorioso"].join("\n"),
    );
  });
});
