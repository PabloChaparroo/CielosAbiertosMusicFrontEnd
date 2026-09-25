import { describe, expect, it } from "vitest";
import { mapSetlist, type RawSetlist } from "./setlists.service";

/** Un setlist tal como lo devuelve GET /setlists del backend (ítems en cualquier orden) */
const raw: RawSetlist = {
  id: "s1",
  title: "Culto del domingo",
  date: "2026-09-27T10:00:00.000Z",
  isUpcoming: true,
  fechaHoraAlta: "2026-09-20T12:00:00.000Z",
  type: "Culto Domingo",
  leader: { id: "lider" },
  team: [{ id: "lider" }, { id: "bajista" }],
  items: [
    { key: "D", note: null, position: 2, song: { id: "cancion-c" } },
    { key: "G", note: "empezar suave", position: 0, song: { id: "cancion-a" } },
    { key: "F#", note: "", position: 1, song: { id: "cancion-b" } },
  ],
};

describe("mapSetlist — setlist del backend → setlist de la UI", () => {
  it("ordena las canciones por su posición, no por cómo llegan", () => {
    expect(mapSetlist(raw).items.map((i) => i.songId)).toEqual([
      "cancion-a",
      "cancion-b",
      "cancion-c",
    ]);
  });

  it("conserva la tonalidad de cada canción y la nota solo si tiene texto", () => {
    expect(mapSetlist(raw).items).toEqual([
      { songId: "cancion-a", key: "G", note: "empezar suave" },
      { songId: "cancion-b", key: "F#" },
      { songId: "cancion-c", key: "D" },
    ]);
  });

  it("líder y equipo pasan a sus ids", () => {
    expect(mapSetlist(raw)).toMatchObject({ leaderId: "lider", teamIds: ["lider", "bajista"] });
  });

  it("copia los datos del setlist y fechaHoraAlta pasa a createdAt", () => {
    expect(mapSetlist(raw)).toMatchObject({
      id: "s1",
      title: "Culto del domingo",
      date: "2026-09-27T10:00:00.000Z",
      type: "Culto Domingo",
      isUpcoming: true,
      createdAt: "2026-09-20T12:00:00.000Z",
    });
  });

  it("sin isUpcoming ni fechaHoraAlta (setlists anteriores a esos campos): no es 'próximo' y no inventa fecha", () => {
    const { isUpcoming: _u, fechaHoraAlta: _f, ...viejo } = raw;
    const mapped = mapSetlist(viejo);
    expect(mapped.isUpcoming).toBe(false);
    expect("createdAt" in mapped).toBe(false);
  });

  it("no modifica el orden del objeto original que devolvió el backend", () => {
    const copy = structuredClone(raw);
    mapSetlist(copy);
    expect(copy.items.map((i) => i.position)).toEqual([2, 0, 1]);
  });
});
