import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => window.location.replace("/app"), 1500);
    } catch {
      setError("Impossible de mettre à jour le mot de passe. Demandez un nouveau lien.");
    } finally {
      setPending(false);
    }
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
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-7 shadow-2xl backdrop-blur-xl"
      >
        <h1 className="mb-1 text-lg font-semibold tracking-tight text-white">Nouveau mot de passe</h1>
        <p className="mb-6 text-xs text-neutral-400">
          {done
            ? "Mot de passe mis à jour. Redirection en cours…"
            : ready
              ? "Choisissez un nouveau mot de passe pour votre espace client."
              : "Ouvrez cette page depuis le lien reçu par e-mail pour continuer."}
        </p>

        <label className="mb-1 block text-xs text-neutral-300">Mot de passe</label>
        <div className="relative mb-4">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={pending || done || !ready}
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2.5 pr-10 text-sm text-white focus:border-red-500 focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <label className="mb-1 block text-xs text-neutral-300">Confirmation</label>
        <input
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          disabled={pending || done || !ready}
          autoComplete="new-password"
          className="mb-4 w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none disabled:opacity-60"
        />

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending || done || !ready}
          className="w-full rounded-xl bg-red-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-60"
        >
          {pending ? "Mise à jour…" : "Enregistrer"}
        </button>
      </motion.form>
    </div>
  );
}
