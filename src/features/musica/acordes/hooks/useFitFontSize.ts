import { useCallback, useEffect, useLayoutEffect, useState } from "react";

/**
 * Tamaño de letra de la hoja de acordes que hace entrar su línea más ancha en el ancho
 * disponible — en un celular 25px no entra y la canción quedaba cortada. Nunca pasa de `max`
 * (el tamaño de siempre en pantallas grandes) ni baja de `min`.
 *
 * Cada vez que cambian `deps` (canción, modo, tono…) o el ancho de la caja (girar el celular),
 * arranca en `max` y baja de a 1px midiendo el render real (`[data-chord-sheet]` dentro de la
 * caja) hasta que entra. Es exacto aunque haya partes que no escalan con la letra (márgenes de
 * las notas, títulos); corre en layout effects, antes de pintar, así que no se ve el ajuste.
 * Con `enabled` en false (tamaño elegido a mano) no mide nada.
 */
export function useFitFontSize(
  max: number,
  min: number,
  enabled: boolean,
  deps: readonly unknown[],
) {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const [fitted, setFitted] = useState(max);
  const [fitting, setFitting] = useState(true);

  const boxRef = useCallback((node: HTMLDivElement | null) => setBox(node), []);

  useEffect(() => {
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setBoxWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [box]);

  // La fuente monoespaciada es web: hasta que carga se mide con la de reemplazo (más angosta) y
  // el ajuste quedaba corto en la primera visita. Cuando termina de cargar alguna fuente, se reajusta.
  const [fontsLoaded, setFontsLoaded] = useState(0);
  useEffect(() => {
    const onLoaded = () => setFontsLoaded((n) => n + 1);
    document.fonts.addEventListener("loadingdone", onLoaded);
    void document.fonts.ready.then(onLoaded);
    return () => document.fonts.removeEventListener("loadingdone", onLoaded);
  }, []);

  // algo cambió: volver a empezar desde el máximo
  useLayoutEffect(() => {
    if (!enabled) return;
    setFitted(max);
    setFitting(true);
    // deps viene de afuera a propósito (ver comentario de arriba)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, boxWidth, fontsLoaded, enabled, max, ...deps]);

  // un paso por render: si la línea más ancha no entra, 1px menos
  useLayoutEffect(() => {
    if (!enabled || !fitting) return;
    const sheet = box?.querySelector<HTMLElement>("[data-chord-sheet]");
    if (!sheet) return;
    const widest = Math.max(0, ...Array.from(sheet.children, (child) => child.scrollWidth));
    if (widest > sheet.clientWidth && fitted > min) setFitted(fitted - 1);
    else setFitting(false);
  }, [box, enabled, fitting, fitted, min]);

  return { boxRef, fitted };
}
