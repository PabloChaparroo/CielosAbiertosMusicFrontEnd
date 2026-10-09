/** Nombre automático de una lista predefinida nueva: "Lista 1", "Lista 2"… (el siguiente al mayor) */
export function nextTemplateName(existing: string[]): string {
  const numbers = existing
    .map((title) => /^Lista (\d+)$/i.exec(title.trim())?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number);
  return `Lista ${numbers.length ? Math.max(...numbers) + 1 : 1}`;
}
