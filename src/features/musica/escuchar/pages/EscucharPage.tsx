import { useEffect, useMemo, useState } from "react";
import { SongsService } from "@/features/canciones/services/songs.service";
import { Check, Layers, Link2, Music4, Pencil, Play, Plus, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, EmptyState, FavButton, formatDuration, TagChip } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import type { Song, Tag } from "@/types";
import { AudioTracksModal } from "../components/AudioTracksModal";
import { SongLinksModal } from "../components/SongLinksModal";
import { UploadModal } from "../components/UploadModal";

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

export function EscucharPage() {
  const { songs, play, current, can, addSong, updateSong } = useApp();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<Tag | null>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  // secuencia (multitracks): todas / con / sin
  const [secuencia, setSecuencia] = useState<"con" | "sin" | null>(null);
  // tipos para el filtro (Alabanza / Adoración), desde el backend: aparecen aunque ninguna
  // canción tenga todavía ese tipo
  const [tipos, setTipos] = useState<string[]>([]);
  useEffect(() => {
    SongsService.listTipos()
      .then((list) => setTipos(list.map((t) => t.nombre)))
      .catch(() => setTipos([]));
  }, []);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Song | null>(null);
  const [managingTracks, setManagingTracks] = useState<Song | null>(null);
  const [managingLinks, setManagingLinks] = useState<Song | null>(null);

  const filtered = useMemo(
    () =>
      songs.filter(
        (s) =>
          (!tag || s.tags.includes(tag)) &&
          (!tipo || s.tipo === tipo) &&
          (!secuencia || (secuencia === "con") === s.trackCount > 0) &&
          (s.title.toLowerCase().includes(query.toLowerCase()) ||
            s.artist.toLowerCase().includes(query.toLowerCase())),
      ),
    [songs, query, tag, tipo, secuencia],
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
        {/* tipo (rápida / lenta): botones más marcados que los temas, para no confundir el
            tipo "Adoración" con el tema "Adoración" */}
        {tipos.length ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
            {[null, ...tipos].map((t) => (
              <button
                key={t ?? "todos"}
                type="button"
                onClick={() => setTipo(t)}
                aria-pressed={tipo === t}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  tipo === t
                    ? "gradient-gold text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {t ?? "Todos los tipos"}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por secuencia">
          {(
            [
              [null, "Con y sin secuencia"],
              ["con", "Con secuencia"],
              ["sin", "Sin secuencia"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setSecuencia(value)}
              aria-pressed={secuencia === value}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                secuencia === value
                  ? "bg-primary/15 text-primary ring-1 ring-primary/50"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "con" ? <Check className="h-3.5 w-3.5" /> : null}
              {label}
            </button>
          ))}
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
        <div className="surface-card overflow-x-auto">
          <div className="hidden grid-cols-[40px_minmax(0,1fr)_80px_150px_210px] 2xl:grid-cols-[40px_minmax(220px,1fr)_200px_80px_150px_210px] gap-4 border-b border-border/60 px-4 py-3 text-[11px] tracking-widest text-muted-foreground uppercase md:grid">
            <span>#</span>
            <span>Título</span>
            <span className="hidden 2xl:block">Temas</span>
            <span className="text-center">Secuencia</span>
            <span>Tono / Compás / BPM</span>
            <span className="text-right">Duración</span>
          </div>
          {filtered.map((song, i) => (
            <div
              key={song.id}
              onClick={() => play(song)}
              className={`group grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-2.5 transition-colors hover:bg-elevated/70 md:grid-cols-[40px_minmax(0,1fr)_80px_150px_210px] 2xl:grid-cols-[40px_minmax(220px,1fr)_200px_80px_150px_210px] ${
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
                  <p className="truncate text-sm text-muted-foreground">
                    {song.artist}
                    {song.tipo ? (
                      <span className="ml-2 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                        {song.tipo}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="hidden flex-wrap gap-1.5 2xl:flex">
                {song.tags.map((t) => (
                  <TagChip key={t} tag={t} />
                ))}
              </div>
              {/* secuencia: check amarillo si tiene pistas (multitracks), "-" si no */}
              <span className="hidden justify-center md:flex">
                {song.trackCount > 0 ? (
                  <Check
                    className="h-5 w-5 text-primary"
                    strokeWidth={3}
                    aria-label={`Con secuencia (${song.trackCount} pistas)`}
                  />
                ) : (
                  <span className="text-base text-foreground" aria-label="Sin secuencia">
                    -
                  </span>
                )}
              </span>
              <span className="hidden whitespace-nowrap text-sm text-muted-foreground md:block">
                {song.key} · {song.compas} · {song.bpm} BPM
              </span>
              <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                <FavButton songId={song.id} />
                <span className="hidden w-12 text-right text-sm text-muted-foreground md:inline">
                  {formatDuration(song.duration)}
                </span>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setManagingTracks(song);
                  }}
                  aria-label={`Pistas adicionales de ${song.title}`}
                  className="rounded-full p-2 text-muted-foreground hover:text-primary"
                >
                  <Layers className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setManagingLinks(song);
                  }}
                  aria-label={`Links relacionados de ${song.title}`}
                  title="Links relacionados"
                  className="rounded-full p-2 text-muted-foreground hover:text-primary"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </button>
                {can("editSongs") ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditing(song);
                    }}
                    aria-label={`Editar ${song.title}`}
                    className="rounded-full p-2 text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    play(song);
                  }}
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
      {editing ? (
        <UploadModal song={editing} onClose={() => setEditing(null)} onSave={updateSong} />
      ) : null}
      {managingTracks ? (
        <AudioTracksModal song={managingTracks} onClose={() => setManagingTracks(null)} />
      ) : null}
      {managingLinks ? (
        <SongLinksModal song={managingLinks} onClose={() => setManagingLinks(null)} />
      ) : null}
    </AppLayout>
  );
}
