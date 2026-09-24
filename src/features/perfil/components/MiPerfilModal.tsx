import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Upload, X } from "lucide-react";
import { Avatar } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";
import { useAuth } from "@/core/auth/useAuth";
import { StorageClient } from "@/lib/storage-client";
import { validateImageFile } from "@/features/canciones/lib/image-validation";
import { PerfilService } from "../services/perfil.service";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";

export function MiPerfilModal({ onClose }: { onClose: () => void }) {
  const { currentUser, reloadUsers } = useApp();
  const { refresh, logout } = useAuth();

  const [name, setName] = useState(currentUser.name);
  const [ministryRole, setMinistryRole] = useState(currentUser.ministryRole);
  const [instrument, setInstrument] = useState(currentUser.instruments[0] ?? "");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const uploading = uploadPct !== null;

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleClose = () => {
    if (uploading) abortRef.current?.abort();
    onClose();
  };

  const handleFileChange = (file: File | null) => {
    setFileError(null);
    if (!file) {
      setAvatarFile(null);
      return;
    }
    const validationError = validateImageFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }
    setAvatarFile(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      let avatarKey: string | undefined;
      if (avatarFile) {
        const { uploadUrl, key } = await StorageClient.getUploadUrl("avatares", avatarFile.type);
        const controller = new AbortController();
        abortRef.current = controller;
        setUploadPct(0);
        await StorageClient.uploadFileWithProgress(
          uploadUrl,
          avatarFile,
          avatarFile.type,
          setUploadPct,
          controller.signal,
        );
        setUploadPct(null);
        avatarKey = key;
      }

      await PerfilService.updateMyProfile({
        name: name.trim(),
        ministryRole,
        instruments: instrument ? [instrument] : currentUser.instruments,
        ...(avatarKey ? { avatarKey } : {}),
      });

      // El Sidebar/etc. leen currentUser desde useApp (lista de Equipo), no
      // desde el authStore directo — hay que refrescar los dos para que se
      // vea el cambio en todos lados sin relogear.
      await refresh();
      reloadUsers();

      setAvatarFile(null);
      setSaved(true);
      setSaving(false);
    } catch (e) {
      setUploadPct(null);
      if (e instanceof DOMException && e.name === "AbortError") return;
      setSaveError(e instanceof Error ? e.message : "No se pudieron guardar los cambios");
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordChanged(false);
    if (newPassword.length < 6) {
      setPasswordError("La contraseña nueva tiene que tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setPasswordSaving(true);
    try {
      await PerfilService.changeMyPassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordChanged(true);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : "No se pudo cambiar la contraseña");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg animate-in slide-in-from-bottom-6 overflow-y-auto rounded-t-3xl border border-border bg-card p-6 sm:max-h-[85vh] sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Mi perfil</h2>
            <p className="text-sm text-muted-foreground">Editá tus propios datos</p>
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
          <div className="flex items-center gap-4">
            <Avatar
              user={{ ...currentUser, avatarKey: avatarFile ? null : currentUser.avatarKey }}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-background"
            />
            <div className="flex-1 space-y-1.5">
              {uploading ? (
                <div className="rounded-xl border border-border bg-secondary px-3 py-2">
                  <div className="mb-1 flex items-center justify-between text-xs">
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
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  {avatarFile ? avatarFile.name : "Cambiar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={saving}
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              {fileError ? (
                <p role="alert" className="text-xs text-destructive">
                  {fileError}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Email
            </p>
            <input
              className={`${inputCls} cursor-not-allowed opacity-60`}
              value={currentUser.email}
              disabled
            />
            <p className="mt-1 text-xs text-muted-foreground">
              El email y tu rol del sistema los administra el equipo desde Equipo y Roles.
            </p>
          </div>

          <input
            className={inputCls}
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Rol en el ministerio"
            value={ministryRole}
            onChange={(e) => setMinistryRole(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Instrumento"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
          />

          {saveError ? (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          ) : null}
          {saved ? <p className="text-sm text-primary">Perfil actualizado.</p> : null}

          <button
            disabled={!name.trim() || saving}
            onClick={() => void handleSaveProfile()}
            className="w-full rounded-full gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {uploading ? "Subiendo…" : saving ? "Guardando…" : "Guardar perfil"}
          </button>
        </div>

        <div className="mt-6 space-y-3 border-t border-border pt-5">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Cambiar contraseña
          </p>
          <input
            type="password"
            className={inputCls}
            placeholder="Contraseña actual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            type="password"
            className={inputCls}
            placeholder="Contraseña nueva (mín. 6 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            className={inputCls}
            placeholder="Repetir contraseña nueva"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {passwordError ? (
            <p role="alert" className="text-sm text-destructive">
              {passwordError}
            </p>
          ) : null}
          {passwordChanged ? (
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
              <p className="flex items-center gap-2 text-primary">
                <AlertTriangle className="h-4 w-4" /> Contraseña actualizada.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Por seguridad, te recomendamos cerrar sesión y volver a entrar — tu sesión actual
                sigue activa con la contraseña anterior hasta que expire sola.
              </p>
              <button
                onClick={() => void logout()}
                className="mt-2 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                Cerrar sesión ahora
              </button>
            </div>
          ) : null}
          <button
            disabled={!currentPassword || !newPassword || !confirmPassword || passwordSaving}
            onClick={() => void handleChangePassword()}
            className="w-full rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary disabled:opacity-40"
          >
            {passwordSaving ? "Cambiando…" : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
}
