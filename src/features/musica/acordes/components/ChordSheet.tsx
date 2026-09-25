import { isChartMarker, type ChordPair, type ParsedLine } from "@/lib/chords";

type ChartSegment = { kind: "chart"; value: string } | { kind: "note"; value: string };

/**
 * Si la línea es el mismo grupo de compases repetido, lo escribe una sola vez con el signo de
 * repetición: "| F | C - G | F | C - G |" → "| F | C - G |:]" (2 veces), "|x3]", "|x4]"…
 * Solo en líneas "simples": si ya tiene ":]", marcas ("x3", "Sube Tono") o notas "(…)", se
 * respeta tal cual la escribió el usuario. null si no hay repetición.
 */
function compressRepeats(pairs: ChordPair[]): string | null {
  if (pairs.some((p) => p.note || (p.chord && isChartMarker(p.chord)) || p.text.includes(":]"))) {
    return null;
  }
  // compases: acordes unidos por "-" van en el mismo compás (mismo criterio que abajo)
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
  const keys = bars.map((bar) => bar.join(" - "));
  for (let period = 1; period <= keys.length / 2; period += 1) {
    if (keys.length % period !== 0) continue;
    if (keys.every((key, i) => key === keys[i % period])) {
      const times = keys.length / period;
      return `| ${keys.slice(0, period).join(" | ")} |${times === 2 ? ":]" : `x${times}]`}`;
    }
  }
  return null;
}

/**
 * Línea en "Solo acordes" como compases: "| F - C | Am |:]". Las notas "(…)" cortan el texto
 * en el lugar donde se escribieron; las marcas ("x3", "Sube Tono") no abren un compás nuevo.
 */
function chordChartSegments(pairs: ChordPair[]): ChartSegment[] {
  const compressed = compressRepeats(pairs);
  if (compressed) return [{ kind: "chart", value: compressed }];
  const segments: ChartSegment[] = [];
  let buffer = "";
  let started = false;
  let joinsNextChord = false;
  // hay un compás abierto que se cierra con " |" al final
  let barOpen = false;

  const applyNotation = (notation: string) => {
    if (notation.includes(":]")) {
      buffer += " |:]";
      barOpen = false;
    } else if (notation.includes("-")) {
      buffer += " -";
      joinsNextChord = true;
    }
  };

  pairs.forEach((pair) => {
    if (pair.note) {
      if (buffer) segments.push({ kind: "chart", value: buffer });
      buffer = "";
      segments.push({ kind: "note", value: pair.note });
      return;
    }
    const notation = pair.text.trim();
    if (pair.chord && isChartMarker(pair.chord)) {
      buffer += started ? ` ${pair.chord}` : pair.chord;
      applyNotation(notation);
    } else if (pair.chord) {
      buffer += joinsNextChord
        ? ` ${pair.chord}`
        : started
          ? ` | ${pair.chord}`
          : `| ${pair.chord}`;
      started = true;
      barOpen = true;
      joinsNextChord = false;
      applyNotation(notation);
    } else {
      applyNotation(notation);
    }
  });

  if (barOpen) buffer += " |";
  if (buffer) segments.push({ kind: "chart", value: buffer });
  return segments;
}

/** Tamaño de las notas "(…)" respecto de la letra de la hoja */
const NOTE_SCALE = 0.7;

/** Anotación "(…)": flecha + texto chico, del color de los acordes, donde se escribió */
function NoteMark({ note, fontSize }: { note: string; fontSize: number }) {
  return (
    <span
      className="mx-2 inline-block font-normal tracking-normal whitespace-pre text-primary"
      style={{ fontSize: fontSize * NOTE_SCALE, lineHeight: `${fontSize}px` }}
    >
      ↱ {note}
    </span>
  );
}

/** Texto de letra tal como se muestra en "Letra + acordes" */
const displayText = (text: string) => text.replace(/\s-\s/g, " ").replace(/\s:\]/g, "");

/** Ancho (en caracteres de la fuente de acordes) que ocupa una nota dibujada a NOTE_SCALE, más margen */
const noteWidthCh = (note: string) => Math.ceil((note.length + 2) * NOTE_SCALE) + 2;

/**
 * Las notas se dibujan encima de la fila de acordes sin ocupar lugar: la letra nunca se mueve.
 * Si la nota no entra antes del acorde siguiente, se corre a la izquierda, al espacio libre de
 * la fila de acordes; solo si tampoco entra así, se corre ese acorde (solo el acorde, no su
 * letra). Todo en caracteres — la fuente es monoespaciada. Devuelve, por par, cuánto correr la
 * nota (negativo = a la izquierda) y cuánto correr el acorde.
 */
function placeNotes(pairs: ChordPair[]): { noteOffset: number[]; chordNudge: number[] } {
  // ancho de cada columna: el acorde (+1ch de margen) o " " arriba; la letra o " " abajo
  const widths = pairs.map((p) =>
    p.note ? 0 : Math.max(p.chord ? p.chord.length + 1 : 1, displayText(p.text).length || 1),
  );
  const starts: number[] = [];
  widths.reduce((x, w, j) => ((starts[j] = x), x + w), 0);

  const noteOffset = pairs.map(() => 0);
  const chordNudge = pairs.map(() => 0);
  // hasta dónde está ocupada la fila de acordes por lo ya dibujado
  let occupiedUntil = 0;
  pairs.forEach((p, j) => {
    if (!p.note) {
      if (p.chord) {
        // en cadena: si algo anterior (nota o acorde corrido) todavía ocupa este lugar, se corre
        chordNudge[j] = Math.max(0, occupiedUntil - starts[j]!);
        occupiedUntil = starts[j]! + chordNudge[j]! + p.chord.length + 1;
      }
      return;
    }
    const width = noteWidthCh(p.note);
    const k = pairs.findIndex((q, idx) => idx > j && !q.note && q.chord);
    const nextChordAt = k === -1 ? Infinity : starts[k]!;
    let start = Math.max(starts[j]!, occupiedUntil);
    if (start + width > nextChordAt) start = Math.max(occupiedUntil, nextChordAt - width);
    noteOffset[j] = start - starts[j]!;
    occupiedUntil = start + width;
  });
  return { noteOffset, chordNudge };
}

export function ChordSheet({
  lines,
  fontSize,
  mode,
  dark,
}: {
  lines: ParsedLine[];
  fontSize: number;
  mode: "both" | "chords";
  /** Fondo negro (modo En vivo): texto en blanco */
  dark?: boolean;
}) {
  return (
    <div
      data-chord-sheet
      className={`font-mono leading-none ${dark ? "text-white" : ""}`}
      style={{ fontSize }}
    >
      {lines.map((line, i) => {
        if (line.kind === "blank") return <div key={i} style={{ height: fontSize }} />;
        if (line.kind === "section")
          return (
            <p
              key={i}
              className="mt-6 mb-3 font-semibold tracking-widest text-primary"
              style={{ fontSize: fontSize * 1.15 }}
            >
              {line.label}
              {mode === "chords" ? ":" : ""}
              {line.notes.map((note, j) => (
                <NoteMark key={j} note={note} fontSize={fontSize} />
              ))}
            </p>
          );
        if (mode === "chords") {
          const pairs = line.pairs.filter((pair) => pair.chord || pair.note || pair.text.trim());
          const hasChords = pairs.some((pair) => pair.chord);
          const segments: ChartSegment[] = hasChords
            ? chordChartSegments(pairs)
            : pairs.map((pair) =>
                pair.note
                  ? { kind: "note", value: pair.note }
                  : { kind: "chart", value: pair.text },
              );
          // Las notas van en un renglón chico ARRIBA de los compases, en la columna donde se
          // escribieron (como en una hoja a mano: "_2doVers" sobre "| G |"); la línea de compases
          // queda limpia. Si dos notas se pisarían, la segunda se corre.
          let base = "";
          let noteEnd = 0;
          const notes: Array<{ col: number; value: string }> = [];
          segments.forEach((segment) => {
            if (segment.kind === "chart") {
              base += segment.value;
              return;
            }
            const col = Math.max(base.length + 1, noteEnd);
            notes.push({ col, value: segment.value });
            noteEnd = col + noteWidthCh(segment.value);
          });
          // una línea que es solo una nota ("(repetir intro)") se muestra como línea normal
          const notesAbove = base.trim() !== "";
          return (
            <div key={i} style={{ marginBottom: `${fontSize * 0.18}px` }}>
              {notesAbove && notes.length ? (
                <div className="relative" style={{ height: fontSize * 0.85 }}>
                  {notes.map((note, j) => (
                    // el left en ch se mide con la letra de la hoja; la nota chica va adentro
                    <span key={j} className="absolute bottom-0" style={{ left: `${note.col}ch` }}>
                      <span
                        className="font-normal tracking-normal whitespace-pre text-primary"
                        style={{ fontSize: fontSize * NOTE_SCALE, lineHeight: 1 }}
                      >
                        ↱ {note.value}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}
              <div
                className="flex flex-nowrap whitespace-pre"
                style={{ lineHeight: `${fontSize}px` }}
              >
                {notesAbove ? (
                  <span className={hasChords ? "font-semibold text-primary" : undefined}>
                    {base}
                  </span>
                ) : (
                  notes.map((note, j) => <NoteMark key={j} note={note.value} fontSize={fontSize} />)
                )}
              </div>
            </div>
          );
        }
        const { noteOffset, chordNudge } = placeNotes(line.pairs);
        return (
          <div
            key={i}
            className="flex flex-nowrap whitespace-nowrap"
            style={{ marginBottom: `${fontSize * 0.18}px` }}
          >
            {line.pairs.map((p, j) =>
              // la nota va en la fila de los acordes sin ocupar lugar (ver placeNotes)
              p.note ? (
                <span key={j} className="relative w-0">
                  <span
                    className="absolute top-0"
                    style={{ left: `${noteOffset[j]}ch`, lineHeight: `${fontSize}px` }}
                  >
                    <NoteMark note={p.note} fontSize={fontSize} />
                  </span>
                </span>
              ) : (
                <span key={j} className="inline-flex flex-col">
                  <span
                    className="relative font-semibold whitespace-pre text-primary"
                    style={{
                      minHeight: p.chord ? undefined : 1,
                      lineHeight: `${fontSize}px`,
                      // separa acordes consecutivos cuando la letra de abajo es más corta que el acorde
                      paddingRight: p.chord ? "1ch" : undefined,
                      // corrido solo si una nota no entraba antes (la letra no se mueve)
                      left: chordNudge[j] ? `${chordNudge[j]}ch` : undefined,
                    }}
                  >
                    {p.chord || " "}
                  </span>
                  <span className="whitespace-pre" style={{ lineHeight: `${fontSize}px` }}>
                    {displayText(p.text) || " "}
                  </span>
                </span>
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}
