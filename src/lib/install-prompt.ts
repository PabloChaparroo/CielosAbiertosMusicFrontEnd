import { useEffect, useState } from "react";

/**
 * Botón "Instalar" nativo de Chrome/Edge/Android (evento `beforeinstallprompt`). El evento llega
 * una sola vez y puede llegar antes de que se abra el módulo Instalar app, así que se escucha
 * apenas carga la app (__root importa este archivo) y se guarda. Safari/iPhone no lo tiene.
 */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

/** true si la app ya se está usando instalada (abierta desde el ícono, sin barra del navegador) */
export function isRunningInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** `install` abre el cartel nativo de instalar; null si el navegador no lo ofrece */
export function useInstallPrompt(): { install: (() => Promise<boolean>) | null } {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  if (!deferred) return { install: null };
  const event = deferred;
  return {
    install: async () => {
      await event.prompt();
      const { outcome } = await event.userChoice;
      // el evento sirve una sola vez
      deferred = null;
      notify();
      return outcome === "accepted";
    },
  };
}
