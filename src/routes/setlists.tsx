import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  FileDown,
  GripVertical,
  ListMusic,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover, EmptyState, LockedHint } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { KEYS } from "@/lib/chords";
import { exportSetlistPdf } from "@/lib/pdf";
import type { EventType, Setlist, SetlistItem } from "@/types";

export const Route = createFileRoute("/setlists")({
  head: () => ({
    meta: [
      { title: "Setlists — Cielos Abiertos" },
      {
        name: "description",
        content: "Próximos servicios y ensayos con el orden de canciones y su tonalidad del día.",
      },
      { property: "og:title", content: "Setlists — Cielos Abiertos" },
      { property: "og:description", content: "Organizá el repertorio de cada servicio." },
    ],
  }),
  component: Setlists,
});

const eventColor: Record<EventType, string> = {
  "Culto Domingo": "bg-primary/15 text-primary border-primary/40",
  Ensayo: "bg-sky/15 text-sky border-sky/40",
  "Evento Especial": "bg-secondary text-foreground border-border",
};

function Setlists() {
  const { setlists, songs, users, can, addSetlist, updateSetlist } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);

  const now = Date.now();
  const sorted = [...setlists].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const upcoming = sorted.filter((s) => new Date(s.date).getTime() >= now - 86400000);
  const past = sorted
    .filter((s) => new Date(s.date).getTime() < now - 86400000)
    .filter((s) => s.title.toLowerCase().includes(query.toLowerCase()))
    .reverse();

  const setlist = setlists.find((s) => s.id === selected);

  if (setlist) {
    return (
      <SetlistDetail
        setlist={setlist}
        onBack={() => setSelected(null)}
        onChange={updateSetlist}
        canEdit={can("createSetlist")}
      />
    );
  }

  return (
    <AppLayout
      title="Setlists"
      subtitle="Servicios, ensayos y eventos especiales"
      actions={
        can("createSetlist") ? (
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nuevo setlist</span>
          </button>
        ) : (
          <LockedHint>Solo líderes pueden crear setlists</LockedHint>
        )
      }
    >
      <section className="mb-10">
        <h2 className="mb-4 font-display text-xl font-semibold">Próximos</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="No hay servicios agendados"
            description="Creá el próximo setlist para que el equipo lo tenga a mano."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {upcoming.map((s) => (
              <SetlistCard key={s.id} s={s} onClick={() => setSelected(s.id)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Historial</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en el historial…"
              className="w-full rounded-full border border-border bg-card py-2 pr-4 pl-10 text-sm outline-none focus:border-primary/60"
            />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {past.map((s) => (
            <SetlistCard key={s.id} s={s} onClick={() => setSelected(s.id)} muted />
          ))}
        </div>
      </section>

      {modal ? (
        <NewSetlistModal
          onClose={() => setModal(false)}
          onSave={(s) => {
            addSetlist(s);
            setModal(false);
          }}
        />
      ) : null}
    </AppLayout>
  );

  function SetlistCard({ s, onClick, muted }: { s: Setlist; onClick: () => void; muted?: boolean }) {
    const leader = users.find((u) => u.id === s.leaderId);
    return (
      <button
        onClick={onClick}
        className={`surface-card w-full p-5 text-left hover:-translate-y-1 hover:border-primary/40 ${muted ? "opacity-80" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${eventColor[s.type]}`}>
              {s.type}
            </span>
            <h3 className="mt-2 font-display text-lg font-semibold">{s.title}</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(s.date).toLocaleString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{s.items.length}</p>
            canciones
          </div>
        </div>
        <div className="mt-4 flex -space-x-2">
          {s.teamIds.map((id) => {
            const u = users.find((x) => x.id === id);
            if (!u) return null;
            return (
              <span
                key={id}
                title={u.name}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card text-[11px] font-bold text-background"
                style={{ backgroundImage: u.avatarColor }}
              >
                {u.initials}
              </span>
            );
          })}
          <span className="pl-4 text-xs text-muted-foreground">Lidera {leader?.name}</span>
        </div>
        <p className="mt-3 truncate text-sm text-muted-foreground">
          {s.items.map((i) => songs.find((so) => so.id === i.songId)?.title).join(" · ")}
        </p>
      </button>
    );
  }
}

function SetlistDetail({
  setlist,
  onBack,
  onChange,
  canEdit,
}: {
  setlist: Setlist;
  onBack: () => void;
  onChange: (s: Setlist) => void;
  canEdit: boolean;
}) {
  const { songs, users } = useApp();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    const items = [...setlist.items];
    const [it] = items.splice(from, 1);
    if (!it) return;
    items.splice(to, 0, it);
    onChange({ ...setlist, items });
  };

  return (
    <AppLayout
      title={setlist.title}
      subtitle={new Date(setlist.date).toLocaleString("es-AR", {
        dateStyle: "full",
        timeStyle: "short",
      })}
      actions={
        <button
          onClick={() => exportSetlistPdf(setlist, songs)}
          className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
        >
          <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">Exportar PDF</span>
        </button>
      }
    >
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a setlists
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="surface-card divide-y divide-border/60">
          {setlist.items.map((item, i) => {
            const song = songs.find((s) => s.id === item.songId);
            if (!song) return null;
            return (
              <div
                key={item.songId + i}
                draggable={canEdit}
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== i) move(dragIndex, i);
                  setDragIndex(null);
                }}
                className={`flex items-center gap-3 p-3 transition-colors hover:bg-elevated/60 ${
                  dragIndex === i ? "opacity-50" : ""
                }`}
              >
                {canEdit ? (
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                ) : (
                  <span className="w-4 text-center text-sm text-muted-foreground">{i + 1}</span>
                )}
                <Cover song={song} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{song.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {song.artist} · {song.bpm} BPM
                    {item.note ? ` · ${item.note}` : ""}
                  </p>
                </div>
                <select
                  disabled={!canEdit}
                  value={item.key}
                  onChange={(e) => {
                    const items: SetlistItem[] = setlist.items.map((x, idx) =>
                      idx === i ? { ...x, key: e.target.value } : x,
                    );
                    onChange({ ...setlist, items });
                  }}
                  className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs disabled:opacity-60"
                >
                  {KEYS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                {canEdit ? (
                  <button
                    aria-label="Quitar canción"
                    onClick={() =>
                      onChange({ ...setlist, items: setlist.items.filter((_, idx) => idx !== i) })
                    }
                    className="rounded-full p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            );
          })}
          {canEdit ? (
            <p className="p-3 text-xs text-muted-foreground">
              Arrastrá las canciones para reordenar el servicio.
            </p>
          ) : (
            <div className="p-3">
              <LockedHint>Solo líderes pueden modificar este setlist</LockedHint>
            </div>
          )}
        </div>

        <aside className="surface-card h-fit p-5">
          <h3 className="mb-3 font-display text-lg font-semibold">Equipo asignado</h3>
          <ul className="space-y-3">
            {setlist.teamIds.map((id) => {
              const u = users.find((x) => x.id === id);
              if (!u) return null;
              return (
                <li key={id} className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-background"
                    style={{ backgroundImage: u.avatarColor }}
                  >
                    {u.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.ministryRole}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </AppLayout>
  );
}

function NewSetlistModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (s: Setlist) => void;
}) {
  const { songs, currentUser } = useApp();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("2026-09-13T10:30");
  const [type, setType] = useState<EventType>("Culto Domingo");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const results = useMemo(
    () => songs.filter((s) => s.title.toLowerCase().includes(query.toLowerCase())).slice(0, 40),
    [songs, query],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl border border-border bg-card p-6 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Nuevo setlist</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            className={inputCls}
            placeholder="Título del servicio"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="datetime-local"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <select
              className={inputCls}
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
            >
              <option>Culto Domingo</option>
              <option>Ensayo</option>
              <option>Evento Especial</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={inputCls + " pl-10"}
              placeholder="Buscar canciones para agregar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="my-4 max-h-64 flex-1 overflow-y-auto rounded-xl border border-border">
          {results.map((s) => {
            const on = picked.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() =>
                  setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))
                }
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-elevated/70 ${
                  on ? "bg-primary/10" : ""
                }`}
              >
                <Cover song={s} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.artist}</p>
                </div>
                <span className="text-xs text-muted-foreground">{s.key}</span>
                {on ? <span className="text-xs font-semibold text-primary">Agregada</span> : null}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
            Cancelar
          </button>
          <button
            disabled={!title || picked.length === 0}
            onClick={() =>
              onSave({
                id: `sl${Date.now()}`,
                title,
                date: new Date(date).toISOString(),
                type,
                leaderId: currentUser.id,
                items: picked.map((id) => ({
                  songId: id,
                  key: songs.find((s) => s.id === id)?.key ?? "C",
                })),
                teamIds: [currentUser.id],
              })
            }
            className="rounded-full gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            <ListMusic className="mr-1 inline h-4 w-4" /> Crear setlist
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";
