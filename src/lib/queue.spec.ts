import { describe, expect, it } from "vitest";
import { buildQueue, pickNext } from "./queue";

const song = (id: string, tipo: string, playable = true) => ({
  id,
  tipo,
  audioKey: playable ? `audio/${id}.mp3` : null,
  youtubeVideoId: null,
});
const songs = [
  song("a", "Alabanza"),
  song("b", "Adoración"),
  song("c", "Alabanza", false),
  { ...song("d", "Adoración", false), youtubeVideoId: "dQw4w9WgXcQ" },
  song("e", "Alabanza"),
];

describe("buildQueue", () => {
  it("todas: solo las reproducibles (audio o YouTube), en el orden de la lista", () => {
    expect(buildQueue(songs, "todas").map((s) => s.id)).toEqual(["a", "b", "d", "e"]);
  });
  it("filtra por tipo", () => {
    expect(buildQueue(songs, "Alabanza").map((s) => s.id)).toEqual(["a", "e"]);
    expect(buildQueue(songs, "Adoración").map((s) => s.id)).toEqual(["b", "d"]);
  });
});

describe("pickNext", () => {
  const queue = buildQueue(songs, "todas");
  it("siguiente y anterior dan la vuelta", () => {
    expect(pickNext(queue, "e", 1)?.id).toBe("a");
    expect(pickNext(queue, "a", -1)?.id).toBe("e");
    expect(pickNext(queue, "b", 1)?.id).toBe("d");
  });
  it("si la actual no está en la cola (cambió el filtro), arranca por la primera", () => {
    expect(pickNext(buildQueue(songs, "Alabanza"), "b", 1)?.id).toBe("a");
  });
  it("aleatorio nunca repite la actual", () => {
    for (const r of [0, 0.3, 0.6, 0.99])
      expect(pickNext(queue, "b", 1, true, () => r)?.id).not.toBe("b");
  });
  it("cola vacía → null", () => {
    expect(pickNext([], "a", 1)).toBeNull();
  });
});
