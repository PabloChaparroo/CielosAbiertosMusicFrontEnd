import { useState } from "react";
import { createPortal } from "react-dom";
import { Rocket } from "lucide-react";
import { SongsService } from "@/features/canciones/services/songs.service";
import { useApp } from "@/hooks/useApp";
import type { Song } from "@/types";

/**
 * Marca o desmarca la canción como "próxima a sacar" (sale destacada en Inicio), con un modal de
 * confirmación. Deja de ser próxima sola cuando una lista de canciones que la tiene pasa al
 * historial (lo calcula la API).
 */
export function ProximaButton({ song }: { song: Song }) {
  const { updateSong } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = song.esProxima;

  const toggle = async () => {
    setSaving(true);
    setError(null);
    try {
      updateSong(await SongsService.updateSong(song.id, { proximaASacar: !active }));
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setError(null);
          setConfirming(true);
        }}
        aria-pressed={active}
        aria-label={
          active
            ? `Quitar ${song.title} de próximas a sacar`
            : `Marcar ${song.title} como próxima a sacar`
        }
        title={active ? "Próxima a sacar (tocá para quitarla)" : "Marcar como próxima a sacar"}
        className={`rounded-full p-2 transition-colors ${
          active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-primary"
        }`}
      >
        <Rocket className="h-3.5 w-3.5" />
      </button>

      {/* portal: las tarjetas de celular tienen transform, y un fixed adentro quedaría atrapado */}
      {confirming
        ? createPortal(
            <div
              className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
              role="dialog"
              aria-modal="true"
              aria-label={active ? "Quitar de próximas a sacar" : "Marcar como próxima a sacar"}
              // dentro de una fila que reproduce al tocarla: nada de acá llega a la fila
              onClick={(e) => {
                e.stopPropagation();
                if (e.target === e.currentTarget && !saving) setConfirming(false);
              }}
            >
              <div className="w-full max-w-sm animate-in fade-in-0 zoom-in-95 rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl">
                <div className="mb-4 flex items-start gap-3">
                  <div className="rounded-full bg-primary/15 p-2 text-primary">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold">
                      {active ? "Quitar de próximas a sacar" : "Próxima a sacar"}
                    </h2>
                    <p className="truncate text-sm text-muted-foreground">
                      {song.title} · {song.artist}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {active
                    ? "Deja de aparecer destacada en Inicio."
                    : "Va a aparecer destacada en Inicio hasta que se toque en una lista de canciones que pase al historial."}
                </p>
                {error ? (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={saving}
                    className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggle()}
                    disabled={saving}
                    autoFocus
                    className="flex items-center gap-2 rounded-full gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    <Rocket className="h-4 w-4" />
                    {saving ? "Guardando…" : active ? "Quitar" : "Marcar"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
