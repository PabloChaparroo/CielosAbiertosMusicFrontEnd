import { describe, expect, it } from "vitest";
import { parseChordPro } from "./chords";
import { chordsOverLyricsToInline, isChord } from "./chords-over-lyrics";

describe("isChord", () => {
  it.each(["G", "G/A", "C9", "F#m7b5", "Bbmaj7", "Dsus4", "Eadd9", "A7(b9)", "C#°", "(G)"])(
    "%s es acorde",
    (token) => expect(isChord(token)).toBe(true),
  );
  it.each(["Te", "alabo", "Coro", "x2", "Amor", "Do"])("%s no es acorde", (token) =>
    expect(isChord(token)).toBe(false),
  );
});

describe("chordsOverLyricsToInline", () => {
  it("mete cada acorde en la letra según su columna", () => {
    const input = [
      "     G",
      "Te alabo en el valle",
      "     G/A        G",
      "Te alabo en el monte",
    ].join("\n");
    expect(chordsOverLyricsToInline(input)).toBe(
      ["Te al[G]abo en el valle", "Te al[G/A]abo en el m[G]onte"].join("\n"),
    );
  });

  it("acorde después del final de la letra va al final", () => {
    expect(chordsOverLyricsToInline("     D             C9\nTe alabo en el día")).toBe(
      "Te al[D]abo en el día [C9]",
    );
  });

  it("ignora la sangría de la letra", () => {
    expect(chordsOverLyricsToInline("C9                G\n   Tú estás a mi lado")).toBe(
      "[C9]Tú estás a mi l[G]ado",
    );
  });

  it("letra sin acordes y líneas en blanco quedan igual", () => {
    expect(chordsOverLyricsToInline("Te alabo en el medio\n\n\n\nOtra línea")).toBe(
      "Te alabo en el medio\n\nOtra línea",
    );
  });

  it("línea de acordes sin letra abajo queda sola, con las marcas de repetición", () => {
    expect(chordsOverLyricsToInline("G  D  Em  C  x2\n\nLetra")).toBe(
      "[G] [D] [Em] [C] x2\n\nLetra",
    );
  });

  it("encabezados de sección pasan a {Sección}", () => {
    expect(chordsOverLyricsToInline("Coro:\nG\nSanto\n[Verso 2]\nIntro: G D Em C")).toBe(
      "{Coro}\n[G]Santo\n{Verso 2}\n{Intro}\n[G] [D] [Em] [C]",
    );
  });

  it("una palabra de la letra que parece acorde no convierte la línea", () => {
    expect(chordsOverLyricsToInline("A ti te alabo")).toBe("A ti te alabo");
  });

  it("acepta tabs y fin de línea de Windows", () => {
    expect(chordsOverLyricsToInline("\tG\r\nEstando rodeado de amor")).toBe(
      "Estando [G]rodeado de amor",
    );
  });

  it("el resultado lo lee el parser de Acordes con los mismos acordes", () => {
    const lines = parseChordPro(
      chordsOverLyricsToInline("Coro:\n     G/A        G\nTe alabo en el monte"),
      0,
      "G",
    );
    expect(lines[0]).toMatchObject({ kind: "section", label: "CORO" });
    const line = lines[1]!;
    expect(line.kind === "line" && line.pairs.map((p) => p.chord).filter(Boolean)).toEqual([
      "G/A",
      "G",
    ]);
  });
});
