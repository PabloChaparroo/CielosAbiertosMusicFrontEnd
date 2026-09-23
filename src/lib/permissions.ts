/**
 * Espejo del catálogo de permisos real del backend
 * (CielosAbiertosAlabanzasBackEnd/src/common/authorization/permission.catalog.ts).
 * Mientras el frontend siga mockeado y sin conectar, este archivo es la
 * única fuente que hay que mantener sincronizada a mano; cuando se conecte
 * el backend real, esta pantalla debería consumir GET /permisos en su lugar
 * y este archivo deja de hacer falta.
 */

export const CRUD_ACTIONS = ["read", "write", "update", "delete"] as const;
export type CrudAction = (typeof CRUD_ACTIONS)[number];

export const CRUD_RESOURCES = [
  "cancion",
  "setlist",
  "equipo",
  "anotacion",
  "anotacion-propia",
  "estadisticas",
  "rol",
] as const;
export type CrudResource = (typeof CRUD_RESOURCES)[number];

export type PermissionName = `${CrudResource}:${CrudAction}`;

export function crudPermission(resource: CrudResource, action: CrudAction): PermissionName {
  return `${resource}:${action}`;
}

export interface PermissionGroup {
  resource: CrudResource;
  permissions: PermissionName[];
}

export const PERMISSION_CATALOG: PermissionGroup[] = CRUD_RESOURCES.map((resource) => ({
  resource,
  permissions: CRUD_ACTIONS.map((action) => crudPermission(resource, action)),
}));

export const resourceLabels: Record<CrudResource, string> = {
  cancion: "Canciones",
  setlist: "Setlists",
  equipo: "Equipo",
  anotacion: "Anotaciones",
  "anotacion-propia": "Anotaciones propias",
  estadisticas: "Estadísticas",
  rol: "Roles y permisos",
};

export const actionLabels: Record<CrudAction, string> = {
  read: "Ver",
  write: "Crear",
  update: "Editar",
  delete: "Eliminar",
};
