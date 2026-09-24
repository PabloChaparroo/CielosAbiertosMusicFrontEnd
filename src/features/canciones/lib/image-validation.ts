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

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Formato no soportado — subí una imagen jpg, png o webp.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "La imagen supera el límite de 8MB.";
  }
  return null;
}
