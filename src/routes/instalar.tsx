import { createFileRoute } from "@tanstack/react-router";
import { InstalarPage } from "@/features/instalar/pages/InstalarPage";

export const Route = createFileRoute("/instalar")({
  head: () => ({
    meta: [
      { title: "Instalar app — Cielos Abiertos" },
      {
        name: "description",
        content: "Cómo instalar Cielos Abiertos en el celular para abrirla con un toque.",
      },
    ],
  }),
  component: InstalarPage,
});
