/**
 * Mes actual como "YYYY-MM", con el mismo criterio que el backend al registrar reproducciones
 * (`new Date().toISOString().slice(0, 7)`, en UTC) — así las claves de `playsByMonth` coinciden.
 */
export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}
