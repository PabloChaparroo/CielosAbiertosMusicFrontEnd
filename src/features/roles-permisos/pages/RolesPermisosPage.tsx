import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { CreateRoleModal } from "../components/CreateRoleModal";
import { RoleCard } from "../components/RoleCard";

export function RolesPermisosPage() {
  const { roles, rolePermissions, addRole, updateRolePermissions, can } = useApp();
  const [modal, setModal] = useState(false);

  if (!can("manageRoles")) {
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

  return (
    <AppLayout
      title="Roles y Permisos"
      subtitle={`${roles.length} roles definidos`}
      actions={
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-full gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
        >
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nuevo rol</span>
        </button>
      }
    >
      <div className="space-y-4">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            grantedPermissions={rolePermissions[role.id] ?? []}
            onSave={(permissions) => updateRolePermissions(role.id, permissions)}
          />
        ))}
      </div>

      {modal ? (
        <CreateRoleModal onClose={() => setModal(false)} onSave={(name) => addRole(name)} />
      ) : null}
    </AppLayout>
  );
}
