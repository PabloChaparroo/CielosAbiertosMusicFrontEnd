import { describe, expect, it } from "vitest";
import { mapSong, type RawSong } from "./songs.service";

/** Una canción tal como la devuelve GET /canciones del backend */
const raw: RawSong = {
  id: "9a35033a-4a0c-47bd-b6ce-afed9fdbe7ab",
  title: "Desde mi interior",
  artist: "Hilsson",
  key: "C",
  bpm: 100,
  compas: "4/4",
  duration: 374,
  cover: "linear-gradient(135deg,#4c1d95,#2563eb)",
  audioKey: "audios/5bd96ffd-3884-440b-981b-02a6f10d2a09",
  chordpro: "[INTRO]\n[F]Mil veces",
  lyricsImageKey: null,
  coverKey: "portadas/0c1f2b9e-portada",
  tipoId: "t-adoracion",
  tipo: { id: "t-adoracion", nombre: "Adoración" },
  trackCount: 2,
  links: [
    { url: "https://drive.google.com/partitura", order: 0 },
    { url: "https://youtu.be/pORjEfnPALk?si=x", order: 1 },
    { url: "https://www.youtube.com/watch?v=aaaaaaaaaaa", order: 2 },
  ],
  tags: [
    { id: "t1", valor: "Júbilo" },
    { id: "t2", valor: "Adoración" },
  ],
  playStats: [
    { month: "2026-08", plays: 2 },
    { month: "2026-09", plays: 6 },
  ],
  fechaHoraAlta: "2026-09-24T02:36:49.531Z",
};

describe("mapSong — canción del backend → canción de la UI", () => {
  it("los temas {id, valor}[] pasan a una lista de nombres", () => {
    expect(mapSong(raw).tags).toEqual(["Júbilo", "Adoración"]);
  });

  it("las reproducciones {month, plays}[] pasan a un objeto por mes", () => {
    expect(mapSong(raw).playsByMonth).toEqual({ "2026-08": 2, "2026-09": 6 });
  });

  it("sin playStats (respuesta vieja de POST /canciones) queda sin reproducciones, sin romper", () => {
    const { playStats: _, ...sinStats } = raw;
    expect(mapSong(sinStats).playsByMonth).toEqual({});
  });

  it("audioKey: se conserva la key (no es una URL) y null si no hay audio", () => {
    expect(mapSong(raw).audioKey).toBe("audios/5bd96ffd-3884-440b-981b-02a6f10d2a09");
    expect(mapSong({ ...raw, audioKey: null }).audioKey).toBeNull();
  });

  it("coverKey: se conserva la key de la portada; null o ausente (backend viejo) → null", () => {
    expect(mapSong(raw).coverKey).toBe("portadas/0c1f2b9e-portada");
    expect(mapSong({ ...raw, coverKey: null }).coverKey).toBeNull();
    const { coverKey: _, ...sinCampo } = raw;
    expect(mapSong(sinCampo).coverKey).toBeNull();
  });

  it("tipo: se toma el id y el nombre; backend viejo sin tipo → vacío, sin romper", () => {
    expect(mapSong(raw)).toMatchObject({ tipoId: "t-adoracion", tipo: "Adoración" });
    const { tipoId: _a, tipo: _b, ...sinTipo } = raw;
    expect(mapSong(sinTipo)).toMatchObject({ tipoId: "", tipo: "" });
  });

  it("trackCount (secuencia): se copia; ausente (backend viejo) → 0", () => {
    expect(mapSong(raw).trackCount).toBe(2);
    const { trackCount: _, ...sinCampo } = raw;
    expect(mapSong(sinCampo).trackCount).toBe(0);
  });

  it("youtubeVideoId: el del primer link de YouTube (los otros links no cuentan); sin links → null", () => {
    expect(mapSong(raw).youtubeVideoId).toBe("pORjEfnPALk");
    expect(mapSong({ ...raw, links: [] }).youtubeVideoId).toBeNull();
    const { links: _, ...sinLinks } = raw;
    expect(mapSong(sinLinks).youtubeVideoId).toBeNull();
    expect(
      mapSong({ ...raw, links: [{ url: "https://www.youtube.com/watch?v=roto", order: 0 }] })
        .youtubeVideoId,
    ).toBeNull();
  });

  it("fechaHoraAlta pasa a addedAt y el resto de los campos se copian igual", () => {
    expect(mapSong(raw)).toMatchObject({
      id: raw.id,
      title: "Desde mi interior",
      artist: "Hilsson",
      key: "C",
      bpm: 100,
      compas: "4/4",
      duration: 374,
      chordpro: raw.chordpro,
      lyricsImageKey: null,
      addedAt: "2026-09-24T02:36:49.531Z",
    });
  });

  it("si falta el compás (canción anterior a ese campo), usa 4/4", () => {
    expect(mapSong({ ...raw, compas: undefined as unknown as string }).compas).toBe("4/4");
  });
});
