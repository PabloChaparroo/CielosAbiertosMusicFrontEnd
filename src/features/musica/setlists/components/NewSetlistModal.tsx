import { useMemo, useState } from "react";
import { ListMusic, Search, X } from "lucide-react";
import { Cover } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import type { EventType, Setlist } from "@/types";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

export function NewSetlistModal({
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
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 hover:bg-secondary"
          >
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
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}
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
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
          >
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
