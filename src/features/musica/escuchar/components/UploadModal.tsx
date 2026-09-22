import { useState } from "react";
import { Upload, X } from "lucide-react";
import { TagChip } from "@/components/common/ui-bits";
import { KEYS } from "@/lib/chords";
import type { Song, Tag } from "@/types";

const ALL_TAGS: Tag[] = [
  "Adoración",
  "Júbilo",
  "Navidad",
  "Sanidad",
  "Bautismo",
  "Comunión",
  "Entrega",
  "Gratitud",
];

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

export function UploadModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (s: Song) => void;
}) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("G");
  const [tags, setTags] = useState<Tag[]>([]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg animate-in slide-in-from-bottom-6 rounded-t-3xl border border-border bg-card p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Subir canción</h2>
            <p className="text-sm text-muted-foreground">Agregá una pista al repertorio</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Nombre">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Artista / autor original">
            <input
              className={inputCls}
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
            />
          </Field>
          <Field label="Link de audio o archivo">
            <input
              className={inputCls}
              placeholder="https://…/audio.mp3"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
              <Upload className="h-4 w-4" /> Arrastrá un archivo (demo)
              <input type="file" className="hidden" />
            </label>
          </Field>
          <Field label="Tonalidad original">
            <select className={inputCls} value={key} onChange={(e) => setKey(e.target.value)}>
              {KEYS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="Temas">
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setTags((prev) =>
                      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                    )
                  }
                >
                  <TagChip tag={t} active={tags.includes(t)} />
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            disabled={!title}
            onClick={() => {
              onSave({
                id: `s${Date.now()}`,
                title,
                artist: artist || "Desconocido",
                key,
                bpm: 80,
                duration: 300,
                tags: tags.length ? tags : ["Adoración"],
                cover: "linear-gradient(135deg,#4c1d95,#2563eb)",
                audioUrl: url || "",
                chordpro: "{estrofa 1}\n[G]Nueva canción del minis[D]terio",
                addedAt: new Date().toISOString().slice(0, 10),
                playsByMonth: {},
              });
              onClose();
            }}
            className="rounded-full gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
