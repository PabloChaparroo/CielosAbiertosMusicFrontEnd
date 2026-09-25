import { apiRequest } from "@/lib/api-client";
import type { User } from "@/types";

export interface CreateMemberDto {
  email: string;
  password: string;
  name: string;
  ministryRole: string;
  avatarColor: string;
  initials: string;
}

export type UpdateMemberDto = Partial<Omit<CreateMemberDto, "password">> & { password?: string };

export const EquipoService = {
  /** incluirBajas trae también a los usuarios dados de baja (fechaHoraBaja != null). */
  listMembers: (incluirBajas = false) =>
    apiRequest<User[]>(`/equipo${incluirBajas ? "?incluirBajas=true" : ""}`),

  createMember: (dto: CreateMemberDto) =>
    apiRequest<User>("/equipo", { method: "POST", body: dto }),

  updateMember: (id: string, dto: UpdateMemberDto) =>
    apiRequest<User>(`/equipo/${id}`, { method: "PATCH", body: dto }),

  /** Baja lógica (BaseAuditEntity.fechaHoraBaja) — no borra el registro. */
  removeMember: (id: string) => apiRequest<void>(`/equipo/${id}`, { method: "DELETE" }),

  assignRole: (userId: string, roleId: string) =>
    apiRequest<{ id: string; name: string }[]>(`/equipo/${userId}/roles/${roleId}`, {
      method: "POST",
    }),

  unassignRole: (userId: string, roleId: string) =>
    apiRequest<{ id: string; name: string }[]>(`/equipo/${userId}/roles/${roleId}`, {
      method: "DELETE",
    }),
};
