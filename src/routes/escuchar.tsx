import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Music4, Play, Plus, Search, Upload, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Cover,
  EmptyState,
  FavButton,
  formatDuration,
  TagChip,
} from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { KEYS } from "@/lib/chords";
import type { Song, Tag } from "@/types";

const ALL_TAGS: Tag[] = [
  "Adoración",
  "Júbilo",
  "Navidad",
  "Sanidad",
  "Bautismo",
  "Comunión",
  "Entrega",
  "Gratitud",
];

export const Route = createFileRoute("/escuchar")({
  head: () => ({
    meta: [
      { title: "Escuchar y Subir — Cielos Abiertos" },
      {
        name: "description",
        content: "Reproducí el repertorio del ministerio y subí nuevas canciones con sus tags.",
      },
      { property: "og:title", content: "Escuchar y Subir — Cielos Abiertos" },
      { property: "og:description", content: "Repertorio de audio del equipo de adoración." },
    ],
  }),
  component: Escuchar,
});

function Escuchar() {
  const { songs, play, current, can, addSong } = useApp();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<Tag | null>(null);
  const [modal, setModal] = useState(false);

  const filtered = useMemo(
    () =>
      songs.filter(
        (s) =>
          (!tag || s.tags.includes(tag)) &&
          (s.title.toLowerCase().includes(query.toLowerCase()) ||
            s.artist.toLowerCase().includes(query.toLowerCase())),
      ),
    [songs, query, tag],
  );

  return (
    <AppLayout
      title="Escuchar y Subir"
      subtitle={`${songs.length} canciones en el repertorio`}
      actions={
        can("editSongs") ? (
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Subir canción</span>
          </button>
        ) : null
      }
    >
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar canción o artista…"
            className="w-full rounded-full border border-border bg-card py-2.5 pr-4 pl-10 text-sm outline-none transition-colors focus:border-primary/60"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTag(null)}>
            <TagChip tag="Todas" active={tag === null} />
          </button>
          {ALL_TAGS.map((t) => (
            <button key={t} onClick={() => setTag(t === tag ? null : t)}>
              <TagChip tag={t} active={tag === t} />
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Music4 className="h-6 w-6" />}
          title="No encontramos canciones"
          description="Probá con otro nombre o quitá el filtro de tema."
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="hidden grid-cols-[40px_1fr_180px_120px_90px] gap-4 border-b border-border/60 px-4 py-3 text-[11px] tracking-widest text-muted-foreground uppercase md:grid">
            <span>#</span>
            <span>Título</span>
            <span>Temas</span>
            <span>Tono / BPM</span>
            <span className="text-right">Duración</span>
          </div>
          {filtered.map((song, i) => (
            <div
              key={song.id}
              onDoubleClick={() => play(song)}
              className={`group grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-2.5 transition-colors hover:bg-elevated/70 md:grid-cols-[40px_1fr_180px_120px_90px] ${
                current?.id === song.id ? "bg-elevated/60" : ""
              }`}
            >
              <button
                onClick={() => play(song)}
                aria-label={`Reproducir ${song.title}`}
                className="hidden h-8 w-8 items-center justify-center rounded-full text-sm text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground md:flex"
              >
                <span className="group-hover:hidden">{i + 1}</span>
                <Play className="hidden h-3.5 w-3.5 group-hover:block" />
              </button>
              <div className="flex min-w-0 items-center gap-3">
                <Cover song={song} size="sm" />
                <div className="min-w-0">
                  <p
                    className={`truncate font-medium ${current?.id === song.id ? "text-primary" : ""}`}
                  >
                    {song.title}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
                </div>
              </div>
              <div className="hidden flex-wrap gap-1.5 md:flex">
                {song.tags.map((t) => (
                  <TagChip key={t} tag={t} />
                ))}
              </div>
              <span className="hidden text-sm text-muted-foreground md:block">
                {song.key} · {song.bpm} BPM
              </span>
              <div className="flex items-center justify-end gap-1">
                <FavButton songId={song.id} />
                <span className="hidden w-12 text-right text-sm text-muted-foreground md:inline">
                  {formatDuration(song.duration)}
                </span>
                <button
                  onClick={() => play(song)}
                  aria-label={`Reproducir ${song.title}`}
                  className="rounded-full p-2 text-muted-foreground hover:text-primary md:hidden"
                >
                  <Play className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal ? <UploadModal onClose={() => setModal(false)} onSave={addSong} /> : null}
    </AppLayout>
  );
}

function UploadModal({ onClose, onSave }: { onClose: () => void; onSave: (s: Song) => void }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("G");
  const [tags, setTags] = useState<Tag[]>([]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg animate-in slide-in-from-bottom-6 rounded-t-3xl border border-border bg-card p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Subir canción</h2>
            <p className="text-sm text-muted-foreground">Agregá una pista al repertorio</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Nombre">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Artista / autor original">
            <input className={inputCls} value={artist} onChange={(e) => setArtist(e.target.value)} />
          </Field>
          <Field label="Link de audio o archivo">
            <input
              className={inputCls}
              placeholder="https://…/audio.mp3"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
              <Upload className="h-4 w-4" /> Arrastrá un archivo (demo)
              <input type="file" className="hidden" />
            </label>
          </Field>
          <Field label="Tonalidad original">
            <select className={inputCls} value={key} onChange={(e) => setKey(e.target.value)}>
              {KEYS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="Temas">
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
                  }
                >
                  <TagChip tag={t} active={tags.includes(t)} />
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
            Cancelar
          </button>
          <button
            disabled={!title}
            onClick={() => {
              onSave({
                id: `s${Date.now()}`,
                title,
                artist: artist || "Desconocido",
                key,
                bpm: 80,
                duration: 300,
                tags: tags.length ? tags : ["Adoración"],
                cover: "linear-gradient(135deg,#4c1d95,#2563eb)",
                audioUrl: url || "",
                chordpro: "{estrofa 1}\n[G]Nueva canción del minis[D]terio",
                addedAt: new Date().toISOString().slice(0, 10),
                playsByMonth: {},
              });
              onClose();
            }}
            className="rounded-full gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}
