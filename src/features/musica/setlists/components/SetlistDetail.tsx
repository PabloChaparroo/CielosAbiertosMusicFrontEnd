import { useState } from "react";
import { ArrowLeft, FileDown, GripVertical, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Cover } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { KEYS } from "@/lib/chords";
import { exportSetlistPdf } from "@/lib/pdf";
import type { Setlist, SetlistItem } from "@/types";
import { LockedHint } from "./LockedHint";

export function SetlistDetail({
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
                    <p className="truncate text-xs text-muted-foreground">
                      {u.fechaHoraBaja ? "Dado de baja" : u.ministryRole}
                    </p>
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
