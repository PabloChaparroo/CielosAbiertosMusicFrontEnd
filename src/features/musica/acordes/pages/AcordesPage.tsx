import { useMemo, useState } from "react";
import { FileDown, Maximize2, Minus, Plus, Search, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FavButton, Skeletons } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { chordsOnly, KEYS, parseChordPro, transposeKey } from "@/lib/chords";
import { exportChordsPdf } from "@/lib/pdf";
import { Annotations } from "../components/Annotations";
import { ChordSheet } from "../components/ChordSheet";

export function AcordesPage() {
  const { songs, songsLoadState } = useApp();
  const [songId, setSongId] = useState<string | null>(null);
  const [semitones, setSemitones] = useState(0);
  const [fontSize, setFontSize] = useState(17);
  const [mode, setMode] = useState<"both" | "chords">("both");
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(false);

  // Las canciones ahora se cargan del backend real; mientras se resuelve el
  // fetch, `songs` está vacío (antes el mock siempre tenía datos ya listos).
  // Los hooks de acá abajo se llaman siempre (regla de hooks), con
  // fallbacks seguros para ese instante — el guard de "todavía no hay
  // canciones" se aplica recién en el return, después de todos los hooks.
  const ready = songsLoadState === "ready" && songs.length > 0;
  const song = songs.find((s) => s.id === songId) ?? songs[0];
  const targetKey = song ? transposeKey(song.key, semitones) : "C";

  const lines = useMemo(() => {
    if (!song) return [];
    const parsed = parseChordPro(song.chordpro, semitones, targetKey);
    return mode === "chords" ? chordsOnly(parsed) : parsed;
  }, [song, semitones, targetKey, mode]);

  const filtered = songs.filter((s) =>
    (s.title + s.artist).toLowerCase().includes(query.toLowerCase()),
  );

  if (!ready || !song) {
    return (
      <AppLayout title="Acordes" subtitle="Transposición, zoom y modo en vivo">
        <Skeletons rows={4} />
      </AppLayout>
    );
  }

  if (live) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black px-5 py-10 text-center">
        <button
          onClick={() => setLive(false)}
          aria-label="Salir del modo presentación"
          className="fixed top-4 right-4 rounded-full border border-white/20 p-2 text-white/70 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="fixed bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 backdrop-blur">
          <IconBtn onClick={() => setFontSize((f) => Math.max(12, f - 2))} label="Achicar">
            <Minus className="h-4 w-4" />
          </IconBtn>
          <span className="w-9 text-center text-xs text-white/70">{fontSize}px</span>
          <IconBtn onClick={() => setFontSize((f) => Math.min(48, f + 2))} label="Agrandar">
            <Plus className="h-4 w-4" />
          </IconBtn>
          <span className="mx-2 h-4 w-px bg-white/20" />
          <IconBtn onClick={() => setSemitones((s) => s - 1)} label="Bajar semitono">
            <Minus className="h-4 w-4" />
          </IconBtn>
          <span className="w-10 text-center text-sm font-semibold text-primary">{targetKey}</span>
          <IconBtn onClick={() => setSemitones((s) => s + 1)} label="Subir semitono">
            <Plus className="h-4 w-4" />
          </IconBtn>
        </div>
        <h2 className="mb-8 font-display text-2xl text-white">{song.title}</h2>
        <ChordSheet lines={lines} fontSize={fontSize} mode={mode} centered />
      </div>
    );
  }

  return (
    <AppLayout
      title="Acordes"
      subtitle="Transposición, zoom y modo en vivo"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive(true)}
            className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <Maximize2 className="h-4 w-4" /> <span className="hidden sm:inline">En vivo</span>
          </button>
          <button
            onClick={() => exportChordsPdf(song, { semitones, targetKey, mode, fontSize })}
            className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="surface-card order-2 flex max-h-[70vh] flex-col overflow-hidden lg:order-1 lg:sticky lg:top-24">
          <div className="relative border-b border-border/60 p-3">
            <Search className="absolute top-1/2 left-6 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Saltar a canción…"
              className="w-full rounded-full border border-border bg-secondary py-2 pr-3 pl-10 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Sin resultados</p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSongId(s.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                    s.id === song.id ? "bg-primary/15 text-primary" : "hover:bg-elevated/70"
                  }`}
                >
                  <div
                    className="h-8 w-8 shrink-0 rounded-lg"
                    style={{ backgroundImage: s.cover }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.artist}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{s.key}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="order-1 space-y-5 lg:order-2">
          <div className="surface-card flex flex-wrap items-center gap-3 p-4">
            <div className="mr-auto min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-display text-2xl font-semibold">{song.title}</h2>
                <FavButton songId={song.id} />
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {song.artist} · original {song.key} · {song.bpm} BPM
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-full border border-border p-1">
              <IconBtn onClick={() => setSemitones((s) => s - 1)} label="Bajar semitono">
                <Minus className="h-4 w-4" />
              </IconBtn>
              <select
                value={targetKey}
                onChange={(e) => {
                  const idxFrom = KEYS.indexOf(targetKey);
                  const target = e.target.value;
                  const semis = (((KEYS.indexOf(target) - idxFrom) % 12) + 12) % 12;
                  setSemitones((s) => s + semis);
                }}
                className="rounded-full bg-transparent px-2 text-sm font-semibold text-primary outline-none"
              >
                {KEYS.map((k) => (
                  <option key={k} value={k} className="bg-card text-foreground">
                    {k}
                  </option>
                ))}
              </select>
              <IconBtn onClick={() => setSemitones((s) => s + 1)} label="Subir semitono">
                <Plus className="h-4 w-4" />
              </IconBtn>
            </div>

            <div className="flex items-center gap-1 rounded-full border border-border p-1">
              <IconBtn
                onClick={() => setFontSize((f) => Math.max(12, f - 2))}
                label="Achicar letra"
              >
                <Minus className="h-4 w-4" />
              </IconBtn>
              <span className="w-10 text-center text-xs text-muted-foreground">{fontSize}px</span>
              <IconBtn
                onClick={() => setFontSize((f) => Math.min(40, f + 2))}
                label="Agrandar letra"
              >
                <Plus className="h-4 w-4" />
              </IconBtn>
            </div>

            <div className="flex rounded-full border border-border p-0.5">
              {(
                [
                  ["both", "Letra + acordes"],
                  ["chords", "Solo acordes"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setMode(v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    mode === v ? "gradient-gold text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-card overflow-x-auto p-5 sm:p-8">
            <ChordSheet lines={lines} fontSize={fontSize} mode={mode} />
          </div>

          <Annotations songId={song.id} />
        </div>
      </div>
    </AppLayout>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {children}
    </button>
  );
}
