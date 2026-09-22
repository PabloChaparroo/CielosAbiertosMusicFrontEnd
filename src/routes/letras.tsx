import { createFileRoute } from "@tanstack/react-router";
import { LetrasPage } from "@/features/musica/letras/pages/LetrasPage";

export const Route = createFileRoute("/letras")({
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
