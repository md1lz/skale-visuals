import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAdmin, getAdminSessionFn } from "@/lib/admin-auth.functions";
import { getEditorSessionFn } from "@/lib/editor.functions";
import { registerPushWorker, isStandaloneApp } from "@/lib/pwa";
import logoMark from "@/assets/skale-logo-mark.jpg.asset.json";

export const Route = createFileRoute("/crm")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Skale CRM — Connexion" },
      { name: "description", content: "Connexion au panel Skale Visuals, réservée à l'équipe et aux monteurs." },
      { property: "og:title", content: "Skale CRM — Connexion" },
      { property: "og:description", content: "Connexion au panel Skale Visuals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#0D0D0D" },
    ],
  }),
  component: CrmRoute,
});

function isDevHost() {
  const h = window.location.hostname;
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".lovable.app") ||
    h.endsWith(".lovable.dev")
  );
}

function CrmRoute() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (isStandaloneApp() || isDevHost()) {
      setAllowed(true);
      void registerPushWorker();
      return;
    }
    setAllowed(false);
    window.location.replace("https://skalevisuals.com");
  }, []);

  if (allowed !== true) return <div className="min-h-[100dvh] bg-[#0D0D0D]" />;
  return <CrmLogin />;
}

function CrmLogin() {
  const login = useServerFn(loginAdmin);
  const fetchAdmin = useServerFn(getAdminSessionFn);
  const fetchEditor = useServerFn(getEditorSessionFn);

  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [admin, editor] = await Promise.all([fetchAdmin(), fetchEditor()]);
        if (cancelled) return;
        if (admin) {
          window.location.replace("/admin");
          return;
        }
        if (editor) {
          window.location.replace("/monteur");
          return;
        }
      } catch {
        /* noop */
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAdmin, fetchEditor]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await login({ data: { username, password, remember: true } });
      if (!res.ok) {
        setError("suspended" in res && res.suspended ? "Ce compte est suspendu." : "Identifiant ou mot de passe incorrect");
        return;
      }
      window.location.replace("role" in res && res.role === "editor" ? "/monteur" : "/admin");
    } catch {
      setError("Identifiant ou mot de passe incorrect");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#0D0D0D] text-white">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0D0D0D] px-6 text-white">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="font-kangge text-5xl leading-none text-[#E24B4A]">Skale</span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Skale CRM</h1>
          <p className="mt-1.5 text-sm text-neutral-500">Panel de gestion Skale Visuals</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            placeholder="Identifiant"
            className="w-full rounded-2xl border border-white/10 bg-[#161616] px-4 py-3.5 text-[15px] text-white outline-none placeholder:text-neutral-600 focus:border-white/25"
          />
          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Mot de passe"
              className="w-full rounded-2xl border border-white/10 bg-[#161616] px-4 py-3.5 pr-12 text-[15px] text-white outline-none placeholder:text-neutral-600 focus:border-white/25"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{ backgroundColor: RED }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Se connecter
          </button>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pt-1 text-center text-[13px] text-red-400"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      <p className="pb-8 text-center text-[11px] text-neutral-700">Accès sur invitation uniquement</p>
    </div>
  );
}
