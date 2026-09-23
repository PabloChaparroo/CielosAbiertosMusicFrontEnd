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
    can: (action: AppAction) => authStore.can(action),
    login: authStore.login,
    logout: authStore.logout,
  };
}
