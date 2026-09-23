import type { Setlist } from "@/types";

/**
 * Setlists sigue mockeado y usa estos IDs fijos "u1".."u8" heredados de
 * cuando Equipo también era mock. Ya no hay un array `members` acá — los
 * usuarios reales vienen del backend con UUIDs — así que `useApp.tsx`
 * traduce estos IDs a los IDs reales por email al cargar, usando este mapa
 * como fuente de verdad de "qué email tenía cada uX".
 * Puente temporal: se elimina por completo el día que Setlists se conecte
 * al backend real.
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

/**
 * Mismo puente temporal que MOCK_USER_ID_TO_EMAIL, ahora para canciones:
 * los IDs fijos "s1".."s20" que usan los `items` de los setlists mock se
 * traducen a los UUID reales matcheando por título (los 20 títulos del
 * seed real coinciden 1:1 en orden con estos). Se elimina junto con el
 * resto del puente cuando Setlists se conecte al backend real — es lo
 * único que va a seguir dependiendo de IDs mock de canciones después de
 * este ticket (Canciones/Anotaciones/Favoritos ya son reales).
 */
export const MOCK_SONG_ID_TO_TITLE: Record<string, string> = {
  s1: "Océanos",
  s2: "Digno de Alabanza",
  s3: "Nada Nos Separará",
  s4: "Al Que Está Sentado",
  s5: "Sana Nuestra Tierra",
  s6: "Aguas Vivas",
  s7: "Renuévame",
  s8: "Gloria a Dios en las Alturas",
  s9: "Noche de Paz Renovada",
  s10: "Tu Mesa",
  s11: "Cuán Grande Es Él",
  s12: "Espíritu Santo Ven",
  s13: "Levanto Mis Manos",
  s14: "Correré",
  s15: "Tuyo Es Mi Corazón",
  s16: "El Río de Dios",
  s17: "Cordero de Dios",
  s18: "Bendito El Que Viene",
  s19: "Mi Refugio",
  s20: "Hoy Te Doy Gracias",
};

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
