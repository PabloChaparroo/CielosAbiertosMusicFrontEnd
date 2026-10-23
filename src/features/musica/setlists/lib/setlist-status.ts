/** "AAAA-MM-DD" en hora local */
export const localDay = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Una lista ya se tocó el día DESPUÉS de su fecha: la del domingo sigue en Próximos todo el
 * domingo y pasa el lunes. Desde ahí va sola al Historial y no se puede modificar ni eliminar.
 */
export const isPlayed = (iso: string, now: Date = new Date()) =>
  localDay(new Date(iso)) < localDay(now);

/** Valor de un `<input type="datetime-local">` ("AAAA-MM-DDTHH:mm", hora local) para una fecha ISO */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${localDay(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
