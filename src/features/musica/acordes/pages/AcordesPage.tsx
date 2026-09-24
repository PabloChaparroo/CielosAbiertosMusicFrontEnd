import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  FileDown,
  Maximize2,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useSearch } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { FavButton, Skeletons } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { chordsOnly, diatonicChords, KEYS, parseChordPro, transposeKey } from "@/lib/chords";
import { exportChordsPdf } from "@/lib/pdf";
import { SongsService } from "@/features/canciones/services/songs.service";
import { Annotations } from "../components/Annotations";
import { ChordSheet } from "../components/ChordSheet";

export function AcordesPage() {
  const { songs, songsLoadState, current, isPlaying, play, toggle, can, updateSong } = useApp();
  const { songId: requestedSongId, songIds } = useSearch({ from: "/acordes" });
  const [songId, setSongId] = useState<string | null>(null);
  const [semitones, setSemitones] = useState(0);
  const [fontSize, setFontSize] = useState(17);
  const [mode, setMode] = useState<"both" | "chords">("both");
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const chordInputRef = useRef<HTMLTextAreaElement | null>(null);
  const scopedSongIds = useMemo(() => (songIds ? new Set(songIds.split(",")) : null), [songIds]);
  const availableSongs = useMemo(
    () => (scopedSongIds ? songs.filter((item) => scopedSongIds.has(item.id)) : songs),
    [songs, scopedSongIds],
  );

  useEffect(() => {
    if (!requestedSongId) return;
    const requestedSong = availableSongs.find((item) => item.id === requestedSongId);
    if (!requestedSong) return;
    setSongId(requestedSong.id);
  }, [requestedSongId, availableSongs]);

  useEffect(() => {
    setEditing(false);
    setDraft("");
    setSaveError(null);
  }, [songId]);

  // Las canciones ahora se cargan del backend real; mientras se resuelve el
  // fetch, `songs` está vacío (antes el mock siempre tenía datos ya listos).
  // Los hooks de acá abajo se llaman siempre (regla de hooks), con
  // fallbacks seguros para ese instante — el guard de "todavía no hay
  // canciones" se aplica recién en el return, después de todos los hooks.
  const ready = songsLoadState === "ready" && availableSongs.length > 0;
  const song = availableSongs.find((s) => s.id === songId) ?? availableSongs[0];
  const targetKey = song ? transposeKey(song.key, semitones) : "C";

  const lines = useMemo(() => {
    if (!song) return [];
    const parsed = parseChordPro(song.chordpro, semitones, targetKey);
    return mode === "chords" ? chordsOnly(parsed) : parsed;
  }, [song, semitones, targetKey, mode]);

  const filtered = availableSongs.filter((s) =>
    (s.title + s.artist).toLowerCase().includes(query.toLowerCase()),
  );

  const sectionShortcuts = [
    "INTRO",
    "ESTROFA 1",
    "ESTROFA 2",
    "CORO",
    "PRE-CORO",
    "PUENTE",
    "INTERLUDIO",
    "FINAL",
    "SOLO",
  ];
  const chordShortcuts = song ? diatonicChords(targetKey) : [];

  const insertAtCursor = (value: string, lineBreaks: boolean) => {
    const input = chordInputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const before = draft.slice(0, start);
    const after = draft.slice(end);
    const prefix = lineBreaks && before && !before.endsWith("\n") ? "\n" : "";
    const suffix = lineBreaks && after && !after.startsWith("\n") ? "\n" : "";
    const inserted = `${prefix}${value}${suffix}`;
    const nextDraft = `${before}${inserted}${after}`;
    setDraft(nextDraft);

    requestAnimationFrame(() => {
      if (!input) return;
      const cursor = before.length + inserted.length;
      input.focus();
      input.setSelectionRange(cursor, cursor);
    });
  };

  const handleStartEditing = () => {
    setDraft(song?.chordpro ?? "");
    setEditing(true);
    setSaveError(null);
  };

  const handleCancelEditing = () => {
    setEditing(false);
    setDraft("");
    setSaveError(null);
  };

  const handleSaveChords = async () => {
    if (!song) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await SongsService.updateSong(song.id, { chordpro: draft });
      updateSong(updated);
      setEditing(false);
      setDraft("");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "No se pudieron guardar los acordes");
    } finally {
      setSaving(false);
    }
  };

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
                <div
                  key={s.id}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                    s.id === song.id ? "bg-primary/15 text-primary" : "hover:bg-elevated/70"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSongId(s.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-label={`Ver acordes de ${s.title}`}
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
                  <button
                    type="button"
                    onClick={() => {
                      if (current?.id === s.id && isPlaying) toggle();
                      else play(s);
                    }}
                    aria-label={
                      current?.id === s.id && isPlaying
                        ? `Pausar ${s.title}`
                        : `Reproducir ${s.title}`
                    }
                    title={current?.id === s.id && isPlaying ? "Pausar" : "Reproducir"}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-primary"
                  >
                    {current?.id === s.id && isPlaying ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="ml-0.5 h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
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
                {song.artist} · original {song.key} · {song.compas} · {song.bpm} BPM
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
            {can("editSongs") && !editing ? (
              <button
                type="button"
                onClick={handleStartEditing}
                className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <Pencil className="h-4 w-4" /> Editar
              </button>
            ) : null}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="surface-card flex flex-wrap items-center gap-2 p-3">
                <span className="mr-1 text-xs font-semibold text-muted-foreground">Secciones:</span>
                {sectionShortcuts.map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => insertAtCursor(`[${section}]`, true)}
                    className="rounded-full border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    {section}
                  </button>
                ))}
              </div>
              <div className="surface-card flex flex-wrap items-center gap-2 p-3">
                <span className="mr-1 text-xs font-semibold text-muted-foreground">
                  Acordes en {targetKey}:
                </span>
                {chordShortcuts.map((chord) => (
                  <button
                    key={chord}
                    type="button"
                    onClick={() => insertAtCursor(`[${chord}]`, false)}
                    className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10"
                  >
                    {chord}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => insertAtCursor("    ", false)}
                  className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10"
                >
                  Tab
                </button>
              </div>
              <textarea
                ref={chordInputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[420px] w-full rounded-2xl border border-border bg-card p-6 font-mono text-lg leading-relaxed whitespace-pre-wrap outline-none focus:border-primary/50"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveChords()}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-full border border-primary/50 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
              {saveError ? (
                <p role="alert" className="text-sm text-destructive">
                  {saveError}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="surface-card overflow-x-auto p-5 sm:p-8">
              <ChordSheet lines={lines} fontSize={fontSize} mode={mode} />
            </div>
          )}

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
