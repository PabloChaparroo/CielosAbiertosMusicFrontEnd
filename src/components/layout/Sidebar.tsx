import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Cloud,
  Guitar,
  Heart,
  Home,
  ListMusic,
  LogOut,
  Music4,
  ShieldCheck,
  Type,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/hooks/useApp";
import { useAuth } from "@/core/auth/useAuth";
import { Avatar, RoleBadge } from "@/components/common/ui-bits";
import { canOpenModule } from "@/core/auth/module-access";

const groups = [
  {
    label: "Principal",
    items: [{ to: "/", label: "Inicio", icon: Home }],
  },
  {
    label: "Música",
    items: [
      { to: "/escuchar", label: "Canciones", icon: Music4 },
      { to: "/letras", label: "Letras", icon: Type },
      { to: "/acordes", label: "Acordes", icon: Guitar },
      { to: "/setlists", label: "Setlists", icon: ListMusic },
      { to: "/favoritos", label: "Favoritos", icon: Heart },
    ],
  },
  {
    label: "Gestión",
    items: [
      { to: "/equipo", label: "Equipo y Roles", icon: Users },
      { to: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
      { to: "/roles-permisos", label: "Roles y Permisos", icon: ShieldCheck },
    ],
  },
] as const;

export function SidebarContent({
  onNavigate,
  onOpenPerfil,
}: {
  onNavigate?: () => void;
  onOpenPerfil: () => void;
}) {
  const { currentUser } = useApp();
  const { logout, hasAnyPermission, isGuest } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Solo los módulos cuyo permiso "Ver" tiene el usuario (mismo mapa que usa AuthGate para las URLs)
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canOpenModule(item.to, (permission) => hasAnyPermission([permission]), isGuest),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-gold text-primary-foreground">
          <Cloud className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-lg font-semibold">Cielos Abiertos</p>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase">Adoración</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? "bg-sidebar-accent text-primary"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] transition-transform group-hover:scale-110",
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        {/* un invitado no tiene perfil que editar */}
        <button
          onClick={isGuest ? undefined : onOpenPerfil}
          disabled={isGuest}
          className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors enabled:hover:bg-sidebar-accent/60"
        >
          <Avatar
            user={currentUser}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-background"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{currentUser.name}</p>
          </div>
          <RoleBadge roles={currentUser.roles} />
        </button>
        <button
          onClick={() => void logout()}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> {isGuest ? "Salir (iniciar sesión)" : "Cerrar sesión"}
        </button>
      </div>
    </div>
  );
}

export function MobileSidebar({
  open,
  onClose,
  onOpenPerfil,
}: {
  open: boolean;
  onClose: () => void;
  onOpenPerfil: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/70 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "absolute top-0 left-0 h-full w-[280px] border-r border-sidebar-border transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar menú"
          className="absolute top-5 right-4 z-10 rounded-full p-2 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent
          onNavigate={onClose}
          onOpenPerfil={() => {
            onClose();
            onOpenPerfil();
          }}
        />
      </div>
    </div>
  );
}
