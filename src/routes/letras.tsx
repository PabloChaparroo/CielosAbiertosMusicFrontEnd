import { createFileRoute } from "@tanstack/react-router";
import { LetrasPage } from "@/features/musica/letras/pages/LetrasPage";

export const Route = createFileRoute("/letras")({
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
      { title: "Letras — Cielos Abiertos" },
      {
        name: "description",
        content:
          "Letras del repertorio en texto o imagen, con búsqueda por tema y exportación a PDF.",
      },
      { property: "og:title", content: "Letras — Cielos Abiertos" },
      { property: "og:description", content: "Letras del repertorio del ministerio de alabanza." },
    ],
  }),
  component: LetrasPage,
});
