import { jsPDF } from "jspdf";
import { displayLyricsLines, parseChordPro, type ParsedLine } from "./chords";
import type { Setlist, Song } from "@/types";

const CHURCH = "Cielos Abiertos";

function header(doc: jsPDF, title: string, subtitle: string) {
  // sin fondo negro (gasta mucha tinta al imprimir): texto y una línea fina
  doc.setTextColor(190, 130, 30);
  doc.setFontSize(13);
  doc.text(CHURCH, 14, 14);
  doc.setTextColor(110, 110, 110);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString("es-AR"), 196, 14, { align: "right" });
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(14, 19, 196, 19);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(18);
  doc.text(title, 14, 40);
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(subtitle, 14, 47);
  doc.setTextColor(20, 20, 20);
}

function ensure(doc: jsPDF, y: number): number {
  if (y > 280) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function exportLyricsPdf(song: Song) {
  const doc = new jsPDF();
  header(
    doc,
    song.title,
    `${song.artist} · Tonalidad ${song.key} · Compás ${song.compas} · ${song.tags.join(", ")}`,
  );
  // Dos columnas: cada sección (título + sus líneas) entra entera en una columna; si no entra en
  // lo que queda, pasa a la columna de la derecha y, si ya estaba ahí, a la hoja siguiente.
  const COLS = [14, 108];
  const COL_WIDTH = 88;
  const BOTTOM = 285;
  const SECTION_GAP = 8;
  const LINE = 5.5;
  type Block = { title: string | null; lines: string[] };
  const blocks: Block[] = [];
  displayLyricsLines(song.chordpro).forEach((line) => {
    if (line.kind === "section") blocks.push({ title: line.value, lines: [] });
    else {
      if (!blocks.length) blocks.push({ title: null, lines: [] });
      blocks[blocks.length - 1]!.lines.push(line.value);
    }
  });

  let col = 0;
  let top = 58;
  let y = top;
  const nextColumn = () => {
    if (col === 0) col = 1;
    else {
      doc.addPage();
      col = 0;
      top = 20;
    }
    y = top;
  };

  blocks.forEach((block) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    // las líneas largas se parten al ancho de la columna; sin líneas vacías al final
    const lines = [...block.lines];
    while (lines.length && !lines[lines.length - 1]!.trim()) lines.pop();
    const rows = lines.flatMap((l) =>
      l.trim() ? (doc.splitTextToSize(l, COL_WIDTH) as string[]) : [""],
    );
    const height = (block.title ? SECTION_GAP : 0) + rows.length * LINE;
    if (y > top && y + height > BOTTOM) nextColumn();
    const x = COLS[col]!;
    if (block.title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(190, 130, 30);
      doc.text(block.title, x, y);
      doc.setTextColor(20, 20, 20);
      y += 7;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    rows.forEach((row) => {
      if (y > BOTTOM) nextColumn();
      doc.text(row || " ", COLS[col]!, y);
      y += row ? LINE : LINE * 0.6;
    });
    y += SECTION_GAP - 4;
  });
  doc.save(`${song.title} - letra.pdf`);
}

/** Tamaño de las notas "(…)" respecto de la letra de los acordes */
const NOTE_SCALE_PDF = 0.8;

/**
 * Anotación "(…)" más chica y del color de los acordes en (x, y); "->" porque las fuentes estándar de jsPDF no
 * tienen "↱". Restaura fuente, tamaño y color que había.
 */
function drawNoteAt(doc: jsPDF, label: string, x: number, y: number, size: number) {
  const font = doc.getFont();
  const color = doc.getTextColor();
  doc.setFont("courier", "normal");
  doc.setFontSize(size * NOTE_SCALE_PDF);
  doc.setTextColor(190, 130, 30);
  doc.text(label, x, y);
  doc.setFont(font.fontName, font.fontStyle);
  doc.setFontSize(size);
  doc.setTextColor(color);
}

/** Anotaciones de una sección ("[CORO] (suave)"), a continuación del título */
function drawNotes(doc: jsPDF, notes: string[], x: number, y: number, size: number) {
  notes.forEach((note, index) => {
    const label = `-> ${note}`;
    const offset = notes.slice(0, index).reduce((w, n) => w + doc.getTextWidth(`-> ${n}   `), 0);
    drawNoteAt(doc, label, x + 6 + offset * NOTE_SCALE_PDF, y, size);
  });
}

export function exportChordsPdf(
  song: Song,
  opts: { semitones: number; targetKey: string; mode: "both" | "chords"; fontSize: number },
) {
  const doc = new jsPDF();
  header(
    doc,
    song.title,
    `${song.artist} · Tonalidad ${opts.targetKey} · Compás ${song.compas} · ${song.bpm} BPM`,
  );
  const lines: ParsedLine[] = parseChordPro(song.chordpro, opts.semitones, opts.targetKey);
  const size = Math.min(16, Math.max(8, Math.round(opts.fontSize * 0.55)));
  let y = 60;

  lines.forEach((line) => {
    y = ensure(doc, y);
    if (line.kind === "blank") {
      y += size * 0.3;
      return;
    }
    if (line.kind === "section") {
      doc.setFontSize(size);
      doc.setTextColor(190, 130, 30);
      doc.text(line.label, 14, y);
      drawNotes(doc, line.notes, 14 + doc.getTextWidth(line.label), y, size);
      doc.setTextColor(20, 20, 20);
      y += size * 0.55;
      return;
    }
    doc.setFont("courier", "bold");
    doc.setFontSize(size);
    // Primera pasada: letra y columna de cada acorde, sin que las notas ocupen lugar.
    let chordEnd = 0;
    let lyricLine = "";
    const items: Array<{ kind: "chord" | "note"; col: number; text: string }> = [];
    line.pairs.forEach((p) => {
      if (p.note) {
        items.push({
          kind: "note",
          col: Math.max(chordEnd, lyricLine.length) + 1,
          text: `-> ${p.note}`,
        });
        return;
      }
      const { text, chord } = p;
      const col = Math.max(chordEnd, lyricLine.length);
      if (chord) items.push({ kind: "chord", col, text: chord });
      chordEnd = col + chord.length;
      lyricLine = lyricLine.padEnd(col, " ") + text;
      // +1: que dos acordes seguidos no queden pegados cuando la letra de abajo es más corta
      if (chord && chord.length >= text.length) lyricLine = lyricLine.padEnd(chordEnd + 1, " ");
    });
    // Segunda pasada — mismo criterio que en pantalla: la nota va donde se escribió; si no entra
    // antes del acorde siguiente se corre a la izquierda (al espacio libre de la fila de
    // acordes) y, si tampoco, se corre ese acorde. La letra nunca se mueve.
    let occupiedUntil = 0;
    items.forEach((item, index) => {
      if (item.kind === "chord") {
        item.col = Math.max(item.col, occupiedUntil);
        occupiedUntil = item.col + item.text.length + 1;
        return;
      }
      const width = Math.ceil(item.text.length * NOTE_SCALE_PDF) + 1;
      const next = items.slice(index + 1).find((i) => i.kind === "chord");
      let start = Math.max(item.col, occupiedUntil);
      if (next && start + width > next.col) start = Math.max(occupiedUntil, next.col - width);
      item.col = start;
      occupiedUntil = start + width;
    });
    const chordLine = items
      .filter((i) => i.kind === "chord")
      .reduce((acc, i) => acc.padEnd(i.col, " ") + i.text, "");
    const notes = items.filter((i) => i.kind === "note");
    doc.setTextColor(190, 130, 30);
    doc.text(chordLine, 14, y);
    notes.forEach((n) =>
      drawNoteAt(doc, n.text, 14 + doc.getTextWidth(" ".repeat(n.col)), y, size),
    );
    // interlineado: el acorde pegado a su letra, y un poco más de aire hasta el renglón siguiente
    y += opts.mode === "both" ? size * 0.42 : size * 0.55;
    y = ensure(doc, y);
    if (opts.mode === "both") {
      doc.setFont("courier", "normal");
      doc.setTextColor(20, 20, 20);
      doc.text(lyricLine, 14, y);
      y += size * 0.55;
    }
  });

  doc.save(`${song.title} - ${opts.targetKey}.pdf`);
}

export function exportSetlistPdf(setlist: Setlist, songs: Song[]) {
  const doc = new jsPDF();
  const date = new Date(setlist.date).toLocaleString("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
  });
  header(doc, setlist.title, `${setlist.type} · ${date}`);
  let y = 62;
  doc.setFontSize(11);
  setlist.items.forEach((item, i) => {
    const song = songs.find((s) => s.id === item.songId);
    if (!song) return;
    y = ensure(doc, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}. ${song.title}`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 110);
    doc.text(`${song.artist} · Tono ${item.key} · ${song.bpm} BPM`, 20, y + 5);
    if (item.note) doc.text(`Nota: ${item.note}`, 20, y + 10);
    doc.setTextColor(20, 20, 20);
    y += item.note ? 18 : 13;
  });
  doc.save(`${setlist.title}.pdf`);
}
