import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { MobileSidebar, SidebarContent } from "./Sidebar";
import { MiniPlayer } from "./MiniPlayer";
import { useApp } from "@/hooks/useApp";

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
  const [open, setOpen] = useState(false);
  const { current } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed top-0 left-0 hidden h-screen w-[272px] border-r border-sidebar-border lg:block">
        <SidebarContent />
      </aside>
      <MobileSidebar open={open} onClose={() => setOpen(false)} />

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
          className={
            (bleed ? "" : "px-4 py-6 sm:px-8 sm:py-8 ") + (current ? "pb-32" : "pb-16")
          }
        >
          {children}
        </div>
      </main>

      <MiniPlayer />
    </div>
  );
}
