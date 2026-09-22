import { createFileRoute } from "@tanstack/react-router";
import { FavoritosPage } from "@/features/musica/favoritos/pages/FavoritosPage";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Cielos Abiertos" },
      { name: "description", content: "Tus canciones favoritas del repertorio del ministerio." },
      { property: "og:title", content: "Favoritos — Cielos Abiertos" },
      { property: "og:description", content: "Acceso rápido a tus canciones marcadas." },
    ],
  }),
  component: FavoritosPage,
});
