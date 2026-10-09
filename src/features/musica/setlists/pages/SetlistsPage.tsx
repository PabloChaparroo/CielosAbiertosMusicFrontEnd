import { useEffect, useState } from "react";
import {
  BookmarkPlus,
  CalendarDays,
  CalendarPlus,
  ListMusic,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState, Skeletons } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { LockedHint } from "../components/LockedHint";
import { NewSetlistModal } from "../components/NewSetlistModal";
import { SetlistCard } from "../components/SetlistCard";
import { SetlistDetail } from "../components/SetlistDetail";
import {
  SetlistTemplatesService,
  type SetlistTemplate,
} from "../services/setlist-templates.service";
import { matchesSearch } from "@/lib/search";

/** "AAAA-MM-DD" en hora local */
const localDay = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Un setlist pasa al historial el día DESPUÉS de su fecha: el del domingo sigue en Próximos todo
 * el domingo y pasa el lunes.
 */
const isPast = (iso: string) => localDay(new Date(iso)) < localDay(new Date());

export function SetlistsPage() {
  const { setlists, setlistsLoadState, can, addSetlist, updateSetlist, songs } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  // lista predefinida de la que se arma el setlist nuevo (null = desde cero)
  const [fromTemplate, setFromTemplate] = useState<SetlistTemplate | null>(null);
  const [templates, setTemplates] = useState<SetlistTemplate[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    SetlistTemplatesService.listAll()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(id);
  }, [notice]);

  if (setlistsLoadState === "loading") {
    return (
      <AppLayout title="Listas de canciones" subtitle="Servicios, ensayos y eventos especiales">
        <Skeletons rows={4} />
      </AppLayout>
    );
  }

  if (setlistsLoadState === "error") {
    return (
      <AppLayout title="Listas de canciones" subtitle="Servicios, ensayos y eventos especiales">
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="No se pudieron cargar las listas de canciones"
          description="Revisá tu conexión con el servidor e intentá de nuevo recargando la página."
        />
      </AppLayout>
    );
  }

  const createdTime = (setlist: (typeof setlists)[number]) =>
    new Date(setlist.createdAt ?? setlist.date).getTime();
  const sorted = [...setlists].sort((a, b) => createdTime(b) - createdTime(a));
  const upcoming = sorted.filter((s) => s.isUpcoming && !isPast(s.date));
  const past = sorted
    .filter((s) => !s.isUpcoming || isPast(s.date))
    .filter((s) => matchesSearch(query, s.title));

  const toggleUpcoming = (target: (typeof setlists)[number]) => {
    void updateSetlist({ ...target, isUpcoming: !target.isUpcoming });
  };

  const canCreate = can("createSetlist");
  const saveTemplate = async (target: (typeof setlists)[number]) => {
    try {
      const created = await SetlistTemplatesService.create({
        title: target.title,
        items: target.items,
      });
      setTemplates((prev) => [...prev, created].sort((a, b) => a.title.localeCompare(b.title)));
      setNotice(`"${target.title}" se guardó en Listas predefinidas`);
    } catch {
      setNotice("No se pudo guardar la lista predefinida");
    }
  };
  const removeTemplate = async (template: SetlistTemplate) => {
    if (!window.confirm(`¿Eliminar la lista predefinida "${template.title}"?`)) return;
    try {
      await SetlistTemplatesService.remove(template.id);
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    } catch {
      setNotice("No se pudo eliminar la lista predefinida");
    }
  };
  const songTitle = (id: string) => songs.find((so) => so.id === id)?.title;

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
      title="Listas de canciones"
      subtitle="Servicios, ensayos y eventos especiales"
      actions={
        canCreate ? (
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nueva lista</span>
          </button>
        ) : (
          <LockedHint>Solo líderes pueden crear listas de canciones</LockedHint>
        )
      }
    >
      <section className="mb-10">
        <h2 className="mb-4 font-display text-xl font-semibold">Próximos</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="No hay servicios agendados"
            description="Creá la próxima lista de canciones para que el equipo la tenga a mano."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {upcoming.map((s) => (
              <SetlistCard
                key={s.id}
                s={s}
                onClick={() => setSelected(s.id)}
                onToggleUpcoming={() => toggleUpcoming(s)}
                onSaveTemplate={canCreate ? () => void saveTemplate(s) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-1 font-display text-xl font-semibold">Listas predefinidas</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Listas para reutilizar: elegí una y ponele fecha (y equipo, si querés). Para crear una,
          tocá <BookmarkPlus className="inline h-4 w-4 align-text-bottom" /> en una lista de
          canciones.
        </p>
        {templates.length === 0 ? (
          <EmptyState
            icon={<ListMusic className="h-6 w-6" />}
            title="Todavía no hay listas predefinidas"
            description="Guardá una lista de Próximos o del Historial para reutilizarla."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.map((t) => (
              <div key={t.id} className="surface-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-lg font-semibold">{t.title}</h3>
                    <p className="text-xs text-muted-foreground">{t.items.length} canciones</p>
                  </div>
                  {canCreate ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFromTemplate(t);
                          setModal(true);
                        }}
                        className="flex items-center gap-1.5 rounded-full gradient-gold px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" /> Ponerle fecha
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeTemplate(t)}
                        aria-label={`Eliminar ${t.title}`}
                        className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="mt-3 truncate text-sm text-muted-foreground">
                  {t.items
                    .map((i) => songTitle(i.songId))
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
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
            <SetlistCard
              key={s.id}
              s={s}
              onClick={() => setSelected(s.id)}
              // ya pasó la fecha: no puede volver a Próximos
              onToggleUpcoming={isPast(s.date) ? undefined : () => toggleUpcoming(s)}
              onSaveTemplate={canCreate ? () => void saveTemplate(s) : undefined}
              muted
            />
          ))}
        </div>
      </section>

      {notice ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 animate-in rounded-full border border-border bg-card px-4 py-2 text-sm shadow-lg fade-in">
          {notice}
        </div>
      ) : null}

      {modal ? (
        <NewSetlistModal
          initial={fromTemplate ?? undefined}
          onClose={() => {
            setModal(false);
            setFromTemplate(null);
          }}
          onSave={(s) => {
            addSetlist(s);
            setModal(false);
            setFromTemplate(null);
          }}
        />
      ) : null}
    </AppLayout>
  );
}
