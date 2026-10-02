import { loadYoutubeApi } from "./youtube-api";

const TIMEOUT_MS = 10_000;

/** Lee la duración (en segundos) de un video con un player oculto; null si no se pudo */
function readOne(videoId: string): Promise<number | null> {
  return loadYoutubeApi().then(
    (YT) =>
      new Promise((resolve) => {
        const host = document.createElement("div");
        host.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;";
        const el = document.createElement("div");
        host.appendChild(el);
        document.body.appendChild(host);
        let poll: ReturnType<typeof setInterval> | undefined;
        let player: { getDuration(): number; destroy(): void } | null = null;
        const finish = (seconds: number | null) => {
          clearInterval(poll);
          clearTimeout(timeout);
          try {
            player?.destroy();
          } catch {
            // el player ya no existe
          }
          host.remove();
          resolve(seconds);
        };
        const timeout = setTimeout(() => finish(null), TIMEOUT_MS);
        player = new YT.Player(el, {
          videoId,
          width: "1",
          height: "1",
          playerVars: { autoplay: 0, controls: 0 },
          events: {
            // la duración puede tardar un instante en estar disponible después de onReady
            onReady: () => {
              poll = setInterval(() => {
                const d = Math.round(player?.getDuration() ?? 0);
                if (d > 0) finish(d);
              }, 200);
            },
            onStateChange: () => {},
          },
        });
      }),
    () => null,
  );
}

let chain: Promise<unknown> = Promise.resolve();
/** Duración del video de YouTube en segundos (de a un player por vez); null si no se pudo leer */
export function readYoutubeDuration(videoId: string): Promise<number | null> {
  const result = chain.then(() => readOne(videoId));
  chain = result.catch(() => null);
  return result;
}
