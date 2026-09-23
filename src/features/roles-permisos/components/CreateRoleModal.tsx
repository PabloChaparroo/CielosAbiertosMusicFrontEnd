import { useState } from "react";
import { X } from "lucide-react";

export function CreateRoleModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Nuevo rol</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del rol, ej. Sonidista"
          className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Arranca sin permisos — se le otorgan desde la tarjeta una vez creado.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            disabled={!name.trim()}
            onClick={() => {
              onSave(name.trim());
              onClose();
            }}
            className="rounded-full gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Crear rol
          </button>
        </div>
      </div>
    </div>
  );
}
