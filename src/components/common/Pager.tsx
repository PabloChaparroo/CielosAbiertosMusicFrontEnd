import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pagina una lista ya filtrada: el buscador y los filtros se aplican sobre todas las canciones
 * y después se corta la página. Si cambia la lista (otra búsqueda), vuelve a la página 1.
 */
export function usePaged<T>(items: T[], pageSize: number, resetKey: unknown) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [resetKey]);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    page: current,
    pages,
    start,
    setPage,
  };
}

export function Pager({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  const go = (p: number) => {
    onChange(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const btn =
    "flex h-9 min-w-9 items-center justify-center rounded-full border border-border px-3 text-sm transition-colors enabled:hover:border-primary/60 disabled:opacity-40";
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <button
        className={btn}
        disabled={page <= 1}
        onClick={() => go(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm text-muted-foreground">
        Página {page} de {pages}
      </span>
      <button
        className={btn}
        disabled={page >= pages}
        onClick={() => go(page + 1)}
        aria-label="Página siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
