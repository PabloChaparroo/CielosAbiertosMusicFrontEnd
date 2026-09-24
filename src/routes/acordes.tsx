import { createFileRoute } from "@tanstack/react-router";
import { AcordesPage } from "@/features/musica/acordes/pages/AcordesPage";

export const Route = createFileRoute("/acordes")({
  // claves opcionales (no `string | undefined`): con exactOptionalPropertyTypes, así un <Link>
  // a esta ruta no está obligado a pasar `search`
  validateSearch: (search: Record<string, unknown>): { songId?: string; songIds?: string } => {
    const { songId, songIds } = search;
    return {
      ...(typeof songId === "string" ? { songId } : {}),
      ...(typeof songIds === "string" ? { songIds } : {}),
    };
  },
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
