import { describe, expect, it } from "vitest";
import { trackNameFromFile } from "./track-name";

describe("trackNameFromFile — nombre de la pista a partir del archivo", () => {
  it("saca la extensión y cambia los _ por espacios", () => {
    expect(trackNameFromFile("¿Quién podrá_.mp3")).toBe("¿Quién podrá");
    expect(trackNameFromFile("Bateria__Quien_podra.wav")).toBe("Bateria Quien podra");
    expect(trackNameFromFile("Guitarra Quien Podra.m4a")).toBe("Guitarra Quien Podra");
  });
});
