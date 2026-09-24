import { Avatar } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import type { EventType, Setlist } from "@/types";

const eventColor: Record<EventType, string> = {
  "Culto Domingo": "bg-primary/15 text-primary border-primary/40",
  Ensayo: "bg-sky/15 text-sky border-sky/40",
  "Evento Especial": "bg-secondary text-foreground border-border",
};

export function SetlistCard({
  s,
  onClick,
  muted,
}: {
  s: Setlist;
  onClick: () => void;
  muted?: boolean;
}) {
  const { users, songs } = useApp();
  const leader = users.find((u) => u.id === s.leaderId);
  return (
    <button
      onClick={onClick}
      className={`surface-card w-full p-5 text-left hover:-translate-y-1 hover:border-primary/40 ${muted ? "opacity-80" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${eventColor[s.type]}`}
          >
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
            <Avatar
              key={id}
              user={u}
              title={u.name}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card text-[11px] font-bold text-background"
            />
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
