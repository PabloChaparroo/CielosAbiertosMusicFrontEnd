import type { ParsedLine } from "@/lib/chords";

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
    <div className={`font-mono leading-tight ${centered ? "text-white" : ""}`} style={{ fontSize }}>
      {lines.map((line, i) => {
        if (line.kind === "blank") return <div key={i} style={{ height: fontSize }} />;
        if (line.kind === "section")
          return (
            <p
              key={i}
              className={`mt-5 mb-2 font-semibold tracking-widest text-primary ${centered ? "text-center" : ""}`}
              style={{ fontSize: fontSize * 0.75 }}
            >
              {line.label}
            </p>
          );
        return (
          <div key={i} className={`flex flex-wrap ${centered ? "justify-center" : ""}`}>
            {line.pairs.map((p, j) => (
              <span key={j} className="inline-flex flex-col">
                <span
                  className="font-semibold whitespace-pre text-primary"
                  style={{ minHeight: p.chord ? undefined : 1 }}
                >
                  {p.chord || " "}
                </span>
                {mode === "both" ? (
                  <span className="whitespace-pre">{p.text || " "}</span>
                ) : (
                  <span className="whitespace-pre">{p.text ? " " : ""}</span>
                )}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
