import { INSTRUMENTS } from "@/lib/instruments";

/**
 * Chips para elegir instrumentos (se pueden marcar varios). `options` limita los que se ofrecen
 * (ej. en una lista de canciones, los que toca ese miembro); por defecto, todos.
 */
export function InstrumentPicker({
  value,
  onChange,
  options = INSTRUMENTS,
  disabled = false,
  size = "md",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options?: readonly string[];
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const toggle = (instrument: string) =>
    onChange(
      value.includes(instrument)
        ? value.filter((x) => x !== instrument)
        : // en el orden de la lista, no en el que se tocaron
          options.filter((x) => x === instrument || value.includes(x)),
    );
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((instrument) => {
        const active = value.includes(instrument);
        return (
          <button
            key={instrument}
            type="button"
            disabled={disabled}
            onClick={() => toggle(instrument)}
            aria-pressed={active}
            className={`rounded-full border transition-colors disabled:opacity-50 ${
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
            } ${
              active
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {instrument}
          </button>
        );
      })}
    </div>
  );
}
