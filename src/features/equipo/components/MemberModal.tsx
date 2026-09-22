import { useState } from "react";
import { X } from "lucide-react";
import { roleLabels } from "@/hooks/useApp";
import type { SystemRole, User } from "@/types";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

export function MemberModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (u: User) => void;
}) {
  const [name, setName] = useState("");
  const [ministryRole, setMinistryRole] = useState("Vocalista");
  const [instrument, setInstrument] = useState("Voz");
  const [role, setRole] = useState<SystemRole>("musico");

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
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
          >
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
