import { useMemo, useState } from "react";
import { GripVertical, ListMusic, Search, X } from "lucide-react";
import { Cover } from "@/components/common/ui-bits";
import { InstrumentPicker } from "@/components/common/InstrumentPicker";
import { INSTRUMENTS } from "@/lib/instruments";
import { useApp } from "@/hooks/useApp";
import { SetlistsService } from "../services/setlists.service";
import { EVENT_TYPES, type EventType, type Setlist, type SetlistItem } from "@/types";

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
/** Título por defecto a partir de la fecha del input ("AAAA-MM-DDTHH:mm"): "Domingo 04/10" */
const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
function titleForDate(value: string): string {
  const [y, mo, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !mo || !d) return "";
  return `${DAY_NAMES[new Date(y, mo - 1, d).getDay()]} ${value.slice(8, 10)}/${value.slice(5, 7)}`;
}

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
  const { songs, users, currentUser, setlists } = useApp();
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
  // escribe uno propio (o viene de una lista predefinida); si lo borra entero, vuelve a seguirla
  const [title, setTitleValue] = useState(() => initial?.title ?? titleForDate(date));
  const [titleEdited, setTitleEdited] = useState(Boolean(initial?.title));
  const setTitle = (value: string) => {
    setTitleValue(value);
    setTitleEdited(value.trim() !== "");
  };
  const setDate = (value: string) => {
    setDateValue(value);
    if (!titleEdited) setTitleValue(titleForDate(value));
  };
  const [type, setType] = useState<EventType>("Culto Domingo a la mañana");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>(() =>
    (initial?.items ?? []).map((it) => it.songId).filter((id) => songs.some((s) => s.id === id)),
  );
  // tono de cada canción que vino de la lista predefinida (si no, el tono original)
  const initialKeys = useMemo(
    () => new Map((initial?.items ?? []).map((it) => [it.songId, it.key])),
    [initial],
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [team, setTeam] = useState<string[]>([currentUser.id]);
  // qué toca cada miembro en esta lista; si toca un solo instrumento, se marca solo
  const onlyInstrument = (userId: string): Record<string, string[]> => {
    const list = users.find((u) => u.id === userId)?.instruments ?? [];
    return list.length === 1 ? { [userId]: list } : {};
  };
  const [teamInstruments, setTeamInstruments] = useState<Record<string, string[]>>(() =>
    onlyInstrument(currentUser.id),
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
  // Sugerencias: las menos tocadas en 5 meses que todavía no están en la lista
  const suggestions = useMemo(
    () =>
      songs
        .filter((s) => !picked.includes(s.id))
        .sort((a, b) => (playCounts.get(a.id) ?? 0) - (playCounts.get(b.id) ?? 0))
        .slice(0, 6),
    [songs, picked, playCounts],
  );
  const repeatedWarning = (songId: string) => {
    const n = recentCounts.get(songId) ?? 0;
    return n >= 2 ? `Se tocó ${n} veces en el último mes` : null;
  };

  const results = useMemo(() => {
    const found = songs.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()));
    if (leastPlayed)
      found.sort((a, b) => (playCounts.get(a.id) ?? 0) - (playCounts.get(b.id) ?? 0));
    return found.slice(0, 40);
  }, [songs, query, leastPlayed, playCounts]);

  const activeUsers = useMemo(() => users.filter((u) => !u.fechaHoraBaja), [users]);
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
        items: picked.map((id) => ({
          songId: id,
          key: initialKeys.get(id) ?? songs.find((s) => s.id === id)?.key ?? "C",
        })),
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
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl border border-border bg-card p-6 sm:rounded-2xl">
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
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={inputCls + " pl-10"}
                placeholder="Buscar canciones para agregar…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
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
                    <p className="truncate text-xs text-muted-foreground">{s.artist}</p>
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Orden del servicio
              </p>
              <span className="text-xs text-muted-foreground">{pickedSongs.length} canciones</span>
            </div>
            {pickedSongs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Agregá canciones para armar el orden del servicio.
              </p>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {pickedSongs.map((song, index) => (
                  <div
                    key={song.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null || dragIndex === index) return;
                      setPicked((current) => {
                        const next = [...current];
                        const [moved] = next.splice(dragIndex, 1);
                        if (moved) next.splice(index, 0, moved);
                        return next;
                      });
                      setDragIndex(null);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className={`flex items-center gap-2 bg-card px-3 py-2 ${
                      dragIndex === index ? "opacity-50" : ""
                    }`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                    <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
                    <Cover song={song} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{song.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
                      {repeatedWarning(song.id) ? (
                        <p className="truncate text-[11px] text-amber-400">
                          ⚠ {repeatedWarning(song.id)}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      aria-label={`Quitar ${song.title}`}
                      onClick={() => setPicked((current) => current.filter((id) => id !== song.id))}
                      className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Equipo asignado
            </p>
            <div className="flex flex-wrap gap-2">
              {activeUsers.map((u) => {
                const on = team.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
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
            {/* qué toca cada uno en esta lista (de sus instrumentos; si no tiene cargados, todos) */}
            {team.length ? (
              <div className="mt-3 space-y-2">
                {team.map((id) => {
                  const u = users.find((x) => x.id === id);
                  if (!u) return null;
                  return (
                    <div key={id} className="rounded-xl border border-border/60 p-2.5">
                      <p className="mb-1.5 text-xs font-medium">{u.name} toca:</p>
                      <InstrumentPicker
                        size="sm"
                        options={u.instruments?.length ? u.instruments : INSTRUMENTS}
                        value={teamInstruments[id] ?? []}
                        onChange={(next) => setTeamInstruments((prev) => ({ ...prev, [id]: next }))}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
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
