import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff } from "lucide-react";
import { loginAdmin, tryAutoLoginByIp } from "@/lib/admin-auth.functions";

export function AdminBubble() {
  const login = useServerFn(loginAdmin);
  const autoLogin = useServerFn(tryAutoLoginByIp);
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  async function handleBubbleClick() {
    if (pending) return;
    setPending(true);
    try {
      const res = await autoLogin();
      if (res.ok) {
        window.location.assign("/admin");
        return;
      }
    } catch {
      // ignore, fall through to manual login
    } finally {
      setPending(false);
    }
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      const res = await login({ data: { username, password, remember } });
      if (res.ok) {
        setOpen(false);
        setUsername("");
        setPassword("");
        window.location.assign("/admin");
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }


  return (
    <>
      <div
        className="fixed top-4 right-4 z-[60] flex items-center gap-2"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <AnimatePresence>
          {hovered && (
            <motion.span
              initial={{ opacity: 0, x: 12, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.9 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="rounded-full bg-black/80 backdrop-blur px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap shadow-lg border border-white/10"
            >
              Vous êtes admin ?
            </motion.span>
          )}
        </AnimatePresence>
        <motion.button
          aria-label="Admin login"
          onClick={handleBubbleClick}
          initial={{ opacity: 0.35, scale: 0.85 }}
          animate={{
            opacity: hovered ? 1 : 0.35,
            scale: hovered ? 1.15 : 0.85,
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="relative h-3.5 w-3.5 rounded-full bg-red-600 shadow-[0_0_12px_rgba(220,38,38,0.7)]"
        >
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => !pending && setOpen(false)}
          >
            <motion.form
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                <h2 className="text-white text-lg font-semibold">Connexion admin</h2>
              </div>
              <p className="text-xs text-neutral-400 mb-5">Accès réservé à l'équipe.</p>

              <label className="block text-xs text-neutral-300 mb-1">Identifiant</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
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
                    Identifiants incorrects.
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 transition-colors disabled:opacity-60"
                >
                  Annuler
                </button>
                <motion.button
                  type="submit"
                  disabled={pending}
                  whileHover={pending ? undefined : { scale: 1.02 }}
                  whileTap={pending ? undefined : { scale: 0.97 }}
                  className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-70 px-3 py-2 text-sm font-medium text-white transition-colors"
                >
                  {pending ? "Vérification…" : "Se connecter"}
                </motion.button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
