import { apiRequest, registerUnauthorizedHandler } from "@/lib/api-client";

const TOKEN_KEY = "ca_auth_token";

/** Espejo del shape real de GET /auth/me del backend. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  avatarColor: string;
  initials: string;
  avatarKey: string | null;
  permissions: string[];
}

/**
 * Nombres de acción que ya usaba la UI mockeada (useApp().can()). Se
 * mantienen para no tocar los call-sites existentes; internamente ahora
 * se traducen a un permiso real del catálogo del backend.
 */
export type AppAction =
  | "manageTeam"
  | "editTeamMember"
  | "removeTeamMember"
  | "editSongs"
  | "createSetlist"
  | "viewStats"
  | "manageRoles"
  | "assignRole"
  | "unassignRole"
  | "editOwnAnnotation"
  | "editAnyAnnotation"
  | "editSetlist"
  | "deleteSetlist"
  | "removeAudioTrack";

const ACTION_TO_PERMISSION: Record<AppAction, string> = {
  manageTeam: "equipo:write",
  editTeamMember: "equipo:update",
  removeTeamMember: "equipo:delete",
  editSongs: "cancion:write",
  createSetlist: "setlist:write",
  viewStats: "estadisticas:read",
  manageRoles: "rol:write",
  assignRole: "rol:write",
  unassignRole: "rol:delete",
  editOwnAnnotation: "anotacion-propia:update",
  editAnyAnnotation: "anotacion:update",
  editSetlist: "setlist:update",
  deleteSetlist: "setlist:delete",
  removeAudioTrack: "cancion:delete",
};

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthSnapshot {
  status: AuthStatus;
  user: AuthenticatedUser | null;
}

let snapshot: AuthSnapshot = { status: "loading", user: null };
const listeners = new Set<() => void>();

function setSnapshot(next: AuthSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* noop */
  }
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

async function fetchMe(): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("/auth/me");
}

export const authStore = {
  getSnapshot(): AuthSnapshot {
    return snapshot;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Se llama desde el guard de ruta antes de renderizar cualquier página.
   * Si ya se resolvió una vez (authenticated/anonymous), no vuelve a pegarle
   * a /auth/me en cada navegación — solo al bootear la app.
   */
  async ensureRestored(): Promise<AuthSnapshot> {
    if (snapshot.status !== "loading") return snapshot;
    const token = getToken();
    if (!token) {
      setSnapshot({ status: "anonymous", user: null });
      return snapshot;
    }
    try {
      const user = await fetchMe();
      setSnapshot({ status: "authenticated", user });
    } catch {
      clearToken();
      setSnapshot({ status: "anonymous", user: null });
    }
    return snapshot;
  },

  /** Re-pega a /auth/me y actualiza el snapshot — a diferencia de ensureRestored(), lo hace siempre, no solo la primera vez. Se usa después de guardar el perfil propio para que Sidebar/etc. reflejen el cambio sin relogear. */
  async refresh(): Promise<void> {
    if (snapshot.status !== "authenticated") return;
    const user = await fetchMe();
    setSnapshot({ status: "authenticated", user });
  },

  async login(email: string, password: string): Promise<void> {
    const result = await apiRequest<{ accessToken: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(result.accessToken);
    const user = await fetchMe();
    setSnapshot({ status: "authenticated", user });
  },

  /** Limpia localStorage Y redirige a /login en el mismo paso — nunca uno sin el otro. */
  async logout(): Promise<void> {
    clearToken();
    setSnapshot({ status: "anonymous", user: null });
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  },

  can(action: AppAction): boolean {
    if (snapshot.status !== "authenticated" || !snapshot.user) return false;
    return snapshot.user.permissions.includes(ACTION_TO_PERMISSION[action]);
  },

  /** Para gates que son un OR de dos permisos reales (ej. crear anotación: propia o de cualquiera), sin agregar una AppAction por cada combinación. */
  hasAnyPermission(permissions: string[]): boolean {
    if (snapshot.status !== "authenticated" || !snapshot.user) return false;
    return permissions.some((p) => snapshot.user!.permissions.includes(p));
  },
};

// El cliente HTTP no puede importar el store directo (circular: store -> apiRequest -> store),
// así que se registra acá el handler de 401 en vez de que api-client conozca authStore.
registerUnauthorizedHandler(() => authStore.logout());
