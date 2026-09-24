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
            </p>
          );
        return (
          <div
            key={i}
            className={`flex flex-nowrap whitespace-nowrap ${centered ? "justify-center" : ""}`}
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
                    {p.text || " "}
                  </span>
                ) : (
                  <span className="whitespace-pre" style={{ lineHeight: `${fontSize}px` }}>
                    {p.text ? " " : ""}
                  </span>
                )}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
