import type { User } from "@/types";

/**
 * Integrantes que puede ver quien mira (pedido de Pablo): los admins solo los ven otros admins.
 * Se usa en Equipo y al elegir el equipo de una lista. Los nombres que ya figuran en listas o
 * notas se siguen mostrando (el backend los manda igual: `isAdmin` viene en GET /equipo).
 */
export function visibleTeam(users: User[], viewerIsAdmin: boolean): User[] {
  return viewerIsAdmin ? users : users.filter((u) => !u.isAdmin);
}
