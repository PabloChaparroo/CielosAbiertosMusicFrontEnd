import { describe, expect, it } from "vitest";
import { mapAnnotation, type RawAnnotation } from "./annotations.service";

/** Una anotación tal como la devuelve GET /anotaciones?songId=… (sin la relación `song`) */
const raw: RawAnnotation = {
  id: "a1",
  text: "La batería entra en el puente",
  fechaHoraAlta: "2026-09-25T18:00:00.000Z",
  author: { id: "11111111-0000-4000-8000-000000000003" },
};

describe("mapAnnotation — anotación del backend → anotación de la UI", () => {
  it("el autor pasa a authorId y fechaHoraAlta a createdAt", () => {
    expect(mapAnnotation(raw, "cancion-1")).toEqual({
      id: "a1",
      songId: "cancion-1",
      authorId: "11111111-0000-4000-8000-000000000003",
      text: "La batería entra en el puente",
      createdAt: "2026-09-25T18:00:00.000Z",
    });
  });

  it("el songId sale de la canción que se pidió (el backend no lo manda)", () => {
    expect(mapAnnotation(raw, "otra-cancion").songId).toBe("otra-cancion");
  });
});
