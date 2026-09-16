import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { ClientBackdrop } from "@/components/client/ClientBackdrop";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Skale Visuals" },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#000000" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch {
      setError("Le lien est peut-être expiré. Demandez-en un nouveau.");
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[15px] text-white outline-none transition-all placeholder:text-white/35 focus:border-white/25 focus:bg-white/[0.09] disabled:opacity-60";

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-black px-4 py-20">
      <ClientBackdrop />
      <div className="relative z-10 mx-auto w-full max-w-[26rem] rounded-[28px] border border-white/12 bg-white/[0.07] p-7 backdrop-blur-2xl">
        <h1 className="text-center text-[24px] font-semibold tracking-tight text-white">
          Nouveau mot de passe
        </h1>
        <p className="mb-6 mt-2 text-center text-[13px] text-white/50">
          {done
            ? "Mot de passe mis à jour. Redirection…"
            : "Choisissez un nouveau mot de passe pour votre espace client."}
        </p>

        {!done && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={pending}
                autoComplete="new-password"
                placeholder="Nouveau mot de passe"
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
                aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              disabled={pending}
              autoComplete="new-password"
              placeholder="Confirmer le mot de passe"
              className={inputClass}
            />
            {error && <p className="text-[12.5px] text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="!mt-5 w-full rounded-2xl bg-white px-4 py-3 text-[15px] font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-60"
            >
              {pending ? "Un instant…" : "Mettre à jour"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
