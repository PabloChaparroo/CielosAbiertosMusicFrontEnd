import { useEffect, useRef, useState } from "react";
import { Repeat, Repeat1, X } from "lucide-react";
import { formatTime, validateLoop, type LoopRange } from "@/lib/time";

const inputCls =
  "w-20 rounded-lg border border-border bg-secondary px-2 py-1.5 text-center text-sm tabular-nums text-foreground outline-none focus:border-primary/60";

/**
 * Repetir la canción y repetir un tramo (ej. el solo de 3:45 a 4:20 para practicarlo).
 * `compact`: solo íconos (barra de abajo); si no, con texto (pantalla completa).
 */
export function RepeatControls({
  seconds,
  duration,
  repeatOne,
  onRepeatOneChange,
  loop,
  onLoopChange,
  compact = false,
}: {
  seconds: number;
  duration: number;
  repeatOne: boolean;
  onRepeatOneChange: (on: boolean) => void;
  loop: LoopRange | null;
  onLoopChange: (loop: LoopRange | null) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // al abrir: el tramo activo, o desde ahora hasta 30 segundos después
  const openPanel = () => {
    setFrom(formatTime(loop ? loop.start : seconds));
    setTo(formatTime(loop ? loop.end : Math.min(seconds + 30, duration || seconds + 30)));
    setError(null);
    setOpen(true);
  };

  // tocar afuera cierra el panel
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const apply = () => {
    const result = validateLoop(from, to, duration);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onLoopChange(result.loop);
    setOpen(false);
  };

  const chip = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full transition-colors ${
      compact ? "p-2" : "border px-3 py-1.5 text-xs font-semibold"
    } ${
      active
        ? `${compact ? "" : "border-primary/50"} bg-primary/15 text-primary`
        : `${compact ? "" : "border-border"} text-muted-foreground hover:text-foreground`
    }`;

  return (
    <div ref={boxRef} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => onRepeatOneChange(!repeatOne)}
        aria-pressed={repeatOne}
        aria-label={repeatOne ? "Dejar de repetir la canción" : "Repetir la canción"}
        title="Repetir la canción"
        className={chip(repeatOne)}
      >
        <Repeat1 className="h-4 w-4" />
        {compact ? null : <span>Repetir</span>}
      </button>

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-pressed={Boolean(loop)}
        aria-expanded={open}
        aria-label={
          loop
            ? `Repitiendo de ${formatTime(loop.start)} a ${formatTime(loop.end)}`
            : "Repetir un tramo"
        }
        title="Repetir un tramo (ej. un solo para practicarlo)"
        className={chip(Boolean(loop))}
      >
        <Repeat className="h-4 w-4" />
        {loop ? (
          <span className="tabular-nums">
            {formatTime(loop.start)}–{formatTime(loop.end)}
          </span>
        ) : compact ? null : (
          <span>Repetir tramo</span>
        )}
      </button>
      {loop && !compact ? (
        <button
          type="button"
          onClick={() => onLoopChange(null)}
          aria-label="Quitar el tramo"
          title="Quitar el tramo"
          className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {open ? (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-2xl border border-border bg-card p-4 text-left shadow-2xl">
          <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Repetir un tramo
          </p>
          {(
            [
              ["Desde", from, setFrom],
              ["Hasta", to, setTo],
            ] as const
          ).map(([label, value, set]) => (
            <label key={label} className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span className="w-12 text-muted-foreground">{label}</span>
              <input
                value={value}
                onChange={(e) => {
                  set(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && apply()}
                inputMode="numeric"
                placeholder="3:45"
                aria-label={label}
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => {
                  set(formatTime(seconds));
                  setError(null);
                }}
                title="Marcar el momento en que va la canción"
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
              >
                Ahora
              </button>
            </label>
          ))}
          {error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}
          <div className="mt-3 flex justify-end gap-2">
            {loop ? (
              <button
                type="button"
                onClick={() => {
                  onLoopChange(null);
                  setOpen(false);
                }}
                className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Quitar
              </button>
            ) : null}
            <button
              type="button"
              onClick={apply}
              className="rounded-full gradient-gold px-4 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Repetir tramo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
