/**
 * Un solo audio a la vez entre reproductores que no comparten estado: las pistas subidas
 * (AudioTracksModal) y los videos de YouTube extra (YoutubeEmbed). El reproductor principal ya
 * está en el contexto de la app (isPlaying/toggle); estos dos avisan por un evento de window
 * cuando empiezan a sonar, y el otro se pausa.
 */
export type ExclusiveSource = "pista" | "youtube-extra";

const EVENT = "cielos:exclusive-audio";

export function announcePlaying(source: ExclusiveSource) {
  window.dispatchEvent(new CustomEvent<ExclusiveSource>(EVENT, { detail: source }));
}

/** Llama a `onOther` cuando empieza a sonar una fuente distinta de `self`; devuelve la baja */
export function onOtherPlaying(self: ExclusiveSource, onOther: () => void): () => void {
  const listener = (event: Event) => {
    if ((event as CustomEvent<ExclusiveSource>).detail !== self) onOther();
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
