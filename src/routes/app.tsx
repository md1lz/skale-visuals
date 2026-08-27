import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Application mobile — Skale Visuals" },
      {
        name: "description",
        content: "L'application mobile Skale Visuals n'est pas disponible pour le moment.",
      },
      { property: "og:title", content: "Application mobile — Skale Visuals" },
      {
        property: "og:description",
        content: "L'application mobile Skale Visuals n'est pas disponible pour le moment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#0D0D0D" },
    ],
  }),
  component: AppUnavailablePage,
});

function AppUnavailablePage() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[#0D0D0D] px-6 text-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur"
      >
        <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-red-500/15 text-red-400">
          <Smartphone className="h-5 w-5" />
        </span>
        <h1 className="text-lg font-semibold tracking-tight">
          L'application mobile n'est pas disponible pour le moment.
        </h1>
      </motion.div>
    </div>
  );
}
