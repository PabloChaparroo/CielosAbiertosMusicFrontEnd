import { useSyncExternalStore } from "react";
import { authStore, type AppAction } from "./auth-store";

export function useAuth() {
  const snapshot = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getSnapshot,
  );

  return {
    status: snapshot.status,
    user: snapshot.user,
    isGuest: snapshot.user?.isGuest === true,
    can: (action: AppAction) => authStore.can(action),
    hasAnyPermission: (permissions: string[]) => authStore.hasAnyPermission(permissions),
    login: authStore.login,
    loginAsGuest: authStore.loginAsGuest,
    refresh: authStore.refresh,
    logout: authStore.logout,
  };
}
