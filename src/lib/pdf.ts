import { jsPDF } from "jspdf";
import { lyricsLines, parseChordPro, type ParsedLine } from "./chords";
import type { Setlist, Song } from "@/types";

const CHURCH = "Cielos Abiertos";

function header(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(18, 18, 18);
  doc.rect(0, 0, 210, 26, "F");
  doc.setTextColor(240, 190, 100);
  doc.setFontSize(13);
  doc.text(CHURCH, 14, 12);
  doc.setTextColor(235, 235, 235);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString("es-AR"), 196, 12, { align: "right" });
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
  let y = 60;
  lyricsLines(song.chordpro).forEach((line) => {
    y = ensure(doc, y);
    if (line.kind === "section") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(190, 130, 30);
      doc.text(line.value, 14, y);
      doc.setTextColor(20, 20, 20);
      y += 8;
      return;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(line.value || " ", 14, y);
    y += 6;
  });
  doc.save(`${song.title} - letra.pdf`);
}

/**
 * Anotación "(…)" más chica y del color de los acordes en (x, y); "->" porque las fuentes estándar de jsPDF no
 * tienen "↱". Restaura fuente, tamaño y color que había.
 */
function drawNoteAt(doc: jsPDF, label: string, x: number, y: number, size: number) {
  const font = doc.getFont();
  const color = doc.getTextColor();
  doc.setFont("courier", "normal");
  doc.setFontSize(size * 0.65);
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
    drawNoteAt(doc, label, x + 6 + offset * 0.65, y, size);
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
      y += size * 0.5;
      return;
    }
    if (line.kind === "section") {
      doc.setFontSize(size);
      doc.setTextColor(190, 130, 30);
      doc.text(line.label, 14, y);
      drawNotes(doc, line.notes, 14 + doc.getTextWidth(line.label), y, size);
      doc.setTextColor(20, 20, 20);
      y += size * 0.8;
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
      const width = Math.ceil(item.text.length * 0.65) + 1;
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
    y += size * 0.75;
    y = ensure(doc, y);
    if (opts.mode === "both") {
      doc.setFont("courier", "normal");
      doc.setTextColor(20, 20, 20);
      doc.text(lyricLine, 14, y);
      y += size * 0.75;
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
