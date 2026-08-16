import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAdmin, getAdminSessionFn } from "@/lib/admin-auth.functions";
import { getEditorSessionFn } from "@/lib/editor.functions";
import { registerPushWorker, isStandaloneApp } from "@/lib/pwa";

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
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await login({ data: { username, password, remember } });
      if (!res.ok) {
        setError(
          "suspended" in res && res.suspended
            ? "Ce compte est suspendu."
            : "Identifiants incorrects.",
        );
        return;
      }
      window.location.replace("role" in res && res.role === "editor" ? "/monteur" : "/admin");
    } catch {
      setError("Identifiants incorrects.");
    } finally {
      setPending(false);
    }
  }

  if (checking) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#0D0D0D] text-white">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0D0D0D] p-4">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
          <h2 className="text-white text-lg font-semibold">Connexion</h2>
        </div>
        <p className="text-xs text-neutral-400 mb-5">Accès réservé à l'équipe et aux monteurs.</p>

        <label className="block text-xs text-neutral-300 mb-1">Identifiant</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          disabled={pending}
          className="w-full mb-3 rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors disabled:opacity-60"
        />

        <label className="block text-xs text-neutral-300 mb-1">Mot de passe</label>
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={pending}
            className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 pr-10 text-sm text-white focus:outline-none focus:border-red-500 transition-colors disabled:opacity-60"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <label className="flex items-center gap-2 mb-4 text-xs text-neutral-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={pending}
            className="h-3.5 w-3.5 accent-red-600 cursor-pointer"
          />
          Se souvenir de moi sur cet appareil
        </label>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-400 mb-3"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={pending}
          whileHover={pending ? undefined : { scale: 1.02 }}
          whileTap={pending ? undefined : { scale: 0.97 }}
          className="w-full rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-70 px-3 py-2 text-sm font-medium text-white transition-colors"
        >
          {pending ? "Vérification…" : "Se connecter"}
        </motion.button>
      </motion.form>
    </div>
  );
}
