import { isChartMarker, type ChordPair, type ParsedLine } from "@/lib/chords";

type ChartSegment = { kind: "chart"; value: string } | { kind: "note"; value: string };

/**
 * Línea en "Solo acordes" como compases: "| F - C | Am |:]". Las notas "(…)" cortan el texto
 * en el lugar donde se escribieron; las marcas ("x3", "Sube Tono") no abren un compás nuevo.
 */
function chordChartSegments(pairs: ChordPair[]): ChartSegment[] {
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

/** Anotación "(…)": flecha + texto chico, del color de los acordes, donde se escribió */
function NoteMark({ note, fontSize }: { note: string; fontSize: number }) {
  return (
    <span
      className="mx-2 inline-block font-normal tracking-normal whitespace-pre text-primary"
      style={{ fontSize: fontSize * 0.55, lineHeight: `${fontSize}px` }}
    >
      ↱ {note}
    </span>
  );
}

/** Texto de letra tal como se muestra en "Letra + acordes" */
const displayText = (text: string) => text.replace(/\s-\s/g, " ").replace(/\s:\]/g, "");

/** Ancho (en caracteres de la fuente de acordes) que ocupa una nota dibujada al 55%, más margen */
const noteWidthCh = (note: string) => Math.ceil((note.length + 2) * 0.55) + 2;

/**
 * Las notas se dibujan encima de la fila de acordes sin ocupar lugar (la letra no se corta).
 * Si el acorde siguiente queda más cerca que el ancho de la nota, se lo corre lo justo para
 * que no se superpongan: devuelve cuántos caracteres correr cada par.
 */
function noteShifts(pairs: ChordPair[]): number[] {
  const shifts = pairs.map(() => 0);
  pairs.forEach((pair, j) => {
    if (!pair.note) return;
    let gap = 0;
    for (let k = j + 1; k < pairs.length; k += 1) {
      const next = pairs[k]!;
      if (next.note) break;
      if (next.chord) {
        shifts[k] = Math.max(shifts[k]!, noteWidthCh(pair.note) - gap);
        break;
      }
      gap += displayText(next.text).length;
    }
  });
  return shifts;
}

export function ChordSheet({
  lines,
  fontSize,
  mode,
  centered,
}: {
  lines: ParsedLine[];
  fontSize: number;
  mode: "both" | "chords";
  centered?: boolean;
}) {
  return (
    <div className={`font-mono leading-none ${centered ? "text-white" : ""}`} style={{ fontSize }}>
      {lines.map((line, i) => {
        if (line.kind === "blank") return <div key={i} style={{ height: fontSize }} />;
        if (line.kind === "section")
          return (
            <p
              key={i}
              className={`mt-6 mb-3 font-semibold tracking-widest text-primary ${centered ? "text-center" : ""}`}
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
          return (
            <div
              key={i}
              className={`flex flex-nowrap whitespace-pre ${centered ? "justify-center" : ""}`}
              style={{ marginBottom: `${fontSize * 0.18}px`, lineHeight: `${fontSize}px` }}
            >
              {pairs.some((pair) => pair.chord) ? (
                <span className="font-semibold text-primary">
                  {chordChartSegments(pairs).map((segment, j) =>
                    segment.kind === "note" ? (
                      <NoteMark key={j} note={segment.value} fontSize={fontSize} />
                    ) : (
                      <span key={j}>{segment.value}</span>
                    ),
                  )}
                </span>
              ) : (
                <span>
                  {pairs.map((pair, j) =>
                    pair.note ? (
                      <NoteMark key={j} note={pair.note} fontSize={fontSize} />
                    ) : (
                      <span key={j}>{pair.text}</span>
                    ),
                  )}
                </span>
              )}
            </div>
          );
        }
        const shifts = noteShifts(line.pairs);
        return (
          <div
            key={i}
            className={`flex flex-nowrap whitespace-nowrap ${centered ? "justify-center" : ""}`}
            style={{ marginBottom: `${fontSize * 0.18}px` }}
          >
            {line.pairs.map((p, j) =>
              // la nota va en la fila de los acordes, donde se escribió, sin ocupar lugar (ver noteShifts)
              p.note ? (
                <span key={j} className="relative w-0">
                  <span className="absolute top-0 left-0" style={{ lineHeight: `${fontSize}px` }}>
                    <NoteMark note={p.note} fontSize={fontSize} />
                  </span>
                </span>
              ) : (
                <span
                  key={j}
                  className="inline-flex flex-col"
                  style={shifts[j] ? { marginLeft: `${shifts[j]}ch` } : undefined}
                >
                  <span
                    className="font-semibold whitespace-pre text-primary"
                    style={{
                      minHeight: p.chord ? undefined : 1,
                      lineHeight: `${fontSize}px`,
                      // separa acordes consecutivos cuando la letra de abajo es más corta que el acorde
                      paddingRight: p.chord ? "1ch" : undefined,
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
