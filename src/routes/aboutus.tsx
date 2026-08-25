import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowLeft, Moon, Sun } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getAboutContent } from "@/lib/about-content.functions";
import { DEFAULT_ABOUT, type AboutContent } from "@/lib/about-content.shared";

const TITLE = "À propos — Skale Visuals | Agence de montage vidéo";
const DESCRIPTION =
  "Découvrez l'équipe derrière Skale Visuals, l'agence de montage vidéo pensée pour performer. Fondée par Madi Harrois et Lorenzo Di Dio.";

const ABOUT_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Skale Visuals",
  url: "https://skalevisuals.com",
  description: "Agence de montage vidéo pour créateurs et marques.",
  founder: [
    {
      "@type": "Person",
      name: "Madi Harrois",
      jobTitle: "Fondateur et CEO, Directeur de production",
      url: "https://skalevisuals.com/aboutus",
    },
    {
      "@type": "Person",
      name: "Lorenzo Di Dio",
      jobTitle: "Fondateur et CEO, Directeur commercial",
      url: "https://skalevisuals.com/aboutus",
    },
  ],
  sameAs: ["https://www.instagram.com/skalevisuals/", "https://www.linkedin.com/company/skalevisuals/"],
};

export const Route = createFileRoute("/aboutus")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://skalevisuals.com/aboutus" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://skalevisuals.com/aboutus" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(ABOUT_JSONLD) }],
  }),
  component: AboutUsPage,
});

/* ---------------- theme (same as home) ---------------- */

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const stored = window.localStorage.getItem("skale-theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("site-light", theme === "light");
    window.localStorage.setItem("skale-theme", theme);
    return () => root.classList.remove("site-light");
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

function ThemeToggle({ theme, toggle }: { theme: "dark" | "light"; toggle: () => void }) {
  return (
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
  );
}

/* ---------------- helpers ---------------- */

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
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

function Paragraphs({ text, className = "" }: { text: string; className?: string }) {
  return (
    <>
      {text.split(/\n{2,}|\n/).filter(Boolean).map((p, i) => (
        <p key={i} className={className}>
          {p}
        </p>
      ))}
    </>
  );
}

function useAboutContent() {
  const [content, setContent] = useState<AboutContent>(DEFAULT_ABOUT);

  const load = useCallback(() => {
    getAboutContent()
      .then((c) => setContent(c))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("about-content")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return content;
}

/* ---------------- page ---------------- */

function AboutUsPage() {
  const { theme, toggle } = useTheme();
  const about = useAboutContent();

  return (
    <div className="site-root relative min-h-screen">
      <header className="sticky top-0 z-40 w-full py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-24 pt-6">
        {/* 1 — intro */}
        <section className="text-center">
          <FadeIn>
            <h1 className="text-balance text-4xl font-semibold tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
              {about.introTitle}
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              {about.introText}
            </p>
          </FadeIn>
        </section>

        {/* 2 — fondateurs */}
        <section className="mt-16">
          <div className="grid gap-6 md:grid-cols-2">
            {about.founders.map((f, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <article className="site-pill site-corner-glow h-full rounded-3xl px-6 py-8 text-center sm:px-8">
                  <div className="relative z-10 flex h-full flex-col items-center">
                    <div className="site-surface grid h-24 w-24 place-items-center overflow-hidden rounded-full">
                      {f.photo ? (
                        <img
                          src={f.photo}
                          alt={`${f.name} — ${f.role}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-2xl font-medium text-foreground/80">
                          {(f.name || "?").trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">{f.name}</h2>
                    <h3 className="mt-1 text-[11px] uppercase tracking-widest text-primary">{f.role}</h3>
                    <div className="mt-5 space-y-3 text-left text-sm leading-relaxed text-muted-foreground">
                      <Paragraphs text={f.bio} />
                    </div>
                  </div>
                </article>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* 3 — histoire */}
        <section className="mt-16">
          <FadeIn>
            <div className="site-pill site-corner-glow mx-auto max-w-3xl rounded-3xl px-6 py-10 text-center sm:px-10">
              <div className="relative z-10">
                <h2 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                  {about.storyTitle}
                </h2>
                <div className="mx-auto mt-4 max-w-2xl space-y-3 text-balance text-sm text-muted-foreground sm:text-base">
                  <Paragraphs text={about.storyText} />
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* 4 — vision */}
        <section className="mt-8">
          <FadeIn>
            <div className="site-pill site-corner-glow mx-auto max-w-3xl rounded-3xl px-6 py-10 text-center sm:px-10">
              <div className="relative z-10">
                <h2 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                  {about.visionTitle}
                </h2>
                <div className="mx-auto mt-4 max-w-2xl space-y-3 text-balance text-sm text-muted-foreground sm:text-base">
                  <Paragraphs text={about.visionText} />
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* 5 — valeurs */}
        <section className="mt-16">
          <FadeIn>
            <h2 className="text-center text-2xl font-medium text-foreground sm:text-3xl">{about.valuesTitle}</h2>
          </FadeIn>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {about.values.map((v, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="site-pill site-corner-glow h-full rounded-2xl px-5 py-7 text-center">
                  <div className="relative z-10">
                    <span className="text-2xl" aria-hidden>
                      {v.emoji}
                    </span>
                    <h3 className="mt-3 text-base font-medium text-foreground">{v.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{v.text}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* 6 — équipe */}
        <section className="mt-16">
          <FadeIn>
            <div className="site-pill site-corner-glow mx-auto max-w-3xl rounded-3xl px-6 py-10 text-center sm:px-10">
              <div className="relative z-10">
                <h2 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                  {about.teamTitle}
                </h2>
                <div className="mx-auto mt-4 max-w-2xl space-y-3 text-balance text-sm text-muted-foreground sm:text-base">
                  <Paragraphs text={about.teamText} />
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* 7 — CTA */}
        <section className="mt-16 text-center">
          <FadeIn>
            <div className="site-pill site-corner-glow mx-auto max-w-2xl rounded-3xl px-6 py-12 sm:px-10">
              <div className="relative z-10">
                <h2 className="text-balance text-3xl font-medium text-foreground sm:text-4xl">
                  {about.ctaTitle}
                </h2>
                <Link
                  to="/bookacall"
                  className="btn-glow mt-8 inline-flex items-center gap-2 rounded-full bg-primary-deep px-7 py-3.5 text-sm font-medium text-primary-foreground"
                >
                  {about.ctaButton}
                </Link>
              </div>
            </div>
          </FadeIn>
        </section>
      </main>
    </div>
  );
}
