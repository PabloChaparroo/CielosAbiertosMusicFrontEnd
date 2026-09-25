import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/core/auth/useAuth";
import { GUEST_ROLE_NAME } from "@/core/auth/guest";
import type { Role } from "@/features/roles-permisos/types/role";
import { RolesService } from "@/features/roles-permisos/services/roles.service";
import { EquipoService } from "../services/equipo.service";
import { avatarColorFor, generatePassword, initialsFor } from "../lib/generate-password";
import type { User } from "@/types";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

type RolesLoadState = "loading" | "ready" | "error";

export function AddMemberModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  /** `roleWarning`: el integrante se creó pero no se le pudo asignar el rol elegido */
  onCreated: (user: User, password: string, roleWarning?: string) => void;
}) {
  const { can } = useAuth();
  // Asignar un rol se gobierna con rol:write (no equipo:write), igual que en Editar:
  // sin ese permiso no se muestra el desplegable y el integrante nace sin rol.
  const canAssignRole = can("assignRole");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoadState, setRolesLoadState] = useState<RolesLoadState>("loading");
  // "" = sin rol
  const [roleId, setRoleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canAssignRole) return;
    RolesService.listRoles()
      .then((list) => {
        // el rol Invitado es para el acceso sin cuenta: no se asigna a integrantes
        const sorted = list
          .filter((r) => r.name !== GUEST_ROLE_NAME)
          .sort((a, b) => a.name.localeCompare(b.name));
        setRoles(sorted);
        setRoleId(sorted.find((r) => r.name === "Músico")?.id ?? "");
        setRolesLoadState("ready");
      })
      .catch(() => setRolesLoadState("error"));
  }, [canAssignRole]);

  const canSave = name.trim() !== "" && email.trim() !== "" && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const password = generatePassword();
    let created: User;
    try {
      created = await EquipoService.createMember({
        email: email.trim(),
        password,
        name: name.trim(),
        avatarColor: avatarColorFor(name.trim()),
        initials: initialsFor(name.trim()),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el integrante");
      setSaving(false);
      return;
    }

    // El integrante ya existe: aunque falle la asignación del rol, hay que mostrar la
    // contraseña generada (es la única vez que se ve) y avisar que el rol quedó pendiente.
    if (!roleId) {
      onCreated(created, password);
      return;
    }
    try {
      await EquipoService.assignRole(created.id, roleId);
      const role = roles.find((r) => r.id === roleId);
      onCreated({ ...created, roles: role ? [{ id: role.id, name: role.name }] : [] }, password);
    } catch {
      onCreated(
        created,
        password,
        "No se pudo asignar el rol elegido — asignáselo desde Editar integrante.",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Agregar miembro</h2>
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
          />
          <input
            className={inputCls}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {canAssignRole ? (
            rolesLoadState === "error" ? (
              <p className="text-xs text-destructive">
                No se pudieron cargar los roles — el integrante se crea sin rol.
              </p>
            ) : (
              <select
                aria-label="Rol"
                className={inputCls}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={rolesLoadState === "loading"}
              >
                <option value="">
                  {rolesLoadState === "loading" ? "Cargando roles…" : "Sin rol"}
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            )
          ) : null}
          <p className="text-xs text-muted-foreground">
            La contraseña inicial se genera automáticamente y se muestra una única vez al crear el
            integrante. El rol se puede cambiar o quitar después, desde Editar integrante.
          </p>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            disabled={!canSave}
            onClick={() => void handleSave()}
            className="rounded-full gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {saving ? "Creando…" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}
