import type { Setlist, TeamMember, User } from "@/types";

/**
 * Un integrante del equipo de una lista: de la lista completa de usuarios si está cargada (trae
 * más datos, como los roles) y, si no, del integrante que viene con la propia lista. Así quien no
 * tiene el módulo "Equipo" (ej. los músicos) igual ve al equipo de cada lista.
 */
export function teamMemberOf(
  id: string,
  setlist: Pick<Setlist, "team">,
  users: User[],
): User | TeamMember | undefined {
  return users.find((u) => u.id === id) ?? setlist.team?.find((m) => m.id === id);
}
