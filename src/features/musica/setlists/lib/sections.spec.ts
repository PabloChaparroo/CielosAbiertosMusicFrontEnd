import { describe, expect, it } from "vitest";
import { defaultSection, groupBySection, itemsForType, usesSections } from "./sections";

const songs = [
  { id: "muros", tipo: "Alabanza" },
  { id: "santo", tipo: "Adoración" },
  { id: "alaba", tipo: "Alabanza" },
  { id: "sinTipo", tipo: "" },
];

describe("secciones del orden del servicio", () => {
  it("Cultos y Ensayos usan secciones; Evento Especial no", () => {
    expect(usesSections("Culto Domingo a la mañana")).toBe(true);
    expect(usesSections("Ensayo")).toBe(true);
    expect(usesSections("Evento Especial")).toBe(false);
  });

  it("al agregar: adoraciones a Adoración; alabanzas y sin tipo a Alabanzas", () => {
    expect(defaultSection({ tipo: "Adoración" })).toBe("adoracion");
    expect(defaultSection({ tipo: "Alabanza" })).toBe("alabanza");
    expect(defaultSection({ tipo: "" })).toBe("alabanza");
  });

  it("agrupa por la sección guardada; sin sección (listas anteriores), por el tipo", () => {
    const groups = groupBySection(
      [
        { songId: "santo", key: "D" },
        { songId: "muros", key: "G" },
        { songId: "alaba", key: "A", section: "ofrenda" },
        { songId: "sinTipo", key: "C" },
      ],
      songs,
    );
    expect(groups.map((g) => [g.id, g.items.map((i) => i.songId)])).toEqual([
      ["alabanza", ["muros", "sinTipo"]],
      ["adoracion", ["santo"]],
      ["ofrenda", ["alaba"]],
    ]);
  });

  it("al guardar un Culto: ordena por sección y guarda la sección de cada una", () => {
    const items = itemsForType(
      [
        { songId: "alaba", key: "A", section: "ofrenda" as const },
        { songId: "santo", key: "D" },
        { songId: "muros", key: "G" },
      ],
      "Culto Miércoles",
      songs,
    );
    expect(items).toEqual([
      { songId: "muros", key: "G", section: "alabanza" },
      { songId: "santo", key: "D", section: "adoracion" },
      { songId: "alaba", key: "A", section: "ofrenda" },
    ]);
  });

  it("al guardar un Evento Especial: mismo orden y sin sección", () => {
    const items = itemsForType(
      [
        { songId: "alaba", key: "A", section: "ofrenda" as const },
        { songId: "muros", key: "G" },
      ],
      "Evento Especial",
      songs,
    );
    expect(items).toEqual([
      { songId: "alaba", key: "A" },
      { songId: "muros", key: "G" },
    ]);
  });
});
