import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight, Play, ChevronLeft, ChevronRight, Menu, X, AlertTriangle, Mail, MessageCircle, Instagram,
  PenLine, Scissors, TrendingUp, Sparkles,
} from "lucide-react";
import logoAsset from "@/assets/skale-logo.png.asset.json";

const ELECTRIC = "#1E90FF";
const CONTACT_HREF = "#contact";

export const Route = createFileRoute("/immobilier")({
  head: () => ({
    meta: [
      { title: "Skale Immobilier — Vidéo & Social Media pour agences" },
      { name: "description", content: "Accompagnement complet pour les agences immobilières : scripts, hooks, montage Reels et gestion de comptes pour faire exploser vos stats." },
      { property: "og:title", content: "Skale Immobilier — Vidéo & Social Media" },
      { property: "og:description", content: "Scripts, hooks, montage, gestion de comptes. On propulse les agences immobilières sur les réseaux." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Immobilier,
});

function ConstructionBanner() {
  return (
    <div
      className="w-full text-black text-center text-sm font-semibold py-2.5 px-4 flex items-center justify-center gap-2"
      style={{ background: "linear-gradient(90deg, #FFD54A, #FFB800, #FFD54A)" }}
      role="alert"
    >
      <AlertTriangle className="w-4 h-4" />
      <span>Cette partie est en travaux — pas accessible pour le moment.</span>
      <AlertTriangle className="w-4 h-4" />
    </div>
  );
}

function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.15 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Logo({ size = 36 }: { size?: number }) {
  return (
    <img
      src={logoAsset.url}
      alt="Skale Immobilier"
      width={size}
      height={size}
      style={{ filter: `drop-shadow(0 0 12px ${ELECTRIC}99)` }}
      className="object-contain"
    />
  );
}

const NAV_LINKS = [
  { label: "Nos Reels", href: "#reels" },
  { label: "Notre accompagnement", href: "#methode" },
  { label: "Contact", href: "#contact" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const navigate = useNavigate();
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => navigate({ to: "/" }), 550);
  };
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${scrolled ? "py-3" : "py-4"}`}>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
        <a href="/" onClick={handleLogoClick} className="flex items-center gap-2.5 shrink-0 group cursor-pointer" style={{ perspective: 800 }}>
          <motion.span
            animate={{ rotateY: flipping ? 360 : 0, scale: flipping ? 1.15 : 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block group-hover:scale-110 group-active:scale-95 transition-transform"
            style={{ transformStyle: "preserve-3d" }}
          >
            <Logo size={36} />
          </motion.span>
          <span className="font-extrabold text-lg tracking-tight">
            Skale <span style={{ color: ELECTRIC }}>Immobilier</span>
          </span>
        </a>
        <nav className="hidden lg:flex liquid-glass rounded-full px-2 py-1.5 absolute left-1/2 -translate-x-1/2">
          <ul className="flex items-center gap-1 whitespace-nowrap leading-none">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="block px-3.5 py-1.5 text-sm text-white/85 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={CONTACT_HREF}
            className="hidden sm:inline-flex items-center gap-2 liquid-glass rounded-full px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
          >
            Devis agence <ArrowRight className="w-4 h-4" style={{ color: ELECTRIC }} />
          </a>
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu" className="lg:hidden liquid-glass rounded-full p-2.5 text-white">
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden absolute top-full left-4 right-4 mt-2 liquid-glass rounded-2xl p-3 flex flex-col gap-1 origin-top"
            >
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm text-white/90 hover:bg-white/10 rounded-lg">
                  {l.label}
                </a>
              ))}
              <a
                href={CONTACT_HREF}
                onClick={() => setOpen(false)}
                className="mt-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-black"
                style={{ background: ELECTRIC }}
              >
                Devis agence <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            `radial-gradient(ellipse 60% 50% at 50% 0%, ${ELECTRIC}33, transparent 60%), radial-gradient(ellipse 40% 40% at 80% 30%, ${ELECTRIC}22, transparent 60%)`,
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 pt-10 pb-6 lg:pt-16 lg:pb-10 text-center">
        <FadeIn>
          <div className="inline-flex items-center gap-2.5 text-sm text-white/85">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ background: ELECTRIC }}
              />
              <span
                className="relative inline-flex rounded-full h-2.5 w-2.5"
                style={{ background: ELECTRIC }}
              />
            </span>
            Nouvelle branche · Skale Visuals Immobilier
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-7xl font-black text-balance max-w-5xl mx-auto leading-[1.05]">
            On propulse les agences immo pour qu'elles{" "}
            <span className="font-script text-5xl sm:text-6xl lg:text-8xl" style={{ color: ELECTRIC }}>attirent</span>,{" "}
            <span className="font-script text-5xl sm:text-6xl lg:text-8xl" style={{ color: ELECTRIC }}>convertissent</span> et{" "}
            <span className="font-script text-5xl sm:text-6xl lg:text-8xl" style={{ color: ELECTRIC }}>explosent</span>.
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="mt-5 max-w-3xl mx-auto text-base sm:text-lg text-muted-foreground text-balance">
            Ce n'est pas juste du montage. On écrit les scripts et les hooks, on monte vos Reels, et on
            gère vos comptes de A à Z pour faire exploser vos stats — et vos ventes.
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={CTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3.5 rounded-full text-black transition-transform hover:scale-[1.03]"
              style={{ background: ELECTRIC, boxShadow: `0 10px 40px -10px ${ELECTRIC}` }}
            >
              Booster mon agence <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#reels" className="inline-flex items-center gap-2 liquid-glass text-white font-semibold px-6 py-3.5 rounded-full">
              Voir les Reels
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              { icon: PenLine, label: "Scripts & hooks écrits pour vous" },
              { icon: Scissors, label: "Montage Reels premium" },
              { icon: TrendingUp, label: "Gestion de comptes complète" },
              { icon: Sparkles, label: "Croissance mesurée & garantie" },
            ].map((p) => (
              <div
                key={p.label}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-white/[0.03] text-sm text-white/85"
                style={{ borderColor: `${ELECTRIC}55` }}
              >
                <p.icon className="w-4 h-4" style={{ color: ELECTRIC }} /> {p.label}
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function ReelsDeck() {
  const slides = [
    { id: "r1", title: "Visite immersive T4 Paris 16e", label: "Reel · 0:28" },
    { id: "r2", title: "Hook agence — closing 48h", label: "Reel · 0:15" },
    { id: "r3", title: "Témoignage vendeur satisfait", label: "Reel · 0:34" },
    { id: "r4", title: "Coulisses négociation off-market", label: "Reel · 0:22" },
    { id: "r5", title: "Top 3 quartiers qui montent", label: "Reel · 0:41" },
    { id: "r6", title: "Avant / Après home staging", label: "Reel · 0:19" },
  ];
  const len = slides.length;
  const [idx, setIdx] = useState(0);
  const next = () => setIdx((i) => (i + 1) % len);
  const prev = () => setIdx((i) => (i - 1 + len) % len);

  return (
    <section id="reels" className="relative py-12 lg:py-16 border-t border-white/5 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${ELECTRIC}22, transparent 60%)`,
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-balance">
              <span className="text-white">Les</span>{" "}
              <span className="font-script text-5xl sm:text-6xl lg:text-7xl" style={{ color: ELECTRIC }}>Reels</span>{" "}
              <span className="text-white">qui font vendre plus vite.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg text-balance">
              Format vertical, hook implacable, storytelling millimétré — nos Reels sont pensés pour
              générer du lead qualifié dès la première seconde.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-12 relative h-[560px] sm:h-[620px] flex items-center justify-center select-none [perspective:1600px]">
            <button
              onClick={prev}
              aria-label="Précédent"
              className="absolute left-2 sm:left-6 z-30 liquid-glass rounded-full p-3 text-white hover:bg-white/15 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              aria-label="Suivant"
              className="absolute right-2 sm:right-6 z-30 liquid-glass rounded-full p-3 text-white hover:bg-white/15 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="relative w-full h-full flex items-center justify-center [transform-style:preserve-3d]">
              {slides.map((s, i) => {
                const half = Math.floor(len / 2);
                let offset = ((i - idx) % len + len) % len;
                if (offset > half) offset -= len;
                const abs = Math.abs(offset);
                const x = offset * 130;
                const y = abs * 12;
                const scale = abs === 0 ? 1 : 0.86 - (abs - 1) * 0.06;
                const rotateY = offset * -12;
                const rotateZ = offset * -3;
                const opacity = abs > 3 ? 0 : abs === 0 ? 1 : 0.75 - (abs - 1) * 0.15;
                const z = 50 - abs;
                return (
                  <motion.div
                    key={s.id}
                    initial={false}
                    animate={{ x, y, scale, rotateY, rotateZ, opacity }}
                    transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      zIndex: z,
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      translateX: "-50%",
                      translateY: "-50%",
                      transformStyle: "preserve-3d",
                      transformOrigin: "center center",
                    }}
                    onClick={() => offset !== 0 && setIdx(i)}
                    className={offset !== 0 ? "cursor-pointer" : ""}
                  >
                    <div
                      className="group relative w-[240px] sm:w-[280px] aspect-[9/16] rounded-[1.75rem] overflow-hidden border bg-gradient-to-br from-sky-900/60 via-blue-950/70 to-black"
                      style={{
                        borderColor: `${ELECTRIC}66`,
                        boxShadow: `0 40px 80px -20px ${ELECTRIC}55`,
                      }}
                    >
                      <div
                        className="absolute inset-0 pointer-events-none opacity-30"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(255,255,255,0.05) 3px, transparent 4px)",
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="w-14 h-14 rounded-full backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                          style={{ background: `${ELECTRIC}33` }}
                        >
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                      <div
                        className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur text-[10px] font-bold uppercase tracking-widest border pointer-events-none"
                        style={{ color: ELECTRIC, borderColor: `${ELECTRIC}55` }}
                      >
                        {s.label}
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                        <p className="text-sm font-semibold text-white drop-shadow-lg">{s.title}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Aller à la slide ${i + 1}`}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === idx ? 24 : 6,
                    background: i === idx ? ELECTRIC : "rgba(255,255,255,0.3)",
                  }}
                />
              ))}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.25}>
          <div className="mt-8 text-center" id="contact">
            <a
              href={CTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3.5 rounded-full text-black transition-transform hover:scale-[1.03]"
              style={{ background: ELECTRIC, boxShadow: `0 10px 40px -10px ${ELECTRIC}` }}
            >
              Je veux propulser mon agence <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function Immobilier() {
  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <Hero />
      <ReelsDeck />
      <footer className="py-8 text-center text-xs text-muted-foreground border-t border-white/5">
        © Skale Visuals Immobilier — {new Date().getFullYear()}
      </footer>
    </div>
  );
}
