import { useMemo, useState } from "react";
import { GripVertical, ListMusic, Search, X } from "lucide-react";
import { Cover } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { SetlistsService } from "../services/setlists.service";
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
  const { songs, users, currentUser } = useApp();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("2026-09-13T10:30");
  const [type, setType] = useState<EventType>("Culto Domingo");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [team, setTeam] = useState<string[]>([currentUser.id]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(
    () => songs.filter((s) => s.title.toLowerCase().includes(query.toLowerCase())).slice(0, 40),
    [songs, query],
  );

  const activeUsers = useMemo(() => users.filter((u) => !u.fechaHoraBaja), [users]);
  const pickedSongs = picked
    .map((id) => songs.find((song) => song.id === id))
    .filter((song): song is (typeof songs)[number] => Boolean(song));

  const canSave = title.trim() !== "" && picked.length > 0 && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await SetlistsService.createSetlist({
        title: title.trim(),
        date: new Date(date).toISOString(),
        type,
        leaderId: currentUser.id,
        teamIds: team,
        items: picked.map((id) => ({
          songId: id,
          key: songs.find((s) => s.id === id)?.key ?? "C",
        })),
      });
      onSave(created);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el setlist");
      setSaving(false);
    }
  };

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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
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

          <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Orden del servicio
              </p>
              <span className="text-xs text-muted-foreground">{pickedSongs.length} canciones</span>
            </div>
            {pickedSongs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Agregá canciones para armar el orden del servicio.
              </p>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {pickedSongs.map((song, index) => (
                  <div
                    key={song.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null || dragIndex === index) return;
                      setPicked((current) => {
                        const next = [...current];
                        const [moved] = next.splice(dragIndex, 1);
                        if (moved) next.splice(index, 0, moved);
                        return next;
                      });
                      setDragIndex(null);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className={`flex items-center gap-2 bg-card px-3 py-2 ${
                      dragIndex === index ? "opacity-50" : ""
                    }`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                    <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
                    <Cover song={song} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{song.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Quitar ${song.title}`}
                      onClick={() => setPicked((current) => current.filter((id) => id !== song.id))}
                      className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Equipo asignado
            </p>
            <div className="flex flex-wrap gap-2">
              {activeUsers.map((u) => {
                const on = team.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() =>
                      setTeam((prev) =>
                        on ? prev.filter((id) => id !== u.id) : [...prev, u.id],
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      on
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            disabled={!canSave}
            onClick={() => void handleSave()}
            className="rounded-full gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            <ListMusic className="mr-1 inline h-4 w-4" /> {saving ? "Creando…" : "Crear setlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
