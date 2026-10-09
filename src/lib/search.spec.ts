import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeSearch } from "./search";

describe("búsqueda sin acentos", () => {
  it("encuentra la canción escrita sin acento, y al revés", () => {
    expect(matchesSearch("quien podra", "¿Quién Podrá?")).toBe(true);
    expect(matchesSearch("Espíritu", "Santo Espiritu")).toBe(true);
    expect(matchesSearch("CORAZON", "Mi corazón")).toBe(true);
  });

  it("mira todos los textos que se le pasan (título, artista…)", () => {
    expect(matchesSearch("marcos", "Dios Imparable", "Marcos Witt")).toBe(true);
    expect(matchesSearch("xyz", "Dios Imparable", "Marcos Witt")).toBe(false);
  });

  it("la ñ también se encuentra escrita como n", () => {
    expect(normalizeSearch("Señor")).toBe("senor");
  });
});
