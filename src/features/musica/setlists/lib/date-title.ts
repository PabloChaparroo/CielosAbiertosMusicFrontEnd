const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** Título por defecto a partir de la fecha del input ("AAAA-MM-DDTHH:mm"): "Domingo 04/10" */
export function titleForDate(value: string): string {
  const [y, mo, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !mo || !d) return "";
  return `${DAY_NAMES[new Date(y, mo - 1, d).getDay()]} ${value.slice(8, 10)}/${value.slice(5, 7)}`;
}

/** true si el título es solo una fecha como las de titleForDate ("Domingo 04/10") */
export function isDateTitle(value: string): boolean {
  return new RegExp(`^(${DAY_NAMES.join("|")}) \\d{2}/\\d{2}$`).test(value.trim());
}
