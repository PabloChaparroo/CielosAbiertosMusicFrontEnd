import { describe, expect, it } from "vitest";
import type { Setlist, Song, Tag } from "@/types";
import {
  historicRanking,
  isPlayedSetlist,
  monthlyTrend,
  monthsBetween,
  playsFromSetlists,
  recentMonths,
  topSongsInMonths,
  playsByTag,
  playsByYear,
  songPlaysInRange,
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
    audioName: null,
    proximaDesde: null,
    esProxima: false,
    chordpro: "",
    lyricsImageKey: null,
    coverKey: null,
    youtubeVideoId: null,
    tipoId: "t-alabanza",
    tipo: "Alabanza",
    trackCount: 0,
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

describe("songPlaysInRange", () => {
  const sl = (id: string, date: string, songIds: string[]): Setlist => ({
    id,
    teamInstruments: {},
    title: id,
    date,
    isUpcoming: false,
    type: "Culto Miércoles",
    leaderId: "u1",
    items: songIds.map((songId) => ({ songId, key: "D" })),
    teamIds: ["u1", "u2"],
  });
  const setlists = [
    sl("a", "2026-03-01T13:30:00.000Z", ["s1"]),
    sl("b", "2026-05-10T13:30:00.000Z", ["s1", "s2"]),
    sl("c", "2026-06-10T13:30:00.000Z", ["s2"]),
    sl("d", "2026-08-01T13:30:00.000Z", ["s1"]),
  ];

  it("cuenta solo los setlists del rango que incluyen la canción, del más nuevo al más viejo", () => {
    const plays = songPlaysInRange(setlists, "s1", "2026-04-01", "2026-08-01");
    expect(plays.map((p) => p.setlistId)).toEqual(["d", "b"]);
    expect(plays[0]!.teamIds).toEqual(["u1", "u2"]);
  });

  it("devuelve vacío si no se tocó en el rango", () => {
    expect(songPlaysInRange(setlists, "s2", "2026-07-01", "2026-09-01")).toEqual([]);
  });
});

describe("veces tocada según las listas que pasaron al historial", () => {
  const today = new Date("2026-10-08T15:00:00.000Z");
  const list = (id: string, date: string, songIds: string[], isUpcoming = true): Setlist =>
    ({
      id,
      title: id,
      date,
      isUpcoming,
      type: "Culto Miércoles",
      leaderId: "u1",
      items: songIds.map((songId) => ({ songId, key: "D" })),
      teamIds: [],
      teamInstruments: {},
    }) as Setlist;
  const base = [oceanos, digno].map((s, i) => ({ ...s, id: `s${i + 1}` }));

  it("cuenta una vez por lista pasada, en el mes de su fecha; las futuras no cuentan", () => {
    const [s1, s2] = playsFromSetlists(
      base,
      [
        list("a", "2026-09-06T13:30:00.000Z", ["s1", "s2", "s1"]),
        list("b", "2026-09-13T13:30:00.000Z", ["s1"]),
        list("c", "2026-10-04T13:30:00.000Z", ["s2"]),
        list("futura", "2026-10-11T13:30:00.000Z", ["s1"]),
        list("pasada-a-mano", "2026-10-18T13:30:00.000Z", ["s2"], false),
      ],
      today,
    );
    expect(s1!.playsByMonth).toEqual({ "2026-09": 2 });
    expect(s2!.playsByMonth).toEqual({ "2026-09": 1, "2026-10": 2 });
  });

  it("una lista pasa al historial el día después de su fecha", () => {
    expect(isPlayedSetlist(list("hoy", "2026-10-08T22:00:00.000Z", []), today)).toBe(false);
    expect(isPlayedSetlist(list("ayer", "2026-10-07T13:30:00.000Z", []), today)).toBe(true);
  });

  it("meses de un rango y últimos meses", () => {
    expect(monthsBetween("2025-11", "2026-02")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(monthsBetween("2026-02", "2025-12")).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(recentMonths(3, today)).toEqual(["2026-08", "2026-09", "2026-10"]);
  });

  it("más tocadas en un rango, sin las que no se tocaron", () => {
    const songs = playsFromSetlists(
      base,
      [
        list("a", "2026-08-02T13:30:00.000Z", ["s1"]),
        list("b", "2026-09-06T13:30:00.000Z", ["s2"]),
        list("c", "2026-09-13T13:30:00.000Z", ["s2"]),
      ],
      today,
    );
    expect(topSongsInMonths(songs, ["2026-09"]).map((r) => [r.song.id, r.plays])).toEqual([
      ["s2", 2],
    ]);
    expect(
      topSongsInMonths(songs, monthsBetween("2026-08", "2026-09")).map((r) => r.plays),
    ).toEqual([2, 1]);
  });
});
