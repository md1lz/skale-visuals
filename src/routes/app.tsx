import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Chrome, Compass, Download, Share, MoreVertical, Plus, ShieldCheck, Smartphone } from "lucide-react";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Installer l'app Skale — Espace équipe" },
      { name: "description", content: "Installez l'application Skale Visuals pour accéder au panel équipe : projets, deadlines et notifications." },
      { property: "og:title", content: "Installer l'app Skale — Espace équipe" },
      { property: "og:description", content: "Installez l'application Skale Visuals pour accéder au panel équipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#0D0D0D" },
    ],
  }),
  component: InstallPage,
});

const RED = "#E24B4A";

type Env =
  | "desktop-chromium"
  | "desktop-other"
  | "android-chrome"
  | "android-other"
  | "ios-safari"
  | "ios-other";

function detectEnv(): Env {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isEdge = /Edg\//.test(ua);
  const isChrome = /Chrome\//.test(ua) && !/OPR\//.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);

  if (isIOS) return isSafari ? "ios-safari" : "ios-other";
  if (isAndroid) return isChrome || isEdge ? "android-chrome" : "android-other";
  return isChrome || isEdge ? "desktop-chromium" : "desktop-other";
}

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function InstallPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [env, setEnv] = useState<Env | null>(null);
  const [deferred, setDeferred] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Inject the manifest only on /app so the browser install prompt never
    // appears on the public site or other routes.
    if (!pathname.startsWith("/app")) return;
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/manifest.json";
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [pathname]);

  useEffect(() => {
    setEnv(detectEnv());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#0D0D0D] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(226,75,74,0.28), transparent 70%)" }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col items-center justify-center px-6 py-16">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-kangge text-5xl leading-none text-[#E24B4A]"
        >
          Skale
        </motion.span>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] text-neutral-400"
        >
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: RED }} />
          Espace privé
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-6 max-w-3xl text-center text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl md:text-6xl"
        >
          Vous faites partie de l'équipe <span className="font-kangge text-[#E24B4A]">Skale</span> ?
          <br />
          <span className="font-script italic">Accédez à votre panel</span> en installant l'appli.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          className="mt-5 max-w-xl text-center text-[15px] leading-relaxed text-neutral-400"
        >
          Espace réservé à l'équipe et aux monteurs. L'application installée est le seul accès au
          panel — projets, deadlines et notifications, directement sur votre appareil.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
        >
          {installed ? (
            <p className="text-center text-sm text-neutral-300">
              Application installée. Ouvrez-la depuis votre écran d'accueil.
            </p>
          ) : env === null ? (
            <div className="h-12 animate-pulse rounded-2xl bg-white/5" />
          ) : env === "desktop-chromium" ? (
            <>
              <button
                type="button"
                onClick={install}
                disabled={!deferred}
                style={{ backgroundColor: RED }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Installer l'application
              </button>
              {!deferred && (
                <p className="mt-3 text-center text-xs text-neutral-500">
                  Si le bouton reste inactif, utilisez l'icône d'installation dans la barre d'adresse.
                </p>
              )}
            </>
          ) : env === "desktop-other" ? (
            <Notice icon={<Chrome className="h-4 w-4" />} text="Pour installer, utilisez Chrome ou Edge." />
          ) : env === "android-chrome" ? (
            <Steps
              title="Installer sur Android"
              illustration={<PhoneIllustration icon={<MoreVertical className="h-5 w-5" />} />}
              steps={["Appuyez sur ⋮ en haut à droite", "Choisissez « Ajouter à l'écran d'accueil »"]}
            />
          ) : env === "ios-safari" ? (
            <Steps
              title="Installer sur iPhone"
              illustration={<PhoneIllustration icon={<Share className="h-5 w-5" />} />}
              steps={["Appuyez sur Partager", "Choisissez « Sur l'écran d'accueil »"]}
            />
          ) : env === "ios-other" ? (
            <Notice icon={<Compass className="h-4 w-4" />} text="Ouvrez cette page dans Safari pour pouvoir l'installer." />
          ) : (
            <Notice icon={<Chrome className="h-4 w-4" />} text="Ouvrez cette page dans Chrome pour pouvoir l'installer." />
          )}
        </motion.div>

        <p className="mt-8 flex items-center gap-2 text-[11px] text-neutral-600">
          <Smartphone className="h-3.5 w-3.5" />
          Accès sur invitation uniquement
        </p>
      </div>
    </main>
  );
}

function Notice({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#161616] px-4 py-3.5 text-sm text-neutral-300">
      <span className="text-[#E24B4A]">{icon}</span>
      {text}
    </div>
  );
}

function Steps({ title, steps, illustration }: { title: string; steps: string[]; illustration: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-5">
      {illustration}
      <div className="w-full">
        <p className="mb-3 text-center text-sm font-semibold">{title}</p>
        <ol className="space-y-2.5">
          {steps.map((s, i) => (
            <li key={s} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#161616] px-4 py-3 text-sm text-neutral-300">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ backgroundColor: RED }}
              >
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function PhoneIllustration({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="relative h-32 w-[4.5rem] rounded-[1.1rem] border border-white/15 bg-[#141414] shadow-[0_0_40px_rgba(226,75,74,0.15)]">
      <span className="absolute left-1/2 top-1.5 h-1 w-6 -translate-x-1/2 rounded-full bg-white/15" />
      <div className="absolute inset-x-2 top-6 space-y-1.5">
        <div className="h-1.5 rounded bg-white/10" />
        <div className="h-1.5 w-2/3 rounded bg-white/10" />
      </div>
      <motion.span
        animate={{ y: [0, -4, 0], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-3 bottom-4 flex h-9 w-9 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: RED }}
      >
        {icon}
      </motion.span>
      <span className="absolute -left-3 bottom-12 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white">
        <Plus className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}
