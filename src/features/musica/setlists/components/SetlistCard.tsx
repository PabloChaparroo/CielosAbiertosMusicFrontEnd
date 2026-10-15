import { BookmarkPlus, CalendarCheck, CalendarX, UserCheck } from "lucide-react";
import { Avatar } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import type { EventType, Setlist } from "@/types";
import { ListDuration } from "./ListDuration";

const eventColor: Record<EventType, string> = {
  "Culto Domingo a la mañana": "bg-primary/15 text-primary border-primary/40",
  "Culto Domingo a la tarde": "bg-primary/15 text-primary border-primary/40",
  "Culto Miércoles": "bg-primary/15 text-primary border-primary/40",
  "Culto Sábado Jóvenes": "bg-primary/15 text-primary border-primary/40",
  Ensayo: "bg-sky/15 text-sky border-sky/40",
  "Evento Especial": "bg-secondary text-foreground border-border",
};

export function SetlistCard({
  s,
  onClick,
  onToggleUpcoming,
  onSaveTemplate,
  muted,
}: {
  s: Setlist;
  onClick: () => void;
  onToggleUpcoming?: (() => void) | undefined;
  /** Guarda sus canciones como lista predefinida */
  onSaveTemplate?: (() => void) | undefined;
  muted?: boolean;
}) {
  const { users, songs, currentUser } = useApp();
  // el que entra está en el equipo de esta lista: la tarjeta se destaca en dorado
  const assigned = s.teamIds.includes(currentUser.id);
  const myInstruments = s.teamInstruments[currentUser.id] ?? [];
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
      // min-w-0: si no, la línea larga de canciones (truncate) estira la tarjeta y la página en celular
      className={`surface-card relative w-full min-w-0 p-5 text-left hover:-translate-y-1 hover:border-primary/40 ${
        assigned
          ? "border-primary/60 bg-gradient-to-br from-primary/[0.10] to-transparent shadow-[0_0_24px_-8px] shadow-primary/40"
          : ""
      } ${muted && !assigned ? "opacity-80" : ""}`}
    >
      {/* arriba: tipo de evento y botones; abajo, todo a lo ancho (en celulares chicos la columna
          de "N canciones" y los botones dejaban el título y la fecha en una franja angosta) */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`min-w-0 truncate rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${eventColor[s.type]}`}
        >
          {s.type}
        </span>
        <div className="-my-1 -mr-2 flex shrink-0 items-center">
          {onSaveTemplate ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSaveTemplate();
              }}
              title="Guardar como lista predefinida"
              aria-label="Guardar como lista predefinida"
              className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              <BookmarkPlus className="h-4 w-4" />
            </button>
          ) : null}
          {onToggleUpcoming ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleUpcoming();
              }}
              title={s.isUpcoming ? "Sacar de próximas" : "Poner en próximas"}
              aria-label={s.isUpcoming ? "Sacar de próximas" : "Poner en próximas"}
              className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              {s.isUpcoming ? (
                <CalendarX className="h-4 w-4" />
              ) : (
                <CalendarCheck className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>
      </div>
      {assigned ? (
        <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
          <UserCheck className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            Estás asignado{myInstruments.length ? ` · ${myInstruments.join(", ")}` : ""}
          </span>
        </p>
      ) : null}
      <h3 className="mt-2 font-display text-lg font-semibold break-words">{s.title}</h3>
      <p className="text-sm text-muted-foreground first-letter:uppercase">
        {new Date(s.date).toLocaleString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{s.items.length}</span>{" "}
          {s.items.length === 1 ? "canción" : "canciones"}
        </span>
        {/* cuánto dura tocar toda la lista (suma de las secuencias) */}
        <ListDuration
          songs={s.items.flatMap((it) => songs.find((so) => so.id === it.songId) ?? [])}
        />
      </div>
      {/* fotos del equipo; sin equipo no se muestra la fila (ya no va "Lidera …": pedido de Pablo) */}
      {s.teamIds.length ? (
        <div className="mt-4 flex min-w-0 items-center -space-x-2">
          {s.teamIds.map((id) => {
            const u = users.find((x) => x.id === id);
            if (!u) return null;
            return (
              <Avatar
                key={id}
                user={u}
                title={u.name}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card text-[11px] font-bold text-background"
              />
            );
          })}
        </div>
      ) : null}
      <p className="mt-3 truncate text-sm text-muted-foreground">
        {s.items.map((i) => songs.find((so) => so.id === i.songId)?.title).join(" · ")}
      </p>
    </div>
  );
}
