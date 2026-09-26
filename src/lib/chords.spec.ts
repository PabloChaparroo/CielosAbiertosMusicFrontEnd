import { describe, expect, it } from "vitest";
import {
  chartBars,
  chordsOnly,
  diatonicChords,
  mergeRepeatedChartLines,
  parseChordPro,
  semitonesBetween,
  transposeChord,
  transposeKey,
  type ParsedLine,
} from "./chords";

describe("transposeChord", () => {
  it("transponer +3 semitonos da el acorde correcto (C → D#)", () => {
    expect(transposeChord("C", 3)).toBe("D#");
    expect(transposeChord("G", 3)).toBe("A#");
    expect(transposeChord("Am", 3)).toBe("Cm");
  });

  it("en una tonalidad con bemoles escribe bemoles (C +3 en Eb → Eb)", () => {
    expect(transposeChord("C", 3, "Eb")).toBe("Eb");
    expect(transposeChord("G", 3, "F")).toBe("Bb");
  });

  it("acepta sostenidos y bemoles de entrada", () => {
    expect(transposeChord("F#", 1, "G")).toBe("G");
    expect(transposeChord("Bb", 2)).toBe("C");
    expect(transposeChord("Eb", -1, "D")).toBe("D");
  });

  it("conserva la calidad del acorde (m7, maj7, sus4, dim…)", () => {
    expect(transposeChord("Em7", 2, "D")).toBe("F#m7");
    expect(transposeChord("Cmaj7", 5, "F")).toBe("Fmaj7");
    expect(transposeChord("Dsus4", 2)).toBe("Esus4");
    expect(transposeChord("Bdim", 1)).toBe("Cdim");
  });

  it("transpone las dos partes de un acorde con bajo (D/F# → E/G#)", () => {
    expect(transposeChord("D/F#", 2, "E")).toBe("E/G#");
    expect(transposeChord("C/E", -2, "Bb")).toBe("Bb/D");
  });

  it("los semitonos negativos y de más de una octava dan la vuelta", () => {
    expect(transposeChord("C", -1)).toBe("B");
    expect(transposeChord("A", 12)).toBe("A");
    expect(transposeChord("A", 14)).toBe("B");
    expect(transposeChord("E", 0)).toBe("E");
  });

  it("ida y vuelta: +n y después −n (volviendo a la tonalidad original) da el acorde original", () => {
    const cases: Array<[string, number, string, string]> = [
      // [acorde, semitonos, tonalidad destino, tonalidad original]
      ["Bb", 2, "G", "F"],
      ["F#m", 3, "A", "D"],
      ["Eb/G", 5, "Ab", "Eb"],
      ["C#dim", -4, "A", "D"],
    ];
    for (const [chord, n, target, original] of cases) {
      expect(transposeChord(transposeChord(chord, n, target), -n, original)).toBe(chord);
    }
  });

  it("un acorde inválido o que no es acorde no rompe y queda igual", () => {
    for (const value of ["N.C.", "H", "x3", "%", "", "123", "?"]) {
      expect(transposeChord(value, 3)).toBe(value);
    }
  });
});

describe("transposeKey / semitonesBetween", () => {
  it("transpone tonalidades mayores y menores", () => {
    expect(transposeKey("C", 3)).toBe("D#");
    expect(transposeKey("Am", 3)).toBe("Cm");
    expect(transposeKey("G", -7)).toBe("C");
  });

  it("una tonalidad desconocida queda igual", () => {
    expect(transposeKey("X", 2)).toBe("X");
  });

  it("calcula la distancia en semitonos (siempre hacia arriba, 0–11)", () => {
    expect(semitonesBetween("C", "E")).toBe(4);
    expect(semitonesBetween("E", "C")).toBe(8);
    expect(semitonesBetween("Am", "Cm")).toBe(3);
    expect(semitonesBetween("C", "X")).toBe(0);
  });
});

describe("diatonicChords — atajos de acordes del editor", () => {
  it("en D: D Em F#m G A Bm C#dim", () => {
    expect(diatonicChords("D")).toEqual(["D", "Em", "F#m", "G", "A", "Bm", "C#dim"]);
  });

  it("en F usa bemoles: F Gm Am Bb C Dm Edim", () => {
    expect(diatonicChords("F")).toEqual(["F", "Gm", "Am", "Bb", "C", "Dm", "Edim"]);
  });

  it("una tonalidad desconocida no da atajos", () => {
    expect(diatonicChords("X")).toEqual([]);
  });
});

describe("parseChordPro — transposición y robustez", () => {
  const chordsOf = (lines: ParsedLine[]) =>
    lines.flatMap((l) => (l.kind === "line" ? l.pairs.map((p) => p.chord).filter(Boolean) : []));

  it("transpone los acordes de la canción", () => {
    expect(chordsOf(parseChordPro("[G]Santo, [D]santo es el [Em]Señor", 2, "A"))).toEqual([
      "A",
      "E",
      "F#m",
    ]);
  });

  it("no transpone las marcas: [Baja Tono] no se convierte en 'C#aja Tono' (bug ya arreglado)", () => {
    const chords = chordsOf(parseChordPro("[G] [Sube Tono] [A] [Baja Tono] [%] :] [x3]", 2, "A"));
    expect(chords).toEqual(["A", "Sube Tono", "B", "Baja Tono", "%", "x3"]);
  });

  it("un corchete sin cerrar o vacío no rompe el parseo", () => {
    expect(() => parseChordPro("[G Santo [] santo [D]es", 2, "A")).not.toThrow();
    expect(chordsOf(parseChordPro("[G Santo [] santo [D]es", 2, "A"))).toContain("E");
  });

  it("una canción vacía da una línea en blanco, sin error", () => {
    expect(parseChordPro("", 0, "C")).toEqual([{ kind: "blank" }]);
  });

  it("un título de sección no se toma como acorde ni se transpone", () => {
    const [section] = parseChordPro("[CORO]\nDios eterno", 5, "F");
    expect(section).toEqual({ kind: "section", label: "CORO", notes: [] });
  });
});

describe("mergeRepeatedChartLines — Solo acordes: líneas seguidas con los mismos compases", () => {
  const chart = (body: string) => mergeRepeatedChartLines(chordsOnly(parseChordPro(body, 0, "D")));
  const barsOf = (line: ParsedLine) => (line.kind === "line" ? chartBars(line.pairs) : []);

  it("el verso de 'A quién iré' (3 veces | D | Bm | G | D - A |) queda en una sola línea", () => {
    const lines = chart(
      [
        "{Verso}",
        "[D]¿A quién iré en necesi[Bm]dad?",
        "[G]¿A quién iré en busca de [D]paz? - [A]",
        "[D]¿Y quién podrá mi vida sa[Bm]ciar de verdad?",
        "[G]¿Quién más tendrá de mí compa[D]sión? - [A]",
        "[D]¿Y entenderá mi cora[Bm]zón?",
        "[G]¿Quién cambiará mi eterni[D]dad? sino - [A]Tú, Jesús.",
      ].join("\n"),
    );
    expect(lines).toHaveLength(2);
    expect(barsOf(lines[1]!)).toEqual([
      ...["D", "Bm", "G", "D - A"],
      ...["D", "Bm", "G", "D - A"],
      ...["D", "Bm", "G", "D - A"],
    ]);
  });

  it("dos líneas iguales seguidas se juntan", () => {
    const lines = chart("[F] [C] [G]\n[F] [C] [G]");
    expect(lines).toHaveLength(1);
    expect(barsOf(lines[0]!)).toEqual(["F", "C", "G", "F", "C", "G"]);
  });

  it("si la última vuelta es distinta, solo se junta lo que se repite", () => {
    const lines = chart("[D] [Bm]\n[D] [Bm]\n[G] [A]");
    expect(lines.map(barsOf)).toEqual([
      ["D", "Bm", "D", "Bm"],
      ["G", "A"],
    ]);
  });

  it("líneas distintas quedan como están", () => {
    expect(chart("[D] [Bm]\n[G] [A]").map(barsOf)).toEqual([
      ["D", "Bm"],
      ["G", "A"],
    ]);
  });

  it("una sección o una línea vacía cortan el tramo", () => {
    expect(chart("[D] [A]\n{Coro}\n[D] [A]")).toHaveLength(3);
    expect(chart("[D] [A]\n\n[D] [A]")).toHaveLength(3);
  });

  it("las líneas con ':]', marcas o notas se respetan y no se juntan", () => {
    expect(chart("[D] [A] :]\n[D] [A] :]")).toHaveLength(2);
    expect(chart("[D] [A] [x3]\n[D] [A] [x3]")).toHaveLength(2);
    expect(chart("[D] (suave) [A]\n[D] (suave) [A]")).toHaveLength(2);
  });
});
