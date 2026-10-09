/** "¿Quién podrá_.mp3" → "¿Quién podrá"; "Bateria_Quien-podra.wav" → "Bateria Quien-podra" */
export function trackNameFromFile(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
