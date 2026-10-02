import { createFileRoute } from "@tanstack/react-router";
import { TransportadorPage } from "@/features/musica/transportador/pages/TransportadorPage";

export const Route = createFileRoute("/transportador")({
  head: () => ({
    meta: [
      { title: "Transportador — Cielos Abiertos" },
      {
        name: "description",
        content: "Pasá una canción con los acordes arriba de la letra al formato del cancionero.",
      },
    ],
  }),
  component: TransportadorPage,
});
