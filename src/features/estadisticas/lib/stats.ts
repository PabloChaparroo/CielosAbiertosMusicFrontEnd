import type { Song } from "@/types";

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
