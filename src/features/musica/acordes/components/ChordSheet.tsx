import {
  chartBars,
  isChartMarker,
  isSimpleChartLine,
  joinShortChartLines,
  mergeRepeatedChartLines,
  type ChordPair,
  type ParsedLine,
} from "@/lib/chords";

type ChartSegment = { kind: "chart"; value: string } | { kind: "note"; value: string };

/**
 * Si la línea es el mismo grupo de compases repetido, lo escribe una sola vez con el signo de
 * repetición: "| F | C - G | F | C - G |" → "| F | C - G |:]" (2 veces), "|x3]", "|x4]"…
 * Solo en líneas "simples": si ya tiene ":]", marcas ("x3", "Sube Tono") o notas "(…)", se
 * respeta tal cual la escribió el usuario. null si no hay repetición.
 */
function compressRepeats(pairs: ChordPair[]): string | null {
  if (!isSimpleChartLine(pairs)) return null;
  const keys = chartBars(pairs);
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

/**
 * Línea con acordes pero sin letra (ej. "[A]" o "[D] [A] - [Em]"): en "Letra + acordes" se
 * muestra como compases, "| A |", igual que en "Solo acordes". Solo cuenta como letra el texto
 * que no sea "-", ":]" o espacios.
 */
function isChordOnlyLine(pairs: ChordPair[]): boolean {
  return pairs.some((p) => p.chord) && pairs.every((p) => p.note || /^(?:\s|-|:\])*$/.test(p.text));
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
  const renderLine = (line: ParsedLine, i: number) => {
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
    // en "Letra + acordes", una línea sin letra también va como compases
    if (mode === "chords" || isChordOnlyLine(line.pairs)) {
      const pairs = line.pairs.filter((pair) => pair.chord || pair.note || pair.text.trim());
      const hasChords = pairs.some((pair) => pair.chord);
      const segments: ChartSegment[] = hasChords
        ? chordChartSegments(pairs)
        : pairs.map((pair) =>
            pair.note ? { kind: "note", value: pair.note } : { kind: "chart", value: pair.text },
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
          <div className="flex flex-nowrap whitespace-pre" style={{ lineHeight: `${fontSize}px` }}>
            {notesAbove ? (
              <span className={hasChords ? "font-semibold text-primary" : undefined}>{base}</span>
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
  };

  // en Solo acordes, las líneas seguidas que repiten los mismos compases se juntan en una,
  // y dos líneas seguidas de 2 compases van en un mismo renglón
  const shown = mode === "chords" ? joinShortChartLines(mergeRepeatedChartLines(lines)) : lines;

  return (
    <div
      data-chord-sheet
      className={`font-mono leading-none ${dark ? "text-white" : ""}`}
      style={{ fontSize }}
    >
      {mode === "chords" ? (
        // Solo acordes como una hoja de ensayo: la sección a la izquierda y sus compases a la
        // derecha ("Intro:   | Em | G | D | A |"). Las líneas vacías no suman renglones.
        <div
          // del ancho del contenido: si no entra, la hoja se desborda y el ajuste automático del
          // tamaño de letra (useFitFontSize) la achica. En celular no entran dos columnas: la
          // sección va arriba de sus compases
          className="grid grid-cols-1 items-start gap-x-6 sm:w-max sm:grid-cols-[auto_auto]"
          style={{ rowGap: fontSize * 0.55 }}
        >
          {groupBySection(shown).map((group, g) => (
            <SectionRow key={g} group={group} fontSize={fontSize} renderLine={renderLine} />
          ))}
        </div>
      ) : (
        shown.map(renderLine)
      )}
    </div>
  );
}

type SectionGroup = {
  section: Extract<ParsedLine, { kind: "section" }> | null;
  lines: ParsedLine[];
};

/** Agrupa las líneas bajo la sección que las precede (las de antes de la primera, sin sección) */
function groupBySection(lines: ParsedLine[]): SectionGroup[] {
  const groups: SectionGroup[] = [];
  for (const line of lines) {
    if (line.kind === "section") groups.push({ section: line, lines: [] });
    else if (line.kind === "line") {
      if (groups.length === 0) groups.push({ section: null, lines: [] });
      groups[groups.length - 1]!.lines.push(line);
    }
  }
  return groups;
}

/** true si la línea lleva notas "(…)" en un renglón chico arriba de sus compases */
function hasNotesAbove(line: ParsedLine | undefined): boolean {
  if (!line || line.kind !== "line") return false;
  const pairs = line.pairs.filter((p) => p.chord || p.note || p.text.trim());
  return pairs.some((p) => p.note) && pairs.some((p) => p.chord);
}

function SectionRow({
  group,
  fontSize,
  renderLine,
}: {
  group: SectionGroup;
  fontSize: number;
  renderLine: (line: ParsedLine, i: number) => React.ReactNode;
}) {
  return (
    <>
      <p
        className="font-semibold tracking-widest whitespace-nowrap text-primary"
        style={{
          lineHeight: `${fontSize}px`,
          // si el primer renglón tiene notas arriba, el nombre se alinea con los compases
          paddingTop: hasNotesAbove(group.lines[0]) ? fontSize * 0.85 : 0,
        }}
      >
        {group.section ? `${group.section.label}:` : ""}
      </p>
      <div>
        {/* notas del título ("[CORO] (suave)") van del lado de los acordes: si no, ensanchan
            toda la columna de secciones */}
        {group.section?.notes.length ? (
          <p style={{ lineHeight: `${fontSize}px` }}>
            {group.section.notes.map((note, j) => (
              <NoteMark key={j} note={note} fontSize={fontSize} />
            ))}
          </p>
        ) : null}
        {group.lines.map(renderLine)}
      </div>
    </>
  );
}
