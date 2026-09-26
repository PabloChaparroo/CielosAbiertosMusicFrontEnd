import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Music, Upload, X } from "lucide-react";
import { TagChip } from "@/components/common/ui-bits";
import { KEYS } from "@/lib/chords";
import { StorageClient } from "@/lib/storage-client";
import { SongsService, type TipoCancion } from "@/features/canciones/services/songs.service";
import { validateAudioFile } from "@/features/canciones/lib/audio-validation";
import { readAudioDuration, readFileDuration } from "@/features/canciones/lib/audio-duration";
import type { Song, Tag } from "@/types";

const COVER_PALETTE = [
  "linear-gradient(135deg,#1e3a8a,#7c3aed)",
  "linear-gradient(135deg,#b45309,#f59e0b)",
  "linear-gradient(135deg,#0f766e,#22d3ee)",
  "linear-gradient(135deg,#831843,#f472b6)",
  "linear-gradient(135deg,#4c1d95,#2563eb)",
  "linear-gradient(135deg,#7c2d12,#ea580c)",
  "linear-gradient(135deg,#064e3b,#84cc16)",
];

function coverFor(title: string): string {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COVER_PALETTE[hash % COVER_PALETTE.length]!;
}

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      {children}
      {help ? <p className="mt-1 text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}

export function UploadModal({
  song,
  onClose,
  onSave,
}: {
  /** Si viene, el modal edita esta canción (precarga + PATCH) en vez de crear una nueva. */
  song?: Song;
  onClose: () => void;
  onSave: (s: Song) => void;
}) {
  const isEdit = song !== undefined;
  const [title, setTitle] = useState(song?.title ?? "");
  const [artist, setArtist] = useState(song?.artist ?? "");
  const [key, setKey] = useState(song?.key ?? "G");
  const [bpm, setBpm] = useState(song?.bpm ?? 80);
  const [compas, setCompas] = useState(song?.compas ?? "4/4");
  const [durationMinutes, setDurationMinutes] = useState(Math.floor((song?.duration ?? 240) / 60));
  const [durationSeconds, setDurationSeconds] = useState((song?.duration ?? 240) % 60);
  const [chordpro, setChordpro] = useState(
    song?.chordpro ?? "{estrofa 1}\n[G]Nueva canción del minis[D]terio",
  );
  const [tags, setTags] = useState<Tag[]>(song?.tags ?? []);
  // tipo obligatorio: en alta arranca sin elegir, para que se decida a propósito
  const [tipoId, setTipoId] = useState(song?.tipoId ?? "");
  const [tipos, setTipos] = useState<TipoCancion[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  useEffect(() => {
    SongsService.listTags()
      .then(setAllTags)
      .catch(() => setAllTags([]));
  }, []);
  useEffect(() => {
    SongsService.listTipos()
      .then(setTipos)
      .catch(() => setTipos([]));
  }, []);
  // true = la duración actual se leyó del archivo de audio (cambia el texto de ayuda)
  const [durationFromAudio, setDurationFromAudio] = useState(false);
  // si el usuario ya tocó la duración a mano, la lectura del audio existente no la pisa
  const durationTouchedRef = useRef(false);
  // descarta lecturas viejas si se elige otro archivo antes de que termine la anterior
  const durationRequestRef = useRef(0);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const uploading = uploadPct !== null;

  // Si se cierra el modal (o se desmonta navegando a otra pantalla) a mitad
  // de una subida, se cancela — nunca sigue en segundo plano. El audioKey
  // recién se manda al backend después de que la subida terminó con éxito,
  // así que cancelar nunca deja una canción con un audio a medio subir.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const applyAudioDuration = (seconds: number | null, requestId: number) => {
    if (seconds === null || requestId !== durationRequestRef.current) return;
    setDurationMinutes(Math.floor(seconds / 60));
    setDurationSeconds(seconds % 60);
    setDurationFromAudio(true);
  };

  // Canción que ya tiene audio: completa la duración con la real del archivo
  useEffect(() => {
    if (!song?.audioKey) return;
    const requestId = ++durationRequestRef.current;
    StorageClient.getDownloadUrl(song.audioKey)
      .then(({ url }) => readAudioDuration(url))
      .then((seconds) => {
        if (!durationTouchedRef.current) applyAudioDuration(seconds, requestId);
      })
      .catch(() => {
        // sin duración automática: queda la cargada a mano
      });
    // solo al abrir el modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDurationChange = (setter: (value: number) => void, value: string) => {
    durationTouchedRef.current = true;
    setDurationFromAudio(false);
    setter(Number(value) || 0);
  };

  const handleClose = () => {
    if (uploading) abortRef.current?.abort();
    onClose();
  };

  const handleFileChange = (file: File | null) => {
    setFileError(null);
    if (!file) {
      setAudioFile(null);
      return;
    }
    const validationError = validateAudioFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }
    setAudioFile(file);
    const requestId = ++durationRequestRef.current;
    void readFileDuration(file).then((seconds) => applyAudioDuration(seconds, requestId));
  };

  const canSave =
    title.trim() !== "" &&
    artist.trim() !== "" &&
    chordpro.trim() !== "" &&
    tipoId !== "" &&
    !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      let audioKey = song?.audioKey ?? undefined;

      if (audioFile) {
        const { uploadUrl, key: newKey } = await StorageClient.getUploadUrl(
          "audios",
          audioFile.type,
        );
        const controller = new AbortController();
        abortRef.current = controller;
        setUploadPct(0);
        await StorageClient.uploadFileWithProgress(
          uploadUrl,
          audioFile,
          audioFile.type,
          setUploadPct,
          controller.signal,
        );
        setUploadPct(null);
        audioKey = newKey;
      }

      const dto = {
        title: title.trim(),
        artist: artist.trim(),
        key,
        bpm,
        compas,
        duration: durationMinutes * 60 + durationSeconds,
        cover: isEdit ? (song?.cover ?? coverFor(title.trim())) : coverFor(title.trim()),
        chordpro,
        tags: tags.length ? tags : (["Adoración"] as Tag[]),
        tipoId,
        ...(audioKey ? { audioKey } : {}),
      };

      const saved = isEdit
        ? await SongsService.updateSong(song!.id, dto)
        : await SongsService.createSong(dto);
      onSave(saved);
      onClose();
    } catch (e) {
      setUploadPct(null);
      if (e instanceof DOMException && e.name === "AbortError") {
        // Cancelado a propósito por el usuario (cerró el modal a mitad de
        // subida) — no es un error que haya que mostrar.
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo guardar la canción");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg animate-in slide-in-from-bottom-6 overflow-y-auto rounded-t-3xl border border-border bg-card p-6 sm:max-h-[85vh] sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">
              {isEdit ? "Editar canción" : "Subir canción"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEdit ? "Actualizá los datos del repertorio" : "Agregá una pista al repertorio"}
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Cerrar"
            className="rounded-full p-2 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Nombre">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Artista / autor original">
            <input
              className={inputCls}
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
            />
          </Field>

          <Field
            label="Tipo"
            help="Obligatorio. Alabanza = canción rápida; Adoración = canción lenta."
          >
            <div className="flex gap-2">
              {tipos.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipoId(t.id)}
                  aria-pressed={tipoId === t.id}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    tipoId === t.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.nombre}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Archivo de audio" help="mp3, wav, ogg, m4a o aac — hasta 100MB.">
            {uploading ? (
              <div className="rounded-xl border border-border bg-secondary px-3 py-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span>Subiendo…</span>
                  <span className="font-semibold text-primary">{uploadPct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full gradient-gold transition-all"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                  <Upload className="h-4 w-4" />
                  {audioFile ? audioFile.name : "Elegir archivo de audio"}
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                </label>
                {!audioFile && song?.audioKey ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ya tiene audio cargado — elegí otro
                    archivo para reemplazarlo.
                  </p>
                ) : null}
                {!audioFile && !song?.audioKey && isEdit ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Music className="h-3.5 w-3.5" /> Todavía sin audio cargado.
                  </p>
                ) : null}
                {fileError ? (
                  <p role="alert" className="mt-1.5 text-xs text-destructive">
                    {fileError}
                  </p>
                ) : null}
              </>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tonalidad original">
              <select className={inputCls} value={key} onChange={(e) => setKey(e.target.value)}>
                {KEYS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
            <Field
              label="BPM"
              help="Tiempo de la canción en pulsos por minuto — a más alto, más rápida."
            >
              <input
                type="number"
                min={1}
                className={inputCls}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value) || 1)}
              />
            </Field>
          </div>

          <Field label="Compás">
            <select className={inputCls} value={compas} onChange={(e) => setCompas(e.target.value)}>
              {["2/4", "3/4", "4/4", "6/8", "12/8"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Duración"
            help={
              durationFromAudio
                ? "Tomada automáticamente del archivo de audio — podés corregirla a mano."
                : "Duración total de la canción, en minutos y segundos (se usa para la barra de progreso del reproductor). Se completa sola al elegir un audio."
            }
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={durationMinutes}
                onChange={(e) => handleDurationChange(setDurationMinutes, e.target.value)}
              />
              <span className="text-sm text-muted-foreground">min</span>
              <input
                type="number"
                min={0}
                max={59}
                className={inputCls}
                value={durationSeconds}
                onChange={(e) => handleDurationChange(setDurationSeconds, e.target.value)}
              />
              <span className="text-sm text-muted-foreground">seg</span>
            </div>
          </Field>

          <Field
            label="Letra en formato ChordPro"
            help="Los acordes van entre corchetes antes de la sílaba, ej: [G]Tú me lla[D]mas. Las secciones van entre llaves, ej: {estrofa 1}."
          >
            <textarea
              className={`${inputCls} min-h-[120px] font-mono whitespace-pre`}
              value={chordpro}
              onChange={(e) => setChordpro(e.target.value)}
            />
          </Field>

          <Field label="Temas">
            <div className="flex flex-wrap gap-2">
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setTags((prev) =>
                      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                    )
                  }
                >
                  <TagChip tag={t} active={tags.includes(t)} />
                </button>
              ))}
            </div>
          </Field>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={handleClose}
            disabled={saving && !uploading}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40"
          >
            {uploading ? "Cancelar subida" : "Cancelar"}
          </button>
          <button
            disabled={!canSave}
            onClick={() => void handleSave()}
            className="rounded-full gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {uploading ? "Subiendo…" : saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
