import { createFileRoute } from "@tanstack/react-router";
import { RolesPermisosPage } from "@/features/roles-permisos/pages/RolesPermisosPage";

export const Route = createFileRoute("/roles-permisos")({
  head: () => ({
    meta: [
      { title: "Roles y Permisos — Cielos Abiertos" },
      {
        name: "description",
        content: "Gestión de roles y qué puede hacer cada uno dentro del ministerio.",
      },
      { property: "og:title", content: "Roles y Permisos — Cielos Abiertos" },
      { property: "og:description", content: "Administración de accesos del equipo." },
    ],
  }),
  component: RolesPermisosPage,
});
