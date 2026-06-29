import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { tryLogin } from "@/lib/admin-auth";

export function AdminBubble() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tryLogin(username, password)) {
      setOpen(false);
      setUsername("");
      setPassword("");
      setError(false);
      navigate({ to: "/admin" });
    } else {
      setError(true);
      setTimeout(() => setError(false), 1800);
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
          onClick={() => setOpen(true)}
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
            onClick={() => setOpen(false)}
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
                className="w-full mb-3 rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
              />

              <label className="block text-xs text-neutral-300 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full mb-4 rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
              />

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
                  className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors"
                >
                  Se connecter
                </motion.button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
