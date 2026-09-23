/**
 * Cliente HTTP único (patrón de claude/stack-y-patrones-base.md, sección 4).
 *
 * Desviación consciente respecto del doc: el patrón original asume un
 * endpoint de refresh de token. Este backend hoy no tiene uno (solo
 * POST /auth/login y GET /auth/me, con JWT_EXPIRES_IN fijo) — así que el
 * singleton que el doc pide para "no disparar múltiples refresh en
 * paralelo" se implementa acá como un singleton de LOGOUT: si varios
 * requests reciben 401 al mismo tiempo, todos esperan la misma promesa de
 * "cerrar sesión y redirigir a /login" en vez de disparar cada uno la suya.
 * El día que exista /auth/refresh, este es el único punto que cambia.
 */

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3000/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let logoutPromise: Promise<void> | null = null;

/** Inyectado por core/auth/auth-store para no crear un import circular. */
let onUnauthorized: (() => Promise<void>) | null = null;
export function registerUnauthorizedHandler(handler: () => Promise<void>) {
  onUnauthorized = handler;
}

function getToken(): string | null {
  try {
    return localStorage.getItem("ca_auth_token");
  } catch {
    return null;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const message = (body as { message?: string | string[] })?.message;
    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string") return message;
  } catch {
    /* body no era JSON */
  }
  return `Error ${response.status}`;
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const token = getToken();

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (isFormData) {
    init.body = options.body as FormData;
  } else if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, init);

  // Un 401 de /auth/login es "credenciales inválidas", no "tu sesión expiró"
  // — no debe disparar el logout/redirect global, si no LoginPage nunca
  // llega a mostrar el error (la página ya está navegando a /login).
  const isLoginAttempt = path === "/auth/login";

  if (response.status === 401 && onUnauthorized && !isLoginAttempt) {
    logoutPromise ??= onUnauthorized().finally(() => {
      logoutPromise = null;
    });
    await logoutPromise;
    throw new ApiError("Sesión expirada", 401);
  }

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
