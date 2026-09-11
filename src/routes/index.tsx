import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useInView, useScroll, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mail, Instagram, Linkedin, Check, ArrowUpRight, BarChart3, Zap, PartyPopper } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteNavbar, SlotMachineText, scrollTo } from "@/components/SiteNavbar";
import skaleSymbol from "@/assets/skale-symbol.png.asset.json";
import skaleRedPill from "@/assets/skale-red-pill.png.asset.json";
import cardMontage from "@/assets/card-montage.png.asset.json";
import cardDesign from "@/assets/card-design.png.asset.json";
import {
  DEFAULT_HOME_SETTINGS,
  getHomeContent,
  type HomeContent,
  type HomeFolder,
  type HomeVideo,
} from "@/lib/home-content.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skale Visuals - Ton Agence de Création Digitale N°1" },
      {
        name: "description",
        content:
          "L'agence de création digitale spécialisée en montage, clipping et design qui n'ont qu'un seul but : convertir.",
      },
      { property: "og:title", content: "Skale Visuals - Ton Agence de Création Digitale N°1" },
      {
        property: "og:description",
        content: "L'agence de création digitale spécialisée en montage, clipping et design qui n'ont qu'un seul but : convertir.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://skalevisuals.com/" },
      { property: "og:image", content: "https://skalevisuals.com/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Skale Visuals - Ton Agence de Création Digitale N°1" },
      {
        name: "twitter:description",
        content: "L'agence de création digitale spécialisée en montage, clipping et design qui n'ont qu'un seul but : convertir.",
      },
      { name: "twitter:image", content: "https://skalevisuals.com/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://skalevisuals.com/" }],
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

/* ---------------- helpers ---------------- */

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.15, once: true });
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

function ServiceDiscoverCta({ to }: { to: string }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="group font-codec-bold inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-neutral-500 bg-black px-4 py-2 text-xs uppercase tracking-wide text-white transition-all duration-200 ease-out hover:scale-[1.09] hover:bg-black/90 hover:shadow-[0_18px_40px_-10px_rgba(0,0,0,0.45)] active:scale-[0.97] sm:text-sm"
    >
      <SlotMachineText text="DÉCOUVRIR" active={hover} />
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-45 sm:h-4 sm:w-4" />
    </Link>
  );
}

function ServiceCards() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.15, once: true });

  const cards = [
    {
      image: cardMontage,
      alt: "Montage vidéo stratégique",
      link: "/videoediting",
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
      link: "/design",
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
                <ServiceDiscoverCta to={card.link} />
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
  const inView = useInView(ref, { amount: 0.2, once: true });

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
  const inView = useInView(ref, { amount: 0.3, once: true });
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
  const inView = useInView(ref, { amount: 0.3, once: true });

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
            className="h-8 w-auto rounded-md object-contain shadow-lg sm:h-9"
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
  const inView = useInView(ref, { amount: 0.15, once: true });

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
              className={`group relative flex min-h-[360px] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)] transition-transform duration-500 ease-out hover:scale-[1.02] ${i === 0 ? "hover:-rotate-1" : "hover:rotate-1"} sm:min-h-[420px] lg:min-h-[480px]`}
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

/* ---------------- récap projets footer ---------------- */

function ProjectRecapFooter() {
  const [hoverMore, setHoverMore] = useState(false);
  const [hoverBook, setHoverBook] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto -mt-6 w-full max-w-6xl px-4 pb-8 sm:-mt-8 sm:pb-10"
    >
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => scrollTo("projets")}
          onMouseEnter={() => setHoverMore(true)}
          onMouseLeave={() => setHoverMore(false)}
          onFocus={() => setHoverMore(true)}
          onBlur={() => setHoverMore(false)}
          className="group font-codec-bold inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-gray-600 bg-black px-5 py-2.5 text-xs uppercase tracking-wide text-white transition-all duration-200 ease-out hover:scale-[1.09] hover:bg-black/90 hover:shadow-[0_18px_40px_-10px_rgba(0,0,0,0.45)] active:scale-[0.97] sm:text-sm"
        >
          <SlotMachineText text="EN VOIR PLUS" active={hoverMore} />
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-45" />
        </button>

        <div className="mt-20 flex flex-col items-center gap-1 sm:mt-32 sm:gap-2">
          <div className="text-center">
            <h2 className="font-codec-bold text-3xl leading-[1.1] tracking-[-0.06em] sm:text-4xl lg:text-5xl">
              <span className="block text-neutral-900">Livraison ultra-rapide,</span>
              <span className="block text-primary">satisfaction garantie</span>
            </h2>
          </div>

          <Link
            to="/bookacall"
            onMouseEnter={() => setHoverBook(true)}
            onMouseLeave={() => setHoverBook(false)}
            onFocus={() => setHoverBook(true)}
            onBlur={() => setHoverBook(false)}
            className="group font-codec-bold inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-gray-600 bg-black px-5 py-2.5 text-xs uppercase tracking-wide text-white transition-all duration-200 ease-out hover:scale-[1.09] hover:bg-black/90 hover:shadow-[0_18px_40px_-10px_rgba(0,0,0,0.45)] active:scale-[0.97] sm:text-sm"
          >
            <SlotMachineText text="RÉSERVER UN APPEL" active={hoverBook} />
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-45" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- processus étape par étape ---------------- */

const PROCESS_STEPS = [
  {
    day: "Jour 1",
    title: "Appel découverte",
    description:
      "On se prévoit un appel 100% gratuit de 30 minutes, sans engagement. On analyse ton contenu actuel, on discute de tes idées et on précise tes objectifs, ta niche et ton projet pour comprendre comment t'aider au mieux.",
    icons: ["📞", "💬", "✨"],
  },
  {
    day: "Jour 2",
    title: "Brief & stratégie",
    description:
      "On prépare un devis adapté à tes besoins, puis on se revoit en appel pour affiner les stratégies et l'accompagnement. Tu nous partages tes inspirations, ta direction artistique et ton angle créatif pour qu'on parte sur une base solide.",
    icons: ["💡", "🎨", "⭐"],
  },
  {
    day: "Jour 3",
    title: "Création",
    description:
      "Selon ton besoin, notre équipe monte ta vidéo ou designe tes visuels. Chaque création est pensée pour capter l'attention dès les premières secondes.",
    icons: ["🎬", "✂️", "🎵"],
  },
  {
    day: "Jour 6",
    title: "Révisions illimitées",
    description:
      "Tu nous fais tes retours directement dans ton espace client : tout est centralisé sans logiciel externe, pour des échanges simples et efficaces. On ajuste jusqu'à ce que tu sois 100% satisfait.",
    icons: ["🪄", "❤️", "📷"],
  },
  {
    day: "Jour 7",
    title: "Livraison",
    description:
      "Une fois validés, tes fichiers finaux te sont livrés prêts à publier directement dans ton espace client. Rapide, simple, sans prise de tête.",
    icons: ["📦", "🚀", "🎞️"],
  },
];

const FLOAT_POS_LEFT = [
  "left-2 -top-8 rotate-[-14deg] sm:left-2 sm:-top-10",
  "right-2 -top-8 rotate-[10deg] sm:right-8 sm:-top-11",
  "left-1/2 -bottom-6 -translate-x-1/2 rotate-[8deg] sm:left-8 sm:-bottom-8",
];

const FLOAT_POS_RIGHT = [
  "right-2 -top-8 rotate-[14deg] sm:right-2 sm:-top-10",
  "left-2 -top-8 rotate-[-10deg] sm:left-8 sm:-top-11",
  "left-1/2 -bottom-6 -translate-x-1/2 rotate-[-8deg] sm:right-8 sm:-bottom-8",
];

function ProcessStep({
  step,
  index,
}: {
  step: (typeof PROCESS_STEPS)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: true });
  const left = index % 2 === 0;
  const floatPos = left ? FLOAT_POS_LEFT : FLOAT_POS_RIGHT;

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`relative max-w-md ${left ? "sm:ml-auto sm:pr-16 sm:text-right" : "sm:mr-auto sm:pl-16 sm:text-left"} pl-14 text-left sm:pl-0`}
    >
      {/* emojis flottants */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
        {step.icons.map((emoji, i) => (
          <motion.span
            key={i}
            className={`absolute ${floatPos[i]} ${i === 2 ? "hidden sm:block" : ""}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={inView ? { opacity: 0.95, scale: 1, y: [0, -7, 0] } : undefined}
            transition={{
              opacity: { duration: 0.5, delay: 0.2 + i * 0.1 },
              scale: { duration: 0.5, delay: 0.2 + i * 0.1 },
              y: { duration: 3.6 + i, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <span className="block text-lg leading-none sm:text-2xl">{emoji}</span>
          </motion.span>
        ))}
      </div>

      <div className={`flex items-center gap-3 ${left ? "sm:justify-end" : "sm:justify-start"}`}>
        <span className="font-codec-bold flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-white shadow-[0_8px_20px_-8px_rgba(226,75,74,0.8)]">
          {index + 1}
        </span>
        <h3 className="font-codec-bold text-2xl tracking-[-0.03em] text-neutral-900 sm:text-3xl">
          {step.title}
        </h3>
      </div>
      <p className="font-codec-bold mt-2 text-xs uppercase tracking-[0.2em] text-primary">
        {step.day}
      </p>
      <p className="mt-3 text-base leading-relaxed text-neutral-600 sm:text-lg">
        {step.description}
      </p>
    </motion.div>
  );

  return (
    <div ref={ref} className="relative">
      <div className="grid sm:grid-cols-2">
        {left ? (
          <>
            <div className="sm:contents">{content}</div>
            <div className="hidden sm:block" />
          </>
        ) : (
          <>
            <div className="hidden sm:block" />
            <div className="sm:contents">{content}</div>
          </>
        )}
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ["#E24B4A", "#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899"];

function ConfettiBurst({ fire }: { fire: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 520,
        y: -(80 + Math.random() * 220),
        rotate: Math.random() * 720 - 360,
        delay: Math.random() * 0.35,
        duration: 1.6 + Math.random() * 1.1,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 6 + Math.random() * 5,
        h: 10 + Math.random() * 8,
      })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 flex justify-center">
      {fire &&
        pieces.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-[2px]"
            style={{ width: p.w, height: p.h, backgroundColor: p.color }}
            initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              x: p.x,
              y: [0, p.y, p.y + 260],
              rotate: p.rotate,
            }}
            transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          />
        ))}
    </div>
  );
}

function ProcessOutro() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.6, once: true });

  return (
    <div ref={ref} className="relative mt-16 sm:mt-20">
      <ConfettiBurst fire={inView} />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto max-w-2xl text-center"
      >
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={inView ? { scale: 1, rotate: 0 } : undefined}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_16px_40px_-12px_rgba(226,75,74,0.8)]"
        >
          <PartyPopper className="h-7 w-7" />
        </motion.span>
        <h3 className="font-codec-bold mt-6 text-2xl leading-[1.15] tracking-[-0.04em] text-neutral-900 sm:text-4xl">
          Et voilà, en quelques jours seulement tu as ton{" "}
          <span className="text-primary">montage vidéo et tes visuels livrés</span>, prêts à publier.
        </h3>
      </motion.div>
    </div>
  );
}

const SERVICES_WORDS = [
  "Montage vidéo",
  "Miniature",
  "Clipping",
  "Graphisme",
  "Shorts & Reels",
  "Branding",
  "Motion design",
];

function ServicesMarquee() {
  const items = [...SERVICES_WORDS, ...SERVICES_WORDS];
  return (
    <div className="marquee always-scroll ticker-fade relative mt-14 overflow-hidden sm:mt-16">
      <div className="marquee-track-fast flex w-max items-center gap-3 py-2 pr-3 sm:gap-4 sm:pr-4">
        {items.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-neutral-100 bg-white px-3 py-2 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.08)] sm:gap-2.5 sm:rounded-2xl sm:px-4 sm:py-2.5"
          >
            <Check className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" strokeWidth={3} />
            <span className="font-codec whitespace-nowrap text-sm tracking-[-0.01em] text-neutral-800 sm:text-base">
              {word}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ProcessSteps() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.75", "end 0.6"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 500, damping: 40, mass: 0.05 });

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:pb-24 sm:pt-10">
      <div ref={ref} className="relative">
        {/* ligne de fond épaisse */}
        <div className="absolute bottom-0 left-5 top-0 w-[6px] -translate-x-1/2 rounded-full bg-neutral-200/80 sm:left-1/2" />
        {/* progression rouge au scroll */}
        <motion.div
          style={{ scaleY: progress }}
          className="absolute bottom-0 left-5 top-0 w-[6px] origin-top -translate-x-1/2 rounded-full bg-primary sm:left-1/2"
        />
        {/* point rouge plein qui descend avec la progression */}
        <motion.div
          style={{ top: useTransform(progress, [0, 1], ["0%", "100%"]) }}
          className="absolute left-5 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_0_6px_rgba(226,75,74,0.18)] sm:left-1/2"
        />
        <div className="flex flex-col gap-16 sm:gap-24">
          {PROCESS_STEPS.map((step, i) => (
            <ProcessStep key={step.title} step={step} index={i} />
          ))}
        </div>
      </div>

      <ProcessOutro />

      <ServicesMarquee />
    </section>
  );
}







/* ---------------- footer ---------------- */

function FooterLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src={skaleRedPill.url}
      alt=""
      aria-hidden="true"
      className={`h-24 w-auto rounded-md object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.30)] sm:h-28 lg:h-32 ${className}`}
    />
  );
}

const TIME_ZONES = [
  { city: "Paris", tz: "Europe/Paris" },
  { city: "Dubai", tz: "Asia/Dubai" },
  { city: "Tokyo", tz: "Asia/Tokyo" },
];

function formatZoneTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

function FooterTimezones() {
  const [times, setTimes] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let serverOffset = 0;
    let active = true;

    const update = () => {
      const officialNow = new Date(Date.now() + serverOffset);
      setTimes(TIME_ZONES.map((z) => formatZoneTime(officialNow, z.tz)));
    };

    const synchronize = async () => {
      const requestStartedAt = Date.now();
      try {
        const response = await fetch("/api/public/time", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { now?: number };
        if (!active || typeof payload.now !== "number") return;
        const requestFinishedAt = Date.now();
        const estimatedClientTime = requestStartedAt + (requestFinishedAt - requestStartedAt) / 2;
        serverOffset = payload.now - estimatedClientTime;
        update();
      } catch {
        // Keep the last synchronized offset if the connection is temporarily unavailable.
      }
    };

    void synchronize();
    update();
    const displayIntervalId = window.setInterval(update, 1_000);
    const synchronizationIntervalId = window.setInterval(() => void synchronize(), 5 * 60_000);

    return () => {
      active = false;
      window.clearInterval(displayIntervalId);
      window.clearInterval(synchronizationIntervalId);
    };
  }, []);

  return (
    <div className="flex gap-6 sm:gap-10">
      {TIME_ZONES.map((zone, i) => (
        <div key={zone.city} className="text-center sm:text-right">
          <div className="font-codec-light text-4xl leading-none tracking-[-0.04em] text-white/80 sm:text-5xl">
            {mounted ? times[i] ?? "—:—" : "—:—"}
          </div>
          <div className="font-codec-light mt-1.5 text-base tracking-[-0.04em] text-white/90 sm:text-xl">
            {zone.city}
          </div>
        </div>
      ))}
    </div>
  );
}

function FooterLogoMarquee({ settings }: { settings: HomeContent["settings"] }) {
  const logos = (settings.footerLogos ?? []).filter((item) => item.logo);
  if (!logos.length) return null;
  const repeated = [...logos, ...logos, ...logos, ...logos];
  return (
    <div className="marquee always-scroll relative mt-5 w-full overflow-hidden sm:mt-6 sm:w-5/12">
      <div
        className="trust-marquee-track flex w-max items-center gap-3 py-1 sm:gap-4"
        style={{ animationDuration: "14s" }}
      >
        {repeated.map((item, index) => (
          <div
            key={`footer-logo-${index}`}
            className="flex h-7 w-16 shrink-0 items-center justify-center sm:h-8 sm:w-20"
          >
            <img
              src={item.logo!}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SiteFooter({ settings }: { settings: HomeContent["settings"] }) {
  return (
    <footer className="relative z-10 w-full">
      <div className="relative w-full overflow-hidden rounded-t-[2.5rem] border-8 border-white/10 bg-[#030303] px-8 pt-10 pb-36 sm:rounded-t-[3rem] sm:pb-44 lg:rounded-t-[4rem] lg:px-14 lg:pt-12 lg:pb-52">
        <div className="relative z-10 flex flex-col items-start gap-6 sm:flex-row sm:items-start sm:justify-between">
          <FooterLogo />
          <FooterTimezones />
        </div>

        <div className="relative z-10">
          <FooterLogoMarquee settings={settings} />
        </div>

        <div className="relative z-10 mt-3 h-px w-32 bg-white/15 sm:mt-4 sm:w-48" />

        <div className="relative z-10 mt-5 flex flex-col gap-1.5 font-codec text-base tracking-[-0.04em] text-white/80 sm:text-lg">
          <a
            href="mailto:contact@skalevisuals.com"
            className="group flex items-center gap-2.5 transition-colors hover:text-white"
          >
            <Mail className="h-4 w-4 text-red-500 transition-transform group-hover:scale-110 sm:h-5 sm:w-5" />
            <span>contact@skalevisuals.com</span>
          </a>
          <a
            href="https://www.linkedin.com/company/skale-visuals"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-2.5 transition-colors hover:text-white"
          >
            <Linkedin className="h-4 w-4 text-sky-500 transition-transform group-hover:scale-110 sm:h-5 sm:w-5" />
            <span>LinkedIn</span>
          </a>
          <a
            href="https://www.instagram.com/skalevisuals"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-2.5 transition-colors hover:text-white"
          >
            <Instagram className="h-4 w-4 text-pink-500 transition-transform group-hover:scale-110 sm:h-5 sm:w-5" />
            <span>Instagram</span>
          </a>
        </div>

        <div className="relative z-10 mt-5 flex flex-col gap-2 py-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <p className="text-left text-xs leading-relaxed text-white/50 sm:text-sm">
            Copyright © 2026 - Skale Visuals pour The Skale Companies
            <br />
            Tous droits réservés.
          </p>
          <p className="text-left text-xs leading-relaxed text-white/50 sm:text-right sm:text-sm">
            Built in France by Skale Studio
            <br />
            Bientôt disponible à la commercialisation.
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex h-36 items-start justify-center overflow-hidden sm:h-44 lg:h-52">
          <img
            src={skaleRedPill.url}
            alt=""
            aria-hidden="true"
            className="h-auto w-[70vw] max-w-[46rem] rounded-md object-contain"
          />
        </div>
      </div>
    </footer>
  );
}

/* ---------------- page ---------------- */

function Home() {
  useLightTheme();
  const { settings } = useHomeContent();

  return (
    <div className="site-root relative min-h-screen">
      <SiteNavbar />
      <main className="relative z-10 w-full">
        <div className="mx-auto w-full max-w-6xl px-4">
          <Hero />
        </div>

        {/* Grande bulle noire — transition vers la rubrique suivante */}
        <section id="services" className="relative w-full scroll-mt-24">
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

        <div id="projets" className="scroll-mt-24">
          <BestRealisationsHeader />
        </div>

        <ProjectRecapCards settings={settings} />

        <ProjectRecapFooter />

        <div id="processus" className="scroll-mt-24">
          <ProcessSteps />
        </div>

      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}

