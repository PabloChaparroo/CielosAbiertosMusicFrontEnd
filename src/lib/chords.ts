import { isChord } from "./chords-over-lyrics";

const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export const KEYS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
  "Am",
  "Bm",
  "Cm",
  "C#m",
  "Dm",
  "Em",
  "Fm",
  "F#m",
  "Gm",
  "G#m",
];

function rootIndex(root: string): number {
  const s = SHARP.indexOf(root);
  if (s >= 0) return s;
  return FLAT.indexOf(root);
}

function shouldUseFlats(key: string): boolean {
  return key.includes("b") || ["F", "Fm", "Dm", "Gm", "Cm"].includes(key);
}

/** Transposes a single chord symbol, e.g. "Em7/G" */
export function transposeChord(chord: string, semitones: number, targetKey = "C"): string {
  if (!chord) return chord;
  return chord
    .split("/")
    .map((part) => {
      const m = part.match(/^([A-G][#b]?)(.*)$/);
      if (!m) return part;
      const idx = rootIndex(m[1]!);
      if (idx < 0) return part;
      const next = (((idx + semitones) % 12) + 12) % 12;
      const scale = shouldUseFlats(targetKey) ? FLAT : SHARP;
      return scale[next]! + (m[2] ?? "");
    })
    .join("/");
}

export function semitonesBetween(from: string, to: string): number {
  const a = rootIndex(from.replace("m", ""));
  const b = rootIndex(to.replace("m", ""));
  if (a < 0 || b < 0) return 0;
  return (((b - a) % 12) + 12) % 12;
}

/**
 * Tonos que se escriben con bemol (mismos nombres que KEYS): Eb, Ab, Bb mayores; Ebm, Bbm menores.
 * Importa porque la hoja decide sostenidos o bemoles según el nombre del tono (shouldUseFlats):
 * si "Eb" se llamara "D#", una canción en Eb mostraría D# y G# en vez de Eb y Ab.
 */
const FLAT_MAJOR_ROOTS = new Set([3, 8, 10]);
const FLAT_MINOR_ROOTS = new Set([3, 10]);

export function transposeKey(key: string, semitones: number): string {
  const minor = key.endsWith("m");
  const root = minor ? key.slice(0, -1) : key;
  const idx = rootIndex(root);
  if (idx < 0) return key;
  const next = (((idx + semitones) % 12) + 12) % 12;
  const flat = (minor ? FLAT_MINOR_ROOTS : FLAT_MAJOR_ROOTS).has(next);
  return (flat ? FLAT : SHARP)[next]! + (minor ? "m" : "");
}

export function diatonicChords(key: string): string[] {
  const minor = key.endsWith("m");
  const root = key.replace(/m$/, "");
  const idx = rootIndex(root);
  if (idx < 0) return [];
  const scale = shouldUseFlats(key) ? FLAT : SHARP;
  // tono menor: escala menor natural (Dm → Dm Edim F Gm Am Bb C); mayor: D → D Em F#m G A Bm C#dim
  const intervals = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const qualities = minor ? ["m", "dim", "", "m", "m", "", ""] : ["", "m", "m", "", "", "m", "dim"];
  return intervals.map((interval, index) => {
    const note = scale[(idx + interval) % 12]!;
    return `${note}${qualities[index]}`;
  });
}

export interface ChordPair {
  chord: string;
  text: string;
  /** Anotación "(…)" en esta posición de la línea, ej. "coro 2 | E |" — si está, chord y text van vacíos */
  note?: string;
}
/** `notes` de una sección: anotaciones escritas al lado del título, ej. "[CORO] (suave)" */
export type ParsedLine =
  | { kind: "section"; label: string; notes: string[] }
  | { kind: "blank" }
  | { kind: "line"; pairs: ChordPair[] };

const NOTE_PATTERN = /\(([^()\n]+)\)/g;

/** Separa las anotaciones "(…)" del resto de la línea */
function extractNotes(line: string): { text: string; notes: string[] } {
  const notes = [...line.matchAll(NOTE_PATTERN)].map((match) => match[1]!.trim()).filter(Boolean);
  const text = notes.length ? line.replace(NOTE_PATTERN, "").replace(/\s+$/, "") : line;
  return { text, notes };
}

/** Parte el texto de un acorde en tramos de texto y notas "(…)", respetando dónde se escribieron */
function splitNotes(chord: string, text: string): ChordPair[] {
  const out: ChordPair[] = [];
  let last = 0;
  for (const match of text.matchAll(NOTE_PATTERN)) {
    const before = text.slice(last, match.index);
    if (out.length === 0 ? chord || before : before) {
      out.push({ chord: out.length === 0 ? chord : "", text: before });
    }
    const note = match[1]!.trim();
    if (note) out.push({ chord: "", text: "", note });
    last = match.index + match[0].length;
  }
  const rest = text.slice(last);
  if (out.length === 0 || rest) out.push({ chord: out.length === 0 ? chord : "", text: rest });
  return out;
}

/**
 * Marcas de la hoja que van entre corchetes pero no son acordes: repeticiones ("x3", "x4")
 * e indicaciones con espacios ("Sube Tono", "Baja Tono"). No se transponen — "Baja Tono"
 * empieza con B — y en "Solo acordes" no abren un compás nuevo.
 */
export function isChartMarker(value: string): boolean {
  const trimmed = value.trim();
  return /^x\d+$/i.test(trimmed) || /\s/.test(trimmed);
}

export function isSectionLabel(value: string): boolean {
  return !/^[A-G](?:#|b)?(?:m|min|maj|sus|add|dim|aug)?\d*(?:\/[A-G](?:#|b)?)?$/.test(value.trim());
}

/** true si la línea (sin notas) es un título de sección entre corchetes, ej. "[CORO]" */
function isSectionLine(bare: string): boolean {
  const match = bare.match(/^\[([^\]]+)\]$/);
  return !!match && match[1]!.trim() !== "%" && isSectionLabel(match[1]!);
}

/**
 * Letra para mostrar en Letras (pantalla y PDF): solo la letra y los títulos de sección, sin
 * nada que sea para músicos — acordes, notas "(…)", ":]", los "-" que unen acordes y las
 * marcas ("%", "x3", "Sube Tono"). Una línea que solo tenía eso no se muestra.
 */
export function displayLyricsLines(
  body: string,
): Array<{ kind: "section" | "text"; value: string }> {
  return body.split("\n").flatMap<{ kind: "section" | "text"; value: string }>((raw) => {
    const line = raw.replace(/\r/g, "");
    const bare = extractNotes(line).text.trim();
    const braceSection = bare.match(/^\{(.+)\}$/);
    if (braceSection) return [{ kind: "section" as const, value: braceSection[1]!.toUpperCase() }];
    const bracketSection = bare.match(/^\[([^\]]+)\]$/);
    if (
      bracketSection &&
      bracketSection[1]!.trim() !== "%" &&
      !isChartMarker(bracketSection[1]!) &&
      isSectionLabel(bracketSection[1]!)
    ) {
      return [{ kind: "section" as const, value: bracketSection[1]!.toUpperCase() }];
    }
    const text = bare
      .replace(/\[[^\]]+\]/g, "")
      .replace(/:\]/g, "")
      .replace(/(^|\s)-(?=\s|$)/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!text && line.trim()) return [];
    return [{ kind: "text" as const, value: text }];
  });
}

export function parseChordPro(body: string, semitones: number, targetKey: string): ParsedLine[] {
  const sourceLines = body.split("\n").map((raw) => raw.replace(/\r/g, ""));
  const normalizedLines: string[] = [];

  for (let index = 0; index < sourceLines.length; index += 1) {
    const current = sourceLines[index]!;
    // las notas "(…)" no cuentan para decidir si es una línea de solo acordes; un título de
    // sección ("[CORO]") tampoco lo es — si no, se unía con la letra siguiente como si fuera un acorde
    const currentBare = extractNotes(current).text.trim();
    const chordOnly =
      currentBare && !isSectionLine(currentBare) && /^(?:\[[^\]]+\]\s*)+$/.test(currentBare);
    const next = sourceLines[index + 1];
    const nextText = next === undefined ? "" : extractNotes(next).text.trim();
    const nextIsLyrics = nextText && !nextText.startsWith("[") && !nextText.startsWith("{");

    if (chordOnly && next !== undefined && nextIsLyrics) {
      normalizedLines.push(`${current}${next}`);
      index += 1;
    } else {
      normalizedLines.push(current);
    }
  }

  return normalizedLines.map((line) => {
    if (!line.trim()) return { kind: "blank" as const };
    const { text: bare, notes } = extractNotes(line);
    const section = bare.trim().match(/^\{(.+)\}$/);
    if (section) return { kind: "section" as const, label: section[1]!.toUpperCase(), notes };
    const bracketSection = bare.trim().match(/^\[([^\]]+)\]$/);
    if (bracketSection && bracketSection[1]!.trim() !== "%" && isSectionLabel(bracketSection[1]!)) {
      return { kind: "section" as const, label: bracketSection[1]!.toUpperCase(), notes };
    }

    const pairs: ChordPair[] = [];
    const regex = /\[([^\]]+)\]/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line))) {
      const before = line.slice(last, match.index);
      if (before) pairs.push(...splitNotes("", before));
      const next = regex.lastIndex;
      const nextMatch = line.slice(next).search(/\[/);
      const text = nextMatch === -1 ? line.slice(next) : line.slice(next, next + nextMatch);
      const raw = match[1]!;
      const chord =
        raw.trim() === "%" || isChartMarker(raw)
          ? raw.trim()
          : transposeChord(raw, semitones, targetKey);
      pairs.push(...splitNotes(chord, text));
      last = next + (nextMatch === -1 ? line.length : nextMatch);
      regex.lastIndex = last;
    }
    if (pairs.length === 0) pairs.push(...splitNotes("", line));
    return { kind: "line" as const, pairs };
  });
}

/**
 * Compases de una línea de "Solo acordes": acordes unidos por "-" van en el mismo compás.
 * "[D] [Bm] [G] [D] - [A]" → ["D", "Bm", "G", "D - A"]
 */
export function chartBars(pairs: ChordPair[]): string[] {
  const bars: string[][] = [];
  let joinsNext = false;
  pairs.forEach((pair) => {
    if (pair.chord) {
      if (joinsNext && bars.length) bars[bars.length - 1]!.push(pair.chord);
      else bars.push([pair.chord]);
      joinsNext = false;
    }
    if (pair.text.includes("-")) joinsNext = true;
  });
  return bars.map((bar) => bar.join(" - "));
}

/**
 * Línea de acordes "simple": sin ":]", marcas ("x3", "Sube Tono") ni notas "(…)" — las que el
 * usuario anotó así se respetan tal cual y no se comprimen.
 */
export function isSimpleChartLine(pairs: ChordPair[]): boolean {
  return (
    pairs.some((p) => p.chord) &&
    !pairs.some((p) => p.note || (p.chord && isChartMarker(p.chord)) || p.text.includes(":]"))
  );
}

/** Compases por fila en "Solo acordes" */
const BARS_PER_ROW = 4;

/** "A/C# - F#m" → pares { A/C#, "-" } { F#m, "" } (un compás armado de nuevo como línea) */
function barPairs(bar: string): ChordPair[] {
  const chords = bar.split(" - ");
  return chords.map((chord, k) => ({ chord, text: k < chords.length - 1 ? "-" : "" }));
}

/** Una vuelta tiene que tener al menos esto para escribirse con ":]" / "x3" (un solo acorde, no) */
const MIN_REPEAT_BARS = 2;

/**
 * Desde el compás `start`: la vuelta que se repite seguida cubriendo más compases (de
 * MIN_REPEAT_BARS o más) y cuántas veces; si no hay, una fila común (hasta 4 compases, 1 vez).
 */
function repeatAt(bars: string[], start: number): { period: number; times: number } {
  let best = { period: Math.min(BARS_PER_ROW, bars.length - start), times: 1 };
  for (let period = MIN_REPEAT_BARS; start + period * 2 <= bars.length; period += 1) {
    let times = 1;
    while (
      start + period * (times + 1) <= bars.length &&
      bars
        .slice(start + period * times, start + period * (times + 1))
        .every((bar, k) => bar === bars[start + k])
    )
      times += 1;
    if (times > 1 && period * times > best.period * best.times) best = { period, times };
  }
  return best;
}

/**
 * "Solo acordes" como hoja de ensayo (pedido de Pablo): cada acorde es un compás — dos acordes
 * van juntos solo si el texto tiene un "-" escrito entre ellos — y los compases de una sección se
 * acomodan corridos en filas de 4, sin importar cuántos acordes tenga cada línea de la letra.
 * Si una vuelta (de 2 compases o más) se repite seguida, se escribe una vez —en sus filas de 4— con
 * ":]" al final (2 veces) o "x3", "x4"…; después sigue lo que viene.
 *
 * El tramo lo cortan las secciones y las líneas que no son "simples" (notas "(…)", marcas como
 * "x3" o "Sube Tono", o un ":]" escrito a mano): esas se respetan tal cual. Las líneas vacías
 * no cortan (un coro con un renglón en blanco entre las dos vueltas sigue siendo uno).
 */
export function packChartRows(lines: ParsedLine[]): ParsedLine[] {
  const out: ParsedLine[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.kind !== "line" || !isSimpleChartLine(line.pairs)) {
      out.push(line);
      i += 1;
      continue;
    }
    // compases de las líneas simples del tramo (saltando las vacías)
    const bars: string[] = [];
    let last = i;
    for (let j = i; j < lines.length; j += 1) {
      const next = lines[j]!;
      if (next.kind === "blank") continue;
      if (next.kind !== "line" || !isSimpleChartLine(next.pairs)) break;
      bars.push(...chartBars(next.pairs));
      last = j;
    }
    for (let s = 0; s < bars.length;) {
      const { period, times } = repeatAt(bars, s);
      const block = bars.slice(s, s + period);
      for (let k = 0; k < block.length; k += BARS_PER_ROW) {
        const pairs = block.slice(k, k + BARS_PER_ROW).flatMap(barPairs);
        // la repetición va al final de la última fila de la vuelta
        if (k + BARS_PER_ROW >= block.length && times === 2)
          pairs[pairs.length - 1] = { ...pairs[pairs.length - 1]!, text: ":]" };
        else if (k + BARS_PER_ROW >= block.length && times > 2)
          pairs.push({ chord: `x${times}`, text: "" });
        out.push({ kind: "line", pairs });
      }
      s += period * times;
    }
    i = last + 1;
  }
  return out;
}

export function chordsOnly(lines: ParsedLine[]): ParsedLine[] {
  return lines.map((l) =>
    l.kind === "line"
      ? {
          ...l,
          pairs: l.pairs.map((p) =>
            p.note
              ? p
              : {
                  chord: p.chord,
                  text: p.text.includes(":]") ? ":]" : p.text.includes("-") ? "-" : "",
                },
          ),
        }
      : l,
  );
}

/**
 * Reescribe los acordes del texto del cancionero en otro tono ("[G]Santo" → "[A]Santo" con +2),
 * para guardarlo así. Solo toca lo que entre corchetes es un acorde: secciones ("[Intro]"),
 * marcas ("[%]", "[x3]", "[Baja Tono]") y el resto del texto quedan igual.
 */
export function transposeChordPro(body: string, semitones: number, targetKey: string): string {
  if (!(((semitones % 12) + 12) % 12)) return body;
  return body.replace(/\[([^\]]+)\]/g, (match, inner: string) => {
    const value = inner.trim();
    if (!isChord(value)) return match;
    // "(G)" (acorde entre paréntesis) conserva los paréntesis
    const wrapped = /^\((.+)\)$/.exec(value);
    const chord = wrapped ? wrapped[1]! : value;
    const moved = transposeChord(chord, semitones, targetKey);
    return `[${wrapped ? `(${moved})` : moved}]`;
  });
}
