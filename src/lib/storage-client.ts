import { apiRequest } from "./api-client";

export interface UploadUrlResult {
  uploadUrl: string;
  key: string;
}

export const StorageClient = {
  getUploadUrl: (folder: "audios" | "letras" | "avatares", contentType: string) =>
    apiRequest<UploadUrlResult>("/storage/upload-url", {
      method: "POST",
      body: { folder, contentType },
    }),

  getDownloadUrl: (key: string) =>
    apiRequest<{ url: string }>(`/storage/download-url?key=${encodeURIComponent(key)}`),

  /**
   * El browser sube el binario directo al bucket con la URL firmada — el
   * backend nunca lo recibe. Usa XMLHttpRequest (no fetch) porque es la
   * única API del browser que expone progreso real de subida vía
   * `upload.onprogress`, sin depender de que el storage lo soporte.
   */
  uploadFileWithProgress(
    uploadUrl: string,
    file: File,
    contentType: string,
    onProgress: (pct: number) => void,
    signal: AbortSignal,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", contentType);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`La subida falló (status ${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("La subida falló — revisá tu conexión"));
      xhr.onabort = () => reject(new DOMException("Subida cancelada", "AbortError"));

      signal.addEventListener("abort", () => xhr.abort());
      xhr.send(file);
    });
  },
};
