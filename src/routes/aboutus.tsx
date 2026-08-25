import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const TITLE = "À propos — Skale Visuals, studio de montage vidéo fondé par Madi Harrois";
const DESCRIPTION =
  "Skale Visuals est un studio de montage vidéo fondé par Madi Harrois : VSL, Ads, Shorts, Motion Design et Podcast pour créateurs et marques.";

const PERSON_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Madi Harrois",
  jobTitle: "CEO & fondateur",
  url: "https://skalevisuals.com/aboutus",
  worksFor: {
    "@type": "Organization",
    name: "Skale Visuals",
    url: "https://skalevisuals.com",
  },
  sameAs: ["https://www.instagram.com/skalevisuals/", "https://www.linkedin.com/company/skalevisuals/"],
};

export const Route = createFileRoute("/aboutus")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://skalevisuals.com/aboutus" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(PERSON_JSONLD) }],
  }),
  component: AboutUsPage,
});

function useSiteTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const stored = window.localStorage.getItem("skale-theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("site-light", theme === "light");
    return () => root.classList.remove("site-light");
  }, [theme]);
  return theme;
}

function AboutUsPage() {
  useSiteTheme();

  return (
    <div className="site-root relative min-h-screen">
      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-24 pt-14">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 text-center"
        >
          <h1 className="text-4xl font-semibold tracking-tighter text-foreground sm:text-5xl">À propos</h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            Skale Visuals est un studio de montage vidéo fondé par{" "}
            <strong className="font-medium text-foreground">Madi Harrois</strong>, pensé pour les créateurs et
            les marques qui veulent des contenus qui performent.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="site-pill site-corner-glow mx-auto mt-12 rounded-3xl px-6 py-14 text-center sm:px-10"
        >
          <p className="relative z-10 text-sm text-muted-foreground sm:text-base">
            Cette page se remplit bientôt : notre histoire, notre méthode et l'équipe.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
