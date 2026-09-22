import { createFileRoute } from "@tanstack/react-router";
import { SetlistsPage } from "@/features/musica/setlists/pages/SetlistsPage";

export const Route = createFileRoute("/setlists")({
  head: () => ({
    meta: [
      { title: "Setlists — Cielos Abiertos" },
      {
        name: "description",
        content: "Próximos servicios y ensayos con el orden de canciones y su tonalidad del día.",
      },
      { property: "og:title", content: "Setlists — Cielos Abiertos" },
      { property: "og:description", content: "Organizá el repertorio de cada servicio." },
    ],
  }),
  component: SetlistsPage,
});
