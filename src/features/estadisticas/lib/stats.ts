import type { Setlist, Song } from "@/types";

/**
 * Cálculos de Estadísticas, como funciones puras (sin React) para poder testearlos. Se sacaron
 * tal cual de los useMemo de EstadisticasPage: mismo resultado, mismo orden, mismos topes.
 * Todas trabajan sobre `playsByMonth` ({ "2026-09": 7, … }) de cada canción.
 */

/** Reproducciones de una canción en los meses que cumplen el filtro */
export function totalPlays(song: Song, filter: (month: string) => boolean = () => true): number {
  return Object.entries(song.playsByMonth)
    .filter(([m]) => filter(m))
    .reduce((acc, [, v]) => acc + v, 0);
}

/** "Más tocadas en <mes>": las `limit` canciones con más reproducciones ese mes */
export function topSongsForMonth(songs: Song[], month: string, limit = 8) {
  return [...songs]
    .map((s) => ({ name: s.title, plays: s.playsByMonth[month] ?? 0 }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, limit);
}

/**
 * Comparativa anual: reproducciones de cada canción en cada año, ordenadas por el último año de
 * la lista. Cada fila tiene `name` y una clave por año (ej. { name, "2025": 3, "2026": 11 }).
 */
export type YearRow = { name: string; [year: string]: string | number };

export function playsByYear(songs: Song[], years: readonly string[], limit = 8): YearRow[] {
  const last = years[years.length - 1]!;
  const playsIn = (row: YearRow) => Number(row[last] ?? 0);
  return [...songs]
    .map((s): YearRow => {
      const row: YearRow = { name: s.title };
      years.forEach((y) => (row[y] = totalPlays(s, (m) => m.startsWith(y))));
      return row;
    })
    .sort((a, b) => playsIn(b) - playsIn(a))
    .slice(0, limit);
}

/** Distribución por tema: una canción con varios temas suma sus reproducciones a cada uno */
export function playsByTag(songs: Song[]) {
  const map = new Map<string, number>();
  songs.forEach((s) => {
    const plays = totalPlays(s);
    s.tags.forEach((t) => map.set(t, (map.get(t) ?? 0) + plays));
  });
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

/** Tendencia: total de reproducciones de todas las canciones en cada mes ("09/26") */
export function monthlyTrend(songs: Song[], months: readonly string[]) {
  return months.map((m) => ({
    month: m.slice(5) + "/" + m.slice(2, 4),
    total: songs.reduce((acc, s) => acc + (s.playsByMonth[m] ?? 0), 0),
  }));
}

/** Ranking histórico: las `limit` canciones con más reproducciones en total */
export function historicRanking(songs: Song[], limit = 10) {
  return [...songs]
    .map((song) => ({ song, plays: totalPlays(song) }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, limit);
}

/**
 * Veces que se tocó una canción en los setlists entre dos fechas ("AAAA-MM-DD", inclusive):
 * una por setlist que la incluye, de la más reciente a la más vieja, con quiénes tocaron.
 */
export function songPlaysInRange(setlists: Setlist[], songId: string, from: string, to: string) {
  return setlists
    .filter((s) => {
      const day = toLocalDay(s.date);
      return day >= from && day <= to && s.items.some((it) => it.songId === songId);
    })
    .map((s) => ({
      setlistId: s.id,
      title: s.title,
      type: s.type,
      date: s.date,
      key: s.items.find((it) => it.songId === songId)!.key,
      teamIds: s.teamIds,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** "AAAA-MM-DD" en hora local */
export function toLocalDay(iso: string | Date): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Una lista de canciones ya se tocó cuando pasó al historial: la pasaron a mano o ya pasó su día
 * (desde el día después de la fecha, igual que la pantalla de listas y "próximas a sacar").
 */
export function isPlayedSetlist(setlist: Setlist, today: Date = new Date()): boolean {
  return !setlist.isUpcoming || toLocalDay(setlist.date) < toLocalDay(today);
}

/**
 * Veces que se tocó cada canción, por mes, según las listas de canciones que ya pasaron al
 * historial (una vez por lista, en el mes de su fecha). Devuelve las canciones con
 * `playsByMonth` calculado así, para que el resto de los cálculos de acá sirvan igual.
 */
export function playsFromSetlists(songs: Song[], setlists: Setlist[], today: Date = new Date()) {
  const counts = new Map<string, Record<string, number>>();
  setlists
    .filter((s) => isPlayedSetlist(s, today))
    .forEach((s) => {
      const month = toLocalDay(s.date).slice(0, 7);
      new Set(s.items.map((it) => it.songId)).forEach((songId) => {
        const byMonth = counts.get(songId) ?? {};
        byMonth[month] = (byMonth[month] ?? 0) + 1;
        counts.set(songId, byMonth);
      });
    });
  return songs.map((song) => ({ ...song, playsByMonth: counts.get(song.id) ?? {} }));
}

/** Meses "AAAA-MM" de `from` a `to` inclusive (en cualquier orden) */
export function monthsBetween(from: string, to: string): string[] {
  const [start, end] = from <= to ? [from, to] : [to, from];
  const months: string[] = [];
  let [y, m] = start.split("-").map(Number) as [number, number];
  for (;;) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    months.push(key);
    if (key >= end) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

/** Los últimos `count` meses hasta el actual, del más viejo al más nuevo */
export function recentMonths(count: number, today: Date = new Date()): string[] {
  const end = toLocalDay(today).slice(0, 7);
  const d = new Date(today.getFullYear(), today.getMonth() - (count - 1), 1);
  return monthsBetween(toLocalDay(d).slice(0, 7), end);
}

/** Más tocadas en esos meses: las `limit` con más veces (las que no se tocaron no aparecen) */
export function topSongsInMonths(songs: Song[], months: readonly string[], limit = 10) {
  const inRange = new Set(months);
  return songs
    .map((s) => ({ song: s, name: s.title, plays: totalPlays(s, (m) => inRange.has(m)) }))
    .filter((row) => row.plays > 0)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, limit);
}

/** Distribución por tema en esos meses */
export function playsByTagInMonths(songs: Song[], months: readonly string[]) {
  const inRange = new Set(months);
  const map = new Map<string, number>();
  songs.forEach((s) => {
    const plays = totalPlays(s, (m) => inRange.has(m));
    if (plays) s.tags.forEach((t) => map.set(t, (map.get(t) ?? 0) + plays));
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
