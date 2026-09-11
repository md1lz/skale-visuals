import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { SiteNavbar } from "@/components/SiteNavbar";
import {
  DEFAULT_HOME_SETTINGS,
  getHomeContent,
  type HomeContent,
} from "@/lib/home-content.functions";

const FALLBACK_TITLE = "Montage vidéo stratégique — Skale Visuals";
const FALLBACK_DESCRIPTION =
  "Vidéos ultra-efficaces qui accrochent dès les premières secondes, retiennent l’attention et poussent chaque vue à l’action.";

export const Route = createFileRoute("/videoediting")({
  head: () => ({
    meta: [
      { title: FALLBACK_TITLE },
      { name: "description", content: FALLBACK_DESCRIPTION },
      { property: "og:title", content: FALLBACK_TITLE },
      { property: "og:description", content: FALLBACK_DESCRIPTION },
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

function useHomeContent() {
  const [content, setContent] = useState<HomeContent>({
    settings: DEFAULT_HOME_SETTINGS,
    folders: [],
    videos: [],
  });

  const load = useCallback(() => {
    getHomeContent()
      .then((c) => setContent(c))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("home-content-videoediting")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, load)
      .subscribe();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  return content;
}

function VideoEditingPage() {
  useLightTheme();
  const { settings } = useHomeContent();
  const header = settings.serviceHeader ?? DEFAULT_HOME_SETTINGS.serviceHeader;

  return (
    <div className="site-root relative min-h-screen overflow-hidden bg-white">
      <SiteNavbar />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="grid min-h-[70vh] items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start"
          >
            <h1 className="max-w-xl text-4xl leading-[1.05] tracking-[-0.06em] text-black sm:text-5xl lg:text-6xl">
              <span className="font-codec tracking-[-0.06em]">{header.title}</span>
            </h1>
            <p className="font-codec mt-6 max-w-lg text-base leading-relaxed tracking-[-0.04em] text-neutral-600 sm:text-lg">
              {header.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={header.primaryLink || "/bookacall"}
                className="group inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.04] hover:bg-neutral-900"
              >
                {header.primaryCta || "Réserver un appel"}
                <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-45" />
              </Link>
              <Link
                to={header.secondaryLink || "/#projets"}
                className="group inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-medium text-black transition-all duration-200 hover:scale-[1.04] hover:border-neutral-300"
              >
                {header.secondaryCta || "Voir nos projets"}
                <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-45" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-neutral-100 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.15)]"
          >
            {header.image ? (
              <img
                src={header.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                <span className="font-codec text-sm">Aucune image importée</span>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
