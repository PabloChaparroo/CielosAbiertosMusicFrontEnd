import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
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
import { useApp } from "@/hooks/useApp";

export const Route = createFileRoute("/estadisticas")({
  head: () => ({
    meta: [
      { title: "Estadísticas — Cielos Abiertos" },
      {
        name: "description",
        content: "Canciones más tocadas por mes y año, distribución por tema y ranking histórico.",
      },
      { property: "og:title", content: "Estadísticas — Cielos Abiertos" },
      { property: "og:description", content: "Datos del repertorio del ministerio de alabanza." },
    ],
  }),
  component: Estadisticas,
});

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

const MONTHS = [
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
];

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

function Estadisticas() {
  const { songs } = useApp();
  const [range, setRange] = useState<"mes" | "anio">("mes");
  const [month, setMonth] = useState("2026-09");

  const total = (s: (typeof songs)[number], filter: (m: string) => boolean) =>
    Object.entries(s.playsByMonth)
      .filter(([m]) => filter(m))
      .reduce((acc, [, v]) => acc + v, 0);

  const topMonth = useMemo(
    () =>
      [...songs]
        .map((s) => ({ name: s.title, plays: s.playsByMonth[month] ?? 0 }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 8),
    [songs, month],
  );

  const byYear = useMemo(() => {
    const years = ["2025", "2026"];
    return [...songs]
      .map((s) => ({
        name: s.title,
        "2025": total(s, (m) => m.startsWith(years[0]!)),
        "2026": total(s, (m) => m.startsWith(years[1]!)),
      }))
      .sort((a, b) => b["2026"] - a["2026"])
      .slice(0, 8);
  }, [songs]);

  const byTag = useMemo(() => {
    const map = new Map<string, number>();
    songs.forEach((s) => {
      const plays = total(s, () => true);
      s.tags.forEach((t) => map.set(t, (map.get(t) ?? 0) + plays));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [songs]);

  const trend = useMemo(
    () =>
      MONTHS.map((m) => ({
        month: m.slice(5) + "/" + m.slice(2, 4),
        total: songs.reduce((acc, s) => acc + (s.playsByMonth[m] ?? 0), 0),
      })),
    [songs],
  );

  const ranking = useMemo(
    () =>
      [...songs]
        .map((s) => ({ song: s, plays: total(s, () => true) }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 10),
    [songs],
  );

  return (
    <AppLayout
      title="Estadísticas"
      subtitle="Qué está cantando la congregación"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border p-0.5">
            {(["mes", "anio"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  range === r ? "gradient-gold text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {r === "mes" ? "Por mes" : "Por año"}
              </button>
            ))}
          </div>
          {range === "mes" ? (
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={range === "mes" ? `Más tocadas en ${month}` : "Comparativa 2025 vs 2026"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={range === "mes" ? topMonth : byYear}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9aa0a6" }} interval={0} angle={-20} height={60} textAnchor="end" />
              <YAxis tick={{ fontSize: 11, fill: "#9aa0a6" }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(1 0 0 / 5%)" }} />
              {range === "mes" ? (
                <Bar dataKey="plays" name="Veces tocada" fill={COLORS[0]} radius={[6, 6, 0, 0]} />
              ) : (
                <>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="2025" fill={COLORS[1]} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="2026" fill={COLORS[0]} radius={[6, 6, 0, 0]} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Distribución por tema">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byTag} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                {byTag.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Evolución mensual del repertorio">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9aa0a6" }} />
              <YAxis tick={{ fontSize: 11, fill: "#9aa0a6" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="total" stroke={COLORS[0]} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <div className="surface-card p-5">
          <h3 className="mb-4 font-display text-lg font-semibold">Top 10 histórico</h3>
          <ol className="space-y-2">
            {ranking.map((r, i) => (
              <li key={r.song.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-elevated/60">
                <span className="w-6 text-center font-display text-lg font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="h-9 w-9 shrink-0 rounded-lg" style={{ backgroundImage: r.song.cover }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.song.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.song.artist}</p>
                </div>
                <span className="text-sm text-muted-foreground">{r.plays}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </AppLayout>
  );
}
