/** Rol real asignado a un usuario (espejo de GET /equipo del backend). */
export interface UserRole {
  id: string;
  name: string;
}

/** Espejo exacto de la entidad User real (GET /equipo) — no un DTO recortado. */
export interface User {
  id: string;
  name: string;
  roles: UserRole[];
  ministryRole: string;
  avatarColor: string;
  initials: string;
  /** Key del objeto en S3/MinIO de la foto de perfil real, mismo criterio que Song.audioKey. null si el usuario no subió ninguna (se muestra avatarColor/initials). */
  avatarKey: string | null;
  email: string;
  fechaHoraAlta: string;
  /** null si está activo; con fecha si está dado de baja. Solo viene poblado cuando se pidió incluirBajas. */
  fechaHoraBaja: string | null;
}
