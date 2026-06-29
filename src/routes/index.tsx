import { createFileRoute } from "@tanstack/react-router";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Play, Film, Sparkles, Zap, Palette, Check, Star, ChevronDown,
  ArrowRight, Clock, Users, Award, MessageCircle, Type, Music,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skale Visuals — Agence de Montage Vidéo" },
      { name: "description", content: "Montage vidéo qui captive, convertit et scale ton business. Livraison en 72h, color grading, sous-titres et motion design inclus." },
    ],
  }),
  component: Index,
});

// ---------- helpers ----------

function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
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
  "from-indigo-600/40 via-purple-700/30 to-pink-600/40",
  "from-orange-500/40 via-rose-500/30 to-amber-500/40",
  "from-cyan-500/40 via-blue-600/30 to-indigo-700/40",
  "from-emerald-500/30 via-teal-600/30 to-cyan-600/40",
  "from-fuchsia-600/40 via-purple-700/30 to-indigo-700/40",
  "from-amber-500/40 via-orange-600/30 to-red-600/40",
  "from-violet-700/40 via-blue-700/30 to-cyan-600/40",
  "from-rose-600/40 via-pink-700/30 to-purple-700/40",
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
        {/* faint scanlines on thumb */}
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
          backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(255,255,255,0.04) 3px, transparent 4px)"
        }}/>
      </div>
    </div>
  );
}

// ---------- sections ----------

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Nos réalisations", href: "#realisations" },
    { label: "Comment ça marche", href: "#methode" },
    { label: "Avis clients", href: "#avis" },
    { label: "Tarifs", href: "#tarifs" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <>
      <div className="relative z-50 w-full text-center py-2 text-xs text-muted-foreground border-b border-white/5 bg-black/40 backdrop-blur">
        🎬 <span className="text-white/80">2 places disponibles ce mois-ci</span>
      </div>
      <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/10" : "bg-black/30 backdrop-blur-sm"}`}>
        <nav className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-3 items-center gap-4">
          <a href="#" className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/40 grid place-items-center shrink-0">
              <Play className="w-4 h-4 text-primary fill-primary" />
            </div>
            <span className="font-extrabold text-lg tracking-tight truncate">Skale Visuals</span>
          </a>
          <div className="hidden lg:flex items-center justify-center gap-7 text-sm text-muted-foreground">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</a>
            ))}
          </div>
          <div className="flex justify-end">
            <a href="#contact" className="hidden sm:inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-lg text-sm btn-glow">
              Obtenir un devis <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </nav>
      </header>
    </>
  );
}

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

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 cinematic-glow pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 lg:pt-32 lg:pb-24 text-center">
        <FadeIn>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-full">
            <Film className="w-3.5 h-3.5" /> Agence de Montage Vidéo
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="mt-8 text-4xl sm:text-5xl lg:text-7xl font-black text-balance max-w-5xl mx-auto leading-[1.05]">
            On monte tes vidéos pour qu'elles{" "}
            <span className="text-primary">captivent</span>,{" "}
            <span className="text-primary">convertissent</span> et{" "}
            <span className="text-primary">scalent</span>.
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground text-balance">
            Livraison en 72h. Montage professionnel, color grading, sous-titres, motion design — on s'occupe de tout pour que ton contenu soit irrésistible.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#contact" className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-lg btn-glow">
              Lancer mon projet <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#realisations" className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold px-6 py-3.5 rounded-lg transition-colors">
              Voir nos réalisations
            </a>
          </div>
        </FadeIn>
        <FadeIn delay={0.45}>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { n: 120, s: "+", l: "clients accompagnés" },
              { n: 850, s: "+", l: "vidéos montées" },
              { n: 4.9, s: "/5", l: "satisfaction client" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl lg:text-5xl font-black text-primary">
                  {Number.isInteger(stat.n) ? <CountUp to={stat.n} suffix={stat.s} /> : <>{stat.n}{stat.s}</>}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{stat.l}</div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>

      {/* hero thumbnail strip */}
      <div className="relative marquee overflow-hidden py-6 mask-fade">
        <div className="flex gap-4 marquee-track w-max">
          {[...heroThumbs, ...heroThumbs].map((t, i) => (
            <VideoThumb key={i} title={t.t} category={t.c} idx={i} size="md" />
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const items = ["YouTubeurs", "Coachs", "E-commerçants", "Agences", "Podcasts", "Influenceurs", "Formateurs", "Startups"];
  return (
    <section className="relative py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur cinematic-glow-soft py-8 px-6">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Ils nous font confiance
          </p>
          <div className="marquee overflow-hidden mask-fade">
            <div className="flex gap-12 marquee-track-fast w-max">
              {[...items, ...items, ...items].map((it, i) => (
                <span key={i} className="text-lg lg:text-xl font-semibold text-white/60 hover:text-white whitespace-nowrap transition-colors">
                  {it}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedTestimonial() {
  return (
    <section className="relative py-20 lg:py-28">
      <div className="absolute inset-0 cinematic-glow-soft pointer-events-none" />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <FadeIn>
          <div className="flex justify-center gap-1 text-primary mb-6">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
          </div>
          <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-medium italic text-white leading-snug text-balance">
            « Depuis qu'on travaille avec Skale Visuals, mes vidéos ont doublé leur rétention. Le montage est tellement propre que même mes concurrents me demandent qui je travaille avec. »
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-rose-500 grid place-items-center font-bold">T</div>
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

function WhySkale() {
  const features = [
    { icon: Film, title: "Montage Premium", desc: "Cuts dynamiques, transitions fluides, rythme maîtrisé. Tes spectateurs ne décrochent pas." },
    { icon: Palette, title: "Color Grading Cinématique", desc: "Une colorimétrie qui reflète ton univers de marque et donne du relief à chaque plan." },
    { icon: Zap, title: "Livraison Rapide", desc: "Fichier livré en 72h maximum avec révisions illimitées incluses." },
  ];
  const pills = [
    { icon: Sparkles, label: "Motion Design inclus" },
    { icon: Type, label: "Sous-titres dynamiques" },
    { icon: Music, label: "Musique & sound design" },
  ];
  return (
    <section className="relative py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-balance">
              On ne monte pas juste des vidéos. <span className="text-primary">On crée de l'impact.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Chaque seconde de ta vidéo est pensée pour retenir l'attention et déclencher l'action.
            </p>
          </div>
        </FadeIn>
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.1}>
              <div className="h-full p-7 rounded-2xl border border-white/10 bg-card/60 backdrop-blur card-hover">
                <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 grid place-items-center mb-5">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{f.title}</h3>
                <p className="mt-2 text-muted-foreground">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.3}>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
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

function HowItWorks() {
  const steps = [
    { n: "01", title: "Onboarding", desc: "Tu remplis notre brief en 5 minutes. On analyse ton style, ton audience et tes objectifs.", icon: Users },
    { n: "02", title: "Production & Montage", desc: "Notre équipe monte ta vidéo avec les assets que tu nous fournis. Color grading, sous-titres, musique — tout est inclus.", icon: Film },
    { n: "03", title: "Livraison & Révisions", desc: "Tu reçois ta vidéo en 72h. Les retouches sont illimitées jusqu'à satisfaction complète.", icon: Clock },
  ];
  return (
    <section id="methode" className="relative py-20 lg:py-28 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">Notre méthode en 3 étapes</h2>
            <p className="mt-4 text-muted-foreground text-lg">Un processus fluide pensé pour te faire gagner du temps.</p>
          </div>
        </FadeIn>
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <FadeIn key={s.n} delay={i * 0.1}>
              <div className="relative h-full p-7 rounded-2xl border border-white/10 bg-card/60 card-hover">
                <div className="text-5xl font-black text-primary/30">{s.n}</div>
                <div className="mt-4 flex items-center gap-3">
                  <s.icon className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold">{s.title}</h3>
                </div>
                <p className="mt-3 text-muted-foreground">{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.3}>
          <div className="mt-12 text-center">
            <a href="#contact" className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-lg btn-glow">
              Démarrer maintenant <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

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

  const Row = ({ items, reverse, offset = 0 }: { items: { t: string; c: string }[]; reverse?: boolean; offset?: number }) => (
    <div className="marquee overflow-hidden mask-fade">
      <div className={`flex gap-4 w-max ${reverse ? "marquee-track-reverse" : "marquee-track"}`}>
        {[...items, ...items].map((it, i) => (
          <VideoThumb key={i} title={it.t} category={it.c} idx={i + offset} />
        ))}
      </div>
    </div>
  );

  return (
    <section id="realisations" className="relative py-20 lg:py-28 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">Nos réalisations</h2>
            <p className="mt-4 text-muted-foreground text-lg">Un aperçu de ce qu'on crée pour nos clients.</p>
          </div>
        </FadeIn>
      </div>
      <div className="space-y-5">
        <Row items={row1} offset={0} />
        <Row items={row2} reverse offset={3} />
        <Row items={row3} offset={6} />
      </div>
    </section>
  );
}

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

  const Card = ({ r }: { r: typeof reviews[0] }) => (
    <div className="w-80 shrink-0 p-6 rounded-2xl border border-white/10 bg-card/60 backdrop-blur card-hover">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-rose-500 grid place-items-center font-bold text-sm">
          {r.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{r.name}</div>
          <div className="text-xs text-muted-foreground truncate">{r.role}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-0.5 text-primary">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
      </div>
      <p className="mt-3 text-sm text-white/80 leading-relaxed">{r.text}</p>
    </div>
  );

  const first = reviews.slice(0, 6);
  const second = reviews.slice(6);

  return (
    <section id="avis" className="relative py-20 lg:py-28 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">Ce qu'ils pensent de Skale Visuals</h2>
            <p className="mt-4 text-muted-foreground text-lg">+120 clients, et autant d'histoires de croissance.</p>
          </div>
        </FadeIn>
      </div>
      <div className="space-y-5">
        <div className="marquee overflow-hidden mask-fade">
          <div className="flex gap-4 marquee-track w-max">
            {[...first, ...first].map((r, i) => <Card key={i} r={r} />)}
          </div>
        </div>
        <div className="marquee overflow-hidden mask-fade">
          <div className="flex gap-4 marquee-track-reverse w-max">
            {[...second, ...second].map((r, i) => <Card key={i} r={r} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  const rows = [
    { feature: "Qualité cinématique", skale: true, freelance: "Variable", agency: true },
    { feature: "Délai de livraison", skale: "72h", freelance: "5-10 jours", agency: "1-3 semaines" },
    { feature: "Suivi client", skale: "Dédié", freelance: "Limité", agency: "Standard" },
    { feature: "Révisions", skale: "Illimitées", freelance: "1-2 incluses", agency: "Facturées" },
    { feature: "Compréhension de votre audience", skale: true, freelance: false, agency: "Partielle" },
    { feature: "Tarif transparent", skale: true, freelance: "Variable", agency: false },
  ];

  const renderCell = (v: boolean | string, highlight?: boolean) => {
    if (v === true) return <Check className={`w-5 h-5 mx-auto ${highlight ? "text-primary" : "text-emerald-400"}`} />;
    if (v === false) return <span className="text-white/30">—</span>;
    return <span className={`text-sm ${highlight ? "text-primary font-semibold" : "text-white/70"}`}>{v}</span>;
  };

  return (
    <section className="relative py-20 lg:py-28 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-center text-balance">
            Ce qui fait de Skale Visuals votre <span className="text-primary">partenaire montage #1</span>
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left text-xs uppercase tracking-widest text-muted-foreground font-medium p-4"></th>
                  <th className="p-4 text-center">
                    <div className="rounded-t-xl border-2 border-b-0 border-primary bg-primary/10 py-3 px-2 font-bold text-primary">
                      Skale Visuals
                    </div>
                  </th>
                  <th className="p-4 text-center text-muted-foreground font-medium text-sm">Monteur freelance</th>
                  <th className="p-4 text-center text-muted-foreground font-medium text-sm">Agence classique</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.feature} className="border-t border-white/10">
                    <td className="p-4 text-sm font-medium text-white/80">{r.feature}</td>
                    <td className={`p-4 text-center border-l-2 border-r-2 border-primary bg-primary/[0.04] ${i === rows.length - 1 ? "rounded-b-xl border-b-2" : ""}`}>
                      {renderCell(r.skale, true)}
                    </td>
                    <td className="p-4 text-center">{renderCell(r.freelance)}</td>
                    <td className="p-4 text-center">{renderCell(r.agency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Starter", desc: "1 vidéo", price: "249€", suffix: "",
      features: ["1 montage professionnel", "Color grading inclus", "Sous-titres dynamiques", "1 révision incluse", "Livraison 72h"],
      cta: "Commencer", featured: false,
    },
    {
      name: "Pro", desc: "5 vidéos", price: "999€", suffix: "soit 199€/vidéo",
      features: ["5 montages premium", "Color grading cinématique", "Sous-titres dynamiques", "Motion intro/outro", "Révisions illimitées", "Support WhatsApp prioritaire"],
      cta: "Choisir Pro", featured: true,
    },
    {
      name: "Studio", desc: "Sur mesure", price: "Parlons-en", suffix: "",
      features: ["Volume personnalisé", "Gestionnaire de compte dédié", "Reporting mensuel", "SLA garanti", "Onboarding équipe"],
      cta: "Nous contacter", featured: false,
    },
  ];
  return (
    <section id="tarifs" className="relative py-20 lg:py-28 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">Une offre pour chaque besoin</h2>
            <p className="mt-4 text-muted-foreground text-lg">Tarifs clairs, sans surprise.</p>
          </div>
        </FadeIn>
        <div className="mt-14 grid md:grid-cols-3 gap-5 items-stretch">
          {plans.map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.1}>
              <div className={`relative h-full p-8 rounded-2xl border bg-card/60 backdrop-blur card-hover flex flex-col ${
                p.featured ? "border-primary shadow-[0_0_60px_-20px_rgba(255,107,43,0.45)]" : "border-white/10"
              }`}>
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground px-3 py-1 rounded-full">
                    Le plus populaire
                  </span>
                )}
                <div className="text-sm text-muted-foreground">{p.desc}</div>
                <div className="mt-1 text-2xl font-bold">{p.name}</div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl font-black">{p.price}</span>
                </div>
                {p.suffix && <div className="mt-1 text-xs text-muted-foreground">{p.suffix}</div>}
                <ul className="mt-6 space-y-3 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="#contact" className={`mt-8 inline-flex items-center justify-center gap-2 font-semibold px-5 py-3 rounded-lg transition-all ${
                  p.featured
                    ? "bg-primary text-primary-foreground btn-glow"
                    : "bg-white/5 hover:bg-white/10 border border-white/15 text-white"
                }`}>
                  {p.cta} <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    { q: "Quels types de vidéos montez-vous ?", a: "YouTube long-format, Shorts/Reels, podcasts, formations en ligne, publicités e-commerce (UGC, VSL), interviews, aftermovies. On s'adapte à ton univers." },
    { q: "Quels fichiers dois-je vous envoyer ?", a: "Tes rushes (vidéo + audio), un brief rempli (5 min), et des références si tu en as. On gère le reste : musique, sound design, color grading." },
    { q: "Combien de temps dure le montage ?", a: "72h maximum après réception complète de tes fichiers. Pour les volumes importants, on planifie ensemble un calendrier." },
    { q: "Les révisions sont-elles vraiment illimitées ?", a: "Oui, dans le périmètre du projet. Tant que tu n'es pas 100% satisfait, on retravaille. Pas de petites lignes." },
    { q: "Puis-je avoir un chef de projet attitré ?", a: "Inclus dans les offres Pro et Studio. Tu communiques avec une seule personne, par WhatsApp ou Slack." },
    { q: "Travaillez-vous avec des petites chaînes ?", a: "Bien sûr. On accompagne aussi bien des créateurs en lancement que des comptes à plusieurs millions d'abonnés." },
    { q: "Comment se passe le paiement ?", a: "Paiement en ligne sécurisé (CB, virement). Pour les forfaits, 50% à la commande, 50% à la livraison du premier asset." },
    { q: "Y a-t-il un engagement de durée ?", a: "Aucun engagement. Les forfaits sont valables 3 mois, et tu reprends quand tu veux. Zéro friction." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-20 lg:py-28 border-t border-white/5">
      <div className="max-w-3xl mx-auto px-6">
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">
              Tes questions. <span className="text-primary">Nos réponses.</span>
            </h2>
          </div>
        </FadeIn>
        <div className="mt-12 space-y-3">
          {items.map((it, i) => (
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
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const thumbs = [
    { t: "Réel viral 2M vues", c: "Reels" },
    { t: "Masterclass premium", c: "Formation" },
    { t: "Pub Q4 e-com", c: "E-commerce" },
    { t: "Podcast season 2", c: "Podcast" },
    { t: "Lancement produit", c: "YouTube" },
    { t: "Aftermovie event", c: "Branding" },
  ];
  return (
    <section id="contact" className="relative py-24 lg:py-32 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 cinematic-glow opacity-150 pointer-events-none" />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <FadeIn>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-balance">
            Prêt à passer au niveau supérieur avec des vidéos qui{" "}
            <span className="text-primary">convertissent</span> ?
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#contact" className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-lg btn-glow">
              Lancer mon projet <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#realisations" className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold px-6 py-3.5 rounded-lg transition-colors">
              Voir nos réalisations
            </a>
          </div>
        </FadeIn>
      </div>
      <div className="relative mt-16 marquee overflow-hidden mask-fade">
        <div className="flex gap-4 marquee-track w-max">
          {[...thumbs, ...thumbs].map((t, i) => (
            <VideoThumb key={i} title={t.t} category={t.c} idx={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-white/10 py-14">
      <div className="max-w-7xl mx-auto px-6 grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/40 grid place-items-center">
              <Play className="w-4 h-4 text-primary fill-primary" />
            </div>
            <span className="font-extrabold text-lg">Skale Visuals</span>
          </div>
          <p className="mt-4 text-muted-foreground text-sm max-w-sm">
            Le montage vidéo qui scale ton business.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm">
            <MessageCircle className="w-4 h-4 text-primary" />
            <a href="mailto:hello@skalevisuals.com" className="text-white/80 hover:text-primary transition">hello@skalevisuals.com</a>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Navigation</div>
          <ul className="space-y-2 text-sm">
            <li><a href="#realisations" className="text-white/80 hover:text-primary transition">Nos réalisations</a></li>
            <li><a href="#methode" className="text-white/80 hover:text-primary transition">Comment ça marche</a></li>
            <li><a href="#avis" className="text-white/80 hover:text-primary transition">Avis clients</a></li>
            <li><a href="#tarifs" className="text-white/80 hover:text-primary transition">Tarifs</a></li>
            <li><a href="#faq" className="text-white/80 hover:text-primary transition">FAQ</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Légal</div>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="text-white/80 hover:text-primary transition">Politique de confidentialité</a></li>
            <li><a href="#" className="text-white/80 hover:text-primary transition">Mentions légales</a></li>
            <li><a href="#" className="text-white/80 hover:text-primary transition">CGV</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between gap-3 text-xs text-muted-foreground">
        <div>© 2026 Skale Visuals. Tous droits réservés.</div>
        <div className="flex items-center gap-2"><Award className="w-3.5 h-3.5 text-primary" /> Made with cinematic care in France</div>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <div className="relative">
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <TrustBar />
        <FeaturedTestimonial />
        <WhySkale />
        <HowItWorks />
        <Portfolio />
        <Testimonials />
        <Comparison />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <style>{`
        .mask-fade {
          -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
                  mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
        }
      `}</style>
    </div>
  );
}
