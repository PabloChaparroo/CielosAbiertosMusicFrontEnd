/**
 * Permiso "Ver" (recurso:read) que hace falta para cada módulo del menú. Sin él, el módulo no
 * aparece en el Sidebar y, si se entra por URL, se muestra "Sección restringida" (AuthGate).
 * Un rol con todos los checks de un recurso apagados no tiene su "Ver", así que no ve el módulo.
 *
 * Es solo UX: la autorización real la hace el backend en cada endpoint (403).
 * null = cualquier usuario con sesión.
 */
export const MODULE_READ_PERMISSION: Record<string, string | null> = {
  "/": null,
  "/escuchar": "cancion:read",
  "/letras": "cancion:read",
  "/acordes": "cancion:read",
  "/favoritos": "cancion:read",
  "/setlists": "setlist:read",
  "/equipo": "equipo:read",
  "/estadisticas": "estadisticas:read",
  "/roles-permisos": "rol:read",
};

/** Módulos que necesitan una cuenta real: un invitado no los ve aunque su rol tenga el permiso */
const USER_ONLY_MODULES = ["/favoritos"];

/** true si el usuario puede abrir el módulo (Sidebar y AuthGate usan esto mismo) */
export function canOpenModule(
  path: string,
  hasPermission: (permission: string) => boolean,
  isGuest: boolean,
): boolean {
  if (isGuest && USER_ONLY_MODULES.includes(path)) return false;
  const permission = MODULE_READ_PERMISSION[path];
  return !permission || hasPermission(permission);
}

/** Módulo del menú al que pertenece la ruta ("/acordes?songId=…" → "/acordes"); "/" si ninguno */
export function moduleFor(pathname: string): string {
  return (
    Object.keys(MODULE_READ_PERMISSION)
      .filter((path) => path !== "/" && (pathname === path || pathname.startsWith(`${path}/`)))
      .sort((a, b) => b.length - a.length)[0] ?? "/"
  );
}
