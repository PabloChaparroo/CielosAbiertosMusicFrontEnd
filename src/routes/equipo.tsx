import { createFileRoute } from "@tanstack/react-router";
import { EquipoPage } from "@/features/equipo/pages/EquipoPage";

export const Route = createFileRoute("/equipo")({
  head: () => ({
    meta: [
      { title: "Equipo y Roles — Cielos Abiertos" },
      {
        name: "description",
        content: "Miembros del ministerio de música, roles y participación reciente.",
      },
      { property: "og:title", content: "Equipo y Roles — Cielos Abiertos" },
      { property: "og:description", content: "El equipo detrás de cada servicio." },
    ],
  }),
  component: EquipoPage,
});
