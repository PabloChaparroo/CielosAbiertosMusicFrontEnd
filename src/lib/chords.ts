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

export function transposeKey(key: string, semitones: number): string {
  const minor = key.endsWith("m");
  const root = minor ? key.slice(0, -1) : key;
  const idx = rootIndex(root);
  if (idx < 0) return key;
  const next = (((idx + semitones) % 12) + 12) % 12;
  return SHARP[next]! + (minor ? "m" : "");
}

export function diatonicChords(key: string): string[] {
  const root = key.replace(/m$/, "");
  const idx = rootIndex(root);
  if (idx < 0) return [];
  const scale = shouldUseFlats(key) ? FLAT : SHARP;
  const intervals = [0, 2, 4, 5, 7, 9, 11];
  const qualities = ["", "m", "m", "", "", "m", "dim"];
  return intervals.map((interval, index) => {
    const note = scale[(idx + interval) % 12]!;
    return `${note}${qualities[index]}`;
  });
}

export interface ChordPair {
  chord: string;
  text: string;
}
export type ParsedLine =
  { kind: "section"; label: string } | { kind: "blank" } | { kind: "line"; pairs: ChordPair[] };

export function isSectionLabel(value: string): boolean {
  return !/^[A-G](?:#|b)?(?:m|min|maj|sus|add|dim|aug)?\d*(?:\/[A-G](?:#|b)?)?$/.test(value.trim());
}

export function lyricsLines(body: string): Array<{ kind: "section" | "text"; value: string }> {
  return body.split("\n").map((raw) => {
    const line = raw.replace(/\r/g, "");
    const braceSection = line.trim().match(/^\{(.+)\}$/);
    const bracketSection = line.trim().match(/^\[([^\]]+)\]$/);
    const section =
      braceSection?.[1] ??
      (bracketSection && isSectionLabel(bracketSection[1]!) ? bracketSection[1] : null);
    return section
      ? { kind: "section" as const, value: section.toUpperCase() }
      : { kind: "text" as const, value: line.replace(/\[[^\]]+\]/g, "") };
  });
}

export function parseChordPro(body: string, semitones: number, targetKey: string): ParsedLine[] {
  const sourceLines = body.split("\n");
  const normalizedLines: string[] = [];

  for (let index = 0; index < sourceLines.length; index += 1) {
    const current = sourceLines[index]!;
    const chordOnly = current.trim() && /^(?:\[[^\]]+\]\s*)+$/.test(current.trim());
    const next = sourceLines[index + 1];
    const nextText = next?.trim() ?? "";
    const nextIsLyrics = nextText && !nextText.startsWith("[") && !nextText.startsWith("{");

    if (chordOnly && nextIsLyrics) {
      normalizedLines.push(`${current}${next}`);
      index += 1;
    } else {
      normalizedLines.push(current);
    }
  }

  return normalizedLines.map((raw) => {
    const line = raw.replace(/\r/g, "");
    if (!line.trim()) return { kind: "blank" as const };
    const section = line.trim().match(/^\{(.+)\}$/);
    if (section) return { kind: "section" as const, label: section[1]!.toUpperCase() };
    const bracketSection = line.trim().match(/^\[([^\]]+)\]$/);
    if (bracketSection && isSectionLabel(bracketSection[1]!)) {
      return { kind: "section" as const, label: bracketSection[1]!.toUpperCase() };
    }

    const pairs: ChordPair[] = [];
    const regex = /\[([^\]]+)\]/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line))) {
      const before = line.slice(last, match.index);
      if (before) pairs.push({ chord: "", text: before });
      const next = regex.lastIndex;
      const nextMatch = line.slice(next).search(/\[/);
      const text = nextMatch === -1 ? line.slice(next) : line.slice(next, next + nextMatch);
      pairs.push({ chord: transposeChord(match[1]!, semitones, targetKey), text });
      last = next + (nextMatch === -1 ? line.length : nextMatch);
      regex.lastIndex = last;
    }
    if (pairs.length === 0) pairs.push({ chord: "", text: line });
    return { kind: "line" as const, pairs };
  });
}

export function chordsOnly(lines: ParsedLine[]): ParsedLine[] {
  return lines.map((l) =>
    l.kind === "line" ? { ...l, pairs: l.pairs.map((p) => ({ chord: p.chord, text: "" })) } : l,
  );
}

export function plainLyrics(body: string): string {
  return lyricsLines(body)
    .map((line) => (line.kind === "section" ? `[${line.value}]` : line.value))
    .join("\n");
}
