import { createFileRoute } from "@tanstack/react-router";
import { AcordesPage } from "@/features/musica/acordes/pages/AcordesPage";

export const Route = createFileRoute("/acordes")({
  head: () => ({
    meta: [
      { title: "Acordes — Cielos Abiertos" },
      {
        name: "description",
        content:
          "Acordes con transposición en tiempo real, zoom para el atril, modo presentación en vivo y anotaciones del equipo.",
      },
      { property: "og:title", content: "Acordes — Cielos Abiertos" },
      {
        property: "og:description",
        content: "Transponé, agrandá y tocá: el cancionero del ministerio.",
      },
    ],
  }),
  component: AcordesPage,
});
