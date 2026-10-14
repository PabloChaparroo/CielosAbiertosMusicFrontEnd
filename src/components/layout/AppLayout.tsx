import { useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { MobileSidebar, mobileNav, SidebarContent } from "./Sidebar";
import { useApp } from "@/hooks/useApp";
import { MiPerfilModal } from "@/features/perfil/components/MiPerfilModal";

export function AppLayout({
  title,
  subtitle,
  actions,
  children,
  bleed,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  bleed?: boolean;
}) {
  // si se llegó tocando un módulo del menú, arranca abierto y se cierra con animación
  const [open, setOpen] = useState(() => mobileNav.closeOnMount);
  useEffect(() => {
    if (!mobileNav.closeOnMount) return;
    const id = requestAnimationFrame(() => {
      mobileNav.closeOnMount = false;
      setOpen(false);
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const [showPerfil, setShowPerfil] = useState(false);
  const { current } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed top-0 left-0 hidden h-screen w-[272px] border-r border-sidebar-border lg:block">
        <SidebarContent onOpenPerfil={() => setShowPerfil(true)} />
      </aside>
      <MobileSidebar
        open={open}
        onClose={() => setOpen(false)}
        onOpenPerfil={() => setShowPerfil(true)}
      />

      <main className="lg:pl-[272px]">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-8">
            <button
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
              className="rounded-xl p-2 text-muted-foreground hover:bg-secondary lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl font-semibold sm:text-2xl">{title}</h1>
              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
              ) : null}
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        </header>

        <div
          // entrada del módulo: aparece subiendo un poco
          className={
            "animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out " +
            (bleed ? "" : "px-4 pt-6 sm:px-8 sm:pt-8 ") +
            // lugar para el reproductor de abajo (antes "sm:py-8" lo pisaba desde sm y tapaba el final)
            (current ? "pb-32" : "pb-16")
          }
        >
          {children}
        </div>
      </main>

      {showPerfil ? <MiPerfilModal onClose={() => setShowPerfil(false)} /> : null}
    </div>
  );
}
