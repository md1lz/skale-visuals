import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Clapperboard, Film, MonitorPlay } from "lucide-react";

import { SiteNavbar, SlotMachineText } from "@/components/SiteNavbar";

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

/* ---------------- macOS-style window frame ---------------- */

function WindowFrame({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="font-codec ml-2 truncate text-[11px] tracking-[-0.02em] text-neutral-500">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ---------------- video info window ---------------- */

function VideoInfoWindow() {
  const rows = [
    { label: "Durée", value: "12:47" },
    { label: "Taille", value: "248 Mo" },
    { label: "Format", value: "MP4 · H.264" },
    { label: "Dimensions", value: "1920 × 1080" },
  ];
  return (
    <WindowFrame title="montage_final.mp4" className="w-60">
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
            <Film className="h-4.5 w-4.5 text-red-500" />
          </div>
          <p className="font-codec-bold text-sm tracking-[-0.04em] text-black">Vidéo YouTube</p>
        </div>
        <dl className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-xs">
              <dt className="font-codec text-neutral-500">{r.label}</dt>
              <dd className="font-codec-bold tabular-nums text-black">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </WindowFrame>
  );
}

/* ---------------- fake client chat window ---------------- */

const CHAT_MESSAGES: { from: "client" | "skale"; text: string }[] = [
  { from: "client", text: "Salut ! La V1 de la vidéo est dispo ? 👀" },
  { from: "skale", text: "Oui Micha, elle vient d'être envoyée dans ton espace ✅" },
  { from: "client", text: "Incroyable, l'intro claque trop fort 🔥" },
  { from: "skale", text: "On te laisse regarder, dis-nous si tu veux des retouches" },
  { from: "client", text: "Juste raccourcir la fin de 5 sec et c'est parfait" },
  { from: "skale", text: "C'est noté, la V2 arrive dans la journée 🚀" },
  { from: "client", text: "Vous gérez, merci l'équipe 🙏" },
];

function ClientChatWindow() {
  const [visible, setVisible] = useState(2);

  useEffect(() => {
    const id = window.setInterval(() => {
      setVisible((v) => (v >= CHAT_MESSAGES.length ? 1 : v + 1));
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <WindowFrame title="Micha — Espace client" className="w-72">
      <div className="flex h-56 flex-col justify-end gap-2 overflow-hidden p-4">
        <AnimatePresence initial={false}>
          {CHAT_MESSAGES.slice(0, visible).map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-snug ${
                m.from === "client"
                  ? "self-start rounded-bl-sm bg-neutral-100 text-black"
                  : "self-end rounded-br-sm bg-black text-white"
              }`}
            >
              <span className="font-codec tracking-[-0.02em]">{m.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </WindowFrame>
  );
}

/* ---------------- project status window ---------------- */

function ProjectStatusWindow() {
  return (
    <WindowFrame title="Projet — Suivi" className="w-64">
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Clapperboard className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <div>
            <p className="font-codec-bold text-sm tracking-[-0.04em] text-black">Vidéo 1 — Lancement</p>
            <p className="font-codec text-[11px] text-neutral-500">Micha · 7 juillet 2026</p>
          </div>
        </div>
        <dl className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <dt className="font-codec text-neutral-500">Statut</dt>
            <dd>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                Montage terminé
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="font-codec text-neutral-500">Plateforme</dt>
            <dd className="font-codec-bold flex items-center gap-1 text-black">
              <MonitorPlay className="h-3.5 w-3.5 text-red-500" /> YouTube
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="font-codec text-neutral-500">Édition</dt>
            <dd className="font-codec-bold text-black">Version finale</dd>
          </div>
        </dl>
      </div>
    </WindowFrame>
  );
}

/* ---------------- page ---------------- */

function VideoEditingPage() {
  useLightTheme();
  const [hoverBook, setHoverBook] = useState(false);
  const [hoverDiscover, setHoverDiscover] = useState(false);

  return (
    <div className="site-root relative min-h-screen overflow-x-hidden bg-white">
      <SiteNavbar />

      <main className="relative z-10">
        <section className="relative mx-auto flex min-h-[92vh] max-w-7xl items-center justify-center px-4 pb-24 pt-32 sm:px-6 lg:px-8">
          {/* floating windows — desktop */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotate: -8 }}
            animate={{ opacity: 1, y: 0, rotate: -6 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-2 top-32 hidden lg:block xl:left-16"
          >
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
              <VideoInfoWindow />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30, rotate: 8 }}
            animate={{ opacity: 1, y: 0, rotate: 5 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-24 left-4 hidden lg:block xl:left-32"
          >
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
              <ProjectStatusWindow />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30, rotate: -7 }}
            animate={{ opacity: 1, y: 0, rotate: -5 }}
            transition={{ duration: 0.7, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-2 top-40 hidden lg:block xl:right-16"
          >
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
              <ClientChatWindow />
            </motion.div>
          </motion.div>

          {/* centered hero */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex max-w-3xl flex-col items-center text-center"
          >
            <h1 className="font-codec text-4xl leading-[1.05] tracking-[-0.06em] text-black sm:text-6xl lg:text-7xl">
              On crée vos contenus vidéo
            </h1>
            <p className="font-codec mt-5 max-w-xl text-lg leading-[1.2] tracking-[-0.04em] text-neutral-600 sm:text-xl">
              Tout inclus, prix fixes &amp; retours illimités.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                to="/bookacall"
                onMouseEnter={() => setHoverBook(true)}
                onMouseLeave={() => setHoverBook(false)}
                onFocus={() => setHoverBook(true)}
                onBlur={() => setHoverBook(false)}
                className="group font-codec-bold inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-gray-600 bg-black px-4 py-2 text-xs uppercase tracking-wide text-white transition-all duration-200 ease-out hover:scale-[1.09] hover:bg-black/90 hover:shadow-[0_18px_40px_-10px_rgba(0,0,0,0.45)] active:scale-[0.97] sm:text-sm"
              >
                <SlotMachineText text="RÉSERVER UN APPEL" active={hoverBook} />
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-45" />
              </Link>
              <button
                type="button"
                onMouseEnter={() => setHoverDiscover(true)}
                onMouseLeave={() => setHoverDiscover(false)}
                onFocus={() => setHoverDiscover(true)}
                onBlur={() => setHoverDiscover(false)}
                className="group font-codec-bold inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-gray-300 bg-white px-4 py-2 text-xs uppercase tracking-wide text-black transition-all duration-200 ease-out hover:scale-[1.09] hover:bg-white/90 hover:shadow-[0_18px_40px_-10px_rgba(0,0,0,0.18)] active:scale-[0.97] sm:text-sm"
              >
                <SlotMachineText text="DÉCOUVRIR" active={hoverDiscover} />
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-45" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* windows — mobile / tablet stacked */}
        <section className="mx-auto grid max-w-md gap-6 px-6 pb-20 sm:max-w-2xl sm:grid-cols-2 lg:hidden">
          <VideoInfoWindow />
          <ClientChatWindow />
          <ProjectStatusWindow />
        </section>
      </main>
    </div>
  );
}
