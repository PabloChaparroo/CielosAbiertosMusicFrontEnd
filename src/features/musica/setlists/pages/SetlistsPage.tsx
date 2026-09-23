import { useState } from "react";
import { CalendarDays, Plus, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState, Skeletons } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { LockedHint } from "../components/LockedHint";
import { NewSetlistModal } from "../components/NewSetlistModal";
import { SetlistCard } from "../components/SetlistCard";
import { SetlistDetail } from "../components/SetlistDetail";

export function SetlistsPage() {
  const { setlists, setlistsLoadState, can, addSetlist, updateSetlist } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);

  if (setlistsLoadState === "loading") {
    return (
      <AppLayout title="Setlists" subtitle="Servicios, ensayos y eventos especiales">
        <Skeletons rows={4} />
      </AppLayout>
    );
  }

  if (setlistsLoadState === "error") {
    return (
      <AppLayout title="Setlists" subtitle="Servicios, ensayos y eventos especiales">
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="No se pudieron cargar los setlists"
          description="Revisá tu conexión con el servidor e intentá de nuevo recargando la página."
        />
      </AppLayout>
    );
  }

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
        canEdit={can("editSetlist")}
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
}
