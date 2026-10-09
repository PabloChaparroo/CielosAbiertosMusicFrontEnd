import { useState } from "react";
import { Rocket } from "lucide-react";
import { SongsService } from "@/features/canciones/services/songs.service";
import { useApp } from "@/hooks/useApp";
import type { Song } from "@/types";

/**
 * Marca o desmarca la canción como "próxima a sacar" (sale destacada en Inicio). Deja de ser
 * próxima sola cuando una lista de canciones que la tiene pasa al historial (lo calcula la API).
 */
export function ProximaButton({ song }: { song: Song }) {
  const { updateSong } = useApp();
  const [saving, setSaving] = useState(false);
  const active = song.esProxima;

  const toggle = async () => {
    setSaving(true);
    try {
      updateSong(await SongsService.updateSong(song.id, { proximaASacar: !active }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void toggle();
      }}
      disabled={saving}
      aria-pressed={active}
      aria-label={
        active
          ? `Quitar ${song.title} de próximas a sacar`
          : `Marcar ${song.title} como próxima a sacar`
      }
      title={active ? "Próxima a sacar (tocá para quitarla)" : "Marcar como próxima a sacar"}
      className={`rounded-full p-2 transition-colors disabled:opacity-50 ${
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-primary"
      }`}
    >
      <Rocket className="h-3.5 w-3.5" />
    </button>
  );
}
