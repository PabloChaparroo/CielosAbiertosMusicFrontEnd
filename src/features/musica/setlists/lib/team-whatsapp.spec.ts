import { describe, expect, it } from "vitest";
import type { Setlist } from "@/types";
import { teamToWhatsapp } from "./team-whatsapp";

const users = [
  { id: "beto", name: "Beto Gómez" },
  { id: "josue", name: "Josué Pérez" },
  { id: "ale", name: "Ale Ríos" },
];

const setlist = (overrides: Partial<Setlist> = {}): Setlist => ({
  id: "s",
  title: "Domingo 18/10",
  date: new Date(2026, 9, 18, 10, 30).toISOString(),
  isUpcoming: true,
  type: "Culto Domingo a la mañana",
  leaderId: "josue",
  items: [],
  teamIds: ["beto", "josue", "ale"],
  teamInstruments: {
    beto: ["Bajo", "Guitarra acústica"],
    josue: ["Teclado", "Voz"],
    ale: ["Voz"],
  },
  ...overrides,
});

describe("teamToWhatsapp — el equipo como lo arma el líder", () => {
  it("instrumentos (también los vacíos), voces, sonido/multimedia y las notas", () => {
    const text = teamToWhatsapp(
      setlist({ notes: "• Todos debemos estudiar los temas y ensayar." }),
      users,
    );
    expect(text).toBe(
      [
        "*Domingo 18/10*",
        "Guitarra eléctrica:",
        "Guitarra acústica: Beto",
        "Teclado: Josué",
        "Percusión:",
        "Batería:",
        "Bajo: Beto",
        "",
        "*Voces:*",
        "• Josué",
        "• Ale",
        "",
        "Sonido:",
        "Multimedia:",
        "",
        "• Todos debemos estudiar los temas y ensayar.",
      ].join("\n"),
    );
  });

  it("sin notas no agrega el bloque final", () => {
    expect(teamToWhatsapp(setlist(), users).endsWith("Multimedia:")).toBe(true);
  });
});
