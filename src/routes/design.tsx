import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

const TITLE = "Design visuel — Skale Visuals";
const DESCRIPTION =
  "Miniatures et visuels sur mesure pour valoriser ton contenu, renforcer ta crédibilité et transformer tes visiteurs en clients.";

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://skalevisuals.com/design" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://skalevisuals.com/design" }],
  }),
  component: DesignPage,
});

function DesignPage() {
  return (
    <div className="site-root flex min-h-screen items-center justify-center bg-white px-4">
      <motion.span
        initial={{ opacity: 0, y: 14, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="inline-flex items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/15 px-4 py-2 font-codec text-sm tracking-[-0.02em] text-yellow-600"
      >
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        Cette partie est en travaux, merci de repasser plus tard
      </motion.span>
    </div>
  );
}
