import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Play, Film, Sparkles, Zap, Palette, Check, Star, ChevronDown,
  ArrowRight, Type, Music, MessageCircle, Mail, Instagram, X,
  Upload, BarChart3, Send, Menu, ChevronLeft, ChevronRight,
  TrendingUp, Mic, Target,
} from "lucide-react";
import logoAsset from "@/assets/skale-logo.png.asset.json";
import arrowAsset from "@/assets/arrow-curl.png.asset.json";
import { listPublicVideos, type PublicVideo } from "@/lib/site-videos.functions";

const CTA_URL = "https://tally.so/r/PdPXRQ";
const WA_URL = "https://wa.me/33766766153?text=" + encodeURIComponent("Bonjour, je souhaite obtenir un devis pour mes vidéos.");
const MAIL_URL = "mailto:skalevisuals086@gmail.com";
const IG_URL = "https://instagram.com/skalevisuals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skale Visuals — Agence de Montage Vidéo" },
      { name: "description", content: "Montage vidéo qui captive, convertit et scale ton business. Livraison rapide, color grading, sous-titres et motion design inclus." },
      { property: "og:title", content: "Skale Visuals — Agence de Montage Vidéo" },
      { property: "og:description", content: "Montage vidéo qui scale ton business. Devis gratuit." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

// ---------- helpers ----------

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

function CountUp({ to, suffix = "", duration = 2 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("fr-FR") + suffix);
  useEffect(() => {
    if (inView) {
      const controls = animate(mv, to, { duration, ease: "easeOut" });
      return () => controls.stop();
    }
  }, [inView, to, duration, mv]);
  return <motion.span ref={ref}>{rounded}</motion.span>;
}

// ---------- portfolio thumbnail ----------

const THUMB_GRADIENTS = [
  "from-rose-700/40 via-red-800/30 to-rose-900/40",
  "from-red-600/40 via-rose-700/30 to-red-900/40",
  "from-rose-500/30 via-red-700/30 to-rose-900/40",
  "from-red-700/40 via-rose-800/30 to-red-950/40",
  "from-rose-600/40 via-red-700/30 to-rose-900/40",
  "from-red-500/40 via-rose-600/30 to-red-800/40",
];

function VideoThumb({ title, category, idx, size = "md" }: { title: string; category: string; idx: number; size?: "sm" | "md" | "lg" }) {
  const gradient = THUMB_GRADIENTS[idx % THUMB_GRADIENTS.length];
  const widths = { sm: "w-64", md: "w-80", lg: "w-96" };
  return (
    <div className={`${widths[size]} shrink-0 group cursor-pointer`}>
      <div className={`relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br ${gradient} card-hover`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6))]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-primary/90 group-hover:scale-110 transition-all duration-300">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
        <div className="absolute top-3 left-3">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-primary bg-black/50 backdrop-blur px-2 py-1 rounded-md border border-primary/30">
            {category}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-sm font-semibold text-white drop-shadow-lg truncate">{title}</p>
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
          backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(255,255,255,0.04) 3px, transparent 4px)"
        }}/>
      </div>
    </div>
  );
}

// ---------- live video thumb (DB-backed) ----------

function detectEmbed(url: string): { kind: "youtube" | "vimeo" | "drive" | "loom" | "streamable" | "video" | "image" | "none"; src: string } {
  if (!url) return { kind: "none", src: "" };
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=0&modestbranding=1&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0&color=white&autohide=1&enablejsapi=1&hd=1&vq=hd1080` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "vimeo", src: `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1&background=1&controls=0` };
  const dr = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (dr) return { kind: "drive", src: `https://drive.google.com/file/d/${dr[1]}/preview` };
  const loom = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  if (loom) return { kind: "loom", src: `https://www.loom.com/embed/${loom[1]}?autoplay=1&muted=1&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true&loop=true` };
  const stream = url.match(/streamable\.com\/(?:e\/)?([\w-]+)/);
  if (stream) return { kind: "streamable", src: `https://streamable.com/e/${stream[1]}?autoplay=1&muted=1&loop=1&nocontrols=1` };
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return { kind: "video", src: url };
  if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url)) return { kind: "image", src: url };
  // Fallback: try as direct video source (signed URLs without extension, CDN URLs, etc.)
  if (/^https?:\/\//i.test(url)) return { kind: "video", src: url };
  return { kind: "none", src: url };
}

function LiveVideoSurface({ video, btnSize = "md" }: { video: PublicVideo; btnSize?: "sm" | "md" }) {
  const { kind, src } = detectEmbed(video.source_url);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [iframeSrc, setIframeSrc] = useState(src);
  useEffect(() => { setIframeSrc(src); setPlaying(false); }, [src]);

  function togglePlay(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !playing;
    setPlaying(next);
    if (kind === "video" && videoRef.current) {
      const v = videoRef.current;
      if (next) { v.muted = false; v.volume = 0.5; v.play().catch(() => {}); }
      else { v.muted = true; v.play().catch(() => {}); }
    } else if (kind === "youtube" && iframeRef.current?.contentWindow) {
      const w = iframeRef.current.contentWindow;
      if (next) {
        w.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
        w.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [50] }), "*");
      } else {
        w.postMessage(JSON.stringify({ event: "command", func: "mute", args: [] }), "*");
      }
    } else if (kind === "vimeo" && iframeRef.current?.contentWindow) {
      const w = iframeRef.current.contentWindow;
      w.postMessage(JSON.stringify({ method: "setMuted", value: !next }), "*");
      w.postMessage(JSON.stringify({ method: "setVolume", value: next ? 0.5 : 0 }), "*");
    } else if (kind === "streamable" || kind === "loom") {
      // No reliable postMessage API: swap iframe src to toggle mute.
      setIframeSrc(src.replace(/muted=1/g, next ? "muted=0" : "muted=1"));
    }
  }

  const btn = btnSize === "sm" ? "w-12 h-12" : "w-14 h-14";
  const ic = btnSize === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <>
      {kind === "image" ? (
        <img src={src} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
      ) : kind === "video" ? (
        <video ref={videoRef} src={src} className="absolute inset-0 w-full h-full object-cover pointer-events-none" muted loop autoPlay playsInline preload="auto" />
      ) : kind !== "none" ? (
        kind === "youtube" ? (
          // Slight scale + overflow crop removes the small pause button and side
          // arrows that YouTube still renders inside the embed chrome. A transparent
          // hit-catcher sits above the iframe so YouTube never receives hover/focus
          // events that would trigger its own UI.
          <div className="absolute inset-0 overflow-hidden">
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              className="absolute inset-0 w-full h-full pointer-events-none"
              allow="autoplay; encrypted-media; picture-in-picture"
              tabIndex={-1}
              aria-hidden="true"
              onLoad={() => {
                const w = iframeRef.current?.contentWindow;
                if (!w) return;
                w.postMessage(JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["hd2160"] }), "*");
                w.postMessage(JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["highres"] }), "*");
              }}
            />
            {/* Block YT chrome from appearing on hover/focus */}
            <div className="absolute inset-0 z-10 pointer-events-auto" aria-hidden="true" />
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="absolute inset-0 w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )
      ) : video.thumbnail_url ? (
        <img src={video.thumbnail_url} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
      ) : null}
      {/* hover dim */}
      <div className="absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55))] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {/* source slides down */}
      {video.source_label && (
        <div className="absolute top-0 left-0 right-0 z-20 p-3 pointer-events-none -translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-primary bg-black/50 backdrop-blur px-2 py-1 rounded-md border border-primary/30">
            {video.source_label}
          </span>
        </div>
      )}
      {/* title slides up */}
      {video.title && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-3 pointer-events-none translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out">
          <p className="text-sm font-semibold text-white drop-shadow-lg truncate">{video.title}</p>
        </div>
      )}
      {/* play/pause button */}
      <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Mettre en pause" : "Lancer la vidéo"}
          className={`${btn} rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-primary/90 hover:scale-110 transition-all duration-300`}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className={`${ic} text-white fill-white`} aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <Play className={`${ic} text-white fill-white ml-0.5`} />
          )}
        </button>
      </div>
    </>
  );
}

function LiveVideoThumb({ video, idx, size = "md" }: { video: PublicVideo; idx: number; size?: "sm" | "md" | "lg" }) {
  const widths = { sm: "w-64", md: "w-80", lg: "w-96" };
  const gradient = THUMB_GRADIENTS[idx % THUMB_GRADIENTS.length];
  return (
    <div className={`${widths[size]} shrink-0 group cursor-pointer`}>
      <div className={`relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br ${gradient} card-hover`}>
        <LiveVideoSurface video={video} />
      </div>
    </div>
  );
}

function useSiteVideos() {
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  useEffect(() => {
    let alive = true;
    listPublicVideos().then((r) => { if (alive) setVideos(r.videos); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return videos;
}

// ---------- shared bits ----------

const NAV_LINKS = [
  { label: "Nos réalisations", href: "#realisations" },
  { label: "Comment ça marche", href: "#methode" },
  { label: "Avis", href: "#avis" },
  { label: "FAQ", href: "#faq" },
  { label: "Nous contacter", href: "#contact" },
];

function Logo({ size = 36 }: { size?: number }) {
  return (
    <img
      src={logoAsset.url}
      alt="Skale Visuals"
      width={size}
      height={size}
      style={{ filter: "drop-shadow(0 0 12px rgba(226,75,74,0.6))" }}
      className="object-contain"
    />
  );
}

// ---------- navbar ----------

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${scrolled ? "py-3" : "py-4"}`}>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left: logo */}
        <a href="#" className="flex items-center gap-2.5 shrink-0">
          <Logo size={36} />
          <span className="font-extrabold text-lg tracking-tight">Skale Visuals</span>
        </a>

        {/* Center: pill nav (absolute centered on desktop) */}
        <nav className="hidden lg:flex liquid-glass rounded-full px-2 py-1.5 absolute left-1/2 -translate-x-1/2">
          <ul className="flex items-center gap-1 whitespace-nowrap leading-none">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="block px-3.5 py-1.5 text-sm text-white/85 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right: CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={CTA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 liquid-glass rounded-full px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
          >
            Obtenir un devis <ArrowRight className="w-4 h-4 text-primary" />
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="lg:hidden liquid-glass rounded-full p-2.5 text-white"
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile menu */}
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
              {NAV_LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.2 }}
                  className="px-3 py-2.5 text-sm text-white/90 hover:bg-white/10 rounded-lg"
                >
                  {l.label}
                </motion.a>
              ))}
              <a
                href={CTA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-3 py-2.5 rounded-lg text-sm font-semibold"
              >
                Obtenir un devis <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

// ---------- hero ----------

function Hero() {
  const heroThumbs = [
    { t: "Lancement produit SaaS", c: "YouTube" },
    { t: "Formation 6 figures", c: "Formation" },
    { t: "Podcast Tech Weekly", c: "Podcast" },
    { t: "Pub Shopify Q4", c: "E-commerce" },
    { t: "Vlog voyage Bali", c: "YouTube" },
    { t: "Masterclass copy", c: "Formation" },
    { t: "Talk conférence", c: "Conférence" },
    { t: "Réel viral 2M vues", c: "Reels" },
  ];
  const liveVideos = useSiteVideos().filter((v) => v.carousel_key === "hero");

  return (
    <section data-section="accueil" className="relative overflow-hidden">
      <div className="absolute inset-0 cinematic-glow pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 pt-10 pb-6 lg:pt-16 lg:pb-8 text-center">
        <FadeIn>
          <div className="inline-flex items-center gap-2.5 text-sm text-white/85">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            Disponible dès maintenant
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-7xl font-black text-balance max-w-5xl mx-auto leading-[1.05]">
            On monte tes vidéos pour qu'elles{" "}
            <span className="font-script text-primary text-5xl sm:text-6xl lg:text-8xl">captivent</span>,{" "}
            <span className="font-script text-primary text-5xl sm:text-6xl lg:text-8xl">convertissent</span> et{" "}
            <span className="font-script text-primary text-5xl sm:text-6xl lg:text-8xl">scalent</span>.
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground text-balance">
            Montage professionnel, color grading, sous-titres, motion design — on s'occupe de tout pour que ton contenu soit irrésistible.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={CTA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-full btn-glow">
              Lancer mon projet <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#realisations" className="inline-flex items-center gap-2 liquid-glass text-white font-semibold px-6 py-3.5 rounded-full">
              Voir nos réalisations
            </a>
          </div>
        </FadeIn>
        <FadeIn delay={0.45}>
          <div className="mt-12 grid grid-cols-3 items-center gap-x-1 gap-y-6 max-w-3xl mx-auto">
            {[
              { n: 30, p: "+", l: "clients" },
              { n: 70, p: "+", l: "PROJETS" },
              { n: 4.8, s: "/5", l: "SATISFACTION" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl lg:text-3xl font-black text-primary">
                  {stat.p}
                  {Number.isInteger(stat.n)
                    ? <CountUp to={stat.n} />
                    : stat.n}
                  {stat.s}
                </div>
                <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{stat.l}</div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>

      {/* hero thumbnail strip — tight spacing */}
      <div className="relative marquee overflow-hidden py-2 mask-fade">
        <div className="flex gap-4 marquee-track w-max">
          {liveVideos.length > 0
            ? [...liveVideos, ...liveVideos].map((v, i) => (
                <LiveVideoThumb key={`${v.id}-${i}`} video={v} idx={i} size="md" />
              ))
            : [...heroThumbs, ...heroThumbs].map((t, i) => (
                <VideoThumb key={i} title={t.t} category={t.c} idx={i} size="md" />
              ))}
        </div>
      </div>
    </section>
  );
}

// ---------- social proof ----------

function SocialProof() {
  const liveAvis = useSiteVideos().filter((v) => v.carousel_key === "avis_video");
  const slots: (PublicVideo | null)[] = [liveAvis[0] ?? null, liveAvis[1] ?? null, liveAvis[2] ?? null];
  return (
    <section data-section="social-proof" className="relative py-12 lg:py-16">

      <div className="absolute inset-0 cinematic-glow-soft pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6 text-center">
        <FadeIn>
          <div className="flex items-center justify-center gap-2 text-sm text-white/80">
            <div className="flex gap-0.5 text-primary">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <span>Noté 4,8 sur 5 avec +80 avis</span>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-black text-balance leading-[1.05]">
            Plus de <CountUp to={30} /> clients<br className="hidden sm:block" /> nous ont déjà fait confiance.
          </h2>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground text-balance">
            Et leur watchtime n'a jamais été aussi haut depuis qu'on monte leurs vidéos.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5 max-w-xs sm:max-w-4xl mx-auto">
            {slots.map((v, i) => (
              <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-primary/25 bg-gradient-to-br from-red-950/60 via-rose-900/30 to-black card-hover cursor-pointer">
                <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(255,255,255,0.05) 3px, transparent 4px)" }} />
                {v ? (
                  <LiveVideoSurface video={v} />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55))] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none -translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out">
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-primary bg-black/50 backdrop-blur px-2 py-1 rounded-md border border-primary/30">
                        Avis client {i + 1}
                      </span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-primary/90 hover:scale-110 transition-all duration-300">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ---------- featured testimonial ----------

function FeaturedTestimonial() {
  return (
    <section data-section="temoignage" className="relative py-10 lg:py-12">
      <div className="absolute inset-0 cinematic-glow-soft pointer-events-none" />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <FadeIn>
          <div className="flex justify-center gap-1 text-primary mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
          </div>
          <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-medium italic text-white leading-snug text-balance">
            « Depuis qu'on travaille avec Skale Visuals, mes vidéos ont doublé leur rétention. Le montage est tellement propre que même mes concurrents me demandent avec qui je travaille. »
          </blockquote>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-rose-600 grid place-items-center font-bold">T</div>
            <div className="text-left">
              <div className="font-semibold">Thomas R.</div>
              <div className="text-sm text-muted-foreground">Créateur YouTube, 45k abonnés</div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ---------- why ----------

function WhySkale() {
  const features = [
    { icon: Film, title: "Montage Premium", desc: "Cuts dynamiques, transitions fluides, rythme maîtrisé. Tes spectateurs ne décrochent pas." },
    { icon: Palette, title: "Color Grading Cinématique", desc: "Une colorimétrie qui reflète ton univers de marque et donne du relief à chaque plan." },
    { icon: Zap, title: "Livraison Rapide", desc: "Fichier livré sous 24–48h pour les formats courts, avec révisions illimitées incluses." },
  ];
  const pills = [
    { icon: Sparkles, label: "Motion Design inclus" },
    { icon: Type, label: "Sous-titres dynamiques" },
    { icon: Music, label: "Musique & sound design" },
  ];
  return (
    <section data-section="services" className="relative py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-balance">
              On ne monte pas juste des vidéos.{" "}
              <span className="font-script text-primary text-4xl sm:text-5xl lg:text-6xl">On crée de l'impact.</span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              Chaque seconde de ta vidéo est pensée pour retenir l'attention et déclencher l'action.
            </p>
          </div>
        </FadeIn>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.1}>
              <div className="h-full p-6 rounded-2xl border border-white/10 bg-card/60 backdrop-blur card-hover">
                <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 grid place-items-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{f.title}</h3>
                <p className="mt-2 text-muted-foreground">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.3}>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {pills.map((p) => (
              <div key={p.label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-sm text-white/80">
                <p.icon className="w-4 h-4 text-primary" /> {p.label}
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ---------- how it works (recreated from screenshot) ----------

function HowItWorks() {
  const steps = [
    {
      n: "Étape 1",
      title: "Onboarding",
      icon: Upload,
      desc: "Tu nous envoies tes rushs, ton brief et tes références via notre formulaire. On analyse ta chaîne, ton ton et ton audience pour démarrer la production sur des bases solides.",
    },
    {
      n: "Étape 2",
      title: "Montage & peaufinage",
      icon: BarChart3,
      desc: "Notre équipe monte ta vidéo : cuts dynamiques, color grading cinématique, sous-titres, motion et sound design. Chaque détail est optimisé pour maximiser le watchtime.",
    },
    {
      n: "Étape 3",
      title: "Livraison & révisions",
      icon: Send,
      desc: "En 24 à 48h, tu reçois ta vidéo prête à publier. Les révisions sont illimitées via une plateforme commentable, jusqu'à ce que ce soit parfait.",
    },
  ];

  const stepArtwork = (i: number) => {
    if (i === 0) {
      return (
        <div className="relative w-full h-full grid place-items-center">
          {/* stacked card placeholders */}
          <div className="absolute w-44 h-28 rounded-xl border border-primary/40 bg-primary/10 rotate-[-10deg] translate-x-[-30px] translate-y-[-6px]" />
          <div className="absolute w-44 h-28 rounded-xl border border-primary/40 bg-primary/[0.08] rotate-[8deg] translate-x-[20px] translate-y-[-10px]" />
          <div className="relative w-48 h-28 rounded-xl border-2 border-dashed border-primary/60 bg-black/40 grid place-items-center">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/50 grid place-items-center">
              <Upload className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="absolute right-4 bottom-2 w-24 h-16 rounded-md overflow-hidden border border-primary/40 bg-gradient-to-br from-primary/40 to-rose-900/60 grid place-items-center rotate-6">
            <Play className="w-5 h-5 fill-white text-white" />
          </div>
        </div>
      );
    }
    if (i === 1) {
      return (
        <div className="relative w-full h-full grid place-items-center">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">Watchtime · x3</div>
          <div className="absolute left-3 top-10 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-xs text-primary font-semibold">Rétention</div>
          <div className="absolute right-3 top-10 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-xs text-primary font-semibold">Engagement</div>
          <svg viewBox="0 0 200 80" className="w-[82%] h-20 mt-10" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cg" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgb(226,75,74)" stopOpacity="0.65" />
                <stop offset="100%" stopColor="rgb(226,75,74)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* organic curve: ups and downs, plafond ~y=22 */}
            <path d="M0 72 C 12 70, 20 60, 30 64 S 48 50, 60 46 S 78 56, 90 42 S 108 26, 122 34 S 142 22, 158 28 S 178 18, 200 22 L200 80 L0 80 Z" fill="url(#cg)" />
            <path d="M0 72 C 12 70, 20 60, 30 64 S 48 50, 60 46 S 78 56, 90 42 S 108 26, 122 34 S 142 22, 158 28 S 178 18, 200 22" fill="none" stroke="rgb(226,75,74)" strokeWidth="2" />
          </svg>
        </div>
      );
    }
    return (
      <div className="relative w-full h-full grid place-items-center">
        <div className="relative w-56 h-32 rounded-lg overflow-hidden border border-primary/40 bg-gradient-to-br from-red-950 via-rose-900/60 to-black">
          {/* scanlines */}
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(255,255,255,0.08) 3px, transparent 4px)" }} />
          {/* preview area */}
          <div className="absolute inset-x-0 top-0 h-[58%] grid place-items-center">
            <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur border border-white/30 grid place-items-center">
              <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
            </div>
          </div>
          {/* timeline editor area */}
          <div className="absolute inset-x-0 bottom-0 h-[42%] bg-black/70 backdrop-blur border-t border-white/15 px-1.5 py-1 flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[8px] text-white/70">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              <span className="font-semibold tracking-wider">PEAUFINAGE</span>
              <span className="ml-auto tabular-nums">04:32</span>
            </div>
            {/* tracks with cut markers */}
            <div className="relative h-2 rounded-sm bg-gradient-to-r from-primary/70 via-rose-500/60 to-primary/70">
              <div className="absolute inset-y-0 left-[30%] w-[2px] bg-white" />
              <div className="absolute inset-y-0 left-[55%] w-[2px] bg-white" />
              <div className="absolute inset-y-0 left-[78%] w-[2px] bg-white" />
            </div>
            <div className="relative h-1.5 rounded-sm bg-white/25">
              <div className="absolute inset-y-0 left-0 w-[40%] bg-emerald-400/80 rounded-sm" />
              <div className="absolute inset-y-0 left-[48%] w-[28%] bg-amber-400/80 rounded-sm" />
            </div>
            <div className="relative h-1 rounded-sm bg-white/15">
              <div className="absolute inset-y-0 left-[20%] w-[50%] bg-sky-400/70 rounded-sm" />
            </div>
            {/* playhead */}
            <div className="absolute top-2 bottom-1 left-[42%] w-[1px] bg-primary shadow-[0_0_6px_rgba(226,75,74,0.9)]" />
          </div>
        </div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">Révisions illimitées</div>
      </div>
    );
  };

  return (
    <section id="methode" data-section="methode" className="relative py-12 lg:py-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        {/* Hero banner */}
        <FadeIn>
          <div className="relative rounded-[2rem] border border-primary/30 overflow-hidden p-6 lg:p-8 bg-gradient-to-br from-red-950/80 via-black to-black">
            <div className="absolute inset-0 pointer-events-none" style={{
              background: "radial-gradient(ellipse 60% 80% at 30% 50%, rgba(226,75,74,0.35), transparent 60%)"
            }} />
            <div className="relative grid lg:grid-cols-[1.2fr_1fr] gap-6 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">
                  Notre méthode en{" "}
                  <span className="font-script text-primary text-4xl sm:text-5xl lg:text-6xl">3 étapes</span>
                </h2>
                <p className="mt-3 text-white/70 max-w-md">
                  Chaque étape est pensée pour faire de YouTube ton canal d'acquisition #1.
                </p>
                <a
                  href={CTA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 bg-white text-black font-semibold px-5 py-3 rounded-full hover:scale-[1.02] transition-transform"
                >
                  Je veux ma vidéo en 48h <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div className="h-[260px] overflow-hidden">
                <div className="grid grid-cols-2 gap-2 h-full">
                  {[0, 1].map((col) => (
                    <div key={col} className="marquee overflow-hidden h-full relative" style={{
                      WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
                      maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
                    }}>
                      <div className={`flex flex-col gap-2 ${col === 1 ? "marquee-y-track-reverse" : "marquee-y-track"}`}>
                        {[...Array(2)].flatMap(() => [0, 1, 2, 3, 4]).map((k, i) => (
                          <div key={i} className="relative aspect-video rounded-md overflow-hidden border border-primary/30 bg-gradient-to-br from-rose-700/60 via-red-900/40 to-black shrink-0">
                            <div className="absolute inset-0 grid place-items-center">
                              <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur border border-white/30 grid place-items-center">
                                <Play className="w-3 h-3 fill-white text-white ml-0.5" />
                              </div>
                            </div>
                            <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                              <span className="text-[8px] px-1 py-0.5 rounded bg-black/70 text-white tabular-nums">0{(k % 9) + 1}:{(k * 7) % 60 < 10 ? "0" : ""}{(k * 7) % 60}</span>
                              <span className="text-[8px] px-1 py-0.5 rounded bg-primary text-primary-foreground font-bold">VPH+</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Step cards */}
        <div className="mt-5 grid md:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.1}>
              <div className="relative h-full p-6 rounded-[1.75rem] border border-primary/25 bg-gradient-to-b from-red-950/40 via-black to-black overflow-hidden card-hover">
                <div className="absolute inset-0 pointer-events-none opacity-60" style={{
                  background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(226,75,74,0.18), transparent 70%)"
                }} />
                <div className="relative h-48 mb-5">{stepArtwork(i)}</div>
                <h3 className="relative text-xl font-bold text-white">{s.n} — {s.title}</h3>
                <p className="relative mt-3 text-white/70 leading-relaxed">{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- content funnel ----------

function ContentFunnel() {
  const stages = [
    {
      icon: TrendingUp,
      tag: "Top of the funnel",
      goal: "Attirer",
      formats: "Vlogs, lifestyle, contenu inspirationnel",
      headline: "personal brand viral grâce au format vlog",
    },
    {
      icon: Mic,
      tag: "Middle of the funnel",
      goal: "Engager",
      formats: "Podcasts, vidéos full value, interviews",
      headline: "double ta crédibilité en partageant ton expertise",
    },
    {
      icon: Target,
      tag: "Bottom of the funnel",
      goal: "Closer",
      formats: "VSL, vidéos de vente",
      headline: "x4 sur tes ventes avec une VSL addictive dans ton funnel",
    },
  ];
  return (
    <section data-section="funnel" className="relative py-12 lg:py-16 border-t border-white/5">

      <div className="max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-balance text-white">
              Vous êtes dans l'<span className="font-script text-primary text-5xl sm:text-6xl lg:text-7xl">entrepreneuriat</span> ?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg text-balance">
              On travaille avec différentes méthodes et on s'adapte à chaque étape de votre <span className="text-primary font-semibold">Content Funnel</span> — du premier scroll jusqu'à la vente.
            </p>
          </div>
        </FadeIn>
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {stages.map((s, i) => (
            <FadeIn key={s.tag} delay={i * 0.1}>
              <div className="relative h-full p-6 rounded-[1.75rem] border border-primary/25 bg-gradient-to-b from-red-950/40 via-black to-black overflow-hidden card-hover">
                <div className="absolute inset-0 pointer-events-none opacity-60" style={{
                  background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(226,75,74,0.18), transparent 70%)",
                }} />
                <div className="relative flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/40 grid place-items-center">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold">{s.tag}</div>
                    <div className="text-lg font-black text-white">{s.goal}</div>
                  </div>
                </div>
                <p className="relative mt-4 text-sm text-white/70">{s.formats}</p>
                <div className="relative mt-3 pt-3 border-t border-white/10">
                  <p className="text-base text-white leading-snug text-balance">{s.headline}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Arrow + closing text */}
        <FadeIn delay={0.2}>
          <div className="mt-8 max-w-3xl mx-auto flex items-start gap-4 sm:gap-6 px-4">
            <img
              src={arrowAsset.url}
              alt=""
              aria-hidden="true"
              className="w-20 sm:w-28 shrink-0 opacity-90 pointer-events-none select-none -rotate-12"
            />
            <p className="text-base sm:text-lg text-white/85 leading-relaxed">
              En 2026, ceux qui captent l'attention captent leur réussite. On ne fait pas que monter vos vidéos — on vous fait gagner un temps précieux, et donc de l'argent. Vous nous confiez vos rushs, <span className="text-primary font-semibold">on s'occupe de tout</span>.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ---------- ads / sales section ----------

function AdsSection() {
  const liveAds = useSiteVideos().filter((v) => v.carousel_key === "ads_alexis");
  const fallback: PublicVideo[] = [
    { id: "f1", carousel_key: "ads_alexis", title: "Hook scroll-stop", source_url: "", source_label: "Ad · 0:08", thumbnail_url: null, format: "court", position: 0 },
    { id: "f2", carousel_key: "ads_alexis", title: "Témoignage client", source_url: "", source_label: "Ad · 0:24", thumbnail_url: null, format: "court", position: 1 },
    { id: "f3", carousel_key: "ads_alexis", title: "Démo produit", source_url: "", source_label: "Ad · 0:18", thumbnail_url: null, format: "court", position: 2 },
  ];
  const slides = liveAds.length > 0 ? liveAds : fallback;
  const len = slides.length;
  const [idx, setIdx] = useState(0);
  const next = () => setIdx((i) => (i + 1) % len);
  const prev = () => setIdx((i) => (i - 1 + len) % len);
  const tones = [
    "from-rose-700/70 via-red-900/50",
    "from-red-600/70 via-rose-800/50",
    "from-rose-500/70 via-red-700/50",
  ];

  return (
    <section data-section="ads" className="relative py-12 lg:py-16 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 cinematic-glow-soft pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-balance">
              <span className="text-white">Boostez vos ventes avec des</span>{" "}
              <span className="font-script text-primary text-5xl sm:text-6xl lg:text-7xl">Ads</span>{" "}
              <span className="text-white">qui remplissent votre agenda</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg text-balance">
              Du hook au CTA, on produit des publicités vidéo qui convertissent dès la première vue.
            </p>
          </div>
        </FadeIn>

        {/* Testimonial banner */}
        <FadeIn delay={0.1}>
          <div className="mt-8 relative rounded-[1.75rem] border border-primary/30 p-5 lg:p-6 bg-gradient-to-r from-red-950/70 via-black to-black overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-60" style={{
              background: "radial-gradient(ellipse 50% 80% at 80% 50%, rgba(226,75,74,0.30), transparent 60%)",
            }} />
            <div className="relative flex flex-col sm:flex-row items-center gap-5 sm:gap-7 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-rose-700 grid place-items-center text-white font-black text-xl shrink-0">A</div>
              <div className="flex-1">
                <div className="text-sm text-white/70">Alexis · Fondateur D2C</div>
                <p className="mt-1 text-lg sm:text-xl font-semibold text-white text-balance">
                  « Grâce aux Ads vidéo, j'ai généré plus de <span className="text-primary">120 000 €</span> de CA depuis qu'on travaille ensemble. »
                </p>
              </div>
              <div className="text-center shrink-0">
                <div className="text-3xl sm:text-4xl font-black text-primary">+120k€</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">CA généré</div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Card-deck carousel */}
        <FadeIn delay={0.2}>
          <div className="mt-12 relative h-[520px] sm:h-[580px] flex items-center justify-center select-none [perspective:1400px]">
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
                // signed offset around the active card, wrapped to [-floor(len/2), ceil(len/2)-1]
                const half = Math.floor(len / 2);
                let offset = ((i - idx) % len + len) % len;
                if (offset > half) offset -= len;
                const abs = Math.abs(offset);
                const x = offset * 170;
                const y = abs * 14;
                const scale = abs === 0 ? 1 : 0.82 - (abs - 1) * 0.06;
                const rotateY = offset * -14;
                const rotateZ = offset * -4;
                const opacity = abs > 2 ? 0 : abs === 0 ? 1 : 0.7;
                const z = 50 - abs;
                const tone = tones[i % tones.length];
                return (
                  <motion.div
                    key={s.id}
                    initial={false}
                    animate={{ x, y, scale, rotateY, rotateZ, opacity }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    style={{ zIndex: z, position: "absolute", top: "50%", left: "50%", translateX: "-50%", translateY: "-50%", transformStyle: "preserve-3d", transformOrigin: "center center" }}
                    onClick={() => offset !== 0 && setIdx(i)}
                    className={offset !== 0 ? "cursor-pointer" : ""}
                  >
                    <div className={`group relative w-[240px] sm:w-[280px] aspect-[9/16] rounded-[1.75rem] overflow-hidden border border-primary/40 bg-gradient-to-br ${tone} to-black shadow-[0_40px_80px_-20px_rgba(226,75,74,0.55)]`}>
                      <LiveVideoSurface video={s} btnSize="sm" />
                      <div className="absolute inset-0 pointer-events-none opacity-25" style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(255,255,255,0.05) 3px, transparent 4px)" }} />
                      <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur text-[10px] font-bold text-white uppercase tracking-widest border border-white/15 pointer-events-none">
                        Ad
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
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-white/30 hover:bg-white/60"}`}
                />
              ))}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="mt-6 text-center">
            <a
              href={CTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-full btn-glow"
            >
              Je veux des Ads qui closent <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ---------- portfolio ----------

function Portfolio() {
  const row1 = [
    { t: "Lancement SaaS Q4", c: "YouTube" },
    { t: "Masterclass Mindset", c: "Formation" },
    { t: "Podcast Founders FR", c: "Podcast" },
    { t: "Pub Shopify Black Friday", c: "E-commerce" },
    { t: "Vlog Tokyo 2026", c: "YouTube" },
    { t: "Talk Web Summit", c: "Conférence" },
  ];
  const row2 = [
    { t: "Réel viral 3M vues", c: "Reels" },
    { t: "Documentaire entrepreneuriat", c: "YouTube" },
    { t: "Formation copywriting", c: "Formation" },
    { t: "Episode podcast tech", c: "Podcast" },
    { t: "Campagne D2C beauté", c: "E-commerce" },
    { t: "Aftermovie événement", c: "Branding" },
  ];
  const row3 = [
    { t: "Long-form interview", c: "YouTube" },
    { t: "Ads UGC fitness", c: "E-commerce" },
    { t: "Live replay coaching", c: "Formation" },
    { t: "Short YouTube 60s", c: "Shorts" },
    { t: "Trailer formation", c: "Promo" },
    { t: "Étude de cas client", c: "B2B" },
  ];
  const allLive = useSiteVideos();
  const live1 = allLive.filter((v) => v.carousel_key === "realisations_1");
  const live2 = allLive.filter((v) => v.carousel_key === "realisations_2");
  const live3 = allLive.filter((v) => v.carousel_key === "realisations_3");

  const Row = ({ items, live, reverse, offset = 0 }: { items: { t: string; c: string }[]; live: PublicVideo[]; reverse?: boolean; offset?: number }) => (
    <div className="marquee overflow-hidden mask-fade">
      <div className={`flex gap-4 w-max ${reverse ? "marquee-track-reverse" : "marquee-track"}`}>
        {live.length > 0
          ? [...live, ...live].map((v, i) => (
              <LiveVideoThumb key={`${v.id}-${i}`} video={v} idx={i + offset} />
            ))
          : [...items, ...items].map((it, i) => (
              <VideoThumb key={i} title={it.t} category={it.c} idx={i + offset} />
            ))}
      </div>
    </div>
  );

  return (
    <section id="realisations" data-section="realisations" className="relative py-12 lg:py-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">
              <span className="text-white">Nos</span> <span className="font-script text-primary text-5xl sm:text-6xl lg:text-7xl">réalisations</span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">Un aperçu de ce qu'on crée pour nos clients.</p>
          </div>
        </FadeIn>
      </div>
      <div className="space-y-4">
        <Row items={row1} live={live1} offset={0} />
        <Row items={row2} live={live2} reverse offset={3} />
        <Row items={row3} live={live3} offset={6} />
      </div>
    </section>
  );
}

// ---------- testimonials (vertical) ----------

function Testimonials() {
  const reviews = [
    { name: "Léa M.", role: "Coach business", text: "Mes vidéos n'ont jamais aussi bien performé. La qualité du montage est dingue." },
    { name: "Karim B.", role: "YouTubeur tech", text: "+38% de watch time en un mois. Le rythme du montage fait toute la différence." },
    { name: "Sophie D.", role: "Fondatrice e-commerce", text: "Mes pubs convertissent 2x mieux depuis qu'on bosse ensemble. ROI immédiat." },
    { name: "Marc L.", role: "Podcasteur", text: "Délais respectés, qualité au rendez-vous. Je recommande sans hésiter." },
    { name: "Inès P.", role: "Créatrice contenu", text: "Le color grading est juste sublime. Mes vidéos ont un vrai look pro maintenant." },
    { name: "Antoine V.", role: "Formateur en ligne", text: "Plus de 200 modules livrés. Toujours dans les temps, toujours nickel." },
    { name: "Camille R.", role: "Influenceuse mode", text: "Les Reels qu'ils me montent font systématiquement +500k vues. Magique." },
    { name: "Hugo F.", role: "Coach sportif", text: "Communication fluide, révisions rapides, équipe au top. Rien à dire." },
    { name: "Julie T.", role: "Consultante", text: "Mon image de marque a complètement changé grâce à eux. Super pro." },
    { name: "Nicolas A.", role: "CEO startup", text: "On a internalisé puis on est revenu chez Skale. Bien plus rentable et qualitatif." },
    { name: "Élise C.", role: "Auteure", text: "J'avais peur de déléguer mon contenu. Aujourd'hui je gagne 15h par semaine." },
    { name: "Bastien O.", role: "Agence marketing", text: "Notre prestataire montage officiel pour tous nos clients. Indispensable." },
  ];

  type R = typeof reviews[number];
  const Card = ({ r }: { r: R }) => (
    <div className="w-full p-5 rounded-2xl border border-white/10 bg-card/60 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/80 to-rose-600 grid place-items-center font-bold text-sm">
          {r.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate text-sm">{r.name}</div>
          <div className="text-xs text-muted-foreground truncate">{r.role}</div>
        </div>
      </div>
      <div className="mt-2.5 flex gap-0.5 text-primary">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
      </div>
      <p className="mt-2.5 text-sm text-white/80 leading-relaxed">{r.text}</p>
    </div>
  );

  const MobileCard = ({ r }: { r: R }) => (
    <div className="w-60 shrink-0 p-3.5 rounded-xl border border-white/10 bg-card/60 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/80 to-rose-600 grid place-items-center font-bold text-xs">
          {r.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate text-xs">{r.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{r.role}</div>
        </div>
      </div>
      <div className="mt-1.5 flex gap-0.5 text-primary">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
      </div>
      <p className="mt-1.5 text-xs text-white/80 leading-relaxed line-clamp-4">{r.text}</p>
    </div>
  );

  const cols = [
    reviews.slice(0, 4),
    reviews.slice(4, 8),
    reviews.slice(8, 12),
  ];

  const Column = ({ items, reverse }: { items: R[]; reverse?: boolean }) => (
    <div className="marquee overflow-hidden h-[560px] mask-fade-y relative">
      <div className={`flex flex-col gap-4 ${reverse ? "marquee-y-track-reverse" : "marquee-y-track"}`}>
        {[...items, ...items].map((r, i) => <Card key={i} r={r} />)}
      </div>
    </div>
  );

  const MobileRow = ({ items, reverse }: { items: R[]; reverse?: boolean }) => (
    <div className="marquee overflow-hidden mask-fade relative">
      <div className={`flex gap-3 w-max ${reverse ? "marquee-track-reverse" : "marquee-track"}`}>
        {[...items, ...items].map((r, i) => <MobileCard key={i} r={r} />)}
      </div>
    </div>
  );

  const mobileRow1 = reviews.slice(0, 6);
  const mobileRow2 = reviews.slice(6, 12);

  return (
    <section id="avis" data-section="avis" className="relative py-12 lg:py-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">
              Ce qu'ils pensent de{" "}
              <span className="font-script text-primary text-4xl sm:text-5xl lg:text-6xl">Skale Visuals</span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">Des créateurs qui ont vu leur audience et leur business décoller.</p>
          </div>
        </FadeIn>
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Column items={cols[0]} />
          <Column items={cols[1]} reverse />
          <Column items={cols[2]} />
        </div>
        <div className="md:hidden space-y-3">
          <MobileRow items={mobileRow1} />
          <MobileRow items={mobileRow2} reverse />
        </div>
      </div>
    </section>
  );
}

// ---------- comparison ----------

function Comparison() {
  const rows = [
    { feature: "Qualité cinématique", skale: true, freelance: "Variable" },
    { feature: "Délai de livraison", skale: "24–48h", freelance: "5–10 jours" },
    { feature: "Suivi client", skale: "WhatsApp dédié", freelance: "Limité" },
    { feature: "Révisions", skale: "Illimitées", freelance: "1–2 incluses" },
    { feature: "Compréhension de votre audience", skale: true, freelance: false },
    { feature: "Équipe de 10 monteurs spécialisés", skale: true, freelance: false },
    { feature: "Tarif transparent", skale: true, freelance: "Variable" },
  ];

  const renderCell = (v: boolean | string, highlight?: boolean) => {
    if (v === true) return <Check className={`w-5 h-5 mx-auto ${highlight ? "text-primary" : "text-emerald-400"}`} />;
    if (v === false) return <X className="w-4 h-4 mx-auto text-white/30" />;
    return <span className={`text-sm ${highlight ? "text-primary font-semibold" : "text-white/70"}`}>{v}</span>;
  };

  return (
    <section data-section="partenaire" className="relative py-12 lg:py-16 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-center text-balance">
            Ce qui fait de Skale Visuals votre{" "}
            <span className="font-script text-primary text-4xl sm:text-5xl lg:text-6xl">partenaire #1</span>
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="mt-8 rounded-2xl border border-white/10 bg-card/40 backdrop-blur overflow-hidden">
            <div className="grid grid-cols-[1.4fr_1fr_1fr]">
              <div className="p-4 text-xs uppercase tracking-widest text-muted-foreground font-medium border-b border-white/10" />
              <div className="p-4 text-center font-bold text-primary bg-primary/10 border-b border-primary/30 border-x border-primary/30">
                Skale Visuals
              </div>
              <div className="p-4 text-center text-muted-foreground font-medium text-sm border-b border-white/10">
                Monteur freelance
              </div>
              {rows.map((r, i) => (
                <div key={r.feature} className="contents">
                  <div className={`p-4 text-sm font-medium text-white/80 ${i === rows.length - 1 ? "" : "border-b border-white/10"}`}>
                    {r.feature}
                  </div>
                  <div className={`p-4 text-center bg-primary/[0.06] border-x border-primary/30 ${i === rows.length - 1 ? "border-b border-primary/30" : "border-b border-primary/20"}`}>
                    {renderCell(r.skale, true)}
                  </div>
                  <div className={`p-4 text-center ${i === rows.length - 1 ? "" : "border-b border-white/10"}`}>
                    {renderCell(r.freelance)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={0.25}>
          <div className="mt-8 text-center">
            <a
              href={CTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-full btn-glow"
            >
              Obtenir mon devis gratuit <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ---------- FAQ ----------

function FAQ() {
  const items = [
    {
      q: "Que faut-il fournir ?",
      a: "Tes rushes (vidéo + audio), un brief rempli (5 min), et des références si tu en as. On gère le reste : musique, sound design, color grading.",
    },
    {
      q: "Combien de temps pour recevoir ma vidéo ?",
      a: "En moyenne, 24 à 48h pour les formats courts. Pour les formats longs, comptez environ 3 à 4 jours.",
    },
    {
      q: "Combien de révisions sont incluses ?",
      a: "Les révisions sont illimitées. On t'envoie la vidéo sur une plateforme qui permet de laisser des commentaires directement sous chaque minute de la vidéo, pour peaufiner à l'infini jusqu'à ce que ce soit parfait.",
    },
    {
      q: "Est-ce que je communique directement avec un monteur ?",
      a: "Non, mais tu es en contact direct sur WhatsApp avec nos managers, qui font le lien avec les monteurs. On a une équipe solide de 10 monteurs, chacun fort dans son domaine, pour garantir la meilleure qualité selon le type de vidéo.",
    },
    {
      q: "Travaillez-vous avec les petites chaînes ?",
      a: "Bien sûr. On accompagne aussi bien des créateurs en lancement que des comptes à plusieurs millions d'abonnés.",
    },
    {
      q: "Vos tarifs sont comme les autres ?",
      a: "Non. Nos tarifs sont en moyenne 30% moins chers que les autres agences, pour une qualité équivalente voire supérieure, et une relation client bien plus qualitative — contact direct WhatsApp, révisions illimitées, et un vrai suivi.",
    },
    {
      q: "Quels sont les tarifs ?",
      a: "Nos tarifs sont flexibles et personnalisés en fonction de ta demande et du volume. Tout sera discuté après ton devis, directement avec l'équipe sur WhatsApp.",
    },
    {
      q: "Possible de travailler sur le long terme ?",
      a: "Absolument. On peut proposer des contrats sur la durée pour travailler sereinement avec des créateurs, avec des montages récurrents, des délais prioritaires et un suivi personnalisé.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" data-section="faq" className="relative py-12 lg:py-16 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">
              Tes questions.{" "}
              <span className="font-script text-primary text-4xl sm:text-5xl lg:text-6xl">Nos réponses.</span>
            </h2>
          </div>
        </FadeIn>
        <div className="mt-8 grid md:grid-cols-2 gap-3 items-start">
          {[0, 1].map((col) => (
            <div key={col} className="flex flex-col gap-3">
              {items.filter((_, i) => i % 2 === col).map((it) => {
                const i = items.indexOf(it);
                return (
                  <FadeIn key={it.q} delay={i * 0.04}>
                    <div className="rounded-xl border border-white/10 bg-card/60 backdrop-blur overflow-hidden">
                      <button
                        onClick={() => setOpen(open === i ? null : i)}
                        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="font-semibold">{it.q}</span>
                        <ChevronDown className={`w-5 h-5 text-primary shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
                      </button>
                      <motion.div
                        initial={false}
                        animate={{ height: open === i ? "auto" : 0, opacity: open === i ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-muted-foreground leading-relaxed">{it.a}</p>
                      </motion.div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- final contact ----------

function FinalCTA() {
  const contacts = [
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: "+33 7 66 76 61 53",
      href: WA_URL,
      external: true,
    },
    {
      icon: Mail,
      label: "Email",
      value: "skalevisuals086@gmail.com",
      href: MAIL_URL,
      external: false,
    },
    {
      icon: Instagram,
      label: "Instagram",
      value: "@skalevisuals",
      href: IG_URL,
      external: true,
    },
  ];

  return (
    <section id="contact" data-section="contact" className="relative py-12 lg:py-16 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 cinematic-glow pointer-events-none" />
      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <FadeIn>
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-script text-primary leading-tight">
            Prêt à passer au niveau supérieur ?
          </h2>
          <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
            On répond rapidement. Choisis le canal qui te convient.
          </p>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {contacts.map((c) => (
              <a
                key={c.label}
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group p-6 rounded-2xl border border-white/10 bg-card/60 backdrop-blur card-hover text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 grid place-items-center mb-4 group-hover:bg-primary/30 transition-colors">
                  <c.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</div>
                <div className="mt-1 font-semibold text-white break-all">{c.value}</div>
              </a>
            ))}
          </div>
        </FadeIn>
        <FadeIn delay={0.25}>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={CTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-full btn-glow"
            >
              Lancer mon projet <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#realisations"
              className="inline-flex items-center gap-2 liquid-glass text-white font-semibold px-6 py-3.5 rounded-full"
            >
              Voir nos réalisations
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ---------- footer ----------

function Footer() {
  return (
    <footer className="relative border-t border-white/10 py-10">
      <div className="max-w-7xl mx-auto px-6 grid gap-8 md:grid-cols-[1.2fr_2fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <span className="font-extrabold text-lg">Skale Visuals</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-white/80">
              <MessageCircle className="w-4 h-4 text-primary shrink-0" />
              <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">+33 7 66 76 61 53</a>
            </li>
            <li className="flex items-center gap-2 text-white/80">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <a href={MAIL_URL} className="hover:text-primary transition break-all">skalevisuals086@gmail.com</a>
            </li>
            <li className="flex items-center gap-2 text-white/80">
              <Instagram className="w-4 h-4 text-primary shrink-0" />
              <a href={IG_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">@skalevisuals</a>
            </li>
          </ul>
        </div>
        <div className="md:text-right">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Navigation</div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm md:justify-end">
            {NAV_LINKS.map((l) => (
              <li key={l.href}><a href={l.href} className="text-white/80 hover:text-primary transition">{l.label}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-8 pt-5 border-t border-white/5 flex flex-col sm:flex-row justify-between gap-3 text-xs text-muted-foreground">
        <div>© 2026 Skale Visuals. Tous droits réservés.</div>
        <div>Made in France by md1lz and lorenz.dio</div>
      </div>
    </footer>
  );
}

// ---------- root ----------

function Index() {
  const [psstOpen, setPsstOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;
    const showT = setTimeout(() => setPsstOpen(true), 800);
    const hideT = setTimeout(() => setPsstOpen(false), 5800);
    return () => {
      clearTimeout(showT);
      clearTimeout(hideT);
    };
  }, []);
  return (
    <div className="relative">
      <Navbar />
      <AnimatePresence>
        {psstOpen && (
          <motion.div
            initial={{ x: "-110%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-110%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="md:hidden fixed left-3 right-3 top-[72px] z-[55] liquid-glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl border border-white/15"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <p className="text-sm text-white/95 flex-1">
              Psst, notre site est plus joli sur PC&nbsp;!
            </p>
            <button
              onClick={() => setPsstOpen(false)}
              aria-label="Fermer"
              className="text-white/60 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="relative z-10">
        <Hero />
        <SocialProof />
        <WhySkale />
        <HowItWorks />
        <ContentFunnel />
        <Portfolio />
        <AdsSection />
        <Testimonials />
        <Comparison />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <style>{`
        .mask-fade {
          -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
                  mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
        }
        .mask-fade-y {
          -webkit-mask-image: linear-gradient(to bottom, transparent, black 8%, black 92%, transparent);
                  mask-image: linear-gradient(to bottom, transparent, black 8%, black 92%, transparent);
        }
      `}</style>
    </div>
  );
}
