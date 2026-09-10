import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Mail, Instagram, Linkedin, AlertTriangle, Check, ChevronDown, ArrowUpRight, User, BarChart3, Zap } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import skaleSymbol from "@/assets/skale-symbol.png.asset.json";
import cardMontage from "@/assets/card-montage.png.asset.json";
import cardDesign from "@/assets/card-design.png.asset.json";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_HOME_SETTINGS,
  getHomeContent,
  type HomeContent,
  type HomeFolder,
  type HomeVideo,
} from "@/lib/home-content.functions";
import { getCompareContent } from "@/lib/compare-content.functions";
import { DEFAULT_COMPARE, type CompareContent } from "@/lib/compare-content.shared";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skale Visuals — Montage vidéo pour créateurs et marques" },
      {
        name: "description",
        content:
          "Déléguez votre montage vidéo à une équipe qui livre vite et bien : VSL, Ads, Shorts, Motion Design, Vlog et Podcast.",
      },
      { property: "og:title", content: "Skale Visuals — Montage vidéo pour créateurs et marques" },
      {
        property: "og:description",
        content: "Une équipe de montage qui livre vite et bien pendant que vous faites grossir votre activité.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

/* ---------------- theme (clair uniquement) ---------------- */

function useLightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("site-light");
    return () => root.classList.remove("site-light");
  }, []);
}

/* ---------------- data ---------------- */

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
      .channel("home-content")
      .on("postgres_changes", { event: "*", schema: "public", table: "home_folders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "home_videos" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return content;
}

/* ---------------- helpers ---------------- */

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.15 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}


function embedFor(url: string): { kind: "iframe" | "video" | "none"; src: string } {
  if (!url) return { kind: "none", src: "" };
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0&playsinline=1` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "iframe", src: `https://player.vimeo.com/video/${vm[1]}?autoplay=1` };
  const dr = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (dr) return { kind: "iframe", src: `https://drive.google.com/file/d/${dr[1]}/preview` };
  const loom = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  if (loom) return { kind: "iframe", src: `https://www.loom.com/embed/${loom[1]}?autoplay=1` };
  if (/^https?:\/\//i.test(url)) return { kind: "video", src: url };
  return { kind: "none", src: url };
}

function posterFor(video: HomeVideo | null): string | null {
  if (!video) return null;
  if (video.thumbnail_url) return video.thumbnail_url;
  const yt = video.source_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  const dr = video.source_url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (dr) return `https://drive.google.com/thumbnail?id=${dr[1]}&sz=w800`;
  return null;
}

/* ---------------- navbar ---------------- */

const NAV_LINKS = [
  { label: "Accueil", target: "top" },
  { label: "Nos réalisations", target: "realisations" },
  { label: "Réserver un call", target: "cta" },
];

function scrollTo(target: string) {
  if (typeof window === "undefined") return;
  if (target === "top") return window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function useScrollHeader() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 20) {
          setHidden(false);
        } else if (y > lastY) {
          setHidden(true);
        } else {
          setHidden(false);
        }
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}

function CenteredTopMenu() {
  const items = ["TEST", "TEST", "TEST", "TEST"];
  return (
    <nav className="pointer-events-auto absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 sm:gap-8 md:flex">
      {items.map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => undefined}
          className="font-codec text-sm tracking-[-0.04em] text-foreground/80 transition-colors duration-200 hover:text-foreground uppercase"
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [skaleHover, setSkaleHover] = useState(false);
  const [studioHover, setStudioHover] = useState(false);
  const [ctaHover, setCtaHover] = useState(false);
  const scrollHidden = useScrollHeader();
  const headerHidden = scrollHidden && !menuOpen && !mobileNavOpen;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 w-full py-3 md:py-4">
      <motion.div
        animate={{ y: headerHidden ? "-120%" : "0%" }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="relative mx-4 flex h-[60px] items-start justify-between rounded-2xl border border-black/[0.06] bg-white px-1 shadow-[0_14px_35px_-12px_rgba(0,0,0,0.28)] sm:mx-6 md:mx-0 md:h-auto md:w-full md:rounded-none md:border-0 md:bg-transparent md:px-6 md:shadow-none"
      >
        <motion.div
          whileHover={menuOpen ? undefined : { scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="pointer-events-auto relative h-13"
        >
          <div
            className={`absolute left-0 top-0 z-50 flex w-fit flex-col rounded-xl p-1 transition-colors duration-300 ${
              menuOpen
                ? "bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]"
                : "bg-transparent"
            }`}
          >
            <div className="flex items-center">
              <Link
                to="/"
                onMouseEnter={() => setSkaleHover(true)}
                onMouseLeave={() => setSkaleHover(false)}
                className="group flex h-11 items-center gap-2.5 rounded-lg px-2.5 transition-transform duration-300 ease-out hover:scale-[1.055]"
              >
                <motion.img
                  src={skaleSymbol.url}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-8 rounded-md object-cover drop-shadow-[0_4px_8px_rgba(0,0,0,0.30)]"
                  animate={skaleHover ? { rotate: -18, scale: 1.12 } : { rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 10, mass: 0.85 }}
                />
                <span
                  className={`font-codec-bold mt-1 text-[1.55rem] leading-none tracking-[-0.06em] ${
                    menuOpen ? "text-slate-900" : "text-foreground"
                  }`}
                >
                  skale
                </span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className={`ml-3 h-9 w-9 rounded-lg bg-transparent hover:bg-transparent ${
                  menuOpen ? "text-slate-500 hover:text-slate-900" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <motion.span
                  animate={{ rotate: menuOpen ? 180 : 0, y: menuOpen ? 1 : 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 16 }}
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  className="overflow-hidden pt-1 pb-2"
                >
                  <motion.button
                    type="button"
                    onClick={() => undefined}
                    onMouseEnter={() => setStudioHover(true)}
                    onMouseLeave={() => setStudioHover(false)}
                    aria-label="Skale Studio, bientôt disponible"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06, type: "spring", stiffness: 300, damping: 20 }}
                    className="group relative flex h-11 w-full cursor-default items-center gap-2.5 rounded-lg px-2.5 text-left transition-transform duration-300 ease-out hover:scale-[1.035]"
                  >
                    <motion.img
                      src={skaleSymbol.url}
                      alt=""
                      aria-hidden="true"
                      className="h-8 w-8 rounded-md object-cover drop-shadow-[0_4px_8px_rgba(0,0,0,0.30)]"
                      animate={studioHover ? { rotate: 14, scale: 1.12 } : { rotate: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 10, mass: 0.85 }}
                    />
                    <span
                      className={`font-codec-bold mt-1 text-[1.55rem] leading-none tracking-[-0.06em] ${
                        menuOpen ? "text-slate-400" : "text-muted-foreground"
                      }`}
                    >
                      studio
                    </span>
                    <span className="absolute right-1.5 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-semibold uppercase leading-none text-primary-foreground">
                      bientôt
                    </span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <CenteredTopMenu />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={mobileNavOpen ? "Fermer la navigation" : "Ouvrir la navigation"}
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((open) => !open)}
          className="pointer-events-auto mr-1 mt-2 grid h-10 w-10 place-items-center rounded-xl bg-transparent text-foreground hover:bg-foreground/5 md:hidden"
        >
          <span className="flex w-5 flex-col items-end gap-1.5" aria-hidden="true">
            <motion.span
              animate={mobileNavOpen ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }}
              className="block h-0.5 w-5 rounded-full bg-current"
            />
            <motion.span
              animate={mobileNavOpen ? { rotate: -45, y: -4, width: 20 } : { rotate: 0, y: 0, width: 14 }}
              className="block h-0.5 rounded-full bg-current"
            />
          </span>
        </Button>

        <AnimatePresence>
          {mobileNavOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 60 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 60 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="pointer-events-auto absolute inset-x-0 top-0 -z-10 overflow-hidden rounded-2xl border border-black/[0.06] bg-white px-2 pb-2 pt-[66px] shadow-[0_18px_45px_-14px_rgba(0,0,0,0.3)] md:hidden"
            >
              {["TEST", "TEST", "TEST", "TEST"].map((label, index) => (
                <Button
                  key={`${label}-${index}`}
                  type="button"
                  variant="ghost"
                  onClick={() => setMobileNavOpen(false)}
                  className="font-codec-bold h-12 w-full justify-start rounded-xl px-4 text-sm uppercase text-foreground hover:bg-foreground/5"
                >
                  {label}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMobileNavOpen(false)}
                className="font-codec-bold h-12 w-full justify-start gap-2 rounded-xl px-4 text-sm uppercase text-foreground hover:bg-foreground/5"
              >
                ESPACE CLIENT
                <User className="h-4 w-4" strokeWidth={2.5} />
              </Button>
              <Button asChild className="font-codec-bold mt-1 h-12 w-full rounded-xl border-2 border-dashed border-gray-600 bg-black text-sm uppercase text-white hover:bg-black/90">
                <Link
                  to="/bookacall"
                  onMouseEnter={() => setCtaHover(true)}
                  onMouseLeave={() => setCtaHover(false)}
                  onFocus={() => setCtaHover(true)}
                  onBlur={() => setCtaHover(false)}
                >
                  <SlotMachineText text="RÉSERVER UN APPEL" active={ctaHover} />
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                </Link>
              </Button>
            </motion.nav>
          )}
        </AnimatePresence>

        <div className="pointer-events-auto hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={() => undefined}
            className="font-codec-bold flex items-center gap-1.5 text-sm tracking-[-0.04em] text-foreground transition-colors duration-200 hover:text-foreground/80 uppercase"
          >
            espace client
            <User className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>

          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            <Link
              to="/bookacall"
              onMouseEnter={() => setCtaHover(true)}
              onMouseLeave={() => setCtaHover(false)}
              onFocus={() => setCtaHover(true)}
              onBlur={() => setCtaHover(false)}
              className="group font-codec-bold inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-gray-600 bg-black px-4 py-2 text-xs uppercase tracking-wide text-white transition-all duration-200 ease-out hover:scale-[1.09] hover:bg-black/90 hover:shadow-[0_18px_40px_-10px_rgba(0,0,0,0.45)] active:scale-[0.97] sm:text-sm"
            >
              <SlotMachineText text="RÉSERVER UN APPEL" active={ctaHover} />
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-45" />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </header>
  );
}

/* ---------------- hero ---------------- */

const ROTATING_WORDS = ["créateurs", "entrepreneurs", "agences", "startups", "médias", "boîtes"];
const WORD_INTERVAL_MS = 2600;

function RotatingWord({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, WORD_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [words.length]);

  return (
    <span
      className="mt-[-6px] inline-block align-middle"
      style={{ transform: "rotate(-2.5deg)", transformOrigin: "center center" }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="relative inline-block overflow-hidden rounded-xl border-[5px] border-dashed border-primary bg-white px-2.5 py-0.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18),0_4px_12px_-4px_rgba(226,75,74,0.12)] sm:px-3.5 sm:py-1"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={words[index]}
            layout
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            exit={{ y: "-110%" }}
            transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.9 }}
            className="block whitespace-nowrap font-codec-bold tracking-[-0.06em] text-foreground"
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </span>
  );
}

function SlotMachineText({ text, active }: { text: string; active: boolean }) {
  return (
    <span className="inline-flex items-center leading-none" aria-label={text}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          className="relative inline-block overflow-hidden"
          style={{ height: "1.25em", lineHeight: "1.25em" }}
        >
          <motion.span
            className="flex flex-col"
            animate={{ y: active ? "-50%" : "0%" }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
              delay: i * 0.018,
            }}
          >
            <span className="block">{char === " " ? "\u00A0" : char}</span>
            <span className="block">{char === " " ? "\u00A0" : char}</span>
          </motion.span>
        </span>
      ))}
    </span>
  );
}


function Hero() {
  const [hoverBook, setHoverBook] = useState(false);
  const [hoverDiscover, setHoverDiscover] = useState(false);

  return (
    <section className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-5 pb-12 pt-32 sm:min-h-[65vh] sm:pt-40 lg:pt-44">
      <div className="relative mx-auto w-full max-w-5xl text-left sm:text-center">
        <FadeIn delay={0.1}>
          <h1 className="flex flex-col items-start gap-0 font-codec-bold text-[2.1rem] leading-[1.05] tracking-[-0.06em] text-foreground sm:gap-2 sm:items-center sm:text-balance sm:leading-[1.1] sm:text-5xl lg:text-6xl">
            <span className="relative block sm:hidden">On optimise</span>
            <span className="relative block sm:hidden">le contenu de tes</span>
            <span className="relative hidden sm:block">On optimise le contenu de tes</span>
            <span className="relative mt-1 block sm:hidden"><RotatingWord words={ROTATING_WORDS} /></span>
            <span className="relative block text-primary sm:hidden">préféré(e)s</span>
            <span className="relative hidden items-start gap-3 sm:inline-flex">
              <RotatingWord words={ROTATING_WORDS} />
              <span className="inline-block text-primary">préféré(e)s</span>
            </span>
          </h1>
          <p className="font-codec mt-5 max-w-[22rem] text-left text-lg leading-[1.18] tracking-[-0.06em] text-black sm:mx-auto sm:mt-3 sm:max-w-2xl sm:text-center sm:text-xl lg:text-2xl">
            Skale Visuals, l'agence de création digitale spécialisée en montage, clipping et design qui n'ont qu'un seul but :{" "}
            <span className="font-codec-bold tracking-[-0.06em] text-black">convertir</span>.
          </p>

          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
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
              onClick={() => undefined}
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
        </FadeIn>
      </div>
    </section>
  );
}






/* ---------------- compact trust carousels ---------------- */

function TrustCarousels({ settings }: { settings: HomeContent["settings"] }) {
  const companies = settings.companies.filter((company) => company.name || company.logo);
  const creators = settings.creators.filter((creator) => creator.name || creator.photo);
  const repeatedCompanies = companies.length ? [...companies, ...companies, ...companies, ...companies] : [];
  const repeatedCreators = creators.length ? [...creators, ...creators, ...creators, ...creators] : [];

  return (
    <div className="w-full overflow-hidden">
      <p className="mx-auto mb-4 max-w-2xl px-6 text-center font-codec text-base tracking-[-0.06em] text-white sm:text-lg">
        Eux et <strong className="font-codec-bold tracking-[-0.06em]">+100 autres</strong> clients nous ont fait et nous font confiance
      </p>

      {companies.length > 0 && (
        <div className="marquee relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <div className="trust-marquee-track flex w-max items-center gap-5 py-1.5 sm:gap-8">
            {repeatedCompanies.map((company, index) => (
              <div key={`${company.name}-${index}`} className="flex h-8 w-20 shrink-0 items-center justify-center sm:h-9 sm:w-28">
                {company.logo ? (
                  <img src={company.logo} alt={company.name} className="max-h-full max-w-full object-contain brightness-0 invert" />
                ) : (
                  <span className="font-codec text-xs tracking-[-0.06em] text-white/70">{company.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {creators.length > 0 && (
        <div className="marquee relative mt-2 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <div className="trust-marquee-track-reverse flex w-max items-center gap-3 py-1.5 sm:gap-4">
            {repeatedCreators.map((creator, index) => (
              <div key={`${creator.name}-${index}`} className="flex w-40 shrink-0 items-center gap-2 sm:w-48">
                <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 sm:h-10 sm:w-10">
                  {creator.photo ? (
                    <img src={creator.photo} alt={creator.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-codec-bold text-xs text-white">{creator.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 text-left font-codec tracking-[-0.06em]">
                  <p className="truncate text-sm text-white">{creator.name}</p>
                  <p className="truncate text-xs text-white/50">{creator.audience}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- services ---------------- */

function ServiceBookCta() {
  const [hover, setHover] = useState(false);
  return (
    <Link
      to="/bookacall"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="group font-codec-bold inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-neutral-500 bg-black px-4 py-2 text-xs uppercase tracking-wide text-white transition-all duration-200 ease-out hover:scale-[1.09] hover:bg-black/90 hover:shadow-[0_18px_40px_-10px_rgba(0,0,0,0.45)] active:scale-[0.97] sm:text-sm"
    >
      <SlotMachineText text="RÉSERVER UN APPEL" active={hover} />
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-45 sm:h-4 sm:w-4" />
    </Link>
  );
}

function ServiceCards() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.15 });

  const cards = [
    {
      image: cardMontage,
      alt: "Montage vidéo stratégique",
      title: (
        <>
          <span className="font-codec tracking-[-0.06em]">Le </span>
          <span className="font-codec-bold tracking-[-0.06em]">montage stratégique</span>
          <span className="font-codec tracking-[-0.06em]">, conçu pour </span>
          <span className="font-codec-bold tracking-[-0.06em]">convertir</span>
          <span className="font-codec tracking-[-0.06em]">.</span>
        </>
      ),
      description:
        "Vidéos ultra-efficaces qui accrochent dès les premières secondes, retiennent l’attention et poussent chaque vue à l’action.",
    },
    {
      image: cardDesign,
      alt: "Design visuel",
      title: (
        <>
          <span className="font-codec tracking-[-0.06em]">Le </span>
          <span className="font-codec-bold tracking-[-0.06em]">design visuel</span>
          <span className="font-codec tracking-[-0.06em]">, conçu pour </span>
          <span className="font-codec-bold tracking-[-0.06em]">captiver</span>
          <span className="font-codec tracking-[-0.06em]"> et </span>
          <span className="font-codec-bold tracking-[-0.06em]">convaincre</span>
          <span className="font-codec tracking-[-0.06em]">.</span>
        </>
      ),
      description:
        "Miniatures et visuels sur mesure pour valoriser ton contenu, renforcer ta crédibilité et transformer tes visiteurs en clients.",
    },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto mt-10 w-full max-w-7xl px-4 sm:mt-12 lg:mt-16"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
        {cards.map((card) => (
          <div
            key={card.alt}
            className="relative flex min-h-[300px] flex-col overflow-hidden rounded-3xl border border-neutral-600/60 bg-black shadow-[0_24px_60px_-20px_rgba(255,255,255,0.10)] sm:min-h-[340px] md:min-h-[380px]"
          >
            <img
              src={typeof card.image === "string" ? card.image : card.image.url}
              alt={card.alt}
              width={1024}
              height={640}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-bottom"
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black from-0% via-black/80 via-[25%] via-black/30 via-[58%] to-transparent to-[100%]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/18 via-black/4 to-transparent backdrop-blur-[3px]" />

            <div className="relative mt-auto flex flex-col items-start p-5 text-left sm:p-6 lg:p-8">
              <h3 className="max-w-lg text-2xl leading-[1.05] tracking-[-0.06em] text-white sm:text-3xl lg:text-4xl">
                {card.title}
              </h3>
              <p className="font-codec mt-3 max-w-md text-base leading-snug tracking-[-0.06em] text-white line-clamp-3 sm:text-lg">
                {card.description}
              </p>
              <div className="mt-5">
                <ServiceBookCta />
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------------- avantages ---------------- */

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.134 1.585 5.929L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ServiceBenefits() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2 });

  const benefits = [
    {
      icon: BarChart3,
      title: "Révisions illimités",
      description: "Il n'y a aucune limite sur les modifications, jusqu'à ce que vous soyez 100% satisfaits.",
    },
    {
      icon: Zap,
      title: "Livraison ultra rapide",
      description: "Des créations uniques, réalisées pour vous et prêtes en quelques jours seulement (1ère version).",
    },
    {
      icon: WhatsAppIcon,
      title: "1 seul interlocuteur",
      description: "Un process direct pour livrer rapidement des contenus qui accrochent vraiment.",
    },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto mt-4 flex w-full max-w-6xl flex-col items-center px-7 sm:mt-6 sm:px-4 lg:mt-8"
    >
      <div className="grid w-full grid-cols-1 gap-12 text-center sm:grid-cols-2 sm:gap-10 sm:text-left lg:grid-cols-3 lg:gap-12">
        {benefits.map((b, i) => {
          const Icon = b.icon;
          return (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.6, delay: 0.08 * (i + 1), ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-3 sm:items-start"
            >
              <Icon className="h-6 w-6 text-primary" strokeWidth={1.8} />
              <h3 className="font-codec-bold text-xl leading-tight tracking-[-0.06em] text-white sm:text-2xl">
                {b.title}
              </h3>
              <p className="font-codec text-lg leading-snug tracking-[-0.06em] text-white sm:text-xl">
                {b.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function StarsRow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 16" width="96" height="16" fill="none" className={className} aria-hidden="true">
      <path
        fill="#E6B919"
        d="M7.18 1.178a1 1 0 0 1 1.64 0L10.647 3.8a1 1 0 0 0 .531.385l3.058.927a1 1 0 0 1 .507 1.56l-1.93 2.547a1 1 0 0 0-.202.624l.064 3.194a1 1 0 0 1-1.328.964l-3.018-1.047a1 1 0 0 0-.656 0L4.654 14a1 1 0 0 1-1.328-.964l.064-3.194a1 1 0 0 0-.203-.624L1.258 6.672a1 1 0 0 1 .508-1.56l3.057-.927a1 1 0 0 0 .53-.385zm20 0a1 1 0 0 1 1.64 0L30.647 3.8a1 1 0 0 0 .531.385l3.057.927a1 1 0 0 1 .508 1.56l-1.93 2.547a1 1 0 0 0-.202.624l.064 3.194a1 1 0 0 1-1.328.964l-3.018-1.047a1 1 0 0 0-.656 0L24.654 14a1 1 0 0 1-1.328-.964l.064-3.194a1 1 0 0 0-.203-.624l-1.929-2.547a1 1 0 0 1 .508-1.56l3.057-.927a1 1 0 0 0 .53-.385l1.826-2.622Zm20 0a1 1 0 0 1 1.64 0L50.648 3.8a1 1 0 0 0 .53.385l3.057.927a1 1 0 0 1 .508 1.56l-1.93 2.547a1 1 0 0 0-.202.624l.064 3.194a1 1 0 0 1-1.328.964l-3.018-1.047a1 1 0 0 0-.656 0L44.654 14a1 1 0 0 1-1.328-.964l.064-3.194a1 1 0 0 0-.203-.624l-1.929-2.547a1 1 0 0 1 .508-1.56l3.057-.927a1 1 0 0 0 .53-.385l1.826-2.622Zm20 0a1 1 0 0 1 1.64 0L70.648 3.8a1 1 0 0 0 .53.385l3.057.927a1 1 0 0 1 .508 1.56l-1.93 2.547a1 1 0 0 0-.202.624l.064 3.194a1 1 0 0 1-1.328.964l-3.018-1.047a1 1 0 0 0-.656 0L64.654 14a1 1 0 0 1-1.328-.964l.064-3.194a1 1 0 0 0-.203-.624l-1.929-2.547a1 1 0 0 1 .508-1.56l3.057-.927a1 1 0 0 0 .53-.385l1.826-2.622Zm20 0a1 1 0 0 1 1.64 0L90.648 3.8a1 1 0 0 0 .53.385l3.057.927a1 1 0 0 1 .508 1.56l-1.93 2.547a1 1 0 0 0-.202.624l.064 3.194a1 1 0 0 1-1.328.964l-3.018-1.047a1 1 0 0 0-.656 0L84.654 14a1 1 0 0 1-1.328-.964l.064-3.194a1 1 0 0 0-.203-.624l-1.929-2.547a1 1 0 0 1 .508-1.56l3.057-.927a1 1 0 0 0 .53-.385l1.826-2.622Z"
      />
    </svg>
  );
}

function TestimonialCta() {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={() => undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="group font-codec-bold inline-flex items-center justify-center rounded-md px-0 py-0 text-xs uppercase tracking-wide text-white transition-all duration-200 ease-out hover:scale-[1.09] active:scale-[0.97] sm:text-sm"
    >
      <SlotMachineText text="VOIR L'AVIS ENTIER" active={hover} />
    </button>
  );
}

function ClientTestimonial({ settings }: { settings: HomeContent["settings"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const t = settings.testimonial;
  if (!t.name && !t.photo && !t.quote) return null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
       className="mx-auto mt-20 flex w-full max-w-5xl flex-col items-center gap-6 px-6 text-center sm:mt-24 sm:flex-row sm:items-center sm:justify-center sm:gap-0 sm:px-4 sm:text-left"
    >
      <div className="flex shrink-0 flex-col items-center justify-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 sm:h-16 sm:w-16">
          {t.photo ? (
            <img src={t.photo} alt={t.name} className="h-full w-full object-cover" />
          ) : (
            <span className="font-codec-bold text-lg text-white">{(t.name || "?").charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 text-center">
          <p className="font-codec-bold text-base tracking-[-0.06em] text-white sm:text-lg">{t.name}</p>
          {t.role ? (
            <p className="font-codec text-sm tracking-[-0.06em] text-white/50">{t.role}</p>
          ) : null}
        </div>
      </div>

      <div className="hidden w-px shrink-0 self-stretch bg-white/15 sm:mx-14 sm:block" />

       <div className="flex max-w-2xl flex-col items-center sm:items-start">
        <StarsRow className="mb-3 h-4 w-24" />
         <p className="font-codec-bold text-center text-2xl leading-[1.15] tracking-[-0.06em] text-white sm:text-left sm:text-3xl lg:text-4xl">
          “{t.quote.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < t.quote.split("\n").length - 1 && <br />}
            </span>
          ))}”
        </p>
        <div className="mt-5">
          <TestimonialCta />
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- meilleures réalisations ---------------- */

function BestRealisationsHeader() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  return (
    <section className="w-full bg-white pt-16 pb-6 sm:pt-20 sm:pb-8 lg:pt-24 lg:pb-10">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex max-w-6xl flex-col items-center px-4 text-center"
      >
        <div className="flex items-center gap-2.5">
          <img
            src={skaleSymbol.url}
            alt=""
            aria-hidden="true"
            className="h-8 w-8 rounded-md object-cover shadow-lg sm:h-9 sm:w-9"
          />
          <span className="font-codec-bold mt-1 text-[1.55rem] leading-none tracking-[-0.06em] text-slate-900 sm:text-[1.75rem]">
            skale
          </span>
        </div>
        <h2 className="font-codec-bold mt-6 text-3xl tracking-[-0.06em] text-foreground sm:text-4xl lg:text-5xl">
          Nos meilleurs projets
        </h2>
      </motion.div>
    </section>
  );
}

/* ---------------- récap projets ---------------- */

function ProjectRecapCards({ settings }: { settings: HomeContent["settings"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.15 });

  const projects = settings.projects.slice(0, 2);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-6xl px-4 pb-10 sm:pb-14 lg:pb-20"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
        {projects.map((project, i) => {
          const hasImage = Boolean(project.image);
          return (
            <motion.div
              key={`${project.title}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.1 * (i + 1), ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex min-h-[360px] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)] transition-transform duration-500 ease-out hover:scale-[1.02] hover:rotate-1 sm:min-h-[420px] lg:min-h-[480px]"
            >
              {hasImage && (
                <>
                  <img
                    src={project.image ?? ""}
                    alt={project.title}
                    width={1024}
                    height={640}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black from-0% via-black/80 via-[28%] via-black/30 via-[62%] to-transparent to-[100%]" />
                </>
              )}

              <div className="relative mt-auto p-5 sm:p-6 lg:p-8">
                <div className="flex flex-col items-start gap-4">
                  <div className="shrink-0">
                    <div
                      className={`grid h-12 w-12 place-items-center overflow-hidden rounded-full shadow-lg sm:h-14 sm:w-14 ${
                        hasImage ? "border-2 border-white/20 bg-black/40 backdrop-blur-sm" : "border border-black/[0.06] bg-neutral-100"
                      }`}
                    >
                      {project.avatar ? (
                        <img
                          src={project.avatar}
                          alt={project.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className={`text-lg font-semibold ${hasImage ? "text-white/60" : "text-neutral-300"}`}>
                          {project.title.charAt(0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <h3
                      className={`font-codec-bold text-xl leading-[1.1] tracking-[-0.06em] sm:text-2xl lg:text-3xl ${
                        hasImage ? "text-white" : "text-neutral-900"
                      }`}
                    >
                      {project.title}
                    </h3>
                    <p
                      className={`font-codec mt-2 max-w-md text-sm leading-snug tracking-[-0.06em] sm:text-base ${
                        hasImage ? "text-white/80" : "text-neutral-600"
                      }`}
                    >
                      {project.description}
                    </p>
                    <span
                      className={`mt-4 inline-flex items-center self-start rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider sm:text-[11px] ${
                        hasImage
                          ? "border border-white/10 bg-white/10 text-white backdrop-blur-md"
                          : "bg-white text-neutral-900 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)]"
                      }`}
                    >
                      {project.badge}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ---------------- réalisations ---------------- */

function Realisations({ folders, videos }: { folders: HomeFolder[]; videos: HomeVideo[] }) {
  const [folderId, setFolderId] = useState<string | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const list = useMemo(() => {
    const arr = folderId === "all" ? videos : videos.filter((v) => v.folder_id === folderId);
    return [...arr].sort((a, b) => a.position - b.position);
  }, [videos, folderId]);

  useEffect(() => {
    setSelectedId(list[0]?.id ?? null);
    setPlaying(false);
  }, [list]);

  const selected = list.find((v) => v.id === selectedId) ?? null;
  const poster = posterFor(selected);
  const embed = selected ? embedFor(selected.source_url) : { kind: "none" as const, src: "" };

  return (
    <section id="realisations" className="scroll-mt-24 py-12">
      <FadeIn>
        <h2 className="text-center text-2xl font-medium text-foreground sm:text-3xl">Nos réalisations</h2>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="site-pill site-corner-glow mx-auto mt-8 max-w-[1120px] overflow-hidden rounded-2xl">
          {/* macOS title bar */}
          <div className="relative z-10 flex items-center border-b border-foreground/10 px-4 py-3">
            <div className="flex gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <p className="pointer-events-none absolute inset-x-0 text-center text-xs text-muted-foreground">
              Skale Visuals
            </p>
          </div>

          <div className="relative z-10 grid gap-0 md:grid-cols-[170px_minmax(0,1fr)_200px]">
            {/* folders */}
            <div className="border-b border-foreground/10 p-4 md:border-b-0 md:border-r">
              <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">Dossiers</p>
              <ul className="flex flex-wrap gap-1.5 md:block md:space-y-1">
                {[{ id: "all" as const, label: "Tous" }, ...folders].map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setFolderId(f.id as string)}
                      className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition ${
                        folderId === f.id
                          ? "bg-primary/15 text-foreground"
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* player */}
            <div className="p-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/60">
                {selected && playing && embed.kind === "iframe" ? (
                  <iframe
                    src={embed.src}
                    title={selected.title}
                    className="absolute inset-0 h-full w-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                ) : selected && playing && embed.kind === "video" ? (
                  <video src={embed.src} controls autoPlay className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <>
                    {poster ? (
                      <img src={poster} alt={selected?.title ?? ""} className="absolute inset-0 h-full w-full object-cover" />
                    ) : selected && embed.kind === "video" ? (
                      <video src={embed.src} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/25 to-black/60" />
                    )}
                    <button
                      type="button"
                      onClick={() => selected && setPlaying(true)}
                      aria-label="Lancer la vidéo"
                      className="absolute inset-0 grid place-items-center"
                    >
                      <span className="grid h-16 w-16 place-items-center rounded-full border border-white/25 bg-white/10 backdrop-blur-md transition hover:scale-110 hover:bg-primary/70">
                        <Play className="ml-0.5 h-6 w-6 fill-white text-white" />
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* video list */}
            <div className="border-t border-foreground/10 p-4 md:border-l md:border-t-0">
              <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">Vidéos</p>
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune vidéo pour l'instant.</p>
              ) : (
                <ul className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
                  {list.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(v.id);
                          setPlaying(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left transition ${
                          selectedId === v.id ? "bg-primary/15" : "hover:bg-foreground/5"
                        }`}
                      >
                        <span className="block truncate text-sm text-foreground">{v.title || "Sans titre"}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{v.author}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

/* ---------------- CTA ---------------- */

function CallCta() {
  return (
    <section id="cta" className="scroll-mt-24 px-5 pb-24 pt-6 text-center">
      <FadeIn>
        <div className="site-pill site-corner-glow mx-auto max-w-2xl rounded-3xl px-6 py-12 sm:px-10">
          <h2 className="text-balance text-3xl font-medium text-foreground sm:text-4xl">
            Prêt à faire décoller ta chaîne&nbsp;?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-balance text-sm text-muted-foreground sm:text-base">
            30 min en call. On analyse ton contenu, on identifie ce qui bloque, et on repart avec un plan
            de montage clair pour ta croissance.
          </p>
          <Link
            to="/bookacall"
            className="btn-glow mt-8 inline-flex items-center gap-2 rounded-full bg-primary-deep px-7 py-3.5 text-sm font-medium text-primary-foreground"
          >
            Réserve ton call
          </Link>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Places limitées chaque semaine
          </p>
        </div>
      </FadeIn>
    </section>
  );
}

/* ---------------- comparatif ---------------- */

function Comparatif() {
  const [content, setContent] = useState<CompareContent>(DEFAULT_COMPARE);

  const load = useCallback(() => {
    getCompareContent()
      .then(setContent)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("home-compare")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <section id="comparatif" className="scroll-mt-24 px-4 pb-20 pt-4">
      <FadeIn>
        <div className="text-center">
          <span className="site-surface inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {content.badge}
          </span>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance text-2xl font-medium text-foreground sm:text-3xl">
            {content.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
            {content.subtitle}
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="relative mx-auto mt-10 max-w-[1000px]">
          <div className="relative grid grid-cols-[minmax(96px,0.7fr)_1fr_1.15fr]">
            {/* floating Skale card shell — spans header + rows */}
            <div
              className="pointer-events-none absolute inset-y-[-12px] left-0 right-0 z-10 col-start-3 rounded-[26px] border border-primary/30 site-corner-glow bg-primary/[0.06]"
              style={{
                gridRow: `1 / span ${content.rows.length + 1}`,
                boxShadow: "0 20px 60px -20px color-mix(in oklab, var(--primary) 45%, transparent)",
              }}
            />

            {/* header */}
            <div className="relative z-20 col-start-1 border-b border-foreground/10" aria-hidden />
            <div className="relative z-20 col-start-2 border-b border-foreground/10 px-2 py-3 text-center text-base font-bold text-muted-foreground sm:text-lg sm:px-4">
              {content.otherLabel}
            </div>
            <div className="relative z-20 col-start-3 border-b border-foreground/10 px-2 py-3 text-center sm:px-4">
              <span className="font-codec-bold text-2xl text-white sm:text-3xl">
                {content.skaleLabel.endsWith(".") ? (
                  <>
                    {content.skaleLabel.slice(0, -1)}
                    <span className="text-primary">.</span>
                  </>
                ) : (
                  content.skaleLabel
                )}
              </span>
            </div>

            {/* rows */}
            {content.rows.map((row, i) => {
              const isLast = i === content.rows.length - 1;
              const borderClass = isLast ? "" : "border-b border-foreground/10";
              return (
                <div key={`${row.criterion}-${i}`} className="contents">
                  <div className={`relative z-20 flex items-center px-2 py-3 sm:px-4 sm:py-4 ${borderClass}`}>
                    <span className="text-base font-bold text-muted-foreground sm:text-lg">
                      {row.criterion}
                    </span>
                  </div>
                  <div className={`relative z-20 flex items-center gap-3 px-2 py-3 sm:px-4 sm:py-4 ${borderClass}`}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-foreground/20 bg-foreground/10 backdrop-blur-md">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </span>
                    <span className="text-sm font-bold text-muted-foreground sm:text-base">
                      {row.other}
                    </span>
                  </div>
                  <div className={`relative z-20 flex items-center gap-3 px-2 py-3 sm:px-4 sm:py-4 ${borderClass}`}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/20 backdrop-blur-md">
                      <Check className="h-4 w-4 text-primary" aria-hidden />
                    </span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-white sm:text-base">
                      {row.skaleTitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}





/* ---------------- footer ---------------- */

function SiteFooter() {
  return (
    <footer className="relative z-10">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="h-px w-full bg-foreground/[0.06]" />
      </div>
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-codec-bold text-3xl text-foreground">
              skale<span className="text-primary">.</span>
            </p>
            <div className="mt-4 space-y-2.5">
              <a
                href="mailto:contact@skalevisuals.com"
                className="flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
                contact@skalevisuals.com
              </a>
              <a
                href="https://www.instagram.com/skalevisuals/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
              >
                <Instagram className="h-4 w-4" />
                @skalevisuals
              </a>
              <a
                href="https://www.linkedin.com/company/skalevisuals/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn Skale Visuals"
                className="flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            </div>
          </div>

          <nav className="sm:text-right">
            <p className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">Navigation</p>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:justify-end">
              {NAV_LINKS.map((l) => (
                <li key={l.label}>
                  <button
                    type="button"
                    onClick={() => scrollTo(l.target)}
                    className="text-sm text-foreground/70 transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
              <li>
                <Link
                  to="/aboutus"
                  className="text-sm text-foreground/70 transition-colors hover:text-foreground"
                >
                  À propos
                </Link>
              </li>
            </ul>

          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-foreground/[0.06] pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© 2026 Skale Visuals. Tous droits réservés.</p>
          <p>Made in France by Madi Harrois</p>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- page ---------------- */

function Home() {
  useLightTheme();
  const { settings, folders, videos } = useHomeContent();

  return (
    <div className="site-root relative min-h-screen">
      <Navbar />
      <main className="relative z-10 w-full">
        <div className="mx-auto w-full max-w-6xl px-4">
          <Hero />
        </div>

        {/* Grande bulle noire — transition vers la rubrique suivante */}
        <section className="relative w-full">
          <div className="flex min-h-[80vh] w-full flex-col items-center justify-center rounded-[2.5rem] bg-[#030303] py-14 pb-16 text-center sm:rounded-[3rem] sm:py-16 sm:pb-20 lg:rounded-[4rem] lg:py-20 lg:pb-28">
            <div className="mb-8 w-full sm:mb-10">
              <TrustCarousels settings={settings} />
            </div>
            <h2 className="max-w-[19rem] px-2 text-3xl leading-[1.1] text-white sm:max-w-4xl sm:px-0 sm:text-4xl md:text-5xl lg:text-6xl">
              <span className="font-codec tracking-[-0.06em]">On transforme ton image de marque en contenu </span>
              <span className="font-codec-bold tracking-[-0.06em]">vidéo et visuel pensé pour </span>
              <span className="font-codec-bold tracking-[-0.06em] underline decoration-primary decoration-2 underline-offset-4">convertir & vendre</span>
              <span className="font-codec-bold tracking-[-0.06em]">.</span>
            </h2>
            <ServiceCards />
            <div className="my-8 h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 sm:my-9" />
            <ServiceBenefits />
            <ClientTestimonial settings={settings} />
          </div>
        </section>

        <BestRealisationsHeader />

        <ProjectRecapCards settings={settings} />

        <div className="mx-auto w-full max-w-6xl px-4">
          <Realisations folders={folders} videos={videos} />
          <CallCta />
          <Comparatif />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

