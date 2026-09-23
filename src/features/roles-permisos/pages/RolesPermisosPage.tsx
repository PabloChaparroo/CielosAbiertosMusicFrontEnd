import { useEffect, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/common/ui-bits";
import { useAuth } from "@/core/auth/useAuth";
import { CreateRoleModal } from "../components/CreateRoleModal";
import { RoleCard } from "../components/RoleCard";
import { RolesService } from "../services/roles.service";
import type { PermissionGroup, Role } from "../types/role";

type LoadState = "loading" | "ready" | "error";

export function RolesPermisosPage() {
  const { can } = useAuth();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<PermissionGroup[]>([]);
  const [modal, setModal] = useState(false);

  const allowed = can("manageRoles");

  useEffect(() => {
    if (!allowed) return;
    setLoadState("loading");
    Promise.all([RolesService.listRoles(), RolesService.listPermissionCatalog()])
      .then(([rolesRes, catalogRes]) => {
        setRoles(rolesRes);
        setCatalog(catalogRes);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, [allowed]);

  if (!allowed) {
    return (
      <AppLayout title="Roles y Permisos" subtitle="Administración de accesos">
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title="Sección restringida"
          description="Solo un administrador puede gestionar roles y permisos."
        />
      </AppLayout>
    );
  }

  const handleRoleSaved = (roleId: string, permissionsCount: number) => {
    setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, permissionsCount } : r)));
  };

  const handleCreateRole = async (name: string) => {
    const created = await RolesService.createRole(name);
    setRoles((prev) => [...prev, { ...created, permissionsCount: 0 }]);
  };

  return (
    <AppLayout
      title="Roles y Permisos"
      subtitle={
        loadState === "ready" ? `${roles.length} roles definidos` : "Administración de accesos"
      }
      actions={
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
        >
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nuevo rol</span>
        </button>
      }
    >
      {loadState === "loading" ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[70px] animate-pulse rounded-2xl bg-card/60" />
          ))}
        </div>
      ) : loadState === "error" ? (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title="No se pudieron cargar los roles"
          description="Revisá tu conexión con el servidor e intentá de nuevo recargando la página."
        />
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} catalog={catalog} onSaved={handleRoleSaved} />
          ))}
        </div>
      )}

      {modal ? <CreateRoleModal onClose={() => setModal(false)} onSave={handleCreateRole} /> : null}
    </AppLayout>
  );
}
