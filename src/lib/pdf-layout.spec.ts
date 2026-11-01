import { describe, expect, it } from "vitest";
import { splitChordRow } from "./pdf-layout";

const row = (chordLine: string, lyricLine: string, maxCols: number) => {
  const chords = [...chordLine.matchAll(/\S+/g)].map((m) => ({
    col: m.index,
    length: m[0].length,
  }));
  return splitChordRow(chordLine, lyricLine, chords, maxCols).map((s) => [
    chordLine.slice(s.start + s.shift, s.end).trimEnd(),
    lyricLine.slice(s.start + s.shift, s.end),
  ]);
};

describe("splitChordRow — líneas largas del PDF de acordes", () => {
  it("una línea que entra queda igual", () => {
    expect(row("C       D", "la luz de Jesus", 40)).toEqual([["C       D", "la luz de Jesus"]]);
  });

  it("corta en un espacio de la letra y el acorde sigue arriba de su sílaba", () => {
    const chords = "E               E                    E/G#";
    const lyric = "la luz de Jesus, que brille en todo lugar No la puedes esconder";
    expect(row(chords, lyric, 40)).toEqual([
      ["E               E", "la luz de Jesus, que brille en todo"],
      [" E/G#", "lugar No la puedes esconder"],
    ]);
  });

  it("no parte un acorde: baja entero al renglón siguiente", () => {
    const parts = row("A          Bm7", "uno dos tres cuatro", 12);
    expect(parts.flatMap(([chords = ""]) => chords.trim().split(/\s+/))).toEqual(["A", "Bm7"]);
  });
});
