/** Texto para comparar en búsquedas: sin acentos ni mayúsculas ("Quién" → "quien") */
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** true si alguno de los textos contiene la búsqueda, sin importar acentos ni mayúsculas */
export function matchesSearch(query: string, ...texts: string[]): boolean {
  const q = normalizeSearch(query.trim());
  return texts.some((text) => normalizeSearch(text).includes(q));
}
