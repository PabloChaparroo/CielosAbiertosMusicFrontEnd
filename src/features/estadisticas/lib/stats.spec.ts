import { describe, expect, it } from "vitest";
import type { Song, Tag } from "@/types";
import {
  historicRanking,
  monthlyTrend,
  playsByTag,
  playsByYear,
  topSongsForMonth,
  totalPlays,
} from "./stats";

/**
 * Datos de prueba: son las mismas reproducciones que se cargaron en la base local para verificar
 * en el navegador que Estadísticas se veía igual antes y después de pasar estos cálculos a
 * funciones puras (con los temas reales de cada canción). Los totales esperados se calcularon a
 * mano y coinciden con lo que mostró la pantalla (ej. Top 10: Digno de Alabanza 17, Océanos 14).
 */
function song(title: string, tags: Tag[], playsByMonth: Record<string, number>): Song {
  return {
    id: title,
    title,
    artist: "",
    key: "C",
    bpm: 80,
    compas: "4/4",
    duration: 240,
    tags,
    cover: "",
    audioKey: null,
    chordpro: "",
    lyricsImageKey: null,
    addedAt: "",
    playsByMonth,
  };
}

const oceanos = song("Océanos", ["Adoración", "Entrega"], {
  "2025-11": 3,
  "2026-03": 4,
  "2026-09": 7,
});
const digno = song("Digno de Alabanza", ["Júbilo", "Adoración"], { "2025-12": 5, "2026-09": 12 });
const desde = song("Desde mi interior", ["Júbilo"], { "2026-08": 2, "2026-09": 6 });
const tuMesa = song("Tu Mesa", ["Comunión"], { "2025-10": 9 });
const renuevame = song("Renuévame", ["Sanidad", "Entrega"], { "2026-09": 1 });
const sinReproducciones = song("Mi Refugio", ["Gratitud"], {});
const songs = [oceanos, digno, desde, tuMesa, renuevame, sinReproducciones];

describe("totalPlays", () => {
  it("suma todos los meses", () => {
    expect(totalPlays(oceanos)).toBe(14);
  });

  it("suma solo los meses que cumplen el filtro", () => {
    expect(totalPlays(oceanos, (m) => m.startsWith("2026"))).toBe(11);
  });

  it("una canción sin reproducciones da 0", () => {
    expect(totalPlays(sinReproducciones)).toBe(0);
  });
});

describe("topSongsForMonth — Más tocadas en <mes>", () => {
  it("ordena por reproducciones de ese mes, de mayor a menor", () => {
    expect(topSongsForMonth(songs, "2026-09").slice(0, 4)).toEqual([
      { name: "Digno de Alabanza", plays: 12 },
      { name: "Océanos", plays: 7 },
      { name: "Desde mi interior", plays: 6 },
      { name: "Renuévame", plays: 1 },
    ]);
  });

  it("solo cuenta ese mes (en agosto, Desde mi interior tiene 2)", () => {
    expect(topSongsForMonth(songs, "2026-08")[0]).toEqual({ name: "Desde mi interior", plays: 2 });
  });

  it("una canción sin reproducciones en el mes cuenta 0 (no se cae)", () => {
    const top = topSongsForMonth(songs, "2026-09");
    expect(top.find((r) => r.name === "Tu Mesa")).toEqual({ name: "Tu Mesa", plays: 0 });
  });

  it("devuelve como máximo 8", () => {
    const muchas = Array.from({ length: 12 }, (_, i) => song(`C${i}`, [], { "2026-09": i }));
    expect(topSongsForMonth(muchas, "2026-09")).toHaveLength(8);
  });
});

describe("playsByYear — Comparativa anual", () => {
  const years = ["2025", "2026"] as const;

  it("suma por año y ordena por el último año de la lista", () => {
    expect(playsByYear(songs, years).slice(0, 4)).toEqual([
      { name: "Digno de Alabanza", "2025": 5, "2026": 12 },
      { name: "Océanos", "2025": 3, "2026": 11 },
      { name: "Desde mi interior", "2025": 0, "2026": 8 },
      { name: "Renuévame", "2025": 0, "2026": 1 },
    ]);
  });

  it("una canción solo con reproducciones de 2025 igual aparece, con 2026 = 0", () => {
    expect(playsByYear(songs, years)).toContainEqual({ name: "Tu Mesa", "2025": 9, "2026": 0 });
  });
});

describe("playsByTag — Distribución por tema", () => {
  const byTag = Object.fromEntries(playsByTag(songs).map((r) => [r.name, r.value]));

  it("una canción con varios temas suma sus reproducciones a cada uno", () => {
    // Adoración = Océanos 14 + Digno 17; Entrega = Océanos 14 + Renuévame 1
    expect(byTag["Adoración"]).toBe(31);
    expect(byTag["Entrega"]).toBe(15);
  });

  it("suma por tema entre canciones distintas", () => {
    // Júbilo = Digno 17 + Desde mi interior 8
    expect(byTag["Júbilo"]).toBe(25);
    expect(byTag["Comunión"]).toBe(9);
  });

  it("un tema de canciones sin reproducciones aparece con 0", () => {
    expect(byTag["Gratitud"]).toBe(0);
  });
});

describe("monthlyTrend — Evolución mensual", () => {
  it("suma todas las canciones en cada mes y rotula MM/AA", () => {
    expect(monthlyTrend(songs, ["2025-10", "2026-08", "2026-09"])).toEqual([
      { month: "10/25", total: 9 },
      { month: "08/26", total: 2 },
      { month: "09/26", total: 26 },
    ]);
  });

  it("un mes sin reproducciones da 0", () => {
    expect(monthlyTrend(songs, ["2026-01"])).toEqual([{ month: "01/26", total: 0 }]);
  });
});

describe("historicRanking — Top 10 histórico", () => {
  it("ordena por reproducciones totales (lo que se vio en la pantalla)", () => {
    expect(historicRanking(songs).map((r) => [r.song.title, r.plays])).toEqual([
      ["Digno de Alabanza", 17],
      ["Océanos", 14],
      ["Tu Mesa", 9],
      ["Desde mi interior", 8],
      ["Renuévame", 1],
      ["Mi Refugio", 0],
    ]);
  });

  it("devuelve como máximo 10", () => {
    const muchas = Array.from({ length: 15 }, (_, i) => song(`C${i}`, [], { "2026-09": i }));
    expect(historicRanking(muchas)).toHaveLength(10);
  });
});
