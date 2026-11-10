import { ArrowUpDown } from "lucide-react";
import type { SetlistSection } from "@/types";
import { SECTIONS } from "../lib/sections";

/**
 * Pasar una canción a otra sección (Alabanzas / Adoración / Ofrenda) con un botón de ícono: en
 * celular el texto del desplegable ocupaba mucho lugar. Es un <select> nativo invisible encima del
 * ícono, así al tocarlo se abre el selector del sistema; la sección actual ya se ve en el título.
 */
export function SectionSelect({
  value,
  onChange,
  songTitle,
}: {
  value: SetlistSection;
  onChange: (section: SetlistSection) => void;
  songTitle: string;
}) {
  const current = SECTIONS.find((section) => section.id === value)?.label ?? "";
  return (
    <span
      title={`Sección: ${current}. Tocá para pasarla a otra`}
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors focus-within:text-primary hover:text-primary"
    >
      <ArrowUpDown className="h-4 w-4" aria-hidden />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SetlistSection)}
        aria-label={`Sección de ${songTitle}`}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {SECTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}
