import { createFileRoute } from "@tanstack/react-router";
import { EscucharPage } from "@/features/musica/escuchar/pages/EscucharPage";

export const Route = createFileRoute("/escuchar")({
  head: () => ({
    meta: [
      { title: "Escuchar y Subir — Cielos Abiertos" },
      {
        name: "description",
        content: "Reproducí el repertorio del ministerio y subí nuevas canciones con sus tags.",
      },
      { property: "og:title", content: "Escuchar y Subir — Cielos Abiertos" },
      { property: "og:description", content: "Repertorio de audio del equipo de adoración." },
    ],
  }),
  component: EscucharPage,
});
