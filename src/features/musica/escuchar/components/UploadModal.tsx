import { useState } from "react";
import { Upload, X } from "lucide-react";
import { TagChip } from "@/components/common/ui-bits";
import { KEYS } from "@/lib/chords";
import { SongsService } from "@/features/canciones/services/songs.service";
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

const COVER_PALETTE = [
  "linear-gradient(135deg,#1e3a8a,#7c3aed)",
  "linear-gradient(135deg,#b45309,#f59e0b)",
  "linear-gradient(135deg,#0f766e,#22d3ee)",
  "linear-gradient(135deg,#831843,#f472b6)",
  "linear-gradient(135deg,#4c1d95,#2563eb)",
  "linear-gradient(135deg,#7c2d12,#ea580c)",
  "linear-gradient(135deg,#064e3b,#84cc16)",
];

function coverFor(title: string): string {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COVER_PALETTE[hash % COVER_PALETTE.length]!;
}

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      {children}
      {help ? <p className="mt-1 text-xs text-muted-foreground">{help}</p> : null}
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
  const [key, setKey] = useState("G");
  const [bpm, setBpm] = useState(80);
  const [durationMinutes, setDurationMinutes] = useState(4);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [chordpro, setChordpro] = useState(
    "{estrofa 1}\n[G]Nueva canción del minis[D]terio",
  );
  const [tags, setTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim() !== "" && artist.trim() !== "" && chordpro.trim() !== "" && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await SongsService.createSong({
        title: title.trim(),
        artist: artist.trim(),
        key,
        bpm,
        duration: durationMinutes * 60 + durationSeconds,
        cover: coverFor(title.trim()),
        chordpro,
        tags: tags.length ? tags : ["Adoración"],
      });
      onSave(created);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la canción");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg animate-in slide-in-from-bottom-6 overflow-y-auto rounded-t-3xl border border-border bg-card p-6 sm:max-h-[85vh] sm:rounded-2xl">
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

          <Field
            label="Archivo de audio"
            help="La carga real de audio todavía no está implementada — por ahora la canción se guarda sin pista de audio. Queda para un ticket aparte."
          >
            <label className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground opacity-60">
              <Upload className="h-4 w-4" /> Subir audio (próximamente)
            </label>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tonalidad original">
              <select className={inputCls} value={key} onChange={(e) => setKey(e.target.value)}>
                {KEYS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
            <Field
              label="BPM"
              help="Tiempo de la canción en pulsos por minuto — a más alto, más rápida."
            >
              <input
                type="number"
                min={1}
                className={inputCls}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value) || 1)}
              />
            </Field>
          </div>

          <Field
            label="Duración"
            help="Duración total de la canción, en minutos y segundos (se usa para la barra de progreso del reproductor)."
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)}
              />
              <span className="text-sm text-muted-foreground">min</span>
              <input
                type="number"
                min={0}
                max={59}
                className={inputCls}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value) || 0)}
              />
              <span className="text-sm text-muted-foreground">seg</span>
            </div>
          </Field>

          <Field label="Letra en formato ChordPro" help="Los acordes van entre corchetes antes de la sílaba, ej: [G]Tú me lla[D]mas. Las secciones van entre llaves, ej: {estrofa 1}.">
            <textarea
              className={`${inputCls} min-h-[120px] font-mono whitespace-pre`}
              value={chordpro}
              onChange={(e) => setChordpro(e.target.value)}
            />
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

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            disabled={!canSave}
            onClick={() => void handleSave()}
            className="rounded-full gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
