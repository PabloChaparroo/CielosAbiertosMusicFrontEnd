import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, FileDown, ImageIcon, Search, Type as TypeIcon, Upload } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, EmptyState, FavButton, TagChip } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { plainLyrics } from "@/lib/chords";
import { exportLyricsPdf } from "@/lib/pdf";

export const Route = createFileRoute("/letras")({
  head: () => ({
    meta: [
      { title: "Letras — Cielos Abiertos" },
      {
        name: "description",
        content: "Letras del repertorio en texto o imagen, con búsqueda por tema y exportación a PDF.",
      },
      { property: "og:title", content: "Letras — Cielos Abiertos" },
      { property: "og:description", content: "Letras del repertorio del ministerio de alabanza." },
    ],
  }),
  component: Letras,
});

function Letras() {
  const { songs, can } = useApp();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<"texto" | "imagen">("texto");
  const [draft, setDraft] = useState("");

  const filtered = useMemo(
    () =>
      songs.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())),
      ),
    [songs, query],
  );

  const song = songs.find((s) => s.id === selected) ?? null;

  if (song) {
    return (
      <AppLayout
        title={song.title}
        subtitle={`${song.artist} · Tonalidad ${song.key}`}
        actions={
          <button
            onClick={() => exportLyricsPdf(song)}
            className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">Exportar PDF</span>
          </button>
        }
      >
        <button
          onClick={() => setSelected(null)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a letras
        </button>

        <div className="mb-4 flex gap-2">
          <ModeBtn active={mode === "texto"} onClick={() => setMode("texto")} icon={<TypeIcon className="h-3.5 w-3.5" />}>
            Texto
          </ModeBtn>
          <ModeBtn active={mode === "imagen"} onClick={() => setMode("imagen")} icon={<ImageIcon className="h-3.5 w-3.5" />}>
            Imagen
          </ModeBtn>
        </div>

        {mode === "texto" ? (
          can("editSongs") ? (
            <textarea
              value={draft || plainLyrics(song.chordpro)}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[420px] w-full rounded-2xl border border-border bg-card p-6 font-sans text-lg leading-relaxed whitespace-pre-wrap outline-none focus:border-primary/50"
            />
          ) : (
            <article className="surface-card p-6 text-lg leading-relaxed whitespace-pre-wrap sm:p-10">
              {plainLyrics(song.chordpro)}
            </article>
          )
        ) : (
          <div className="surface-card flex flex-col items-center justify-center gap-3 p-14 text-center">
            <Upload className="h-6 w-6 text-primary" />
            <p className="font-medium">Subí una foto de la letra</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Podés cargar una foto del cancionero y verla acá con vista previa (demo).
            </p>
            <label className="mt-2 cursor-pointer rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
              Elegir imagen
              <input type="file" accept="image/*" className="hidden" />
            </label>
          </div>
        )}
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Letras" subtitle="Buscá por nombre o tema">
      <div className="relative mb-6 max-w-md">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por canción o tema…"
          className="w-full rounded-full border border-border bg-card py-2.5 pr-4 pl-10 text-sm outline-none focus:border-primary/60"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<TypeIcon className="h-6 w-6" />}
          title="Sin resultados"
          description="No hay letras que coincidan con tu búsqueda."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((song) => (
            <button
              key={song.id}
              onClick={() => {
                setSelected(song.id);
                setDraft("");
              }}
              className="surface-card group p-4 text-left hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <Cover song={song} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{song.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
                </div>
                <FavButton songId={song.id} />
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                {plainLyrics(song.chordpro).replace(/\[.*?\]/g, "").trim()}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {song.tags.map((t) => (
                  <TagChip key={t} tag={t} />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function ModeBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
