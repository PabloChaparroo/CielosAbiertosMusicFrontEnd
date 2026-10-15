import { Clock } from "lucide-react";
import { formatListDuration, useListDuration } from "@/features/canciones/lib/sequence-duration";
import type { Song } from "@/types";

/**
 * "≈ 24 min": cuánto dura tocar la lista entera. De cada canción, la duración del primer track; si
 * no tiene, la del audio principal; si tampoco, la del video de YouTube (ver `sequenceDuration`).
 * Si de alguna canción no se pudo saber, lo aclara.
 */
export function ListDuration({ songs, className = "" }: { songs: Song[]; className?: string }) {
  const { seconds, missing, loading } = useListDuration(songs);
  if (songs.length === 0) return null;

  const known = songs.length - missing;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground ${className}`}
      title={
        missing
          ? `Suma de las duraciones. ${missing} ${missing === 1 ? "canción no tiene" : "canciones no tienen"} audio ni video para medir.`
          : "Suma de las duraciones: el primer track de cada canción o, si no tiene, el video de YouTube"
      }
    >
      <Clock className="h-3.5 w-3.5 text-primary" />
      {loading ? (
        "Calculando…"
      ) : known === 0 ? (
        "Sin duración"
      ) : (
        <>
          <span className="font-semibold text-foreground">≈ {formatListDuration(seconds)}</span>
          {missing ? <span>(sin {missing})</span> : null}
        </>
      )}
    </span>
  );
}
