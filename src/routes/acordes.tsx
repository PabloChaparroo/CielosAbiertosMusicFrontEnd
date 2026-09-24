import { createFileRoute } from "@tanstack/react-router";
import { AcordesPage } from "@/features/musica/acordes/pages/AcordesPage";

export const Route = createFileRoute("/acordes")({
  validateSearch: (search: Record<string, unknown>) => ({
    songId: typeof search.songId === "string" ? search.songId : undefined,
    songIds: typeof search.songIds === "string" ? search.songIds : undefined,
  }),
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
