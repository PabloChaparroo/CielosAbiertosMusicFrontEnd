import { Heart, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/hooks/useApp";
import type { Song, SystemRole } from "@/types";

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

export function RoleBadge({ role }: { role: SystemRole }) {
  const map: Record<SystemRole, { label: string; cls: string }> = {
    admin: { label: "Admin", cls: "bg-primary/15 text-primary border-primary/40" },
    lider: { label: "Líder", cls: "bg-sky/15 text-sky border-sky/40" },
    musico: { label: "Músico", cls: "bg-secondary text-muted-foreground border-border" },
  };
  const it = map[role];
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", it.cls)}>
      {it.label}
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

export function LockedHint({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Lock className="h-3 w-3" /> {children}
    </span>
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
