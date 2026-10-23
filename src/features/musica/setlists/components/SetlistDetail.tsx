import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  FileDown,
  GripVertical,
  Lock,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, Cover } from "@/components/common/ui-bits";
import { InstrumentPicker } from "@/components/common/InstrumentPicker";
import { INSTRUMENTS } from "@/lib/instruments";
import { useApp } from "@/hooks/useApp";
import { roleNames } from "@/lib/user-roles";
import { exportSetlistPdf } from "@/lib/pdf";
import type { Setlist, SetlistItem, SetlistSection } from "@/types";
import { SECTIONS, itemsForType, sectionOf, usesSections } from "../lib/sections";
import { LockedHint } from "./LockedHint";
import { setlistToWhatsapp } from "../lib/whatsapp";
import { teamToWhatsapp } from "../lib/team-whatsapp";
import { isAssignable } from "../lib/assignable";
import { teamMemberOf } from "../lib/team-members";
import { isDateTitle, titleForDate } from "../lib/date-title";
import { isPlayed, localDay, toLocalInput } from "../lib/setlist-status";

export function SetlistDetail({
  setlist,
  onBack,
  onChange,
  canEdit,
  canDelete,
  locked,
  onDelete,
}: {
  setlist: Setlist;
  onBack: () => void;
  onChange: (s: Setlist) => Promise<void>;
  canEdit: boolean;
  /** eliminar la lista (solo antes de su fecha) */
  canDelete: boolean;
  /** la lista ya se tocó: no se modifica ni se elimina (se avisa) */
  locked: boolean;
  onDelete: () => Promise<void>;
}) {
  const { songs, users } = useApp();
  const navigate = useNavigate();
  const setlistSongIds = setlist.items.map((item) => item.songId).join(",");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"acordes" | "letras">("acordes");
  // miembro del equipo al que se le está cambiando qué toca en esta lista
  const [editingInstrumentsOf, setEditingInstrumentsOf] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  // Cultos y Ensayos: el orden va dividido en Alabanzas / Adoración / Ofrenda
  const sectioned = usesSections(setlist.type);
  const songOf = (item: SetlistItem) => songs.find((s) => s.id === item.songId);
  // guarda siempre ordenado por sección, con la sección de cada canción
  const save = (items: SetlistItem[]) =>
    persist({ ...setlist, items: itemsForType(items, setlist.type, songs) });

  // mover: con secciones, soltar sobre otra canción también la pasa a su sección
  const move = (from: number, to: number) => {
    const items = setlist.items.map((item) => ({ ...item }));
    const [it] = items.splice(from, 1);
    const target = setlist.items[to];
    if (!it || !target) return;
    if (sectioned) it.section = sectionOf(target, songOf(target));
    items.splice(to, 0, it);
    save(items);
  };

  const changeSection = (index: number, section: SetlistSection) =>
    save(setlist.items.map((item, idx) => (idx === index ? { ...item, section } : item)));

  // orden en pantalla: con secciones, agrupado (las listas anteriores pueden venir mezcladas);
  // `i` sigue siendo el índice real en setlist.items
  const sectionRank = (item: SetlistItem) =>
    SECTIONS.findIndex((x) => x.id === sectionOf(item, songOf(item)));
  const shown = setlist.items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (sectioned ? sectionRank(a.item) - sectionRank(b.item) : 0));
  // posición (en pantalla) de la primera canción de cada sección, para poner el título arriba
  const sectionStarts = new Map<number, string>();
  if (sectioned) {
    let previous: SetlistSection | null = null;
    shown.forEach(({ item }, pos) => {
      const section = sectionOf(item, songOf(item));
      if (section !== previous) {
        sectionStarts.set(pos, SECTIONS.find((x) => x.id === section)?.label ?? "");
        previous = section;
      }
    });
  }

  const openSong = (path: "/acordes" | "/letras", songId: string) =>
    navigate({ to: path, search: { songId, songIds: setlistSongIds } });

  const openSelectedSong = (songId: string) => openSong(`/${viewMode}`, songId);

  // cambiar la fecha (solo de hoy en adelante); si el título era la fecha, la sigue
  const changeDate = (value: string) => {
    if (!value) return;
    const next = new Date(value);
    if (Number.isNaN(next.getTime()) || isPlayed(next.toISOString())) {
      setSaveError("Elegí una fecha de hoy en adelante.");
      return;
    }
    persist({
      ...setlist,
      date: next.toISOString(),
      title: isDateTitle(setlist.title) ? titleForDate(value) : setlist.title,
    });
  };

  // equipo: sacar o sumar integrantes (líderes y músicos activos; los admins no se asignan)
  const removeMember = (userId: string) => {
    const { [userId]: _removed, ...instruments } = setlist.teamInstruments;
    persist({
      ...setlist,
      teamIds: setlist.teamIds.filter((id) => id !== userId),
      teamInstruments: instruments,
    });
  };
  const addMember = (userId: string) => {
    const only = users.find((u) => u.id === userId)?.instruments ?? [];
    persist({
      ...setlist,
      teamIds: [...setlist.teamIds, userId],
      // si toca un solo instrumento, se marca solo
      teamInstruments:
        only.length === 1
          ? { ...setlist.teamInstruments, [userId]: only }
          : setlist.teamInstruments,
    });
  };
  const addable = users.filter((u) => isAssignable(u) && !setlist.teamIds.includes(u.id));

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar la lista "${setlist.title}"? No se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch {
      setSaveError("No se pudo eliminar la lista.");
      setDeleting(false);
    }
  };

  // "Copiar lista" y "Copiar equipo": texto para pegar en WhatsApp
  const [copied, setCopied] = useState<"lista" | "equipo" | null>(null);
  const copy = async (what: "lista" | "equipo") => {
    try {
      await navigator.clipboard.writeText(
        what === "lista" ? setlistToWhatsapp(setlist, songs) : teamToWhatsapp(setlist, users),
      );
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  // notas del líder para el equipo: se guardan al salir del cuadro
  const [notesDraft, setNotesDraft] = useState(setlist.notes ?? "");
  const saveNotes = () => {
    if (notesDraft.trim() === (setlist.notes ?? "").trim()) return;
    const notes = notesDraft.trim();
    persist({ ...setlist, ...(notes ? { notes } : { notes: "" }) });
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
          {canDelete ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              aria-label="Eliminar la lista"
              title="Eliminar la lista"
              className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
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

      {/* minmax(0,1fr): sin eso, una canción con nombre largo ensanchaba la columna y la página en celular */}
      {locked ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" /> Esta lista ya se tocó: no se puede modificar ni
          eliminar.
        </p>
      ) : null}

      {canEdit ? (
        <div className="surface-card mb-6 flex flex-wrap items-center gap-3 p-4">
          <label
            htmlFor="fecha-lista"
            className="text-xs font-semibold tracking-widest text-muted-foreground uppercase"
          >
            Fecha y hora
          </label>
          <input
            id="fecha-lista"
            type="datetime-local"
            value={toLocalInput(setlist.date)}
            min={`${localDay(new Date())}T00:00`}
            onChange={(e) => changeDate(e.target.value)}
            className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="surface-card min-w-0 divide-y divide-border/60">
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
          {shown.map(({ item, i }, pos) => {
            const song = songs.find((s) => s.id === item.songId);
            if (!song) return null;
            const sectionTitle = sectionStarts.get(pos);
            return [
              sectionTitle ? (
                <p
                  key={`titulo-${i}`}
                  className="bg-white/[0.02] px-3 pt-3 pb-2 text-sm font-semibold text-primary"
                >
                  {sectionTitle}
                </p>
              ) : null,
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
                  <span className="w-4 text-center text-sm text-muted-foreground">{pos + 1}</span>
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
                {sectioned && canEdit ? (
                  <select
                    value={sectionOf(item, song)}
                    onChange={(e) => changeSection(i, e.target.value as SetlistSection)}
                    aria-label={`Sección de ${song.title}`}
                    className="shrink-0 rounded-lg border border-border bg-secondary px-1.5 py-1 text-xs"
                  >
                    {SECTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                {canEdit ? (
                  <button
                    aria-label="Quitar canción"
                    onClick={() => save(setlist.items.filter((_, idx) => idx !== i))}
                    className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>,
            ];
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
              const u = teamMemberOf(id, setlist, users);
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
                        {"fechaHoraBaja" in u && u.fechaHoraBaja
                          ? "Dado de baja"
                          : "roles" in u
                            ? roleNames(u.roles)
                            : ""}
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
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => removeMember(id)}
                      aria-label={`Sacar a ${u.name} del equipo`}
                      title="Sacar del equipo"
                      className="shrink-0 self-start rounded-full p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {canEdit && addable.length ? (
            <select
              value=""
              onChange={(e) => e.target.value && addMember(e.target.value)}
              aria-label="Agregar un integrante al equipo"
              className="mt-3 w-full rounded-xl border border-dashed border-primary/40 bg-transparent px-3 py-2 text-sm text-primary outline-none focus:border-primary"
            >
              <option value="">+ Agregar integrante…</option>
              {addable.map((u) => (
                <option key={u.id} value={u.id} className="bg-card text-foreground">
                  {u.name}
                </option>
              ))}
            </select>
          ) : null}

          {/* notas para el equipo y "Copiar equipo" (el mensaje que el líder pega en el grupo) */}
          <div className="mt-5 border-t border-border/60 pt-4">
            <label
              htmlFor="notas-equipo"
              className="mb-1.5 block text-xs font-semibold tracking-widest text-muted-foreground uppercase"
            >
              Notas para el equipo
            </label>
            {canEdit ? (
              <textarea
                id="notas-equipo"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                onBlur={saveNotes}
                rows={4}
                maxLength={4000}
                placeholder="Ej.: • Todos debemos estudiar los temas y ensayar."
                className="w-full resize-y rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            ) : setlist.notes ? (
              <p id="notas-equipo" className="text-sm whitespace-pre-wrap text-foreground/85">
                {setlist.notes}
              </p>
            ) : (
              <p id="notas-equipo" className="text-sm text-muted-foreground">
                Sin notas.
              </p>
            )}
            {/* los dos mensajes para WhatsApp, juntos: las canciones y el equipo */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void copy("lista")}
                title="Copiar la lista de canciones para WhatsApp"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold whitespace-nowrap text-primary transition-colors hover:bg-primary/20"
              >
                {copied === "lista" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === "lista" ? "¡Copiado!" : "Copiar canciones"}
              </button>
              <button
                type="button"
                onClick={() => void copy("equipo")}
                title="Copiar el equipo y las notas para WhatsApp"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold whitespace-nowrap text-primary transition-colors hover:bg-primary/20"
              >
                {copied === "equipo" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === "equipo" ? "¡Copiado!" : "Copiar equipo"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
