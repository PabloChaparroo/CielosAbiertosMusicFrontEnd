import { apiRequest } from "@/lib/api-client";
import type { PermissionGroup, Role } from "../types/role";

export const RolesService = {
  listPermissionCatalog: () => apiRequest<PermissionGroup[]>("/permisos"),

  listRoles: () => apiRequest<Role[]>("/roles"),

  /** Un rol nuevo arranca sin permisos: el backend no devuelve permissionsCount acá. */
  createRole: (name: string) =>
    apiRequest<{ id: string; name: string }>("/roles", {
      method: "POST",
      body: { name },
    }),

  getRolePermissions: (roleId: string) => apiRequest<string[]>(`/roles/${roleId}/permisos`),

  /** Reemplaza el set completo de permisos del rol (no incremental). */
  updateRolePermissions: (roleId: string, permissions: string[]) =>
    apiRequest<string[]>(`/roles/${roleId}/permisos`, {
      method: "PATCH",
      body: { permissions },
    }),
};
