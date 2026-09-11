import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import cardMontage from "@/assets/card-montage.png.asset.json";

const TITLE = "Montage vidéo stratégique — Skale Visuals";
const DESCRIPTION =
  "Vidéos ultra-efficaces qui accrochent dès les premières secondes, retiennent l’attention et poussent chaque vue à l’action.";

export const Route = createFileRoute("/videoediting")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://skalevisuals.com/videoediting" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://skalevisuals.com/videoediting" }],
  }),
  component: VideoEditingPage,
});

function useLightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("site-light");
    return () => root.classList.remove("site-light");
  }, []);
}

function VideoEditingPage() {
  useLightTheme();
  return (
    <div className="site-root relative min-h-screen overflow-hidden px-4 py-6">
      <header className="relative z-10 flex w-full items-center justify-between">
        <Link
          to="/"
          className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Link>
        <span />
      </header>

      <main className="relative z-10 mx-auto mt-10 max-w-4xl pb-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-3xl bg-black shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)]"
        >
          <div className="relative h-64 sm:h-80">
            <img
              src={cardMontage.url}
              alt="Montage vidéo stratégique"
              width={1024}
              height={640}
              className="absolute inset-0 h-full w-full object-cover object-bottom"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black from-0% via-black/60 via-[40%] to-transparent to-[100%]" />
          </div>

          <div className="relative -mt-20 px-6 pb-10 pt-0 sm:px-10 sm:pb-14">
            <h1 className="max-w-2xl text-3xl leading-[1.05] tracking-[-0.06em] text-white sm:text-4xl lg:text-5xl">
              <span className="font-codec tracking-[-0.06em]">Le </span>
              <span className="font-codec-bold tracking-[-0.06em]">montage stratégique</span>
              <span className="font-codec tracking-[-0.06em]">, conçu pour </span>
              <span className="font-codec-bold tracking-[-0.06em]">convertir</span>
              <span className="font-codec tracking-[-0.06em]">.</span>
            </h1>
            <p className="font-codec mt-5 max-w-xl text-base leading-relaxed tracking-[-0.04em] text-white/80 sm:text-lg">
              {DESCRIPTION}
            </p>

            <Link
              to="/bookacall"
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-all duration-200 hover:scale-[1.04] hover:bg-white/90"
            >
              Réserver un appel
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-45" />
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
