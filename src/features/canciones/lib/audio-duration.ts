/**
 * Lee la duración (en segundos, redondeada) de un audio cargando solo sus metadatos —
 * no descarga el archivo entero. `src` puede ser una URL firmada o un blob: de un File local.
 * Resuelve `null` si el navegador no puede leerla (formato no soportado, error de red, timeout).
 */
export function readAudioDuration(src: string, timeoutMs = 15000): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const finish = (value: number | null) => {
      clearTimeout(timer);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      finish(
        Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : null,
      );
    audio.onerror = () => finish(null);
    audio.src = src;
  });
}

/** Igual que `readAudioDuration`, para un archivo elegido en un `<input type="file">` */
export async function readFileDuration(file: File): Promise<number | null> {
  const url = URL.createObjectURL(file);
  try {
    return await readAudioDuration(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
