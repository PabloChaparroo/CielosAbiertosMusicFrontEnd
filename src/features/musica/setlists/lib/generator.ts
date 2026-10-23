import type { Setlist, SetlistSection, Song } from "@/types";

/**
 * Generador de listas (pedido de Pablo): 3 alabanzas, 2 adoraciones y 1 ofrenda, con canciones que
 * tienen secuencia y que hace tiempo que no se tocan, para rotar el repertorio. Opcionalmente de
 * un tema. Es un sorteo con pesos: cuanto más tiempo pasó desde que se tocó, más chances; así no
 * sale siempre la misma lista y se puede volver a generar.
 */
export type GeneratorSong = Pick<Song, "id" | "tipo" | "tags" | "artist">;

export const LIST_SHAPE = { alabanza: 3, adoracion: 2, ofrenda: 1 } as const;

/** Un enganchado (varios temas en un audio) ocupa este lugar de las alabanzas (3 o 4 temas reales) */
export const MEDLEY_SLOTS = 2;
/** Días sin tocarse que ya cuentan como "hace mucho" (y tope del peso); nunca tocada = el tope */
const MAX_DAYS = 365;
/** Una canción tocada hace menos que esto no se sugiere (si hay otras) */
export const COOLDOWN_DAYS = 14;
const SAME_ARTIST_FACTOR = 0.25;
const DAY_MS = 86_400_000;

/** Cuándo se tocó cada canción por última vez (la fecha de la lista más reciente que la tiene) */
export function lastPlayedBySong(setlists: Pick<Setlist, "date" | "items">[]): Map<string, number> {
  const last = new Map<string, number>();
  setlists.forEach((setlist) => {
    const time = new Date(setlist.date).getTime();
    setlist.items.forEach((item) => {
      if (time > (last.get(item.songId) ?? -Infinity)) last.set(item.songId, time);
    });
  });
  return last;
}

export interface GeneratorOptions {
  /** canciones que se pueden sugerir (ya con secuencia) */
  songs: GeneratorSong[];
  lastPlayed: Map<string, number>;
  /** tema elegido; null = al azar */
  tag: string | null;
  /** decide si una canción es un enganchado (puede medirla, por eso es async) */
  isMedley: (song: GeneratorSong) => Promise<boolean>;
  now?: number;
  rng?: () => number;
}

export interface GeneratedList {
  items: Array<{ songId: string; section: SetlistSection }>;
  /** ids de los enganchados incluidos (cada uno ocupa MEDLEY_SLOTS alabanzas) */
  medleyIds: string[];
  /** no alcanzaron canciones con el tema pedido y se completó con otras */
  relaxedTag: boolean;
  /** lugares que no se pudieron cubrir por falta de canciones */
  missing: { alabanza: number; adoracion: number; ofrenda: number };
}

const sameTag = (song: GeneratorSong, tag: string | null) =>
  tag === null || song.tags.some((t) => t.toLowerCase() === tag.toLowerCase());

function daysSince(id: string, last: Map<string, number>, now: number): number {
  const time = last.get(id);
  if (time === undefined) return MAX_DAYS;
  return Math.min(MAX_DAYS, Math.max(0, (now - time) / DAY_MS));
}

/**
 * Sortea una canción del conjunto. Primero las del tema y que ya "descansaron" (más de
 * COOLDOWN_DAYS); si no hay, se van relajando esas dos condiciones. Dentro del grupo, peso =
 * días sin tocarse; baja si ya hay una del mismo artista.
 */
function draw(
  pool: GeneratorSong[],
  ctx: { options: GeneratorOptions; now: number; chosenArtists: Set<string> },
): GeneratorSong | null {
  if (!pool.length) return null;
  const { options, now, chosenArtists } = ctx;
  const rng = options.rng ?? Math.random;
  const tier = (song: GeneratorSong) =>
    (sameTag(song, options.tag) ? 0 : 2) +
    (daysSince(song.id, options.lastPlayed, now) >= COOLDOWN_DAYS ? 0 : 1);
  const best = Math.min(...pool.map(tier));
  const group = pool.filter((song) => tier(song) === best);
  const weights = group.map(
    (song) =>
      (daysSince(song.id, options.lastPlayed, now) + 1) *
      (chosenArtists.has(song.artist.trim().toLowerCase()) ? SAME_ARTIST_FACTOR : 1),
  );
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < group.length; i += 1) {
    r -= weights[i]!;
    if (r < 0) return group[i]!;
  }
  return group[group.length - 1]!;
}

export async function generateList(options: GeneratorOptions): Promise<GeneratedList> {
  const now = options.now ?? Date.now();
  const chosen = new Set<string>();
  const chosenArtists = new Set<string>();
  const ctx = { options, now, chosenArtists };
  const items: GeneratedList["items"] = [];
  const medleyIds: string[] = [];
  let relaxedTag = false;

  const take = (song: GeneratorSong, section: SetlistSection) => {
    chosen.add(song.id);
    chosenArtists.add(song.artist.trim().toLowerCase());
    items.push({ songId: song.id, section });
    if (!sameTag(song, options.tag)) relaxedTag = true;
  };

  const isAlabanza = (song: GeneratorSong) => song.tipo !== "Adoración";
  const free = (song: GeneratorSong) => !chosen.has(song.id);

  // alabanzas: un enganchado ocupa MEDLEY_SLOTS lugares y entra a lo sumo uno por lista
  let slots: number = LIST_SHAPE.alabanza;
  const rejected = new Set<string>();
  while (slots > 0) {
    const song = draw(
      options.songs.filter((s) => isAlabanza(s) && free(s) && !rejected.has(s.id)),
      ctx,
    );
    if (!song) break;
    if (await options.isMedley(song)) {
      if (medleyIds.length > 0 || slots < MEDLEY_SLOTS) {
        rejected.add(song.id);
        continue;
      }
      medleyIds.push(song.id);
      slots -= MEDLEY_SLOTS;
    } else {
      slots -= 1;
    }
    take(song, "alabanza");
  }

  // adoraciones
  let adoraciones: number = LIST_SHAPE.adoracion;
  while (adoraciones > 0) {
    const song = draw(
      options.songs.filter((s) => !isAlabanza(s) && free(s)),
      ctx,
    );
    if (!song) break;
    take(song, "adoracion");
    adoraciones -= 1;
  }

  // ofrenda: una sola canción (nunca un enganchado); de las alabanzas y, si no hay, de las demás
  let ofrenda: number = LIST_SHAPE.ofrenda;
  const skipped = new Set<string>();
  for (const wantAlabanza of [true, false]) {
    while (ofrenda > 0) {
      const song = draw(
        options.songs.filter(
          (s) => isAlabanza(s) === wantAlabanza && free(s) && !skipped.has(s.id),
        ),
        ctx,
      );
      if (!song) break;
      if (await options.isMedley(song)) {
        skipped.add(song.id);
        continue;
      }
      take(song, "ofrenda");
      ofrenda -= 1;
    }
  }

  return {
    items,
    medleyIds,
    relaxedTag,
    missing: { alabanza: Math.max(0, slots), adoracion: adoraciones, ofrenda },
  };
}

/**
 * Otra canción para reemplazar una de la lista (el 🎲 de cada canción): del mismo tipo, que no esté
 * ya en la lista, y nunca un enganchado. null si no hay otra.
 */
export async function pickReplacement(
  options: GeneratorOptions,
  section: SetlistSection,
  exclude: Set<string>,
  artistsInList: string[],
): Promise<GeneratorSong | null> {
  const now = options.now ?? Date.now();
  const wantAdoracion = section === "adoracion";
  const chosenArtists = new Set(artistsInList.map((a) => a.trim().toLowerCase()));
  const skipped = new Set<string>();
  for (;;) {
    const song = draw(
      options.songs.filter(
        (s) =>
          (s.tipo === "Adoración") === wantAdoracion && !exclude.has(s.id) && !skipped.has(s.id),
      ),
      { options, now, chosenArtists },
    );
    if (!song) return null;
    if (await options.isMedley(song)) {
      skipped.add(song.id);
      continue;
    }
    return song;
  }
}
