import { useEffect } from "react";
import { Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { AppProvider } from "@/hooks/useApp";
import { authStore } from "../auth/auth-store";
import { useAuth } from "../auth/useAuth";

/**
 * Guard centralizado, montado una sola vez en __root.tsx: gatea TODA la app
 * salvo /login, sin excepción.
 *
 * Ojo con esto: no es un `beforeLoad`. En SSR (TanStack Start) el servidor no
 * tiene acceso a localStorage — no hay forma de saber desde el server si hay
 * sesión (esa es una consecuencia de guardar el JWT en localStorage en vez de
 * una cookie, decisión ya tomada). Un `beforeLoad` que dependa de eso
 * quedaría "ciego" en el render del servidor. En cambio, este componente lee
 * el estado real del auth-store (que arranca en "loading" tanto en servidor
 * como en la primera pasada del cliente) y solo deja pasar el contenido
 * cuando el cliente confirmó una sesión real contra /auth/me — mientras
 * tanto, y en cualquier estado no autenticado fuera de /login, muestra el
 * spinner en vez del layout ya armado.
 */
export function AuthGate() {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    void authStore.ensureRestored().then((snapshot) => {
      if (snapshot.status !== "authenticated" && pathname !== "/login") {
        void router.navigate({ to: "/login" });
      }
    });
    // Solo al montar: ensureRestored() ya se autolimita a correr una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pathname === "/login") return <Outlet />;
  if (status !== "authenticated") return <LoadingScreen />;

  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
