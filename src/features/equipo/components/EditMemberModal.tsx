import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/core/auth/useAuth";
import type { User } from "@/types";
import type { Role } from "@/features/roles-permisos/types/role";
import { RolesService } from "@/features/roles-permisos/services/roles.service";
import { EquipoService } from "../services/equipo.service";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

type RolesLoadState = "loading" | "ready" | "error";

export function EditMemberModal({
  member,
  onClose,
  onSaved,
  onRemoved,
}: {
  member: User;
  onClose: () => void;
  onSaved: (user: User) => void;
  onRemoved: (userId: string) => void;
}) {
  const { can } = useAuth();
  const canEditProfile = can("editTeamMember");
  const canManageRoles = can("assignRole") || can("unassignRole");
  const canRemove = can("removeTeamMember");

  const [name, setName] = useState(member.name);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    new Set(member.roles.map((r) => r.id)),
  );

  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [rolesLoadState, setRolesLoadState] = useState<RolesLoadState>("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingBaja, setConfirmingBaja] = useState(false);

  useEffect(() => {
    if (!canManageRoles) return;
    RolesService.listRoles()
      .then((roles) => {
        setAllRoles(roles);
        setRolesLoadState("ready");
      })
      .catch(() => setRolesLoadState("error"));
  }, [canManageRoles]);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      let saved = member;
      if (canEditProfile) {
        saved = await EquipoService.updateMember(member.id, {
          name: name.trim(),
        });
      }
      if (canManageRoles) {
        const currentIds = new Set(member.roles.map((r) => r.id));
        const toAdd = [...selectedRoleIds].filter((id) => !currentIds.has(id));
        const toRemove = [...currentIds].filter((id) => !selectedRoleIds.has(id));
        for (const roleId of toAdd) await EquipoService.assignRole(member.id, roleId);
        for (const roleId of toRemove) await EquipoService.unassignRole(member.id, roleId);
        if (toAdd.length > 0 || toRemove.length > 0) {
          saved = {
            ...saved,
            roles: allRoles.filter((r) => selectedRoleIds.has(r.id)),
          };
        }
      }
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar los cambios");
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    setError(null);
    try {
      await EquipoService.removeMember(member.id);
      onRemoved(member.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo dar de baja al integrante");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Editar integrante</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <input
            className={inputCls}
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEditProfile}
          />

          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Roles del sistema
            </p>
            {!canManageRoles ? (
              <p className="text-xs text-muted-foreground">
                No tenés permiso para asignar o quitar roles.
              </p>
            ) : rolesLoadState === "loading" ? (
              <p className="text-xs text-muted-foreground">Cargando roles…</p>
            ) : rolesLoadState === "error" ? (
              <p className="text-xs text-destructive">No se pudieron cargar los roles.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allRoles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      selectedRoleIds.has(role.id)
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        {canRemove ? (
          <div className="mt-6 border-t border-border pt-4">
            {confirmingBaja ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" /> ¿Dar de baja a {member.name}? No va a poder
                  volver a iniciar sesión.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmingBaja(false)}
                    className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => void handleRemove()}
                    disabled={saving}
                    className="rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-40"
                  >
                    Confirmar baja
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingBaja(true)}
                disabled={saving}
                className="text-xs font-medium text-destructive hover:underline"
              >
                Dar de baja a este integrante
              </button>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            disabled={saving || (!canEditProfile && !canManageRoles)}
            onClick={() => void handleSave()}
            className="rounded-full gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
