import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@/hooks/useApp";
import { EquipoService } from "../services/equipo.service";
import { avatarColorFor, generatePassword, initialsFor } from "../lib/generate-password";
import type { User } from "@/types";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

export function AddMemberModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: User, password: string) => void;
}) {
  const { users } = useApp();
  // Desplegable con los roles de ministerio que ya existen en el equipo —
  // no un catálogo fijo, se arma de lo que ya está cargado. Solo de
  // integrantes activos (mismo criterio que el filtro de instrumentos de
  // EquipoPage) para no arrastrar valores de cuentas dadas de baja.
  const ministryRoleOptions = useMemo(
    () =>
      [...new Set(users.filter((u) => !u.fechaHoraBaja).map((u) => u.ministryRole))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [users],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ministryRole, setMinistryRole] = useState(
    ministryRoleOptions.includes("Vocalista") ? "Vocalista" : (ministryRoleOptions[0] ?? ""),
  );
  const [instrument, setInstrument] = useState("Voz");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim() !== "" && email.trim() !== "" && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const password = generatePassword();
    try {
      const created = await EquipoService.createMember({
        email: email.trim(),
        password,
        name: name.trim(),
        ministryRole,
        instruments: [instrument],
        avatarColor: avatarColorFor(name.trim()),
        initials: initialsFor(name.trim()),
      });
      onCreated(created, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el integrante");
      setSaving(false);
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
          <select
            className={inputCls}
            value={ministryRole}
            onChange={(e) => setMinistryRole(e.target.value)}
          >
            {ministryRoleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            placeholder="Instrumento"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            La contraseña inicial se genera automáticamente y se muestra una única vez al crear el
            integrante. Los roles del sistema se asignan después, desde su perfil.
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
