import { useState } from "react";
import { Guitar, Lock, MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/common/ui-bits";
import { useApp } from "@/hooks/useApp";

export function Annotations({ songId }: { songId: string }) {
  const {
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    canEditAnnotation,
    users,
  } = useApp();
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const list = annotations.filter((a) => a.songId === songId);

  return (
    <section className="surface-card p-5">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
        <MessageSquarePlus className="h-4 w-4 text-primary" /> Anotaciones del equipo
      </h3>

      {list.length === 0 ? (
        <EmptyState
          icon={<Guitar className="h-6 w-6" />}
          title="Sin anotaciones todavía"
          description="Dejá indicaciones para el ensayo: dinámicas, entradas, cambios de ritmo."
        />
      ) : (
        <ul className="space-y-3">
          {list.map((a) => {
            const author = users.find((u) => u.id === a.authorId);
            const editable = canEditAnnotation(a);
            return (
              <li key={a.id} className="rounded-xl bg-elevated/60 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-background"
                    style={{ backgroundImage: author?.avatarColor }}
                  >
                    {author?.initials}
                  </span>
                  <span className="text-sm font-medium">{author?.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString("es-AR")}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    {editable ? (
                      <>
                        <button
                          aria-label="Editar anotación"
                          onClick={() => {
                            setEditing(a.id);
                            setDraft(a.text);
                          }}
                          className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          aria-label="Eliminar anotación"
                          onClick={() => removeAnnotation(a.id)}
                          className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {editing === a.id ? (
                  <div className="flex gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary/60"
                    />
                    <button
                      onClick={() => {
                        updateAnnotation(a.id, draft);
                        setEditing(null);
                      }}
                      className="rounded-lg gradient-gold px-3 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/90">{a.text}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribí una indicación para el equipo…"
          className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:border-primary/60"
        />
        <button
          disabled={!text.trim()}
          onClick={() => {
            addAnnotation(songId, text.trim());
            setText("");
          }}
          className="rounded-xl gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Publicar
        </button>
      </div>
    </section>
  );
}
