import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useInView } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Sun, Moon, Mail, Instagram, Linkedin, AlertTriangle, Check } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import logoDark from "@/assets/skale-logo-dark.png.asset.json";
import logoLight from "@/assets/skale-logo-light.png.asset.json";
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

/* ---------------- theme ---------------- */

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem("skale-theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
    setThemeReady(true);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("site-light", theme === "light");
    window.localStorage.setItem("skale-theme", theme);
    return () => root.classList.remove("site-light");
  }, [theme]);
  return { theme, themeReady, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
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

/** Counts from 1 to `to`, one unit at a time. */
function StepCounter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(to > 0 ? 1 : 0);

  useEffect(() => {
    if (!inView || to <= 1) {
      setValue(to);
      return;
    }
    setValue(1);
    const totalMs = 1600;
    const stepMs = Math.max(12, totalMs / to);
    let current = 1;
    const id = window.setInterval(() => {
      current += 1;
      setValue(current);
      if (current >= to) window.clearInterval(id);
    }, stepMs);
    return () => window.clearInterval(id);
  }, [inView, to]);

  return <span ref={ref}>{value.toLocaleString("fr-FR")}</span>;
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

function Navbar({ theme, toggle }: { theme: "dark" | "light"; toggle: () => void }) {
  return (
    <header className="sticky top-0 z-40 w-full py-4">
      <div className="relative flex w-full items-center justify-end px-4">
        <button
          type="button"
          onClick={toggle}
          role="switch"
          aria-checked={theme === "light"}
          aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          className="site-glass relative flex h-10 w-[74px] items-center rounded-full p-1 transition hover:scale-[1.03]"
        >
          <motion.span
            animate={{ x: theme === "dark" ? 0 : 30 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="absolute left-1 h-8 w-8 rounded-full bg-foreground/90"
          />
          <span className="relative z-10 grid h-8 w-8 place-items-center">
            <Moon className={`h-4 w-4 transition-colors ${theme === "dark" ? "text-background" : "text-foreground/60"}`} />
          </span>
          <span className="relative z-10 grid h-8 w-8 place-items-center">
            <Sun className={`h-4 w-4 transition-colors ${theme === "light" ? "text-background" : "text-foreground/60"}`} />
          </span>
        </button>
      </div>
    </header>
  );
}

/* ---------------- hero ---------------- */

function Hero({
  settings,
  theme,
  themeReady,
}: {
  settings: HomeContent["settings"];
  theme: "dark" | "light";
  themeReady: boolean;
}) {
  return (
    <section className="relative overflow-hidden pb-6 pt-10 lg:pt-16">
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <FadeIn>
          {settings.titleStyle === "visuals" ? (
            <h1 className="flex select-none items-center justify-center gap-3 text-5xl font-semibold leading-none tracking-tighter text-foreground sm:gap-4 sm:text-6xl lg:text-7xl">
              <span
                className={`grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full ring-1 sm:h-16 sm:w-16 lg:h-20 lg:w-20 ${
                  theme === "light" ? "bg-white ring-black/10" : "bg-black ring-white/10"
                }`}
              >
                {themeReady && (
                  <img
                    key={theme}
                    src={theme === "light" ? logoLight.url : logoDark.url}
                    alt="Logo Skale Visuals"
                    decoding="async"
                    className="h-full w-full object-contain p-2"
                  />
                )}
              </span>
              Skale Visuals
            </h1>
          ) : (
            <h1 className="font-kangge select-none text-6xl leading-none text-foreground sm:text-7xl lg:text-8xl">
              skale<span className="text-primary">.</span>
            </h1>
          )}
        </FadeIn>
        <FadeIn delay={0.12}>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-base text-muted-foreground sm:mt-4 sm:text-lg">
            Montage vidéo conçu pour performer : stratégies pensées pour augmenter ton watchtime, convertir et
            faire grossir ton audience. Pas d'intermédiaire, pas de prise de tête. On s'occupe de tout.
          </p>
        </FadeIn>

        <FadeIn delay={0.24}>
          <div className="mt-12 flex flex-col items-stretch justify-center gap-4 sm:flex-row">
            {[
              { value: settings.videosCount, label: "vidéos montées" },
              { value: settings.clientsCount, label: "clients accompagnés" },
            ].map((s) => (
              <div
                key={s.label}
                className="site-pill site-corner-glow rounded-2xl px-12 py-6 sm:min-w-[300px] lg:min-w-[340px]"
              >
                <div className="relative z-10">
                  <div className="text-3xl font-medium text-foreground sm:text-4xl">
                    <span>+</span>
                    <StepCounter to={s.value} />
                  </div>
                  <div className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ---------------- formats ticker ---------------- */

const FORMATS = [
  "⚡ Short",
  "✨ Motion Design",
  "🎬 VSL",
  "📢 Ads",
  "🎥 Face Cam",
  "🎙️ Podcast",
  "🌎 Vlog",
];

function FormatsTicker() {
  return (
    <section className="ticker-fade relative mx-auto max-w-5xl overflow-hidden py-8">
      <div className="flex w-max gap-3 ticker-track">
        {[...FORMATS, ...FORMATS, ...FORMATS].map((f, i) => (
          <span
            key={`${f}-${i}`}
            className="site-surface shrink-0 rounded-full px-5 py-2.5 text-sm text-foreground/90"
          >
            {f}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---------------- trust ---------------- */

function Trust({ settings }: { settings: HomeContent["settings"] }) {
  return (
    <section className="py-10">
      <FadeIn>
        <p className="text-center text-2xl font-medium text-foreground sm:text-3xl">
          Ils nous font confiance
        </p>
        <div className="mt-6 flex flex-wrap items-start justify-center gap-5 sm:gap-8">
          {settings.trust.slice(0, 4).map((c, i) => (
            <div key={i} className="w-16 text-center sm:w-20">
              <div className="site-surface mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-full sm:h-20 sm:w-20">
                {c.photo ? (
                  <img src={c.photo} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-medium text-foreground/80">
                    {(c.name || "?").trim().charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-medium leading-tight text-muted-foreground">{c.name}</p>
            </div>
          ))}
          <div className="w-16 sm:w-20">
            <div className="site-pill site-corner-glow mx-auto grid h-16 w-16 place-items-center rounded-full sm:h-20 sm:w-20">
              <span className="relative z-[1] text-base font-semibold text-foreground sm:text-lg">{settings.plusLabel}</span>
            </div>
          </div>
        </div>

      </FadeIn>
    </section>
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
              <span className="font-kangge text-2xl text-white sm:text-3xl">
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
            <p className="font-kangge text-3xl text-foreground">
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
  const { theme, themeReady, toggle } = useTheme();
  const { settings, folders, videos } = useHomeContent();

  return (
    <div className="site-root relative min-h-screen">
      <Navbar theme={theme} toggle={toggle} />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4">
        <Hero settings={settings} theme={theme} themeReady={themeReady} />
        <FormatsTicker />
        <Trust settings={settings} />
        <Realisations folders={folders} videos={videos} />
        <CallCta />
        <Comparatif />
      </main>
      <SiteFooter />
    </div>
  );
}
