import { useEffect, useRef, useState } from "react";

/**
 * Al elegir una canción en celular/tablet, la página baja hasta `ref` (la tarjeta de la canción) y
 * el buscador de arriba queda fuera de la vista. En compu (xl) la lista va al costado y no tapa
 * nada, así que no se mueve. `request()` se llama solo cuando la elige el usuario (no al entrar
 * desde una lista); es un contador, así también baja si se vuelve a elegir la misma canción.
 */
export function useScrollToPicked<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [requests, setRequests] = useState(0);

  useEffect(() => {
    if (!requests || window.matchMedia("(min-width: 1280px)").matches) return;
    // después de que la lista del buscador termina de plegarse (200 ms): si no, la tarjeta sigue
    // moviéndose mientras baja
    const timer = window.setTimeout(() => {
      const target = ref.current;
      if (!target) return;
      const header = document.querySelector<HTMLElement>("main > header");
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top - (header?.offsetHeight ?? 0) - 12, behavior: "smooth" });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [requests]);

  return { ref, request: () => setRequests((n) => n + 1) };
}
