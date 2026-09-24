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
      doc.setTextColor(20, 20, 20);
      y += size * 0.8;
      return;
    }
    doc.setFont("courier", "bold");
    doc.setFontSize(size);
    let chordLine = "";
    let lyricLine = "";
    line.pairs.forEach((p) => {
      const text = p.text;
      const chord = p.chord;
      chordLine = chordLine.padEnd(lyricLine.length, " ") + chord;
      lyricLine = lyricLine + text;
      if (chord.length > text.length) lyricLine = lyricLine.padEnd(chordLine.length, " ");
    });
    doc.setTextColor(190, 130, 30);
    doc.text(chordLine, 14, y);
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
