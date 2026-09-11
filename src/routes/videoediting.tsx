import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Clock,
  Facebook,
  Flag,
  Info,
  Instagram,
  Linkedin,
  MonitorPlay,
  Mountain,
  Music2,
  SlidersHorizontal,
  Youtube,
} from "lucide-react";

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

/* ---------------- dark window frame + 3d tilt ---------------- */

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
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/95 shadow-[0_40px_80px_-24px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl ${className}`}
    >
      <div className="pointer-events-none absolute -inset-12 -z-10 rounded-[40px] bg-[radial-gradient(circle_at_center,rgba(226,27,60,0.18)_0%,transparent_65%)] blur-2xl" />
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="font-codec ml-2 truncate text-[11px] tracking-[-0.02em] text-white/40">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Tilt({
  children,
  rotate = -5,
  rotateX = 8,
  className = "",
}: {
  children: React.ReactNode;
  rotate?: number;
  rotateX?: number;
  className?: string;
}) {
  return (
    <div className={className} style={{ perspective: 1200 }}>
      <div style={{ transform: `rotateX(${rotateX}deg) rotateY(${rotate * 1.6}deg) rotateZ(${rotate}deg)`, transformStyle: "preserve-3d" }}>
        {children}
      </div>
    </div>
  );
}

/* ---------------- video info window ---------------- */

function VideoInfoWindow() {
  const chips = [
    { icon: Clock, value: "1:10" },
    { icon: ArrowDownToLine, value: "9MB" },
    { icon: Mountain, value: "1920×1080" },
    { icon: SlidersHorizontal, value: "MPEG4, H.264" },
  ];
  return (
    <WindowFrame title="montage_final.mp4" className="w-64">
      <div className="p-5">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
            <Info className="h-3.5 w-3.5 text-white/70" />
          </span>
          <p className="font-codec-bold text-base tracking-[-0.03em] text-white">Informations</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {chips.map((c, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 ${
                i >= 2 ? "w-full" : ""
              }`}
            >
              <c.icon className="h-4 w-4 shrink-0 text-white/50" />
              <span className="font-codec text-sm tracking-[-0.02em] text-white/80">{c.value}</span>
            </span>
          ))}
        </div>
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

function TypingDots({ from }: { from: "client" | "skale" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`max-w-[85%] rounded-2xl px-3 py-2 ${
        from === "client"
          ? "self-start rounded-bl-sm bg-white/10"
          : "self-end rounded-br-sm bg-[#e21b3c]"
      }`}
    >
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-white/80"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.55,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut",
            }}
          />
        ))}
      </span>
    </motion.div>
  );
}

function ClientChatWindow() {
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    if (step >= CHAT_MESSAGES.length) {
      setTyping(false);
      return;
    }
    const pauseBeforeType = step === 0 ? 400 : 1200;
    const typeDuration = 1600;
    const t1 = window.setTimeout(() => setTyping(true), pauseBeforeType);
    const t2 = window.setTimeout(() => {
      setTyping(false);
      setStep((s) => s + 1);
    }, pauseBeforeType + typeDuration);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [step]);

  return (
    <WindowFrame title="Micha — Espace client" className="w-72">
      <div className="flex h-56 flex-col justify-end gap-2 overflow-hidden p-4">
        <AnimatePresence initial={false}>
          {CHAT_MESSAGES.slice(0, step).map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-snug ${
                m.from === "client"
                  ? "self-start rounded-bl-sm bg-white/10 text-white"
                  : "self-end rounded-br-sm bg-[#e21b3c] text-white"
              }`}
            >
              <span className="font-codec tracking-[-0.02em]">{m.text}</span>
            </motion.div>
          ))}
          {typing && step < CHAT_MESSAGES.length && (
            <TypingDots key={`typing-${step}`} from={CHAT_MESSAGES[step].from} />
          )}
        </AnimatePresence>
      </div>
    </WindowFrame>
  );
}

/* ---------------- project status window ---------------- */

const PLATFORMS = [
  { name: "LinkedIn", icon: Linkedin },
  { name: "YouTube", icon: Youtube },
  { name: "Instagram", icon: Instagram },
  { name: "TikTok", icon: Music2 },
  { name: "Facebook", icon: Facebook },
];

function ProjectStatusWindow() {
  return (
    <WindowFrame title="AcmeLabs_023_VDEF.mp4" className="w-80">
      <div className="p-5">
        <p className="font-codec text-[13px] text-white/50">Micha · 11 sept. 2026</p>

        <div className="mt-6 space-y-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-white/80">
              <Flag className="h-4 w-4 shrink-0" />
              <span className="font-codec text-sm tracking-[-0.02em]">État de la vidéo</span>
            </div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-codec text-xs tracking-[-0.01em] text-white">
              Prêt à être publié
            </span>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-white/80">
              <MonitorPlay className="h-4 w-4 shrink-0" />
              <span className="font-codec text-sm tracking-[-0.02em]">Plateforme de publication</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 font-codec text-[11px] tracking-[-0.01em] text-white/90"
                >
                  <p.icon className="h-3 w-3 shrink-0" />
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="font-codec text-sm tracking-[-0.02em] text-white">Édition finale</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-white">
              <Check className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

/* ---------------- page ---------------- */

const SLOW_FLOAT = { duration: 11, repeat: Infinity, ease: "easeInOut" as const };

function VideoEditingPage() {
  useLightTheme();
  const [hoverBook, setHoverBook] = useState(false);
  const [hoverDiscover, setHoverDiscover] = useState(false);

  return (
    <div className="site-root relative min-h-screen overflow-x-hidden bg-white">
      <SiteNavbar />

      <main className="relative z-10">
        <section className="relative mx-auto flex min-h-[92vh] max-w-7xl items-center justify-center px-4 pb-24 pt-32 sm:px-6 lg:px-8">
          {/* floating windows — desktop, behind text, allowed to crop off-screen */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute -left-14 top-[20%] z-0 hidden flex-col gap-24 lg:flex"
          >
            <motion.div animate={{ y: [0, -14, 0] }} transition={SLOW_FLOAT}>
              <Tilt rotate={-6} rotateX={9}>
                <VideoInfoWindow />
              </Tilt>
            </motion.div>
            <motion.div
              animate={{ y: [0, -16, 0] }}
              transition={{ ...SLOW_FLOAT, duration: 13, delay: 1.5 }}
              className="ml-36"
            >
              <Tilt rotate={5} rotateX={8}>
                <ProjectStatusWindow />
              </Tilt>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="absolute -right-14 top-[26%] z-0 hidden lg:block"
          >
            <motion.div animate={{ y: [0, -14, 0] }} transition={{ ...SLOW_FLOAT, duration: 12, delay: 0.8 }}>
              <Tilt rotate={5} rotateX={9}>
                <ClientChatWindow />
              </Tilt>
            </motion.div>
          </motion.div>

          {/* centered hero */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-w-3xl flex-col items-center text-center"
          >
            <h1 className="text-4xl leading-[1.05] text-black sm:text-6xl lg:text-7xl">
              <span className="font-codec-bold tracking-[-0.06em]">On crée vos</span>
              <br />
              <span className="font-codec-bold tracking-[-0.06em] text-[#e21b3c]">contenus vidéo.</span>
            </h1>
            <p className="font-codec mt-5 max-w-[22rem] text-left text-lg leading-[1.18] tracking-[-0.06em] text-black sm:mx-auto sm:mt-3 sm:max-w-2xl sm:text-center sm:text-xl lg:text-2xl">
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
