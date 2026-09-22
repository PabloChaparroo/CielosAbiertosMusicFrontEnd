export type SystemRole = "admin" | "lider" | "musico";

export interface User {
  id: string;
  name: string;
  role: SystemRole;
  ministryRole: string;
  instruments: string[];
  avatarColor: string;
  initials: string;
  email: string;
  joinedAt: string;
}
