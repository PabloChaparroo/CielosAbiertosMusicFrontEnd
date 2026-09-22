import { createFileRoute } from "@tanstack/react-router";
import { InicioPage } from "@/features/inicio/pages/InicioPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cielos Abiertos — Plataforma del equipo de adoración" },
      {
        name: "description",
        content:
          "Letras, acordes con transposición, setlists, equipo y estadísticas para el ministerio de alabanza.",
      },
      { property: "og:title", content: "Cielos Abiertos — Plataforma del equipo de adoración" },
      {
        property: "og:description",
        content: "Todo el repertorio del ministerio de música en un solo lugar.",
      },
    ],
  }),
  component: InicioPage,
});
