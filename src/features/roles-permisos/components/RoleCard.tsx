import { useEffect, useState } from "react";
import { ChevronDown, Save } from "lucide-react";
import { actionLabel, resourceLabel } from "@/lib/permissions";
import { RolesService } from "../services/roles.service";
import type { PermissionGroup, Role } from "../types/role";

type LoadState = "idle" | "loading" | "ready" | "error";

export function RoleCard({
  role,
  catalog,
  onSaved,
}: {
  role: Role;
  catalog: PermissionGroup[];
  onSaved: (roleId: string, permissionsCount: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Cada tarjeta pide sus propios permisos al expandirse por primera vez —
  // no hay ningún estado compartido entre tarjetas que guardar una pueda
  // pisarle a otra.
  useEffect(() => {
    if (!expanded || loadState !== "idle") return;
    setLoadState("loading");
    RolesService.getRolePermissions(role.id)
      .then((permissions) => {
        setDraft(new Set(permissions));
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, [expanded, loadState, role.id]);

  const toggle = (permission: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
    setDirty(true);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await RolesService.updateRolePermissions(role.id, [...draft]);
      setDirty(false);
      onSaved(role.id, saved.length);
    } catch {
      setSaveError("No se pudieron guardar los cambios. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface-card overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <div>
          <h3 className="font-display text-lg font-semibold">{role.name}</h3>
          <p className="text-sm text-muted-foreground">
            {role.permissionsCount} {role.permissionsCount === 1 ? "permiso" : "permisos"}
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded ? (
        <div className="border-t border-border/60 p-5">
          {loadState === "loading" ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Cargando permisos…</p>
          ) : loadState === "error" ? (
            <p className="py-6 text-center text-sm text-destructive">
              No se pudieron cargar los permisos de este rol.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {catalog.map((group) => (
                  <div key={group.resource} className="rounded-xl bg-elevated/50 p-3">
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {resourceLabel(group.resource)}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {group.permissions.map((permission) => {
                        const action = permission.split(":")[1] ?? "";
                        return (
                          <label
                            key={permission}
                            className="flex items-center gap-2 text-sm text-foreground/90"
                          >
                            <input
                              type="checkbox"
                              checked={draft.has(permission)}
                              onChange={() => toggle(permission)}
                              className="h-4 w-4 rounded border-border accent-primary"
                            />
                            {actionLabel(action)}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {saveError ? <p className="mt-3 text-sm text-destructive">{saveError}</p> : null}

              <div className="mt-5 flex justify-end">
                <button
                  disabled={!dirty || saving}
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                >
                  <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
