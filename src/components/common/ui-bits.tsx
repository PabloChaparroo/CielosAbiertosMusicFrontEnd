import { Heart } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/hooks/useApp";
import { StorageClient } from "@/lib/storage-client";
import type { Song, UserRole } from "@/types";

/**
 * Cache en memoria de URLs firmadas ya resueltas, por avatarKey. Cada
 * subida de foto genera un avatarKey nuevo (randomUUID en el backend, igual
 * que audioKey/lyricsImageKey) — nunca se reusa el mismo key sobreescribiendo
 * el archivo — así que esta cache nunca queda desactualizada: si cambia la
 * foto, cambia la key, y la entrada vieja del Map simplemente deja de
 * referenciarse (no hace falta invalidarla a mano). Evita repetir el pedido
 * de URL firmada para el mismo avatar en cada componente que lo muestre
 * dentro de la misma sesión (dura 1h del lado del storage).
 */
const avatarUrlCache = new Map<string, string>();

/**
 * Componente compartido para no repetir la lógica de "resolver URL firmada
 * o caer al círculo de color+iniciales" en cada lugar que muestra un
 * avatar (Sidebar, Equipo, autoría de anotaciones, equipo de un setlist).
 * El `className` lo controla el caller (tamaño, borde, tipografía) — se
 * aplica igual tanto al círculo de iniciales como a la imagen real.
 */
export function Avatar({
  user,
  className,
  title,
}: {
  user: { avatarKey?: string | null; avatarColor: string; initials: string; name?: string };
  className: string;
  title?: string;
}) {
  const [url, setUrl] = useState<string | null>(
    user.avatarKey ? (avatarUrlCache.get(user.avatarKey) ?? null) : null,
  );

  useEffect(() => {
    if (!user.avatarKey) {
      setUrl(null);
      return;
    }
    const cached = avatarUrlCache.get(user.avatarKey);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    StorageClient.getDownloadUrl(user.avatarKey)
      .then((res) => {
        avatarUrlCache.set(user.avatarKey!, res.url);
        if (!cancelled) setUrl(res.url);
      })
      .catch(() => {
        /* sin foto real disponible; se queda con el círculo de color+iniciales */
      });
    return () => {
      cancelled = true;
    };
  }, [user.avatarKey]);

  if (url) {
    return (
      <img
        src={url}
        alt={user.name ? `Foto de ${user.name}` : "Foto de perfil"}
        title={title}
        className={cn(className, "object-cover")}
      />
    );
  }

  return (
    <div className={className} style={{ backgroundImage: user.avatarColor }} title={title}>
      {user.initials}
    </div>
  );
}

export function Cover({
  song,
  size = "md",
  className,
}: {
  song: Song;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "h-11 w-11", md: "h-14 w-14", lg: "h-full w-full aspect-square" };
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-lg shadow-[0_8px_24px_-12px_rgba(0,0,0,.9)]",
        sizes[size],
        className,
      )}
      style={{ backgroundImage: song.cover }}
      aria-hidden
    />
  );
}

export function TagChip({ tag, active }: { tag: string; active?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border bg-secondary/60 text-muted-foreground",
      )}
    >
      {tag}
    </span>
  );
}

export function FavButton({ songId, className }: { songId: string; className?: string }) {
  const { favorites, toggleFavorite } = useApp();
  const active = favorites.includes(songId);
  return (
    <button
      type="button"
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavorite(songId);
      }}
      className={cn(
        "rounded-full p-2 text-muted-foreground transition-all hover:scale-110 hover:bg-secondary hover:text-foreground",
        active && "text-primary hover:text-primary",
        className,
      )}
    >
      <Heart className="h-4 w-4" fill={active ? "currentColor" : "none"} />
    </button>
  );
}

/**
 * Roles ahora son dinámicos (creados/renombrados desde Roles y Permisos), no
 * un enum fijo — el color no puede salir de un mapa cerrado por nombre. Se
 * elige por hash del nombre sobre una paleta fija, así cada rol tiene un
 * color estable entre renders sin necesitar tocar este componente cada vez
 * que se crea un rol nuevo.
 */
const BADGE_PALETTE = [
  "bg-primary/15 text-primary border-primary/40",
  "bg-sky/15 text-sky border-sky/40",
  "bg-secondary text-muted-foreground border-border",
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/40",
];

function paletteClassFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return BADGE_PALETTE[hash % BADGE_PALETTE.length]!;
}

export function RoleBadge({ roles }: { roles: UserRole[] }) {
  if (roles.length === 0) {
    return (
      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
        Sin rol
      </span>
    );
  }
  return (
    <span className="flex flex-wrap justify-end gap-1">
      {roles.map((r) => (
        <span
          key={r.id}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
            paletteClassFor(r.name),
          )}
        >
          {r.name}
        </span>
      ))}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeletons({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl bg-card/60 p-3">
          <div className="h-12 w-12 animate-pulse rounded-lg bg-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
            <div className="h-3 w-1/5 animate-pulse rounded bg-secondary/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
