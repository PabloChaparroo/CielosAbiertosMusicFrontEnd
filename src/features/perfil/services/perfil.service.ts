import { apiRequest } from "@/lib/api-client";

export interface UpdateMyProfileInput {
  name?: string;
  ministryRole?: string;
  avatarKey?: string;
}

export interface ChangeMyPasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const PerfilService = {
  /** Nunca acepta email ni roles — el DTO del backend directamente no los tiene como campos posibles. */
  updateMyProfile: (dto: UpdateMyProfileInput) =>
    apiRequest<unknown>("/auth/me", { method: "PATCH", body: dto }),

  /** 204 sin body si la contraseña actual es correcta; 400 con mensaje claro si no. */
  changeMyPassword: (dto: ChangeMyPasswordInput) =>
    apiRequest<void>("/auth/me/password", { method: "PATCH", body: dto }),
};
