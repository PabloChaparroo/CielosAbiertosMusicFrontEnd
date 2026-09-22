import { Lock } from "lucide-react";

export function LockedHint({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Lock className="h-3 w-3" /> {children}
    </span>
  );
}
