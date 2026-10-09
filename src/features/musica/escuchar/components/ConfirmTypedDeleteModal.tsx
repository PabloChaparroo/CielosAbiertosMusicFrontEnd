import { useState, type ReactNode } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

/**
 * Confirmación de un borrado definitivo escribiendo un nombre, igual que al eliminar una canción
 * (`DeleteSongModal`): el botón se habilita recién cuando el texto coincide exacto.
 */
export function ConfirmTypedDeleteModal({
  title,
  confirmText,
  confirmLabel,
  children,
  onConfirm,
  onClose,
}: {
  title: string;
  /** Lo que hay que escribir para confirmar */
  confirmText: string;
  /** "Para confirmar, escribí …:" */
  confirmLabel: string;
  /** Qué se va a borrar */
  children: ReactNode;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim() === confirmText.trim();

  const handleDelete = async () => {
    if (!matches || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-full bg-destructive/15 p-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
          </div>
        </div>

        <div className="text-sm">{children}</div>

        <label className="mt-5 block text-sm">
          Para confirmar, escribí {confirmLabel}:
          <span className="mt-1 block font-mono text-xs text-muted-foreground select-all">
            {confirmText}
          </span>
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleDelete();
              if (e.key === "Escape") onClose();
            }}
            aria-label="Nombre para confirmar"
            className="mt-2 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:border-destructive/60"
          />
        </label>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={!matches || deleting}
            className="flex items-center gap-2 rounded-full bg-destructive px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Eliminando…" : "Eliminar definitivamente"}
          </button>
        </div>
      </div>
    </div>
  );
}
