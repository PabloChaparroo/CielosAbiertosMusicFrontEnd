// Espejo del whitelist real de StorageService.getUploadUrl — validar acá
// también es solo para dar feedback inmediato sin red; el backend es quien
// realmente lo hace cumplir.
export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/webm",
];

// Límite puramente client-side: un PutObjectCommand firmado no lleva
// restricción de tamaño, así que esto no es una barrera real de seguridad,
// solo evita subidas larguísimas por error desde la UI.
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

export function validateAudioFile(file: File): string | null {
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return "Formato no soportado — subí un archivo de audio (mp3, wav, ogg, m4a, aac).";
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return "El archivo supera el límite de 100MB.";
  }
  return null;
}
