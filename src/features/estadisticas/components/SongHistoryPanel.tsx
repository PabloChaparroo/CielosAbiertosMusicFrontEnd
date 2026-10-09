import { useMemo, useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import { Avatar } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { songPlaysInRange, toLocalDay } from "../lib/stats";
import { hasSequence } from "@/features/canciones/lib/sequence";

const inputCls =
  "rounded-full border border-border bg-secondary px-3 py-1.5 text-sm outline-none focus:border-primary/60";

/** Desde hace 5 meses hasta hoy */
function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 5);
  return { from: toLocalDay(from), to: toLocalDay(to) };
}

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Historial de una canción: cuántas veces se tocó en un rango de fechas (según los setlists) y,
 * con "Ver cuándo se tocó", los días; opcionalmente, quiénes tocaron en cada uno.
 */
export function SongHistoryPanel() {
  const { songs, setlists, users } = useApp();
  const sortedSongs = useMemo(
    () => songs.filter(hasSequence).sort((a, b) => a.title.localeCompare(b.title)),
    [songs],
  );
  const [songId, setSongId] = useState("");
  const [{ from, to }, setRange] = useState(defaultRange);
  const [showDays, setShowDays] = useState(false);
  const [showTeam, setShowTeam] = useState(false);

  const plays = useMemo(
    () => (songId ? songPlaysInRange(setlists, songId, from, to) : []),
    [setlists, songId, from, to],
  );
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  return (
    <div className="surface-card p-5 xl:col-span-2">
      <h3 className="mb-4 font-display text-lg font-semibold">Historial de una canción</h3>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={songId}
          onChange={(e) => {
            setSongId(e.target.value);
            setShowDays(false);
          }}
          aria-label="Canción"
          className={`${inputCls} min-w-0 flex-1 sm:flex-none`}
        >
          <option value="">Elegí una canción…</option>
          {sortedSongs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} — {s.artist}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Desde
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className={inputCls}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Hasta
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className={inputCls}
          />
        </label>
      </div>

      {songId ? (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Se tocó{" "}
              <span className="font-display text-2xl font-semibold text-primary">
                {plays.length}
              </span>{" "}
              {plays.length === 1 ? "vez" : "veces"} en el rango
            </p>
            {plays.length ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowDays((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full gradient-gold px-4 py-1.5 text-sm font-semibold text-primary-foreground"
                >
                  <CalendarDays className="h-4 w-4" />
                  {showDays ? "Ocultar días" : "Ver cuándo se tocó"}
                </button>
                {showDays ? (
                  <button
                    type="button"
                    onClick={() => setShowTeam((v) => !v)}
                    aria-pressed={showTeam}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      showTeam
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Quiénes tocaron
                  </button>
                ) : null}
              </>
            ) : null}
          </div>

          {showDays && plays.length ? (
            <ul className="mt-4 divide-y divide-border/40 rounded-xl border border-border">
              {plays.map((p) => (
                <li
                  key={p.setlistId}
                  className="animate-in fade-in slide-in-from-bottom-1 px-4 py-3 duration-200"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium first-letter:uppercase">
                      {formatDay(p.date)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {p.type} · {p.title} · Tono {p.key}
                    </span>
                  </div>
                  {showTeam ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.teamIds.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Sin equipo cargado</span>
                      ) : (
                        p.teamIds.map((id) => {
                          const user = userById.get(id);
                          if (!user) return null;
                          return (
                            <span
                              key={id}
                              className="flex items-center gap-1.5 rounded-full bg-elevated/70 py-0.5 pr-2.5 pl-0.5 text-xs"
                            >
                              <Avatar user={user} className="h-5 w-5 text-[9px]" />
                              {user.name}
                            </span>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
