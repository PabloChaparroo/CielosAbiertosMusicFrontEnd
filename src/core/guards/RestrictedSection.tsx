import { ShieldCheck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/common/ui-bits";

/** Lo que ve quien entra por URL a un módulo sin su permiso "Ver" (ver module-access.ts) */
export function RestrictedSection() {
  return (
    <AppLayout title="Sección restringida" subtitle="Sin acceso">
      <EmptyState
        icon={<ShieldCheck className="h-6 w-6" />}
        title="Sección restringida"
        description="Tu rol no tiene permiso para ver esta sección. Si lo necesitás, pedíselo a un administrador."
      />
    </AppLayout>
  );
}
