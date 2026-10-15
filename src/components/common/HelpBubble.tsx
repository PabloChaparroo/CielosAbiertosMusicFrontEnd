import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Ícono "?" al lado de un título: al tocarlo, la explicación aparece en una burbuja (en vez de
 * ocupar lugar fija debajo del título). Se cierra tocando afuera.
 */
export function HelpBubble({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Ayuda: ${label}`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-primary data-[state=open]:text-primary"
      >
        <HelpCircle className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-72 rounded-2xl border-white/10 bg-card/90 text-sm leading-relaxed text-muted-foreground shadow-2xl backdrop-blur-xl"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
