import type { User } from "@/types";

/**
 * Quién se puede asignar al equipo de una lista (pedido de Pablo): solo líderes y músicos activos;
 * los admins nunca, aunque quien arma la lista sea admin.
 */
export function isAssignable(
  user: Pick<User, "isAdmin" | "roles"> & { fechaHoraBaja?: User["fechaHoraBaja"] },
): boolean {
  return (
    !user.fechaHoraBaja &&
    !user.isAdmin &&
    user.roles.some((r) => /^(l[ií]der|m[uú]sico)$/i.test(r.name.trim()))
  );
}
