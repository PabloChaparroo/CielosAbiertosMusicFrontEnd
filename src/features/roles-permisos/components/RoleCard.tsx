import { useEffect, useState } from "react";
import { ChevronDown, Save } from "lucide-react";
import { actionLabels, PERMISSION_CATALOG, resourceLabels } from "@/lib/permissions";
import type { Role } from "@/types";

export function RoleCard({
  role,
  grantedPermissions,
  onSave,
}: {
  role: Role;
  grantedPermissions: string[];
  onSave: (permissions: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set(grantedPermissions));
  const [dirty, setDirty] = useState(false);

  // Si cambian los permisos guardados del rol desde afuera (ej. otra pestaña
  // del mock), resetea el borrador — nunca mientras el usuario está editando.
  useEffect(() => {
    if (!dirty) setDraft(new Set(grantedPermissions));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantedPermissions]);

  const toggle = (permission: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
    setDirty(true);
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
            {grantedPermissions.length} {grantedPermissions.length === 1 ? "permiso" : "permisos"}
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded ? (
        <div className="border-t border-border/60 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {PERMISSION_CATALOG.map((group) => (
              <div key={group.resource} className="rounded-xl bg-elevated/50 p-3">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {resourceLabels[group.resource]}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {group.permissions.map((permission) => {
                    const action = permission.split(":")[1] as keyof typeof actionLabels;
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
                        {actionLabels[action]}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              disabled={!dirty}
              onClick={() => {
                onSave([...draft]);
                setDirty(false);
              }}
              className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Save className="h-4 w-4" /> Guardar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
