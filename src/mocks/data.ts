import type { Annotation, Setlist, Song } from "@/types";

/**
 * Setlists y anotaciones siguen mockeados y usan estos IDs fijos "u1".."u8"
 * heredados de cuando Equipo también era mock. Ya no hay un array `members`
 * acá — los usuarios reales vienen del backend con UUIDs — así que
 * `useApp.tsx` traduce estos IDs a los IDs reales por email al cargar,
 * usando este mapa como fuente de verdad de "qué email tenía cada uX".
 * Puente temporal: se elimina por completo el día que Setlists/Anotaciones
 * se conecten al backend real (ahí estos módulos también dejan de tener
 * IDs propios y usan los IDs reales directamente).
 */
export const MOCK_USER_ID_TO_EMAIL: Record<string, string> = {
  u1: "martin@cielosabiertos.org",
  u2: "sofia@cielosabiertos.org",
  u3: "joaquin@cielosabiertos.org",
  u4: "camila@cielosabiertos.org",
  u5: "nico@cielosabiertos.org",
  u6: "lucia@cielosabiertos.org",
  u7: "diego@cielosabiertos.org",
  u8: "ana@cielosabiertos.org",
};

const covers = [
  "linear-gradient(135deg,#1e3a8a,#7c3aed)",
  "linear-gradient(135deg,#b45309,#f59e0b)",
  "linear-gradient(135deg,#0f766e,#22d3ee)",
  "linear-gradient(135deg,#831843,#f472b6)",
  "linear-gradient(135deg,#1f2937,#4b5563)",
  "linear-gradient(135deg,#4c1d95,#2563eb)",
  "linear-gradient(135deg,#7c2d12,#ea580c)",
  "linear-gradient(135deg,#064e3b,#84cc16)",
];

const AUDIO =
  "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=lofi-study-112191.mp3";

const body1 = `{estrofa 1}
[G]Tú me llamas sobre las [D]aguas
donde mis pies pueden [Em7]fallar
y allí te en[C]cuentro en el mis[G]terio
en océanos ca[D]minaré

{coro}
Tu [C]gracia me sos[G]tiene
y en la tor[D]menta con[Em7]fiaré
mis [C]ojos en Ti [G]puestos
mi al[D]ma descansa[G]rá`;

const body2 = `{estrofa 1}
[D]Digno de alabanza es el [A]Rey
[Bm]toda la tierra can[G]tará
[D]Santo, santo, santo es el [A]Señor
[Bm]para siempre reina[G]rá

{coro}
Le[G]vantamos hoy tu [D]nombre
no hay o[A]tro como [Bm]Tú
Le[G]vantamos hoy tu [D]nombre
Cristo, [A]nuestra sal[D]vación`;

const body3 = `{estrofa 1}
[C]Nada nos separa[G]rá
de tu a[Am]mor, de tu a[F]mor
[C]Ni la muerte ni la [G]vida
ni al[Am]tura ni pro[F]fundidad

{coro}
[F]Cantaré de tu [C]amor por siempre
[G]cantaré de tu fideli[Am]dad
[F]Cantaré que tus mise[C]ricordias
[G]nuevas son cada maña[C]na`;

const bodies = [body1, body2, body3];

const titles: Array<[string, string, string, number, number, Song["tags"]]> = [
  ["Océanos", "Hillsong United", "G", 68, 512, ["Adoración", "Entrega"]],
  ["Digno de Alabanza", "Marco Barrientos", "D", 76, 348, ["Adoración", "Júbilo"]],
  ["Nada Nos Separará", "Marcos Witt", "C", 82, 372, ["Adoración", "Gratitud"]],
  ["Al Que Está Sentado", "Miel San Marcos", "A", 130, 296, ["Júbilo"]],
  ["Sana Nuestra Tierra", "Marco Barrientos", "E", 72, 405, ["Sanidad"]],
  ["Aguas Vivas", "Generación 12", "Bm", 74, 388, ["Bautismo", "Adoración"]],
  ["Renuévame", "Marcos Witt", "F", 66, 289, ["Entrega", "Sanidad"]],
  ["Gloria a Dios en las Alturas", "Coral Cielos", "G", 88, 264, ["Navidad"]],
  ["Noche de Paz Renovada", "Cielos Abiertos", "C", 60, 245, ["Navidad"]],
  ["Tu Mesa", "Averly Morillo", "D", 70, 401, ["Comunión"]],
  ["Cuán Grande Es Él", "Himno", "Bb", 64, 320, ["Adoración", "Gratitud"]],
  ["Espíritu Santo Ven", "Barak", "Am", 78, 430, ["Adoración"]],
  ["Levanto Mis Manos", "Samuel Hernández", "E", 84, 356, ["Júbilo", "Gratitud"]],
  ["Correré", "Miel San Marcos", "A", 138, 312, ["Júbilo"]],
  ["Tuyo Es Mi Corazón", "Danilo Montero", "G", 68, 298, ["Entrega"]],
  ["El Río de Dios", "Generación 12", "D", 92, 377, ["Bautismo", "Júbilo"]],
  ["Cordero de Dios", "Cielos Abiertos", "F", 62, 336, ["Comunión", "Adoración"]],
  ["Bendito El Que Viene", "Marcos Brunet", "C", 74, 419, ["Adoración"]],
  ["Mi Refugio", "Lucía Fernández", "Em", 70, 305, ["Sanidad", "Entrega"]],
  ["Hoy Te Doy Gracias", "Cielos Abiertos", "A", 96, 281, ["Gratitud", "Júbilo"]],
];

const monthKeys = [
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

export const songs: Song[] = titles.map(([title, artist, key, bpm, duration, tags], i) => {
  const plays: Record<string, number> = {};
  monthKeys.forEach((m, j) => {
    plays[m] = Math.max(0, Math.round(6 - i * 0.25 + Math.sin(i + j) * 3 + (j % 4)));
  });
  return {
    id: `s${i + 1}`,
    title,
    artist,
    key,
    bpm,
    duration,
    tags,
    cover: covers[i % covers.length]!,
    audioUrl: AUDIO,
    chordpro: bodies[i % bodies.length]!,
    addedAt: `2026-0${(i % 9) + 1}-1${i % 9}`,
    playsByMonth: plays,
  };
});

const dayOffset = (days: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

export const setlists: Setlist[] = [
  {
    id: "sl1",
    title: "Culto Domingo — Cielos Abiertos",
    date: dayOffset(4, 10, 30),
    type: "Culto Domingo",
    leaderId: "u2",
    items: [
      { songId: "s4", key: "A", note: "Arranque con banda completa" },
      { songId: "s1", key: "A" },
      { songId: "s3", key: "C" },
      { songId: "s17", key: "F", note: "Momento de comunión" },
    ],
    teamIds: ["u2", "u3", "u5", "u7", "u8"],
  },
  {
    id: "sl2",
    title: "Ensayo general",
    date: dayOffset(2, 20),
    type: "Ensayo",
    leaderId: "u6",
    items: [
      { songId: "s13", key: "E" },
      { songId: "s2", key: "D" },
      { songId: "s12", key: "Am" },
    ],
    teamIds: ["u6", "u4", "u3", "u5"],
  },
  {
    id: "sl3",
    title: "Culto Domingo — Sanidad",
    date: dayOffset(-3, 10, 30),
    type: "Culto Domingo",
    leaderId: "u2",
    items: [
      { songId: "s5", key: "E" },
      { songId: "s19", key: "Em" },
      { songId: "s7", key: "F" },
      { songId: "s11", key: "Bb" },
    ],
    teamIds: ["u2", "u4", "u7"],
  },
  {
    id: "sl4",
    title: "Noche de Adoración",
    date: dayOffset(-17, 19),
    type: "Evento Especial",
    leaderId: "u6",
    items: [
      { songId: "s18", key: "C" },
      { songId: "s12", key: "Am" },
      { songId: "s15", key: "G" },
      { songId: "s6", key: "Bm" },
      { songId: "s20", key: "A" },
    ],
    teamIds: ["u6", "u1", "u3", "u5", "u7", "u8"],
  },
];

export const annotations: Annotation[] = [
  {
    id: "a1",
    songId: "s1",
    authorId: "u2",
    text: "Entrar bien despacio en el coro, solo teclado los primeros 4 compases.",
    createdAt: "2026-08-28T18:20:00",
  },
  {
    id: "a2",
    songId: "s1",
    authorId: "u3",
    text: "Guitarra con capo en 2 si lo hacemos en A.",
    createdAt: "2026-08-29T09:10:00",
  },
  {
    id: "a3",
    songId: "s2",
    authorId: "u5",
    text: "Cambio a corchea en el puente, esperar la señal.",
    createdAt: "2026-08-30T21:00:00",
  },
];
