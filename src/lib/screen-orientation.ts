type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "portrait" | "landscape") => Promise<void>;
};

/**
 * Gira la pantalla entre vertical y horizontal (pantalla completa de Letras y Acordes). Solo
 * funciona en navegadores que permiten bloquear la orientación — Chrome en Android, y solo con
 * la pantalla completa del navegador activa —; en iPhone no existe. Devuelve false si no se pudo.
 */
export async function toggleScreenOrientation(): Promise<boolean> {
  const orientation = screen.orientation as LockableOrientation | undefined;
  if (!orientation?.lock) return false;
  const next = orientation.type.startsWith("portrait") ? "landscape" : "portrait";
  try {
    await orientation.lock(next);
    return true;
  } catch {
    return false;
  }
}

/** Vuelve a dejar que la pantalla gire sola (al salir de pantalla completa) */
export function releaseScreenOrientation(): void {
  try {
    screen.orientation?.unlock();
  } catch {
    // sin bloqueo activo o sin soporte: no hay nada que soltar
  }
}

/** true si el navegador permite girar la pantalla desde la app */
export function canRotateScreen(): boolean {
  // solo en pantallas táctiles: en la compu el bloqueo existe pero siempre falla
  return (
    typeof screen !== "undefined" &&
    "lock" in (screen.orientation ?? {}) &&
    window.matchMedia("(pointer: coarse)").matches
  );
}
