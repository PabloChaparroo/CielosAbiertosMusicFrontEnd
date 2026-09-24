import { createFileRoute } from "@tanstack/react-router";
import { LetrasPage } from "@/features/musica/letras/pages/LetrasPage";

export const Route = createFileRoute("/letras")({
  validateSearch: (search: Record<string, unknown>) => ({
    songId: typeof search.songId === "string" ? search.songId : undefined,
    songIds: typeof search.songIds === "string" ? search.songIds : undefined,
  }),
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
