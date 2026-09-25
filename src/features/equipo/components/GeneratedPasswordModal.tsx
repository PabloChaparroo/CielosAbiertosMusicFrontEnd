import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";

export function GeneratedPasswordModal({
  email,
  password,
  warning,
  title = "Integrante creado",
  onClose,
}: {
  email: string;
  password: string;
  /** Aviso extra, ej. el rol no se pudo asignar */
  warning?: string;
  title?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard no disponible, el usuario puede seleccionar el texto a mano */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 sm:rounded-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-gold text-primary-foreground">
            <KeyRound className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
        </div>

        {warning ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {warning}
          </p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Contraseña generada para <span className="font-medium text-foreground">{email}</span>:
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2.5">
          <code className="flex-1 truncate font-mono text-sm">{password}</code>
          <button
            onClick={() => void copy()}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiada" : "Copiar"}
          </button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Esta contraseña no se vuelve a mostrar. Copiála y comunicásela al integrante ahora — si se
          pierde, vas a tener que restablecerla editando su perfil.
        </p>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-full gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
