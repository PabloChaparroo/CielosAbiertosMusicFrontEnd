import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  FileDown,
  GripVertical,
  Music2,
  Pencil,
  Trash2,
  Type,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, Cover } from "@/components/common/ui-bits";
import { InstrumentPicker } from "@/components/common/InstrumentPicker";
import { INSTRUMENTS } from "@/lib/instruments";
import { useApp } from "@/hooks/useApp";
import { roleNames } from "@/lib/user-roles";
import { KEYS } from "@/lib/chords";
import { exportSetlistPdf } from "@/lib/pdf";
import type { Setlist, SetlistItem } from "@/types";
import { LockedHint } from "./LockedHint";
import { setlistToWhatsapp } from "../lib/whatsapp";

export function SetlistDetail({
  setlist,
  onBack,
  onChange,
  canEdit,
}: {
  setlist: Setlist;
  onBack: () => void;
  onChange: (s: Setlist) => Promise<void>;
  canEdit: boolean;
}) {
  const { songs, users } = useApp();
  const navigate = useNavigate();
  const setlistSongIds = setlist.items.map((item) => item.songId).join(",");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"acordes" | "letras">("acordes");
  // miembro del equipo al que se le está cambiando qué toca en esta lista
  const [editingInstrumentsOf, setEditingInstrumentsOf] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Cada cambio (mover, cambiar tonalidad, sacar una canción) persiste ya
  // mismo contra el backend real. Si el guardado falla, useApp.updateSetlist
  // revierte el estado global solo — acá solo hace falta avisar, porque el
  // "setlist" que llega por props ya va a reflejar el revert en el próximo
  // render.
  const persist = (updated: Setlist) => {
    setSaveError(null);
    onChange(updated).catch(() => {
      setSaveError("No se pudo guardar el cambio — se revirtió al último estado guardado.");
    });
  };

  const move = (from: number, to: number) => {
    const items = [...setlist.items];
    const [it] = items.splice(from, 1);
    if (!it) return;
    items.splice(to, 0, it);
    persist({ ...setlist, items });
  };

  const openSong = (path: "/acordes" | "/letras", songId: string) =>
    navigate({ to: path, search: { songId, songIds: setlistSongIds } });

  const openSelectedSong = (songId: string) => openSong(`/${viewMode}`, songId);

  // "Copiar": el setlist como texto para pegar en WhatsApp
  const [copied, setCopied] = useState(false);
  const copyForWhatsapp = async () => {
    try {
      await navigator.clipboard.writeText(setlistToWhatsapp(setlist, songs));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AppLayout
      title={setlist.title}
      subtitle={new Date(setlist.date).toLocaleString("es-AR", {
        dateStyle: "full",
        timeStyle: "short",
      })}
      actions={
        <>
          <button
            onClick={() => void copyForWhatsapp()}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/60"
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">{copied ? "¡Copiado!" : "Copiar"}</span>
          </button>
          <button
            onClick={() => exportSetlistPdf(setlist, songs)}
            className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">Exportar PDF</span>
          </button>
        </>
      }
    >
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a listas de canciones
      </button>

      {saveError ? (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" /> {saveError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="surface-card divide-y divide-border/60">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 p-3">
            <span className="text-sm font-medium">Abrir canciones como</span>
            <div className="flex rounded-lg border border-border p-1">
              {(
                [
                  ["acordes", "Acordes"],
                  ["letras", "Letras"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    viewMode === mode
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {viewMode === mode ? <Check className="h-3.5 w-3.5" /> : null}
                  {label}
                </button>
              ))}
            </div>
          </div>
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
                <button
                  type="button"
                  onClick={() => openSelectedSong(song.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  aria-label={`Abrir ${song.title} en ${viewMode}`}
                >
                  <Cover song={song} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{song.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {song.artist} · {song.bpm} BPM
                      {item.note ? ` · ${item.note}` : ""}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Abrir acordes de ${song.title}`}
                    title="Abrir acordes"
                    onClick={() => openSong("/acordes", song.id)}
                    className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-primary"
                  >
                    <Music2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Abrir letra de ${song.title}`}
                    title="Abrir letra"
                    onClick={() => openSong("/letras", song.id)}
                    className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-primary"
                  >
                    <Type className="h-4 w-4" />
                  </button>
                </div>
                <select
                  disabled={!canEdit}
                  value={item.key}
                  onChange={(e) => {
                    const items: SetlistItem[] = setlist.items.map((x, idx) =>
                      idx === i ? { ...x, key: e.target.value } : x,
                    );
                    persist({ ...setlist, items });
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
                      persist({ ...setlist, items: setlist.items.filter((_, idx) => idx !== i) })
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
              <LockedHint>Solo líderes pueden modificar esta lista</LockedHint>
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
                <li key={id} className="flex items-start gap-3">
                  <Avatar
                    user={u}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-background"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    {/* lo que toca en esta lista; si no tiene nada asignado, su rol */}
                    {setlist.teamInstruments[id]?.length ? (
                      <p className="truncate text-xs text-primary">
                        {setlist.teamInstruments[id]!.join(" · ")}
                      </p>
                    ) : (
                      <p className="truncate text-xs text-muted-foreground">
                        {u.fechaHoraBaja ? "Dado de baja" : roleNames(u.roles)}
                      </p>
                    )}
                    {editingInstrumentsOf === id ? (
                      <div className="mt-2">
                        <InstrumentPicker
                          size="sm"
                          options={u.instruments?.length ? u.instruments : INSTRUMENTS}
                          value={setlist.teamInstruments[id] ?? []}
                          onChange={(next) =>
                            persist({
                              ...setlist,
                              teamInstruments: { ...setlist.teamInstruments, [id]: next },
                            })
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => setEditingInstrumentsOf((cur) => (cur === id ? null : id))}
                      aria-label={`Qué toca ${u.name} en esta lista`}
                      title="Qué toca en esta lista"
                      className={`shrink-0 self-start rounded-full p-1.5 transition-colors ${
                        editingInstrumentsOf === id
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {editingInstrumentsOf === id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Pencil className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </AppLayout>
  );
}
