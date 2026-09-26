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
import { useFitFontSize } from "../hooks/useFitFontSize";
import { useAuth } from "@/core/auth/useAuth";
import { ChordProEditor } from "../../components/ChordProEditor";
import { enterBrowserFullscreen, exitBrowserFullscreen, isBrowserFullscreen } from "@/lib/browser-fullscreen";

export function AcordesPage() {
  const { songs, songsLoadState, current, isPlaying, play, toggle, can, updateSong } = useApp();
  const { songId: requestedSongId, songIds, editar } = useSearch({ from: "/acordes" });
  // "Editar" desde Letras abre el editor acá una sola vez, cuando la canción pedida ya cargó
  const autoEditDoneRef = useRef(false);
  const { hasAnyPermission } = useAuth();
  const canSeeAnnotations = hasAnyPermission(["anotacion:read"]);
  const [songId, setSongId] = useState<string | null>(null);
  const [semitones, setSemitones] = useState(0);
  // null = tamaño automático (useFitFontSize); con +/− queda el elegido hasta cambiar de canción
  const [manualFontSize, setManualFontSize] = useState<number | null>(null);
  const [mode, setMode] = useState<"both" | "chords">("both");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchPanelRef = useRef<HTMLElement | null>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const syncLiveMode = () => {
      if (!isBrowserFullscreen()) setLive(false);
    };
    document.addEventListener("fullscreenchange", syncLiveMode);
    document.addEventListener("webkitfullscreenchange", syncLiveMode);
    return () => {
      document.removeEventListener("fullscreenchange", syncLiveMode);
      document.removeEventListener("webkitfullscreenchange", syncLiveMode);
    };
  }, []);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const chordInputRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const closeOnOutsideTap = (event: PointerEvent) => {
      if (searchPanelRef.current && !searchPanelRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideTap);
    return () => document.removeEventListener("pointerdown", closeOnOutsideTap);
  }, []);
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

  // va después del reset de arriba: en el mismo render, este setEditing(true) es el que queda
  useEffect(() => {
    if (!editar || autoEditDoneRef.current || !can("editSongs")) return;
    const requestedSong = availableSongs.find((item) => item.id === requestedSongId);
    if (!requestedSong || songId !== requestedSong.id) return;
    autoEditDoneRef.current = true;
    setDraft(requestedSong.chordpro);
    setEditing(true);
  }, [editar, requestedSongId, availableSongs, songId, can]);

  // Las canciones ahora se cargan del backend real; mientras se resuelve el
  // fetch, `songs` está vacío (antes el mock siempre tenía datos ya listos).
  // Los hooks de acá abajo se llaman siempre (regla de hooks), con
  // fallbacks seguros para ese instante — el guard de "todavía no hay
  // canciones" se aplica recién en el return, después de todos los hooks.
  const ready = songsLoadState === "ready" && availableSongs.length > 0;
  const song = availableSongs.find((s) => s.id === songId) ?? availableSongs[0];
  const targetKey = song ? transposeKey(song.key, semitones) : "C";

  useEffect(() => {
    setSemitones(0);
  }, [song?.id, song?.key]);

  const lines = useMemo(() => {
    if (!song) return [];
    const parsed = parseChordPro(song.chordpro, semitones, targetKey);
    return mode === "chords" ? chordsOnly(parsed) : parsed;
  }, [song, semitones, targetKey, mode]);

  // Vista previa en vivo del borrador mientras se edita — mismo parser y mismo render que la vista normal
  const draftLines = useMemo(() => {
    if (!editing) return [];
    const parsed = parseChordPro(draft, semitones, targetKey);
    return mode === "chords" ? chordsOnly(parsed) : parsed;
  }, [editing, draft, semitones, targetKey, mode]);

  // Tamaño que entra en el ancho de la pantalla (25px en computadora, menos en celular)
  const { boxRef: sheetBoxRef, fitted: fittedFontSize } = useFitFontSize(
    25,
    12,
    manualFontSize === null,
    [song?.id, mode, semitones, editing, live],
  );
  const fontSize = manualFontSize ?? fittedFontSize;
  const changeFontSize = (delta: number, max: number) =>
    setManualFontSize(Math.max(12, Math.min(max, fontSize + delta)));

  useEffect(() => {
    setManualFontSize(null);
  }, [song?.id]);

  const filtered = availableSongs.filter((s) =>
    (s.title + s.artist).toLowerCase().includes(query.toLowerCase()),
  );
  const visibleSongs = query ? filtered : [...filtered].sort((a, b) => Number(b.id === song.id) - Number(a.id === song.id));

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

  /** `cursorBack`: cuántos caracteres antes del final de lo insertado queda el cursor */
  const insertAtCursor = (value: string, lineBreaks: boolean, cursorBack = 0) => {
    const input = chordInputRef.current;
    const scrollTop = input?.scrollTop ?? 0;
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
      const cursor = before.length + inserted.length - cursorBack;
      input.focus();
      input.setSelectionRange(cursor, cursor);
      input.scrollTop = scrollTop;
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
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black px-5 py-10 sm:px-10">
        <button
          onClick={() => {
            setLive(false);
            void exitBrowserFullscreen();
          }}
          aria-label="Salir del modo presentación"
          className="fixed top-4 right-4 rounded-full border border-white/20 p-2 text-white/70 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="fixed bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 backdrop-blur">
          <IconBtn onClick={() => changeFontSize(-2, 48)} label="Achicar">
            <Minus className="h-4 w-4" />
          </IconBtn>
          <span className="w-9 text-center text-xs text-white/70">{fontSize}px</span>
          <IconBtn onClick={() => changeFontSize(2, 48)} label="Agrandar">
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
        {/* Bloque centrado en la pantalla (horizontal, y vertical si la canción es corta), con el
            texto alineado a la izquierda adentro. sheetBoxRef va en el contenedor de ancho completo:
            el ajuste de tamaño necesita un ancho que no dependa del propio contenido. */}
        <div ref={sheetBoxRef} className="flex min-h-full flex-col pb-16">
          <div className="m-auto w-fit max-w-full">
            <h2 className="mb-8 font-display text-2xl text-white">{song.title}</h2>
            <ChordSheet lines={lines} fontSize={fontSize} mode={mode} dark />
          </div>
        </div>
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
            onClick={() => {
              void enterBrowserFullscreen();
              setLive(true);
            }}
            className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <Maximize2 className="h-4 w-4" /> <span className="hidden sm:inline">En vivo</span>
          </button>
          <button
            // el PDF no depende del ancho de la pantalla: tamaño de siempre, salvo que se haya elegido a mano
            onClick={() =>
              exportChordsPdf(song, { semitones, targetKey, mode, fontSize: manualFontSize ?? 25 })
            }
            className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside ref={searchPanelRef} className="surface-card order-1 flex max-h-[55vh] flex-col overflow-hidden lg:order-1 lg:sticky lg:top-24 lg:max-h-[70vh]">
          <div className="relative border-b border-border/60 p-3">
            <Search className="absolute top-1/2 left-6 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Saltar a canción…"
              className="w-full rounded-full border border-border bg-secondary py-2 pr-3 pl-10 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out lg:flex-1 lg:grid-rows-[1fr] lg:opacity-100 ${searchOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="min-h-0 overflow-y-auto p-2 lg:max-h-[65vh]">
            {!query && <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recientes</p>}
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Sin resultados</p>
            ) : (
              visibleSongs.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSongId(s.id);
                    setSearchOpen(false);
                    play(s);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                    s.id === song.id ? "bg-primary/15 text-primary" : "hover:bg-elevated/70"
                  }`}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSongId(s.id);
                      setSearchOpen(false);
                    }}
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
                    onClick={(event) => {
                      event.stopPropagation();
                      setSearchOpen(false);
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
          </div>
        </aside>

        {/* min-w-0: sin esto, una hoja más ancha que la pantalla estiraba la columna y cortaba la tarjeta de arriba */}
        <div className="order-2 min-w-0 space-y-5 lg:order-2">
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
              <IconBtn onClick={() => changeFontSize(-2, 40)} label="Achicar letra">
                <Minus className="h-4 w-4" />
              </IconBtn>
              <span className="w-10 text-center text-xs text-muted-foreground">{fontSize}px</span>
              <IconBtn onClick={() => changeFontSize(2, 40)} label="Agrandar letra">
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
            {/* Guardar/Cancelar arriba, a mano sin importar lo larga que sea la canción */}
            {editing ? (
              <>
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
              </>
            ) : null}
          </div>

          {editing ? (
            <div className="space-y-3">
              {saveError ? (
                <p role="alert" className="text-sm text-destructive">
                  {saveError}
                </p>
              ) : null}
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
                  onClick={() => insertAtCursor(" - ", false)}
                  className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => insertAtCursor(":]", false)}
                  className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10"
                >
                  :]
                </button>
                {["%", "x3", "x4", "Sube Tono", "Baja Tono"].map((marker) => (
                  <button
                    key={marker}
                    type="button"
                    onClick={() => insertAtCursor(`[${marker}]`, false)}
                    className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10"
                  >
                    {marker}
                  </button>
                ))}
                <button
                  type="button"
                  title="Anotación al costado de la línea, ej. (coro 2)"
                  onClick={() => insertAtCursor(" ()", false, 1)}
                  className="rounded-full border border-sky/50 px-3 py-1.5 text-xs font-semibold text-sky transition-colors hover:bg-sky/10"
                >
                  ↱ nota
                </button>
                <button
                  type="button"
                  onClick={() => insertAtCursor("    ", false)}
                  className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10"
                >
                  Tab
                </button>
              </div>
              <div className="grid items-start gap-4 xl:grid-cols-2">
                <ChordProEditor
                  textareaRef={chordInputRef}
                  value={draft}
                  onChange={setDraft}
                  className="min-h-[420px] w-full rounded-2xl border border-border bg-card p-6 font-mono text-lg leading-relaxed whitespace-pre-wrap outline-none focus:border-primary/50"
                />
                <div
                  ref={sheetBoxRef}
                  className="surface-card overflow-auto p-5 sm:p-6 xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)]"
                >
                  <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Vista previa
                  </p>
                  <ChordSheet lines={draftLines} fontSize={fontSize} mode={mode} />
                </div>
              </div>
            </div>
          ) : (
            <div ref={sheetBoxRef} className="surface-card overflow-x-auto p-5 sm:p-8">
              <ChordSheet lines={lines} fontSize={fontSize} mode={mode} />
            </div>
          )}

          {canSeeAnnotations ? <Annotations songId={song.id} /> : null}
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
