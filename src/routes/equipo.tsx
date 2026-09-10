import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Mail, Plus, Users, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState, RoleBadge } from "@/components/common/ui-bits";
import { roleLabels, useApp } from "@/hooks/useApp";
import type { SystemRole, User } from "@/types";

export const Route = createFileRoute("/equipo")({
  head: () => ({
    meta: [
      { title: "Equipo y Roles — Cielos Abiertos" },
      {
        name: "description",
        content: "Miembros del ministerio de música, instrumentos, roles y participación reciente.",
      },
      { property: "og:title", content: "Equipo y Roles — Cielos Abiertos" },
      { property: "og:description", content: "El equipo detrás de cada servicio." },
    ],
  }),
  component: Equipo,
});

function Equipo() {
  const { users, can, addMember, setlists, songs } = useApp();
  const [filter, setFilter] = useState<string>("Todos");
  const [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState(false);

  const instruments = useMemo(
    () => ["Todos", ...new Set(users.flatMap((u) => u.instruments))],
    [users],
  );
  const list = users.filter((u) => filter === "Todos" || u.instruments.includes(filter));
  const member = users.find((u) => u.id === selected);

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
              <RoleBadge role={member.role} />
            </div>
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> {member.email}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              En el ministerio desde {new Date(member.joinedAt).getFullYear()}
            </p>
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
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Equipo y Roles"
      subtitle={`${users.length} miembros del ministerio`}
      actions={
        can("manageTeam") ? (
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Agregar miembro</span>
          </button>
        ) : null
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
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
              className="surface-card flex items-center gap-4 p-5 text-left hover:-translate-y-1 hover:border-primary/40"
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
              </div>
              <RoleBadge role={u.role} />
            </button>
          ))}
        </div>
      )}

      {modal ? <MemberModal onClose={() => setModal(false)} onSave={addMember} /> : null}
    </AppLayout>
  );
}

function MemberModal({ onClose, onSave }: { onClose: () => void; onSave: (u: User) => void }) {
  const [name, setName] = useState("");
  const [ministryRole, setMinistryRole] = useState("Vocalista");
  const [instrument, setInstrument] = useState("Voz");
  const [role, setRole] = useState<SystemRole>("musico");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Agregar miembro</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <input
            className={inputCls}
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Rol en el ministerio"
            value={ministryRole}
            onChange={(e) => setMinistryRole(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Instrumento"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
          />
          <select
            className={inputCls}
            value={role}
            onChange={(e) => setRole(e.target.value as SystemRole)}
          >
            {(Object.keys(roleLabels) as SystemRole[]).map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
            Cancelar
          </button>
          <button
            disabled={!name}
            onClick={() => {
              onSave({
                id: `u${Date.now()}`,
                name,
                role,
                ministryRole,
                instruments: [instrument],
                avatarColor: "linear-gradient(135deg,#f5c76a,#e08b3a)",
                initials: name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase(),
                email: `${name.split(" ")[0]?.toLowerCase()}@cielosabiertos.org`,
                joinedAt: new Date().toISOString().slice(0, 10),
              });
              onClose();
            }}
            className="rounded-full gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";
