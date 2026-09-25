/** Nombres de los roles del sistema de un integrante, para mostrar como texto ("Líder · Músico") */
export function roleNames(roles: { name: string }[]): string {
  return roles.length ? roles.map((r) => r.name).join(" · ") : "Sin rol";
}
