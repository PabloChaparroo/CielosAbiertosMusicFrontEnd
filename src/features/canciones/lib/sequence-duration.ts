import { useEffect, useState } from "react";
import { StorageClient } from "@/lib/storage-client";
import { AudioTracksService } from "@/features/canciones/services/audio-tracks.service";
import type { Song } from "@/types";
import { readAudioDuration } from "./audio-duration";

/**
 * Duración real de una canción = la de su secuencia (pedido de Pablo: muchas se acortan respecto
 * del original, así que la duración del video de YouTube no sirve). Secuencia = el audio
 * principal o, si no hay, la primera pista. Se lee de los metadatos del archivo (sin bajarlo
 * entero) y se recuerda por key: el archivo de una key no cambia, así que no hace falta leerlo
 * de nuevo (en memoria y en este navegador).
 */
const CACHE_PREFIX = "duracion-audio:";
const memory = new Map<string, number | null>();
const inFlight = new Map<string, Promise<number | null>>();

function cached(key: string): number | null | undefined {
  if (memory.has(key)) return memory.get(key);
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (stored !== null) {
      const seconds = Number(stored);
      memory.set(key, seconds);
      return seconds;
    }
  } catch {
    // sin almacenamiento local: solo queda en memoria
  }
  return undefined;
}

/** Duración en segundos del audio de esa key (null si no se pudo leer) */
export function durationOfAudio(key: string): Promise<number | null> {
  const hit = cached(key);
  if (hit !== undefined) return Promise.resolve(hit);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const promise = StorageClient.getDownloadUrl(key)
    .then(({ url }) => readAudioDuration(url))
    .catch(() => null)
    .then((seconds) => {
      inFlight.delete(key);
      // si falló no se guarda: se vuelve a intentar la próxima vez
      if (seconds !== null) {
        memory.set(key, seconds);
        try {
          localStorage.setItem(CACHE_PREFIX + key, String(seconds));
        } catch {
          // sin almacenamiento local
        }
      }
      return seconds;
    });
  inFlight.set(key, promise);
  return promise;
}

/** Duración de la secuencia de la canción (audio principal, si no la primera pista), o null */
export async function sequenceDuration(song: Song): Promise<number | null> {
  if (song.audioKey) return durationOfAudio(song.audioKey);
  if (song.trackCount === 0) return null;
  const tracks = await AudioTracksService.listBySong(song.id).catch(() => []);
  const first = [...tracks].sort((a, b) => a.order - b.order)[0];
  return first ? durationOfAudio(first.audioKey) : null;
}

/**
 * Duración total aproximada de una lista de canciones: la suma de sus secuencias.
 * `missing` = canciones de las que no se pudo saber (sin audio, o no se pudo leer).
 */
export function useListDuration(songs: Song[]): {
  seconds: number;
  missing: number;
  loading: boolean;
} {
  const ids = songs.map((s) => `${s.id}:${s.audioKey ?? ""}:${s.trackCount}`).join(",");
  const [state, setState] = useState({ seconds: 0, missing: 0, loading: songs.length > 0 });
  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: songs.length > 0 }));
    void Promise.all(songs.map(sequenceDuration)).then((durations) => {
      if (cancelled) return;
      setState({
        seconds: durations.reduce<number>((sum, d) => sum + (d ?? 0), 0),
        missing: durations.filter((d) => d === null).length,
        loading: false,
      });
    });
    return () => {
      cancelled = true;
    };
    // `ids` resume las canciones (y sus audios): recalcula solo si cambian
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return state;
}

/** 1110 → "19 min"; 4020 → "1 h 07 min" */
export function formatListDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}
