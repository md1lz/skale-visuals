import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAdmin, getAdminSessionFn, tryAutoLoginByIp } from "@/lib/admin-auth.functions";
import { getEditorSessionFn } from "@/lib/editor.functions";

/** Point d'entrée unique : écran de connexion de /office (admin et monteurs). */
export function OfficeLogin() {
  const login = useServerFn(loginAdmin);
  const fetchAdmin = useServerFn(getAdminSessionFn);
  const fetchEditor = useServerFn(getEditorSessionFn);
  const autoLogin = useServerFn(tryAutoLoginByIp);

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
          window.location.replace("/office");
          return;
        }
        if (editor) {
          window.location.replace("/studio");
          return;
        }
        const auto = await autoLogin({ data: { source: "web" } });
        if (cancelled) return;
        if (auto.ok) {
          window.location.replace("role" in auto && auto.role === "editor" ? "/studio" : "/office");
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
  }, [fetchAdmin, fetchEditor, autoLogin]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await login({ data: { username, password, remember, source: "web" } });
      if (!res.ok) {
        setError(
          "suspended" in res && res.suspended
            ? "Ce compte est suspendu."
            : "Identifiants incorrects.",
        );
        return;
      }
      window.location.replace("role" in res && res.role === "editor" ? "/studio" : "/office");
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
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#0D0D0D] p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(40rem 30rem at 50% 0%, rgba(226,75,74,0.16), transparent 60%)",
        }}
      />
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-7 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-600 shadow-[0_0_10px_rgba(226,75,74,0.9)]" />
          <h2 className="text-lg font-semibold tracking-tight text-white">Skale Office</h2>
        </div>
        <p className="mb-6 text-xs text-neutral-400">Accès réservé à l'équipe et aux monteurs.</p>

        <label className="mb-1 block text-xs text-neutral-300">Identifiant</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          disabled={pending}
          className="mb-3 w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2.5 text-sm text-white transition-colors focus:border-red-500 focus:outline-none disabled:opacity-60"
        />

        <label className="mb-1 block text-xs text-neutral-300">Mot de passe</label>
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={pending}
            className="w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2.5 pr-10 text-sm text-white transition-colors focus:border-red-500 focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-white"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <label className="mb-4 flex cursor-pointer select-none items-center gap-2 text-xs text-neutral-300">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={pending}
            className="h-3.5 w-3.5 cursor-pointer accent-red-600"
          />
          Se souvenir de moi sur cet appareil
        </label>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 text-xs text-red-400"
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
          className="w-full rounded-xl bg-red-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-70"
        >
          {pending ? "Vérification…" : "Se connecter"}
        </motion.button>
      </motion.form>
    </div>
  );
}
