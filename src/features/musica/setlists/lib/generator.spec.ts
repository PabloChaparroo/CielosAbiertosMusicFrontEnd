import { describe, expect, it } from "vitest";
import {
  COOLDOWN_DAYS,
  generateList,
  lastPlayedBySong,
  pickReplacement,
  type GeneratorSong,
} from "./generator";

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 23).getTime();

let n = 0;
const song = (
  tipo: "Alabanza" | "Adoración",
  tags: string[] = [],
  artist = `Artista ${(n += 1)}`,
): GeneratorSong => ({ id: `s${n}`, tipo, tags, artist });

const base = (songs: GeneratorSong[], extra: Partial<Parameters<typeof generateList>[0]> = {}) => ({
  songs,
  lastPlayed: new Map<string, number>(),
  tag: null,
  isMedley: async () => false,
  now: NOW,
  rng: () => 0.5,
  ...extra,
});

describe("generateList", () => {
  const catalog = () => {
    n = 0;
    return [
      ...Array.from({ length: 8 }, () => song("Alabanza")),
      ...Array.from({ length: 5 }, () => song("Adoración")),
    ];
  };

  it("arma 3 alabanzas, 2 adoraciones y 1 ofrenda, sin repetir canciones", async () => {
    const list = await generateList(base(catalog()));
    const count = (section: string) => list.items.filter((i) => i.section === section).length;
    expect([count("alabanza"), count("adoracion"), count("ofrenda")]).toEqual([3, 2, 1]);
    expect(new Set(list.items.map((i) => i.songId)).size).toBe(6);
    expect(list.missing).toEqual({ alabanza: 0, adoracion: 0, ofrenda: 0 });
  });

  it("no sugiere lo que se tocó hace menos de dos semanas si hay otras", async () => {
    const songs = catalog();
    const recent = new Map(songs.slice(0, 4).map((s) => [s.id, NOW - (COOLDOWN_DAYS - 1) * DAY]));
    for (let i = 0; i < 20; i += 1) {
      const list = await generateList(base(songs, { lastPlayed: recent, rng: Math.random }));
      list.items.forEach((item) => expect(recent.has(item.songId)).toBe(false));
    }
  });

  it("si faltan canciones, usa las recientes en vez de dejar lugares vacíos", async () => {
    n = 0;
    const songs = [song("Alabanza"), song("Alabanza"), song("Alabanza"), song("Adoración")];
    const recent = new Map(songs.map((s) => [s.id, NOW - DAY]));
    const list = await generateList(base(songs, { lastPlayed: recent }));
    expect(list.items).toHaveLength(4);
  });

  it("prefiere las que hace más que no se tocan (la más vieja con rng bajo)", async () => {
    n = 0;
    const songs = Array.from({ length: 6 }, () => song("Alabanza"));
    songs.push(song("Adoración"), song("Adoración"));
    const lastPlayed = new Map(songs.map((s, i) => [s.id, NOW - (30 + i * 10) * DAY]));
    const list = await generateList(base(songs, { lastPlayed, rng: () => 0.999 }));
    // con rng alto sale la de mayor peso al final del grupo: la más vieja
    expect(list.items.some((i) => i.songId === songs[5]!.id)).toBe(true);
  });

  it("con tema, usa solo canciones de ese tema; si no alcanzan, completa y lo avisa", async () => {
    n = 0;
    const songs = [
      song("Alabanza", ["Fe"]),
      song("Alabanza", ["Fe"]),
      song("Alabanza", ["Gozo"]),
      song("Alabanza", ["Gozo"]),
      song("Adoración", ["Fe"]),
      song("Adoración", ["Gozo"]),
      song("Adoración", ["Gozo"]),
    ];
    const list = await generateList(base(songs, { tag: "Fe" }));
    const ids = list.items.map((i) => i.songId);
    expect(ids.slice(0, 2).every((id) => songs.find((s) => s.id === id)!.tags.includes("Fe"))).toBe(
      true,
    );
    expect(list.relaxedTag).toBe(true);
  });

  it("un enganchado ocupa 2 lugares de alabanza y entra a lo sumo uno", async () => {
    n = 0;
    const songs = [
      song("Alabanza"),
      song("Alabanza"),
      song("Alabanza"),
      song("Alabanza"),
      song("Alabanza"),
      song("Adoración"),
      song("Adoración"),
      song("Adoración"),
    ];
    const medleys = new Set([songs[0]!.id, songs[1]!.id]);
    for (let i = 0; i < 30; i += 1) {
      const list = await generateList(
        base(songs, { isMedley: async (s) => medleys.has(s.id), rng: Math.random }),
      );
      const alabanzas = list.items.filter((x) => x.section === "alabanza");
      expect(list.medleyIds.length).toBeLessThanOrEqual(1);
      const slots = alabanzas.reduce((sum, x) => sum + (medleys.has(x.songId) ? 2 : 1), 0);
      expect(slots).toBe(3);
      // la ofrenda nunca es un enganchado
      const ofrenda = list.items.find((x) => x.section === "ofrenda");
      expect(ofrenda && medleys.has(ofrenda.songId)).toBeFalsy();
    }
  });

  it("evita repetir artista cuando hay otras opciones", async () => {
    n = 0;
    const songs = [
      song("Alabanza", [], "Barak"),
      song("Alabanza", [], "Barak"),
      song("Alabanza", [], "Miel San Marcos"),
      song("Alabanza", [], "Marcos Witt"),
      song("Alabanza", [], "Hillsong"),
      song("Adoración", [], "Averly"),
      song("Adoración", [], "Taya"),
    ];
    for (let i = 0; i < 30; i += 1) {
      const list = await generateList(base(songs, { rng: Math.random }));
      const barak = list.items.filter(
        (x) => songs.find((s) => s.id === x.songId)!.artist === "Barak",
      );
      expect(barak.length).toBeLessThanOrEqual(1);
    }
  });
});

describe("lastPlayedBySong", () => {
  it("toma la fecha de la lista más reciente que tiene la canción", () => {
    const last = lastPlayedBySong([
      { date: new Date(2026, 8, 1).toISOString(), items: [{ songId: "a", key: "C" }] },
      {
        date: new Date(2026, 9, 1).toISOString(),
        items: [
          { songId: "a", key: "C" },
          { songId: "b", key: "D" },
        ],
      },
    ]);
    expect(last.get("a")).toBe(new Date(2026, 9, 1).getTime());
    expect(last.get("b")).toBe(new Date(2026, 9, 1).getTime());
    expect(last.get("c")).toBeUndefined();
  });
});

describe("pickReplacement", () => {
  it("otra canción del mismo tipo, fuera de la lista y que no sea enganchado", async () => {
    n = 0;
    const songs = [song("Alabanza"), song("Alabanza"), song("Alabanza"), song("Adoración")];
    const result = await pickReplacement(
      base(songs, { isMedley: async (s) => s.id === songs[1]!.id }),
      "alabanza",
      new Set([songs[0]!.id]),
      [],
    );
    expect(result?.id).toBe(songs[2]!.id);
  });
  it("null si no queda ninguna", async () => {
    n = 0;
    const songs = [song("Adoración")];
    const result = await pickReplacement(base(songs), "adoracion", new Set([songs[0]!.id]), []);
    expect(result).toBeNull();
  });
});
