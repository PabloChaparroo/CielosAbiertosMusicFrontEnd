import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, Skeletons } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { hasSequence } from "@/features/canciones/lib/sequence";
import { SongHistoryPanel } from "../components/SongHistoryPanel";
import {
  historicRanking,
  isPlayedSetlist,
  monthlyTrend,
  monthsBetween,
  playsByTagInMonths,
  playsFromSetlists,
  recentMonths,
  toLocalDay,
  topSongsInMonths,
} from "../lib/stats";

const COLORS = [
  "oklch(0.82 0.15 80)",
  "oklch(0.66 0.15 255)",
  "oklch(0.72 0.14 165)",
  "oklch(0.68 0.19 350)",
  "oklch(0.75 0.13 40)",
  "oklch(0.6 0.16 300)",
  "oklch(0.7 0.12 200)",
  "oklch(0.78 0.14 120)",
];

/** "2026-09" → "septiembre 2026" */
const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-5">
      <h3 className="mb-4 font-display text-lg font-semibold">{title}</h3>
      <div className="h-72">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  background: "oklch(0.21 0.006 285)",
  border: "1px solid oklch(1 0 0 / 12%)",
  borderRadius: 12,
  color: "#fff",
  fontSize: 12,
};

/** Ranking de canciones con barras (se lee bien en celular) */
function TopCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: ReturnType<typeof topSongsInMonths>;
}) {
  const max = rows[0]?.plays ?? 1;
  return (
    <div className="surface-card p-5">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mb-4 text-xs text-muted-foreground first-letter:uppercase">{subtitle}</p>
      {rows.length ? (
        <ol className="space-y-2.5">
          {rows.map((row, i) => (
            <li key={row.song.id} className="flex items-center gap-3">
              <span className="w-5 text-center font-display text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <Cover song={row.song} size="none" className="h-9 w-9 shrink-0 shadow-none" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium">{row.song.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {row.plays} {row.plays === 1 ? "vez" : "veces"}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full gradient-gold"
                    style={{ width: `${(row.plays / max) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No se tocó ninguna canción con secuencia en este período.
        </p>
      )}
    </div>
  );
}

const selectCls = "rounded-full border border-border bg-secondary px-3 py-1.5 text-xs capitalize";

/**
 * Estadísticas = veces que se tocó cada canción: una por cada lista de canciones que ya pasó al
 * historial (pedido de Pablo: lo que importa es qué canta la congregación, no las escuchas en la
 * app). Se ven por mes o por un rango de meses.
 */
export function EstadisticasPage() {
  const { songs, songsLoadState, setlists, setlistsLoadState } = useApp();
  const [mode, setMode] = useState<"mes" | "rango">("mes");
  const thisMonth = toLocalDay(new Date()).slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [from, setFrom] = useState(recentMonths(3)[0]!);
  const [to, setTo] = useState(thisMonth);

  // canciones con `playsByMonth` = veces que se tocó, según las listas pasadas
  // solo canciones con secuencia (al menos un audio cargado): las demás no cuentan
  const played = useMemo(
    () => playsFromSetlists(songs.filter(hasSequence), setlists),
    [songs, setlists],
  );

  // meses para elegir: desde la lista pasada más vieja (o un año atrás) hasta el actual
  const monthOptions = useMemo(() => {
    const oldest = setlists
      .filter((s) => isPlayedSetlist(s))
      .map((s) => toLocalDay(s.date).slice(0, 7))
      .sort()[0];
    const yearAgo = recentMonths(12)[0]!;
    return monthsBetween(oldest && oldest < yearAgo ? oldest : yearAgo, thisMonth).reverse();
  }, [setlists, thisMonth]);

  const months = useMemo(
    () => (mode === "mes" ? [month] : monthsBetween(from, to)),
    [mode, month, from, to],
  );
  const periodLabel =
    mode === "mes"
      ? monthLabel(month)
      : `${monthLabel(from <= to ? from : to)} a ${monthLabel(from <= to ? to : from)}`;

  const top = useMemo(() => topSongsInMonths(played, months), [played, months]);
  const lastThree = useMemo(() => recentMonths(3), []);
  const topLastThree = useMemo(() => topSongsInMonths(played, lastThree), [played, lastThree]);
  const byTag = useMemo(() => playsByTagInMonths(played, months), [played, months]);
  const trend = useMemo(() => monthlyTrend(played, recentMonths(12)), [played]);
  const ranking = useMemo(() => historicRanking(played).filter((r) => r.plays > 0), [played]);

  if (songsLoadState !== "ready" || setlistsLoadState === "loading") {
    return (
      <AppLayout title="Estadísticas" subtitle="Qué está cantando la congregación">
        <Skeletons rows={5} />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Estadísticas"
      subtitle="Qué está cantando la congregación"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex rounded-full border border-border p-0.5">
            {(["mes", "rango"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  mode === m ? "gradient-gold text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "mes" ? "Mes" : "Rango"}
              </button>
            ))}
          </div>
          {mode === "mes" ? (
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Mes"
              className={selectCls}
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="Desde"
                className={selectCls}
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
              a
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="Hasta"
                className={selectCls}
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-2">
        {/* más tocadas: la del período elegido y, al lado, la de los últimos 3 meses */}
        <TopCard title="Más tocadas" subtitle={periodLabel} rows={top} />
        <TopCard
          title="Más tocadas · últimos 3 meses"
          subtitle={`${monthLabel(lastThree[0]!)} a ${monthLabel(lastThree[2]!)}`}
          rows={topLastThree}
        />

        <div className="xl:col-span-2">
          <SongHistoryPanel />
        </div>

        <Panel title={`Por tema · ${periodLabel}`}>
          {byTag.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byTag}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {byTag.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sin datos en este período.
            </p>
          )}
        </Panel>

        <Panel title="Canciones tocadas por mes (último año)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9aa0a6" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9aa0a6" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="total"
                name="Veces"
                stroke={COLORS[0]}
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <div className="surface-card p-5 xl:col-span-2">
          <h3 className="mb-4 font-display text-lg font-semibold">Más tocadas de siempre</h3>
          {ranking.length ? (
            <ol className="grid gap-2 sm:grid-cols-2">
              {ranking.map((r, i) => (
                <li
                  key={r.song.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-elevated/60"
                >
                  <span className="w-6 text-center font-display text-lg font-semibold text-primary">
                    {i + 1}
                  </span>
                  <Cover song={r.song} size="none" className="h-9 w-9 shadow-none" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.song.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.song.artist}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {r.plays} {r.plays === 1 ? "vez" : "veces"}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía no hay listas de canciones en el historial.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
