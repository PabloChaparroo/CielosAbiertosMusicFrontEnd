import { useMemo, useState } from "react";
import { Check, Copy, Eraser } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { chordsOverLyricsToInline } from "@/lib/chords-over-lyrics";

const areaCls =
  "h-[60vh] min-h-[320px] w-full resize-none rounded-2xl border border-border bg-card p-4 font-mono text-sm leading-relaxed outline-none transition-colors focus:border-primary/60";

/**
 * Transportador: pegás una canción con los acordes en la línea de arriba de la letra y la pasa al
 * formato del cancionero ([G] metido en la letra), para copiarla en Acordes. No guarda nada.
 */
export function TransportadorPage() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const output = useMemo(() => chordsOverLyricsToInline(input), [input]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // sin permiso de portapapeles: se puede seleccionar y copiar a mano
    }
  };

  return (
    <AppLayout
      title="Transportador"
      subtitle="Pegá los acordes arriba de la letra y copiá el resultado en Acordes"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <div className="flex h-9 items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Acordes arriba de la letra
            </h2>
            <button
              onClick={() => setInput("")}
              disabled={!input}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <Eraser className="h-4 w-4" /> Limpiar
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"     G\nTe alabo en el valle\n     G/A        G\nTe alabo en el monte"}
            spellCheck={false}
            wrap="off"
            aria-label="Canción con los acordes arriba de la letra"
            className={areaCls}
          />
        </section>
        <section className="flex flex-col gap-2">
          <div className="flex h-9 items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Formato del cancionero</h2>
            <button
              onClick={() => void copy()}
              disabled={!output}
              className="flex items-center gap-1.5 rounded-full gradient-gold px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder={"Te al[G]abo en el valle\nTe al[G/A]abo en el m[G]onte"}
            spellCheck={false}
            aria-label="Canción en el formato del cancionero"
            className={areaCls}
          />
        </section>
      </div>
    </AppLayout>
  );
}
