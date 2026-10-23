import { useMemo, useRef, useState } from "react";
import { ChevronDown, Dices, GripVertical, ListMusic, Search, Sparkles, X } from "lucide-react";
import { Cover } from "@/components/common/ui-bits";
import { INSTRUMENTS } from "@/lib/instruments";
import { InstrumentPicker } from "@/components/common/InstrumentPicker";
import { useApp } from "@/hooks/useApp";
import { SetlistsService } from "../services/setlists.service";
import { SongsService } from "@/features/canciones/services/songs.service";
import { resolveMedley } from "@/features/canciones/lib/medley";
import { generateList, lastPlayedBySong, pickReplacement } from "../lib/generator";
import {
  EVENT_TYPES,
  type EventType,
  type Setlist,
  type SetlistItem,
  type SetlistSection,
} from "@/types";
import { SECTIONS, defaultSection, itemsForType, usesSections } from "../lib/sections";
import { isDateTitle, titleForDate } from "../lib/date-title";
import { isAssignable } from "../lib/assignable";
import { matchesSearch } from "@/lib/search";
import { hasSequence } from "@/features/canciones/lib/sequence";
import { ListDuration } from "./ListDuration";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

/** "AAAA-MM-DDTHH:mm" (lo que usa el input datetime-local), en hora local */
const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Próximo día de la semana (0 = domingo, 3 = miércoles) desde hoy, inclusive; weeksLater = 1 es
 * el de la semana siguiente. Mantiene la hora "HH:mm" que ya estaba elegida.
 */
function nextWeekday(weekday: number, weeksLater: number, time: string): string {
  const d = new Date();
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7) + weeksLater * 7);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return toLocalInput(d);
}

/** Desplegable de fechas: los próximos 4 de cada uno (el primero es el de esta semana, o hoy) */
const DATE_SHORTCUTS = [
  { label: "Domingos", day: "Domingo", weekday: 0 },
  { label: "Miércoles", day: "Miércoles", weekday: 3 },
];

export function NewSetlistModal({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: (s: Setlist) => void;
  /** Lista predefinida de la que se parte: trae el título y las canciones (con su tono) */
  initial?: { title: string; items: SetlistItem[] } | undefined;
}) {
  const { songs, users, currentUser, setlists, can, updateSong } = useApp();
  // "Menos tocadas": ordena por cuántas veces se tocó cada canción en los setlists de los
  // últimos 5 meses (de menos a más)
  const [leastPlayed, setLeastPlayed] = useState(false);
  const playCounts = useMemo(() => {
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    const now = new Date();
    const counts = new Map<string, number>();
    setlists.forEach((sl) => {
      const d = new Date(sl.date);
      if (d < since || d > now) return;
      sl.items.forEach((it) => counts.set(it.songId, (counts.get(it.songId) ?? 0) + 1));
    });
    return counts;
  }, [setlists]);
  const [date, setDateValue] = useState(() => nextWeekday(0, 0, "10:30"));
  // el título arranca con la fecha ("Domingo 04/10") y la sigue al cambiarla, hasta que el usuario
  // escribe uno propio; si lo borra entero, vuelve a seguirla. Un título que ya es una fecha (ej.
  // una predefinida llamada "Domingo 04/10") también la sigue: si no quedaba con la fecha vieja
  const [title, setTitleValue] = useState(() => initial?.title ?? titleForDate(date));
  const [titleEdited, setTitleEdited] = useState(
    Boolean(initial?.title) && !isDateTitle(initial?.title ?? ""),
  );
  const setTitle = (value: string) => {
    setTitleValue(value);
    setTitleEdited(value.trim() !== "" && !isDateTitle(value));
  };
  const setDate = (value: string) => {
    setDateValue(value);
    if (!titleEdited) setTitleValue(titleForDate(value));
  };
  const [type, setType] = useState<EventType>("Culto Domingo a la tarde");
  const [query, setQuery] = useState("");
  // filtro por tipo (Alabanza / Adoración) al lado del buscador; "" = todos
  const [tipo, setTipo] = useState("");
  const tipos = useMemo(
    () => [...new Set(songs.map((s) => s.tipo).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [songs],
  );
  const searchRef = useRef<HTMLDivElement | null>(null);
  const [picked, setPicked] = useState<string[]>(() =>
    (initial?.items ?? []).map((it) => it.songId).filter((id) => songs.some((s) => s.id === id)),
  );
  // tono de cada canción que vino de la lista predefinida (si no, el tono original)
  const initialKeys = useMemo(
    () => new Map((initial?.items ?? []).map((it) => [it.songId, it.key])),
    [initial],
  );
  // sección de cada canción (Cultos y Ensayos): la que vino de la lista predefinida o la elegida;
  // si no hay, la de su tipo (adoraciones a Adoración, el resto a Alabanzas)
  const [sections, setSections] = useState<Record<string, SetlistSection>>(() =>
    Object.fromEntries(
      (initial?.items ?? []).flatMap((it) => (it.section ? [[it.songId, it.section]] : [])),
    ),
  );
  const sectionFor = (songId: string): SetlistSection =>
    sections[songId] ?? defaultSection(songs.find((s) => s.id === songId));
  // ---- sugerir una lista (generador): 3 alabanzas, 2 adoraciones y 1 ofrenda ----
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestTag, setSuggestTag] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [rerolling, setRerolling] = useState<string | null>(null);
  const [suggestNote, setSuggestNote] = useState<string | null>(null);
  const allTags = useMemo(
    () => [...new Set(songs.flatMap((song) => song.tags))].sort((a, b) => a.localeCompare(b)),
    [songs],
  );
  const medleyCache = useRef(new Map<string, boolean>());
  // enganchado: lo decidido en la canción o, si no, medido por la duración (y guardado, así no se
  // vuelve a leer el audio; solo si quien arma la lista puede editar canciones)
  const isMedley = async (generatorSong: { id: string }) => {
    const cached = medleyCache.current.get(generatorSong.id);
    if (cached !== undefined) return cached;
    const full = songs.find((song) => song.id === generatorSong.id);
    const result = full ? await resolveMedley(full) : false;
    medleyCache.current.set(generatorSong.id, result ?? false);
    if (full && result !== null && full.enganchado === null && can("editSongs")) {
      void SongsService.updateSong(full.id, { enganchado: result })
        .then(updateSong)
        .catch(() => undefined);
    }
    return result ?? false;
  };
  const generatorOptions = () => ({
    songs: songs.filter(hasSequence),
    lastPlayed: lastPlayedBySong(setlists),
    tag: suggestTag || null,
    isMedley,
  });
  const suggest = async () => {
    if (
      picked.length > 0 &&
      !window.confirm("Esto reemplaza las canciones que ya elegiste. ¿Seguir?")
    )
      return;
    setSuggesting(true);
    setSuggestNote(null);
    try {
      const list = await generateList(generatorOptions());
      setPicked(list.items.map((item) => item.songId));
      setSections(Object.fromEntries(list.items.map((item) => [item.songId, item.section])));
      const titleOf = (id: string) => songs.find((song) => song.id === id)?.title ?? "";
      const notes: string[] = [];
      if (list.medleyIds.length)
        notes.push(
          `Incluye un enganchado (${list.medleyIds.map(titleOf).join(", ")}): cuenta como 2 alabanzas.`,
        );
      if (list.relaxedTag)
        notes.push(`No alcanzaron canciones con el tema "${suggestTag}": se completó con otras.`);
      const { alabanza, adoracion, ofrenda } = list.missing;
      if (alabanza || adoracion || ofrenda)
        notes.push("No hay canciones con secuencia suficientes para completar la lista.");
      setSuggestNote(notes.length ? notes.join(" ") : null);
    } finally {
      setSuggesting(false);
    }
  };
  // 🎲: cambia una canción por otra del mismo tipo (que no esté en la lista ni sea enganchado)
  const reroll = async (songId: string) => {
    setRerolling(songId);
    setSuggestNote(null);
    try {
      const section = sectionFor(songId);
      const artists = picked.map((id) => songs.find((song) => song.id === id)?.artist ?? "");
      const next = await pickReplacement(generatorOptions(), section, new Set(picked), artists);
      if (!next) {
        setSuggestNote("No hay otra canción con secuencia para cambiar.");
        return;
      }
      setPicked((current) => current.map((id) => (id === songId ? next.id : id)));
      setSections((prev) => {
        const { [songId]: _old, ...rest } = prev;
        return { ...rest, [next.id]: section };
      });
    } finally {
      setRerolling(null);
    }
  };
  const sectioned = usesSections(type);
  // se arrastra por id: con secciones, soltar sobre otra canción también la pasa a su sección
  const [dragId, setDragId] = useState<string | null>(null);
  const dropOn = (targetId: string | null, section?: SetlistSection) => {
    if (dragId === null || dragId === targetId) return;
    const moving = dragId;
    setPicked((current) => {
      const next = current.filter((id) => id !== moving);
      const at = targetId === null ? next.length : next.indexOf(targetId);
      next.splice(at === -1 ? next.length : at, 0, moving);
      return next;
    });
    const to = section ?? (targetId ? sectionFor(targetId) : undefined);
    if (sectioned && to) setSections((prev) => ({ ...prev, [moving]: to }));
    setDragId(null);
  };
  // quien arma la lista entra al equipo, salvo que sea admin (los admins no se asignan)
  const [team, setTeam] = useState<string[]>(() => (currentUser.isAdmin ? [] : [currentUser.id]));
  // qué toca cada miembro en esta lista; si toca un solo instrumento, se marca solo
  const onlyInstrument = (userId: string): Record<string, string[]> => {
    const list = users.find((u) => u.id === userId)?.instruments ?? [];
    return list.length === 1 ? { [userId]: list } : {};
  };
  const [teamInstruments, setTeamInstruments] = useState<Record<string, string[]>>(() =>
    currentUser.isAdmin ? {} : onlyInstrument(currentUser.id),
  );
  const toggleMember = (userId: string) => {
    const on = team.includes(userId);
    setTeam((prev) => (on ? prev.filter((id) => id !== userId) : [...prev, userId]));
    setTeamInstruments((prev) => {
      if (!on) return { ...onlyInstrument(userId), ...prev };
      const { [userId]: _removed, ...rest } = prev;
      return rest;
    });
  };
  // elegir por instrumento (pedido de Pablo): tocar un nombre debajo de "Voces" lo suma al equipo
  // tocando voz; si se le sacan todos los instrumentos, sale del equipo
  const toggleInstrument = (userId: string, instrument: string) => {
    const current = teamInstruments[userId] ?? [];
    const next = current.includes(instrument)
      ? current.filter((i) => i !== instrument)
      : [...current, instrument];
    setTeamInstruments((prev) => ({ ...prev, [userId]: next }));
    setTeam((prev) =>
      next.length
        ? prev.includes(userId)
          ? prev
          : [...prev, userId]
        : prev.filter((id) => id !== userId),
    );
  };
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rotación: veces que se tocó cada canción en el último mes (para avisar si se repite mucho)
  const recentCounts = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const now = new Date();
    const counts = new Map<string, number>();
    setlists.forEach((sl) => {
      const d = new Date(sl.date);
      if (d < since || d > now) return;
      sl.items.forEach((it) => counts.set(it.songId, (counts.get(it.songId) ?? 0) + 1));
    });
    return counts;
  }, [setlists]);
  // Sugerencias: las menos tocadas en 5 meses que todavía no están en la lista (solo con secuencia)
  const suggestions = useMemo(
    () =>
      songs
        .filter((s) => hasSequence(s) && !picked.includes(s.id))
        .sort((a, b) => (playCounts.get(a.id) ?? 0) - (playCounts.get(b.id) ?? 0))
        .slice(0, 6),
    [songs, picked, playCounts],
  );
  const repeatedWarning = (songId: string) => {
    const n = recentCounts.get(songId) ?? 0;
    return n >= 2 ? `Se tocó ${n} veces en el último mes` : null;
  };

  const results = useMemo(() => {
    // al buscar entran todas, con o sin secuencia: a veces hay que tocar una que todavía no tiene audio
    const found = songs.filter((s) => (!tipo || s.tipo === tipo) && matchesSearch(query, s.title));
    if (leastPlayed)
      found.sort((a, b) => (playCounts.get(a.id) ?? 0) - (playCounts.get(b.id) ?? 0));
    return found.slice(0, 40);
  }, [songs, query, tipo, leastPlayed, playCounts]);

  // equipo para elegir (pedido de Pablo): solo líderes y músicos activos; los admins nunca, aunque
  // quien arma la lista sea admin
  const activeUsers = useMemo(() => users.filter(isAssignable), [users]);
  // grupos por instrumento (en el orden de siempre), solo los que alguien del equipo toca
  const instrumentGroups = INSTRUMENTS.map((instrument) => ({
    instrument,
    label: instrument === "Voz" ? "Voces" : instrument,
    members: activeUsers.filter((u) => u.instruments?.includes(instrument)),
  })).filter((group) => group.members.length > 0);
  const withoutInstruments = activeUsers.filter((u) => !u.instruments?.length);
  const pickedSongs = picked
    .map((id) => songs.find((song) => song.id === id))
    .filter((song): song is (typeof songs)[number] => Boolean(song));

  const canSave = title.trim() !== "" && picked.length > 0 && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await SetlistsService.createSetlist({
        title: title.trim(),
        date: new Date(date).toISOString(),
        isUpcoming: true,
        type,
        leaderId: currentUser.id,
        teamIds: team,
        teamInstruments,
        // con secciones: ordenadas por sección y cada una con la suya; Evento Especial, en orden
        items: itemsForType(
          picked.map((id) => ({
            songId: id,
            key: initialKeys.get(id) ?? songs.find((s) => s.id === id)?.key ?? "C",
            section: sectionFor(id),
          })),
          type,
          songs,
        ),
      });
      onSave(created);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la lista de canciones");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      {/* celular: ocupa toda la pantalla, de arriba a abajo (antes era una hoja hasta el 92 %) */}
      <div className="flex h-dvh w-full max-w-xl flex-col border-border bg-card p-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:border">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Nueva lista de canciones</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="space-y-3">
            <input
              className={inputCls}
              placeholder="Título del servicio"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="datetime-local"
                className={inputCls}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <select
                className={inputCls}
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            {/* acceso directo de fecha: los próximos 4 domingos y 4 miércoles (mantiene la hora) */}
            {(() => {
              const time = date.slice(11, 16);
              const groups = DATE_SHORTCUTS.map((g) => ({
                ...g,
                dates: [0, 1, 2, 3].map((weeks) => nextWeekday(g.weekday, weeks, time)),
              }));
              const picked = groups.some((g) => g.dates.includes(date)) ? date : "";
              return (
                <select
                  aria-label="Elegir un domingo o miércoles próximo"
                  className={`${inputCls} ${picked ? "border-primary/50 text-primary" : "text-muted-foreground"}`}
                  value={picked}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                >
                  <option value="">Elegir un domingo o miércoles próximo…</option>
                  {groups.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.dates.map((value, weeks) => (
                        <option key={value} value={value}>
                          {g.day} {value.slice(8, 10)}/{value.slice(5, 7)}
                          {weeks === 0
                            ? g.weekday === new Date().getDay()
                              ? " (hoy)"
                              : " (este)"
                            : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              );
            })()}
            {/* al tocar el buscador en celular se abre el teclado: el buscador sube al tope del
                modal para que se vean los resultados justo abajo */}
            {/* generador: arma 3 alabanzas, 2 adoraciones y 1 ofrenda con canciones con secuencia que
                hace tiempo que no se tocan, opcionalmente de un tema */}
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.06]">
              <button
                type="button"
                onClick={() => setSuggestOpen((open) => !open)}
                aria-expanded={suggestOpen}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-primary"
              >
                <Sparkles className="h-4 w-4" /> Sugerir una lista
                <ChevronDown
                  className={`ml-auto h-4 w-4 transition-transform ${suggestOpen ? "rotate-180" : ""}`}
                />
              </button>
              {suggestOpen ? (
                <div className="space-y-3 border-t border-primary/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    3 alabanzas, 2 adoraciones y 1 ofrenda, con canciones con secuencia que hace
                    tiempo que no se tocan. Cada vez sale una distinta.
                  </p>
                  <select
                    value={suggestTag}
                    onChange={(e) => setSuggestTag(e.target.value)}
                    aria-label="Tema de la lista sugerida"
                    className={inputCls}
                  >
                    <option value="">Al azar (cualquier tema)</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void suggest()}
                    disabled={suggesting}
                    className="flex w-full items-center justify-center gap-2 rounded-full gradient-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60"
                  >
                    <Sparkles className="h-4 w-4" />
                    {suggesting
                      ? "Armando la lista…"
                      : picked.length
                        ? "Generar de nuevo"
                        : "Generar lista"}
                  </button>
                </div>
              ) : null}
              {suggestNote ? (
                <p className="border-t border-primary/20 px-4 py-2.5 text-xs text-amber-400">
                  {suggestNote}
                </p>
              ) : null}
            </div>
            <div ref={searchRef} className="flex scroll-mt-1 items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={inputCls + " pl-10"}
                  placeholder="Buscar canciones para agregar…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => {
                    // después de que el teclado achica la pantalla
                    window.setTimeout(
                      () =>
                        searchRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }),
                      300,
                    );
                  }}
                />
              </div>
              {tipos.length ? (
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  aria-label="Filtrar por tipo"
                  className={`shrink-0 self-stretch rounded-xl border bg-secondary px-3 text-sm outline-none transition-colors focus:border-primary/60 ${
                    tipo ? "border-primary/50 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  <option value="">Todas</option>
                  {tipos.map((t) => (
                    <option key={t} value={t}>
                      {t === "Alabanza" ? "Alabanzas" : t === "Adoración" ? "Adoraciones" : t}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
            {results.map((s) => {
              const on = picked.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() =>
                    setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))
                  }
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-elevated/70 ${
                    on ? "bg-primary/10" : ""
                  }`}
                >
                  <Cover song={s} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.artist}
                      {hasSequence(s) ? "" : " · Sin secuencia"}
                    </p>
                    {repeatedWarning(s.id) ? (
                      <p className="truncate text-[11px] text-amber-400">
                        ⚠ {repeatedWarning(s.id)}
                      </p>
                    ) : null}
                  </div>
                  {leastPlayed ? (
                    <span className="text-xs text-muted-foreground">
                      {(playCounts.get(s.id) ?? 0) === 0
                        ? "Sin tocar"
                        : `${playCounts.get(s.id)} ${playCounts.get(s.id) === 1 ? "vez" : "veces"}`}
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">{s.key}</span>
                  {on ? <span className="text-xs font-semibold text-primary">Agregada</span> : null}
                </button>
              );
            })}
          </div>

          {/* "Menos tocadas" y las sugeridas, debajo de los resultados: los resultados van justo
              abajo del buscador */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setLeastPlayed((v) => !v)}
              aria-pressed={leastPlayed}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                leastPlayed
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Menos tocadas (últimos 5 meses)
            </button>
            {suggestions.length ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Sugeridas para rotar:</span>
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPicked((p) => [...p, s.id])}
                    className="rounded-full border border-dashed border-primary/40 px-2.5 py-0.5 text-xs text-primary transition-colors hover:bg-primary/10"
                  >
                    + {s.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Orden del servicio
              </p>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                <ListDuration songs={pickedSongs} />
                {pickedSongs.length} canciones
              </span>
            </div>
            {pickedSongs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Agregá canciones para armar el orden del servicio.
              </p>
            ) : (
              <div className="space-y-3">
                {(sectioned
                  ? SECTIONS.map((section) => ({
                      id: section.id as SetlistSection | null,
                      label: section.label as string | null,
                      songs: pickedSongs.filter((song) => sectionFor(song.id) === section.id),
                    }))
                  : [{ id: null, label: null, songs: pickedSongs }]
                ).map((group, g, groups) => {
                  // numeración corrida entre secciones
                  const offset = groups.slice(0, g).reduce((n, x) => n + x.songs.length, 0);
                  return (
                    <div key={group.id ?? "todas"}>
                      {group.label ? (
                        <p
                          // soltar sobre el título pasa la canción al final de esa sección
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => dropOn(null, group.id ?? undefined)}
                          className="mb-1.5 text-sm font-semibold text-primary"
                        >
                          {group.label}
                        </p>
                      ) : null}
                      {group.songs.length === 0 ? (
                        <p
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => dropOn(null, group.id ?? undefined)}
                          className="rounded-xl border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground"
                        >
                          Sin canciones. Pasá una desde otra sección.
                        </p>
                      ) : (
                        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                          {group.songs.map((song, index) => (
                            <div
                              key={song.id}
                              draggable
                              onDragStart={() => setDragId(song.id)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => dropOn(song.id)}
                              onDragEnd={() => setDragId(null)}
                              className={`flex items-center gap-2 bg-card px-3 py-2 ${
                                dragId === song.id ? "opacity-50" : ""
                              }`}
                            >
                              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                              <span className="w-5 text-xs text-muted-foreground">
                                {offset + index + 1}
                              </span>
                              <Cover song={song} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{song.title}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {song.artist}
                                </p>
                                {repeatedWarning(song.id) ? (
                                  <p className="truncate text-[11px] text-amber-400">
                                    ⚠ {repeatedWarning(song.id)}
                                  </p>
                                ) : null}
                              </div>
                              {sectioned ? (
                                // pasar a otra sección (más fácil que arrastrar en el celular)
                                <select
                                  value={sectionFor(song.id)}
                                  onChange={(event) =>
                                    setSections((prev) => ({
                                      ...prev,
                                      [song.id]: event.target.value as SetlistSection,
                                    }))
                                  }
                                  aria-label={`Sección de ${song.title}`}
                                  className="shrink-0 rounded-lg border border-border bg-secondary px-1.5 py-1 text-xs outline-none focus:border-primary/60"
                                >
                                  {SECTIONS.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : null}
                              <button
                                type="button"
                                aria-label={`Cambiar ${song.title} por otra`}
                                title="Cambiar por otra"
                                disabled={rerolling !== null || suggesting}
                                onClick={() => void reroll(song.id)}
                                className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-primary disabled:opacity-40"
                              >
                                <Dices
                                  className={`h-4 w-4 ${rerolling === song.id ? "animate-spin" : ""}`}
                                />
                              </button>
                              <button
                                type="button"
                                aria-label={`Quitar ${song.title}`}
                                onClick={() =>
                                  setPicked((current) => current.filter((id) => id !== song.id))
                                }
                                className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Equipo asignado
            </p>
            {/* por instrumento: debajo de cada uno, quienes lo tocan; tocar un nombre lo asigna
                a ese instrumento en esta lista */}
            <div className="space-y-3">
              {instrumentGroups.map((group) => (
                <div key={group.instrument}>
                  <p className="mb-1.5 text-sm font-semibold text-primary">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.members.map((u) => {
                      const on = (teamInstruments[u.id] ?? []).includes(group.instrument);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleInstrument(u.id, group.instrument)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            on
                              ? "border-primary/50 bg-primary/15 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {u.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {withoutInstruments.length ? (
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-muted-foreground">
                    Sin instrumentos cargados
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {withoutInstruments.map((u) => {
                      const on = team.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleMember(u.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            on
                              ? "border-primary/50 bg-primary/15 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {u.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Los instrumentos se cargan desde Equipo.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex justify-end gap-2">
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
            <ListMusic className="mr-1 inline h-4 w-4" /> {saving ? "Creando…" : "Crear lista"}
          </button>
        </div>
      </div>
    </div>
  );
}
