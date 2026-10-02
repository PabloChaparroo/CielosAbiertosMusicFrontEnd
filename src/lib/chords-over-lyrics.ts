/**
 * Pasa una canción con los acordes en la línea de arriba de la letra (el formato de las páginas
 * de acordes) al formato del cancionero, con cada acorde metido en la letra:
 *
 *       G/A        G
 *   Te alabo en el monte   →   Te al[G/A]abo en el[G] monte
 *
 * La posición de cada acorde es su columna en la línea de arriba.
 */

const CHORD =
  /^[A-G](?:#|b)?(?:maj|min|m|M|dim|aug|sus|add|°|ø|\+|-)?\d*(?:(?:maj|add|sus|M|b|#|\+|-)?\d+)*(?:\([^)]*\))?(?:\/[A-G](?:#|b)?)?$/;
/** Marcas que pueden ir en una línea de acordes sin ser acordes: |, -, x2, (x2) */
const MARKER = /^(?:\|+|-+|\(?x\d+\)?|\(?\d+x\)?)$/i;
const SECTION =
  /^(intro|verso|verse|estrofa|pre-?coro|pre-?chorus|coro|chorus|puente|bridge|interludio|instrumental|solo|final|outro|tag|vamp|refr[aá]n)\b[^:]*:?$/i;

export function isChord(token: string): boolean {
  return CHORD.test(token.replace(/^\((.+)\)$/, "$1"));
}

/** Expande tabs a espacios (tab cada 8 columnas) para que las columnas coincidan con lo que se ve */
function expandTabs(line: string): string {
  let out = "";
  for (const char of line) out += char === "\t" ? " ".repeat(8 - (out.length % 8)) : char;
  return out;
}

/** Acordes de la línea con su columna; null si la línea no es (solo) de acordes */
function chordTokens(line: string): Array<{ col: number; value: string }> | null {
  const tokens = [...line.matchAll(/\S+/g)].map((m) => ({ col: m.index, value: m[0] }));
  if (!tokens.length || !tokens.some((t) => isChord(t.value))) return null;
  return tokens.every((t) => isChord(t.value) || MARKER.test(t.value)) ? tokens : null;
}

/** Línea de acordes sola (sin letra abajo): cada acorde entre corchetes, las marcas como están */
function chordsAlone(tokens: Array<{ col: number; value: string }>): string {
  return tokens.map((t) => (isChord(t.value) ? `[${t.value}]` : t.value)).join(" ");
}

/** Mete los acordes en la letra según su columna */
function mergeInto(tokens: Array<{ col: number; value: string }>, lyric: string): string {
  // la sangría de la letra no cuenta: los acordes se corren lo mismo
  const indent = lyric.length - lyric.trimStart().length;
  const text = lyric.trim();
  let out = "";
  let pos = 0;
  for (const token of tokens) {
    const label = isChord(token.value) ? `[${token.value}]` : ` ${token.value} `;
    const col = Math.max(0, token.col - indent);
    if (col >= text.length) {
      // acorde después del final de la letra: va al final, separado
      out += text.slice(pos);
      pos = text.length;
      out += (out ? " " : "") + label;
    } else {
      const at = Math.max(col, pos);
      out += text.slice(pos, at) + label;
      pos = at;
    }
  }
  return (out + text.slice(pos)).replace(/ {2,}/g, " ").trimEnd();
}

/** "Coro:", "VERSO 1", "[Intro]" → "{Coro}", "{VERSO 1}", "{Intro}"; null si no es encabezado */
function sectionHeader(line: string): string | null {
  const bare = line.trim().replace(/^\[(.+)\]$/, "$1");
  if (!SECTION.test(bare)) return null;
  return `{${bare.replace(/:$/, "").trim()}}`;
}

export function chordsOverLyricsToInline(input: string): string {
  const lines = input.replace(/\r\n?/g, "\n").split("\n").map(expandTabs);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) {
      out.push("");
      continue;
    }
    // "Intro: G D Em C" → encabezado + acordes
    const inlineSection = line.match(/^\s*([^:]+):\s+(.+)$/);
    if (inlineSection && sectionHeader(`${inlineSection[1]}:`)) {
      const tokens = chordTokens(inlineSection[2]!);
      if (tokens) {
        out.push(sectionHeader(`${inlineSection[1]}:`)!, chordsAlone(tokens));
        continue;
      }
    }
    const header = sectionHeader(line);
    if (header) {
      out.push(header);
      continue;
    }
    const tokens = chordTokens(line);
    if (!tokens) {
      out.push(line.trim());
      continue;
    }
    const next = lines[i + 1];
    if (next !== undefined && next.trim() && !chordTokens(next) && !sectionHeader(next)) {
      out.push(mergeInto(tokens, next));
      i++;
    } else {
      out.push(chordsAlone(tokens));
    }
  }
  // sin más de una línea en blanco seguida, ni blancos al principio o al final
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
