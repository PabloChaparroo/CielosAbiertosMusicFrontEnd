/** ID de video de YouTube: 11 caracteres de letras, números, "-" o "_" */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

/**
 * ID limpio de un link de YouTube en cualquiera de sus formatos (watch?v=, youtu.be/, embed/,
 * shorts/, live/, con parámetros extra como &t= o ?si=) o del ID solo. null si no es un video
 * de YouTube válido — así nunca se intenta embeber un link roto o de otro sitio.
 */
export function parseYoutubeVideoId(input: string): string | null {
  const text = input.trim();
  if (VIDEO_ID.test(text)) return text;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  let id: string | null | undefined = null;
  if (host === "youtu.be" || host === "www.youtu.be") {
    id = parts[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) id = parts[1];
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

/** true si el link apunta a YouTube (aunque esté roto): para avisar antes de guardarlo */
export function looksLikeYoutube(input: string): boolean {
  return /(^|[/.])(youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(input.trim());
}

/** URL oficial del reproductor embebido (enablejsapi: para poder pausarlo desde la app) */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`;
}
