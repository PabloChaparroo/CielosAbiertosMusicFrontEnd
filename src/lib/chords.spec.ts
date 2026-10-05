import { describe, expect, it } from "vitest";
import {
  chartBars,
  chordsOnly,
  diatonicChords,
  packChartRows,
  parseChordPro,
  semitonesBetween,
  transposeChord,
  transposeChordPro,
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
    expect(transposeKey("C", 3)).toBe("Eb");
    expect(transposeKey("Am", 3)).toBe("Cm");
    expect(transposeKey("G", -7)).toBe("C");
  });

  it("los tonos con bemol conservan su nombre (Eb, Ab, Bb): si no, la hoja salía con sostenidos", () => {
    expect(transposeKey("Eb", 0)).toBe("Eb");
    expect(transposeKey("Bb", 0)).toBe("Bb");
    expect(transposeKey("Ab", 0)).toBe("Ab");
    expect(transposeKey("C#m", -3)).toBe("Bbm");
    expect(transposeKey("F#", 0)).toBe("F#");
    expect(transposeKey("C#", 0)).toBe("C#");
    // la hoja de una canción en Eb, sin transponer, muestra Eb y Ab
    const lines = parseChordPro("[Eb] [Ab] [Cm7] - [Bb]", 0, transposeKey("Eb", 0));
    const chords = lines.flatMap((l) => (l.kind === "line" ? l.pairs.map((p) => p.chord) : []));
    expect(chords.filter(Boolean)).toEqual(["Eb", "Ab", "Cm7", "Bb"]);
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

  it("en Dm (menor): Dm Edim F Gm Am Bb C — no los de D mayor", () => {
    expect(diatonicChords("Dm")).toEqual(["Dm", "Edim", "F", "Gm", "Am", "Bb", "C"]);
  });

  it("en Em y Bm (menores con sostenidos)", () => {
    expect(diatonicChords("Em")).toEqual(["Em", "F#dim", "G", "Am", "Bm", "C", "D"]);
    expect(diatonicChords("Bm")).toEqual(["Bm", "C#dim", "D", "Em", "F#m", "G", "A"]);
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

  it("interpreta una marca entre guiones arriba del acorde y la conserva al transponer", () => {
    const [line] = parseChordPro("[-|||-G] [A]", 2, "A");
    expect(line).toMatchObject({
      kind: "line",
      pairs: [
        { chord: "A", above: "|||" },
        { chord: "B" },
      ],
    });
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

describe("packChartRows — Solo acordes: filas de 4 compases, repeticiones con :]", () => {
  const chart = (...rows: string[]) =>
    packChartRows(chordsOnly(parseChordPro(rows.join("\n"), 0, "D")));
  const barsOf = (line: ParsedLine) => (line.kind === "line" ? chartBars(line.pairs) : []);
  const endOf = (line: ParsedLine) =>
    line.kind === "line" ? line.pairs.at(-1)!.text || line.pairs.at(-1)!.chord : null;

  it("el verso de Pablo: el '-' solo donde está escrito; filas de 4; dos filas iguales → :]", () => {
    const lines = chart(
      "{Verso}",
      "[A]Tu eres el principio[D] Tuya es la eternidad",
      "[A/C#]- Llamaste el mundo a existe[F#m]cia Me acerco a [D]ti",
      "[A]Moriste por mis fracasos [D]Llevaste mi culpa en la cruz",
      "[A/C#]- Cargaste en tus h[F#m]ombros mi carga [D]Me acerco a [A]ti",
      "¿[D]Que puedo hace[Bm]r? ¿que puedo [F#m]decir?",
    );
    expect(lines.map(barsOf)).toEqual([[], ["A", "D", "A/C# - F#m", "D"], ["A", "D", "Bm", "F#m"]]);
    expect(endOf(lines[1]!)).toBe(":]");
  });

  it("sin '-' escrito, dos acordes de una línea son dos compases", () => {
    expect(chart("[A]Tu eres el principio[D] Tuya es").map(barsOf)).toEqual([["A", "D"]]);
  });

  it("líneas de distinto largo se acomodan corridas de a 4", () => {
    expect(chart("[D] [A]", "[G]", "[Bm] [G] [Em]", "[A]").map(barsOf)).toEqual([
      ["D", "A", "G", "Bm"],
      ["G", "Em", "A"],
    ]);
  });

  it("tres filas iguales → x3; los renglones vacíos en el medio no cortan", () => {
    const lines = chart(
      "[D] [Bm] [G] [D] - [A]",
      "",
      "[D] [Bm] [G] [D] - [A]",
      "[D] [Bm] [G] [D] - [A]",
    );
    expect(lines.map(barsOf)).toEqual([["D", "Bm", "G", "D - A", "x3"]]);
  });

  it("el coro de 'Al estar ante ti': las dos vueltas → filas con :]", () => {
    const vuelta = [
      "[D/F#]- Digno es el co[G]rdero de[D/F#] Dios",
      "El que fue i[G]nmolad - [A/C#]o en la cru[Bm]z -",
      "Dig[A]no de l[G]a - h[A/C#]onra y el[D] poder",
      "La sa[Em]biduria suya [A] es",
    ];
    const lines = chart("{Coro}", ...vuelta, "", ...vuelta, "[C] [A4]");
    // la vuelta (9 compases) va una vez, en filas de 4, con ":]" al final; después sigue el resto
    expect(lines.map(barsOf)).toEqual([
      [],
      ["D/F# - G", "D/F#", "G - A/C#", "Bm"],
      ["A", "G - A/C#", "D", "Em"],
      ["A"],
      ["C", "A4"],
    ]);
    expect(endOf(lines[3]!)).toBe(":]");
  });

  it("el coro de Pablo: | D - A | E - F#m | tres veces seguidas → x3, y sigue el final", () => {
    const lines = chart(
      "{Coro}",
      "A[D]qui - esto[A]y con [E]manos - al[F#m]zadas vengo",
      "[D]Pues - [A]tu tod[E]o lo diste por - [F#m]mi",
      "[D]Aqui estoy - [A]mi alma a[E] ti - entr[F#m]ego",
      "[D]Tuyo - s[A]oy s[E]eñor",
    );
    expect(lines.map(barsOf)).toEqual([[], ["D - A", "E - F#m", "x3"], ["D - A", "E"]]);
  });

  it("cuatro veces la misma mitad → x4 (no :] de una fila de 4)", () => {
    const lines = chart("[D] [A] [D] [A]", "[D] [A] [D] [A]");
    expect(lines.map(barsOf)).toEqual([["D", "A", "x4"]]);
  });

  it("una vuelta de 4 compases repetida 2 veces en medio de otras", () => {
    const lines = chart("[E] [F#m] [D] [A]", "[D] [Bm] [G] [A]", "[D] [Bm] [G] [A]", "[E]");
    expect(lines.map(barsOf)).toEqual([["E", "F#m", "D", "A"], ["D", "Bm", "G", "A"], ["E"]]);
    expect(endOf(lines[1]!)).toBe(":]");
  });

  it("una sección corta el tramo", () => {
    expect(chart("[D] [A]", "{Coro}", "[D] [A]").map(barsOf)).toEqual([["D", "A"], [], ["D", "A"]]);
  });

  it("las líneas con ':]', marcas o notas se respetan tal cual", () => {
    expect(chart("[D] [A] :]", "[G] [A]").map(barsOf)).toEqual([
      ["D", "A"],
      ["G", "A"],
    ]);
    expect(chart("[D] [A] [x3]", "[G]")).toHaveLength(2);
    expect(chart("[D] (suave) [A]", "[G]")).toHaveLength(2);
  });

  it("el % es un compás más", () => {
    expect(chart("[Em]Solo Tú tienes pa[%]labras", "[G]de vida [A]eterna").map(barsOf)).toEqual([
      ["Em", "%", "G", "A"],
    ]);
  });
});

describe("transposeChordPro", () => {
  it("pasa los acordes al tono nuevo y deja la letra igual", () => {
    expect(transposeChordPro("[C]Al esta[G]r ante ti\nEn[G/B]tre [Am]la", 2, "D")).toBe(
      "[D]Al esta[A]r ante ti\nEn[A/C#]tre [Bm]la",
    );
  });

  it("no toca secciones ni marcas (Baja Tono empieza con B)", () => {
    expect(
      transposeChordPro("{Coro}\n[Intro]\n[G] [%] :] [x3] [Sube Tono] [Baja Tono]", 2, "A"),
    ).toBe("{Coro}\n[Intro]\n[A] [%] :] [x3] [Sube Tono] [Baja Tono]");
  });

  it("acordes con extensiones y entre paréntesis", () => {
    expect(transposeChordPro("[Am7b5] [G4] [C9] [(E)]", -2, "Bb")).toBe("[Gm7b5] [F4] [Bb9] [(D)]");
  });

  it("bemoles o sostenidos según el tono de destino", () => {
    expect(transposeChordPro("[C] [F] [G]", 3, "Eb")).toBe("[Eb] [Ab] [Bb]");
    expect(transposeChordPro("[C] [F] [G]", 4, "E")).toBe("[E] [A] [B]");
  });

  it("sin cambio de tono (0 o 12 semitonos) devuelve el texto tal cual", () => {
    expect(transposeChordPro("[Db] [C#]", 12, "C")).toBe("[Db] [C#]");
  });
});
