import { useMemo, useState } from "react";
import { ArrowLeft, Mail, Pencil, Plus, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState, RoleBadge, Skeletons } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { AddMemberModal } from "../components/AddMemberModal";
import { EditMemberModal } from "../components/EditMemberModal";
import { GeneratedPasswordModal } from "../components/GeneratedPasswordModal";

export function EquipoPage() {
  const { users, usersLoadState, reloadUsers, can, setlists, songs } = useApp();
  const [filter, setFilter] = useState<string>("Todos");
  const [selected, setSelected] = useState<string | null>(null);
  const [showBajas, setShowBajas] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ email: string; password: string } | null>(null);

  const activeUsers = useMemo(() => users.filter((u) => !u.fechaHoraBaja), [users]);
  const visibleUsers = showBajas ? users : activeUsers;

  const instruments = useMemo(
    () => ["Todos", ...new Set(activeUsers.flatMap((u) => u.instruments))],
    [activeUsers],
  );
  const list = visibleUsers.filter((u) => filter === "Todos" || u.instruments.includes(filter));
  const member = users.find((u) => u.id === selected);
  const editingUser = users.find((u) => u.id === editing);

  if (usersLoadState === "loading") {
    return (
      <AppLayout title="Equipo y Roles" subtitle="Administración de accesos">
        <Skeletons rows={6} />
      </AppLayout>
    );
  }

  if (usersLoadState === "error") {
    return (
      <AppLayout title="Equipo y Roles" subtitle="Administración de accesos">
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No se pudo cargar el equipo"
          description="Revisá tu conexión con el servidor e intentá de nuevo."
          action={
            <button
              onClick={reloadUsers}
              className="rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Reintentar
            </button>
          }
        />
      </AppLayout>
    );
  }

  if (member) {
    const participations = setlists.filter((s) => s.teamIds.includes(member.id));
    return (
      <AppLayout title={member.name} subtitle={member.ministryRole}>
        <button
          onClick={() => setSelected(null)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al equipo
        </button>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="surface-card p-6 text-center">
            <div
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-background"
              style={{ backgroundImage: member.avatarColor }}
            >
              {member.initials}
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold">{member.name}</h3>
            <p className="text-sm text-muted-foreground">{member.ministryRole}</p>
            <div className="mt-3 flex justify-center">
              <RoleBadge roles={member.roles} />
            </div>
            {member.fechaHoraBaja ? (
              <p className="mt-2 text-xs font-semibold text-destructive">Dado de baja</p>
            ) : null}
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> {member.email}
            </p>
            {!member.fechaHoraBaja && can("editTeamMember") ? (
              <button
                onClick={() => setEditing(member.id)}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-secondary"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {member.instruments.map((i) => (
                <span key={i} className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {i}
                </span>
              ))}
            </div>
          </div>

          <div className="surface-card p-6">
            <h4 className="mb-4 font-display text-lg font-semibold">Participación reciente</h4>
            {participations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin servicios registrados todavía.</p>
            ) : (
              <ul className="space-y-3">
                {participations.map((s) => (
                  <li key={s.id} className="rounded-xl bg-elevated/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{s.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.date).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {s.items
                        .map((i) => songs.find((so) => so.id === i.songId)?.title)
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {editingUser ? (
          <EditMemberModal
            member={editingUser}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              reloadUsers();
            }}
            onRemoved={() => {
              setEditing(null);
              setSelected(null);
              reloadUsers();
            }}
          />
        ) : null}
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Equipo y Roles"
      subtitle={`${activeUsers.length} miembros del ministerio`}
      actions={
        can("manageTeam") ? (
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Agregar miembro</span>
          </button>
        ) : null
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {instruments.map((i) => (
          <button
            key={i}
            onClick={() => setFilter(i)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              filter === i
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {i}
          </button>
        ))}
        <button
          onClick={() => setShowBajas((v) => !v)}
          className={`ml-auto rounded-full border px-3 py-1.5 text-xs transition-colors ${
            showBajas
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {showBajas ? "Ocultar dados de baja" : "Mostrar dados de baja"}
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Sin miembros"
          description="No hay integrantes con ese instrumento."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelected(u.id)}
              className={`surface-card flex items-center gap-4 p-5 text-left hover:-translate-y-1 hover:border-primary/40 ${
                u.fechaHoraBaja ? "opacity-50" : ""
              }`}
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-background"
                style={{ backgroundImage: u.avatarColor }}
              >
                {u.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{u.name}</p>
                <p className="truncate text-sm text-muted-foreground">{u.ministryRole}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {u.instruments.join(" · ")}
                </p>
                {u.fechaHoraBaja ? (
                  <p className="mt-1 text-[11px] font-semibold text-destructive">Dado de baja</p>
                ) : null}
              </div>
              <RoleBadge roles={u.roles} />
            </button>
          ))}
        </div>
      )}

      {addModal ? (
        <AddMemberModal
          onClose={() => setAddModal(false)}
          onCreated={(user, password) => {
            setAddModal(false);
            reloadUsers();
            setGenerated({ email: user.email, password });
          }}
        />
      ) : null}

      {generated ? (
        <GeneratedPasswordModal
          email={generated.email}
          password={generated.password}
          onClose={() => setGenerated(null)}
        />
      ) : null}
    </AppLayout>
  );
}
