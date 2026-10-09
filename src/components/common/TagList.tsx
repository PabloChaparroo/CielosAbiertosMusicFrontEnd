import { useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TagChip } from "./ui-bits";

/**
 * Temas de una canción en una sola línea: los primeros `max` y un "+N" con el resto, para que la
 * fila no crezca. Pasando el mouse (compu) o tocando el "+N" (celular) se abre una burbuja con
 * todos los temas, que aparecen de a uno con un pequeño rebote.
 */
export function TagList({ tags, max = 2 }: { tags: string[]; max?: number }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (tags.length === 0) return null;

  const shown = tags.slice(0, max);
  const hidden = tags.length - shown.length;

  // con mouse: abre al pasar y cierra al salir, con un respiro para poder llegar a la burbuja
  const hoverOpen = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hoverClose = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden">
      {shown.map((t) => (
        <TagChip key={t} tag={t} />
      ))}
      {hidden > 0 ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              // la fila reproduce al tocarla: el "+N" no
              onClick={(e) => e.stopPropagation()}
              onPointerEnter={hoverOpen}
              onPointerLeave={hoverClose}
              aria-label={`Ver los ${tags.length} temas`}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                open
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-secondary/60 text-muted-foreground hover:text-primary"
              }`}
            >
              +{hidden}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            sideOffset={8}
            onClick={(e) => e.stopPropagation()}
            onPointerEnter={hoverOpen}
            onPointerLeave={hoverClose}
            // la burbuja: redonda, con brillo, y nace desde el "+N"
            className="w-auto max-w-72 rounded-2xl border-primary/30 bg-card/95 p-3 shadow-[0_8px_30px_-8px] shadow-primary/40 backdrop-blur data-[state=open]:zoom-in-75 data-[state=open]:duration-200"
          >
            <p className="mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Temas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t, i) => (
                <span
                  key={t}
                  className="animate-in fade-in-0 zoom-in-50 duration-300"
                  // "both": cada tema espera invisible su turno (aparecen de a uno)
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                >
                  <TagChip tag={t} />
                </span>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
