import { createFileRoute } from "@tanstack/react-router";
import { AcordesPage } from "@/features/musica/acordes/pages/AcordesPage";

export const Route = createFileRoute("/acordes")({
  // claves opcionales (no `string | undefined`): con exactOptionalPropertyTypes, así un <Link>
  // a esta ruta no está obligado a pasar `search`
  // `editar`: abre directo el editor de la canción (lo usa el botón Editar de Letras)
  validateSearch: (
    search: Record<string, unknown>,
  ): { songId?: string; songIds?: string; editar?: true } => {
    const { songId, songIds, editar } = search;
    return {
      ...(typeof songId === "string" ? { songId } : {}),
      ...(typeof songIds === "string" ? { songIds } : {}),
      ...(editar === true ? { editar } : {}),
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
