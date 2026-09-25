import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Cloud, Eye, EyeOff, LogIn, UserRound } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/core/auth/useAuth";

export function LoginPage() {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Completá email y contraseña para ingresar.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  // Sin usuario ni contraseña: solo lectura (canciones, letras, acordes e inicio)
  const handleGuest = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginAsGuest();
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo entrar como invitado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="gradient-sky pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background to-background" />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          <div className="glow flex h-16 w-16 items-center justify-center rounded-2xl gradient-gold text-primary-foreground">
            <Cloud className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Cielos <span className="text-gradient-gold">Abiertos</span>
            </h1>
            <p className="mt-1 text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Ministerio de Adoración
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="surface-card space-y-5 p-6 sm:p-8">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@cielosabiertos.org"
              className="w-full rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-secondary py-2.5 pr-11 pl-3.5 text-sm outline-none transition-colors focus:border-primary/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
                className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full gradient-gold px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-60 disabled:hover:scale-100"
          >
            <LogIn className="h-4 w-4" /> {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void handleGuest()}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
        >
          <UserRound className="h-4 w-4" /> Entrar como invitado
        </button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          El equipo de adoración ingresa con su cuenta. Como invitado podés ver las canciones,
          letras y acordes.
        </p>
      </div>
    </div>
  );
}
