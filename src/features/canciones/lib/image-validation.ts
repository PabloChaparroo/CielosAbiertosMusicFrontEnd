// Espejo del whitelist real de StorageService.getUploadUrl para folder
// "letras". HEIC queda afuera a propósito, no por olvido: el <img> de
// visualización no lo puede decodificar en Chrome/Firefox/Edge de
// escritorio ni en Android (solo Safari/iOS lo soporta nativo) — permitir
// subir un formato que la mitad del equipo no puede ver rompe el propósito
// de la feature.
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Una foto de una sola hoja de letra, aunque sea con la cámara del celular
// en alta resolución, normalmente comprime a 2-6MB en JPEG. 8MB da margen
// sin permitir capturas RAW gigantes por error. Igual que con audio, es un
// límite puramente client-side.
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Portada de canción: es un thumbnail que se carga en cada listado (no una imagen de detalle
// como la letra), así que el tope es más chico. Mismos formatos que la letra.
export const MAX_COVER_BYTES = 5 * 1024 * 1024;

/**
 * Misma regla para toda imagen (formatos permitidos); solo cambia el tope de tamaño según el
 * uso — por defecto el de la foto de letra (8MB). Parametrizado en vez de duplicar el archivo:
 * si mañana se suma un formato, se toca en un solo lugar.
 */
export function validateImageFile(file: File, maxBytes = MAX_IMAGE_BYTES): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Formato no soportado — subí una imagen jpg, png o webp.";
  }
  if (file.size > maxBytes) {
    return `La imagen supera el límite de ${Math.round(maxBytes / (1024 * 1024))}MB.`;
  }
  return null;
}
