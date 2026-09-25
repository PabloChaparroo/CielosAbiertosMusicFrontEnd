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

/** Permiso que necesita la ruta actual (por prefijo: "/acordes?songId=…" usa el de "/acordes") */
export function requiredPermissionFor(pathname: string): string | null {
  const match = Object.keys(MODULE_READ_PERMISSION)
    .filter((path) => path !== "/" && (pathname === path || pathname.startsWith(`${path}/`)))
    .sort((a, b) => b.length - a.length)[0];
  return match ? MODULE_READ_PERMISSION[match]! : null;
}
