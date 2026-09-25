import type { ParsedLine } from "@/lib/chords";

function chordChartText(pairs: { chord: string; text: string }[]): string {
  let result = "";
  let joinsNextChord = false;

  pairs.forEach((pair) => {
    const notation = pair.text.trim();
    if (pair.chord) {
      result += joinsNextChord ? ` ${pair.chord}` : result ? ` | ${pair.chord}` : `| ${pair.chord}`;
      joinsNextChord = false;
      if (notation.includes("-")) {
        result += " -";
        joinsNextChord = true;
      } else if (notation.includes(":]")) {
        result += " |:]";
      }
    } else if (notation.includes(":]")) {
      result += " |:]";
    } else if (notation.includes("-")) {
      result += " -";
      joinsNextChord = true;
    }
  });

  return `${result}${result.endsWith(":]") ? "" : " |"}`;
}

/** Anotaciones "(…)" de la línea: flecha + texto chico en color, al final de la línea */
function LineNotes({ notes, fontSize }: { notes: string[]; fontSize: number }) {
  if (!notes.length) return null;
  return (
    <span
      className="ml-6 self-start font-normal tracking-normal whitespace-pre text-sky"
      style={{ fontSize: fontSize * 0.55, lineHeight: `${fontSize}px` }}
    >
      {notes.map((note) => `↱ ${note}`).join("    ")}
    </span>
  );
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
              <LineNotes notes={line.notes} fontSize={fontSize} />
            </p>
          );
        if (mode === "chords") {
          const chords = line.pairs.filter((pair) => pair.chord || pair.text.trim());
          return (
            <div
              key={i}
              className={`flex flex-nowrap whitespace-pre ${centered ? "justify-center" : ""}`}
              style={{ marginBottom: `${fontSize * 0.18}px`, lineHeight: `${fontSize}px` }}
            >
              {chords.some((pair) => pair.chord) ? (
                <span className="font-semibold text-primary">{chordChartText(chords)}</span>
              ) : (
                <span>{line.pairs.map((pair) => pair.text).join("")}</span>
              )}
              <LineNotes notes={line.notes} fontSize={fontSize} />
            </div>
          );
        }
        return (
          <div
            key={i}
            className={`flex flex-nowrap whitespace-nowrap ${centered ? "justify-center" : ""}`}
            style={{ marginBottom: `${fontSize * 0.18}px` }}
          >
            {line.pairs.map((p, j) => (
              <span key={j} className="inline-flex flex-col">
                <span
                  className="font-semibold whitespace-pre text-primary"
                  style={{
                    minHeight: p.chord ? undefined : 1,
                    lineHeight: `${fontSize}px`,
                  }}
                >
                  {p.chord || " "}
                </span>
                {mode === "both" ? (
                  <span className="whitespace-pre" style={{ lineHeight: `${fontSize}px` }}>
                    {p.text.replace(/\s-\s/g, " ").replace(/\s:\]/g, "") || " "}
                  </span>
                ) : (
                  <span className="whitespace-pre" style={{ lineHeight: `${fontSize}px` }}>
                    {p.text ? " " : ""}
                  </span>
                )}
              </span>
            ))}
            <LineNotes notes={line.notes} fontSize={fontSize} />
          </div>
        );
      })}
    </div>
  );
}
