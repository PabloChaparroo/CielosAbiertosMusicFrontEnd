import { createFileRoute } from "@tanstack/react-router";
import { EstadisticasPage } from "@/features/estadisticas/pages/EstadisticasPage";

export const Route = createFileRoute("/estadisticas")({
  head: () => ({
    meta: [
      { title: "Estadísticas — Cielos Abiertos" },
      {
        name: "description",
        content: "Canciones más tocadas por mes y año, distribución por tema y ranking histórico.",
      },
      { property: "og:title", content: "Estadísticas — Cielos Abiertos" },
      { property: "og:description", content: "Datos del repertorio del ministerio de alabanza." },
    ],
  }),
  component: EstadisticasPage,
});
