import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Cloud, LogIn } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/core/auth/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-gold text-primary-foreground">
            <Cloud className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold">Cielos Abiertos</p>
            <p className="text-xs tracking-widest text-muted-foreground uppercase">Adoración</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="surface-card space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full gradient-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" /> {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
