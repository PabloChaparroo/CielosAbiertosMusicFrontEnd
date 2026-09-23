/** Espejo exacto de GET /roles del backend real. */
export interface Role {
  id: string;
  name: string;
  permissionsCount: number;
}

/** Espejo exacto de GET /permisos del backend real. */
export interface PermissionGroup {
  resource: string;
  permissions: string[];
}
