/** Tramo de un renglón de acordes + letra que entra en el ancho de la hoja */
export interface RowSegment {
  /** columna donde empieza (incluida) y termina (excluida) */
  start: number;
  end: number;
  /** espacios que se sacan al principio del tramo (los que quedaron del corte) */
  shift: number;
}

/**
 * Parte un renglón de acordes + letra (en columnas de fuente monoespaciada) en tramos de hasta
 * `maxCols`, para que en el PDF una línea larga siga abajo en vez de cortarse en el borde. Corta en
 * un espacio de la letra y nunca en medio de un acorde; acorde y letra se cortan en la misma
 * columna, así cada acorde sigue arriba de su sílaba.
 */
export function splitChordRow(
  chordLine: string,
  lyricLine: string,
  chords: Array<{ col: number; length: number }>,
  maxCols: number,
): RowSegment[] {
  const total = Math.max(chordLine.length, lyricLine.length);
  const segments: RowSegment[] = [];
  let start = 0;
  while (start < total) {
    let end = total;
    if (total - start > maxCols) {
      end = start + maxCols;
      // último espacio de la letra antes del límite (si no hay, se corta en el límite)
      const space = lyricLine.lastIndexOf(" ", end);
      if (space > start) end = space;
      // un acorde que quedaría partido baja entero al renglón siguiente
      const cut = chords.find((c) => c.col < end && c.col + c.length > end);
      if (cut && cut.col > start) end = cut.col;
    }
    const leading = (text: string) => text.length - text.trimStart().length;
    const chordPart = chordLine.slice(start, end);
    const lyricPart = lyricLine.slice(start, end);
    // en los tramos que siguen, sin la sangría que dejó el corte (la menor de las dos filas, así
    // acorde y letra se corren lo mismo)
    const shift =
      start === 0
        ? 0
        : Math.min(
            lyricPart.trim() ? leading(lyricPart) : lyricPart.length,
            chordPart.trim() ? leading(chordPart) : chordPart.length,
          );
    segments.push({ start, end, shift });
    start = end;
  }
  return segments;
}
