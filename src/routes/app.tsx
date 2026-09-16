import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Espace client — Skale Visuals" },
      {
        name: "description",
        content: "Connectez-vous à votre espace client Skale Visuals pour suivre vos projets vidéo.",
      },
      { property: "og:title", content: "Espace client — Skale Visuals" },
      {
        property: "og:description",
        content: "Connectez-vous à votre espace client Skale Visuals pour suivre vos projets vidéo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#0D0D0D" },
    ],
  }),
  component: () => <Outlet />,
});
