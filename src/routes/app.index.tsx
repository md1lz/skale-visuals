import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/app/")({
  component: ClientSpacePage,
});

type Mode = "signin" | "signup" | "forgot";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2.5 text-sm text-white transition-colors placeholder:text-neutral-600 focus:border-red-500 focus:outline-none disabled:opacity-60";

function Shell({ children }: { children: React.ReactNode }) {
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
      {children}
    </div>
  );
}

function ClientSpacePage() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <Shell>
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </Shell>
    );
  }

  return <Shell>{session ? <ClientHome /> : <AuthCard />}</Shell>;
}

function ClientHome() {
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const { data } = await supabase
        .from("client_profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const fallback =
        (user.user_metadata?.["full_name"] as string | undefined) ??
        (user.user_metadata?.["name"] as string | undefined) ??
        user.email?.split("@")[0] ??
        "";
      setName((data?.full_name || fallback || "").trim());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-xl"
    >
      <div className="mb-3 flex items-center justify-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-600 shadow-[0_0_10px_rgba(226,75,74,0.9)]" />
        <span className="text-xs uppercase tracking-widest text-neutral-400">Espace client</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Bonjour {name || "👋"}
      </h1>
      <p className="mt-3 text-sm text-neutral-400">
        Votre espace est prêt. Vos projets et livrables apparaîtront ici très bientôt.
      </p>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
        }}
        className="mt-7 w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:bg-white/5"
      >
        Se déconnecter
      </button>
    </motion.div>
  );
}

function AuthCard() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [marketing, setMarketing] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setInfo(null);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    reset();
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: {
              full_name: fullName.trim(),
              company: company.trim(),
              marketing_opt_in: marketing,
            },
          },
        });
        if (err) throw err;
        setInfo(
          "Compte créé. Ouvrez l'e-mail de confirmation que nous venons de vous envoyer pour activer votre accès.",
        );
        return;
      }
      if (mode === "forgot") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/app/reset-password`,
        });
        if (err) throw err;
        setInfo("Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.");
        return;
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/Invalid login credentials/i.test(message)) setError("E-mail ou mot de passe incorrect.");
      else if (/Email not confirmed/i.test(message))
        setError("Votre adresse n'est pas encore confirmée. Vérifiez votre boîte mail.");
      else if (/already registered/i.test(message))
        setError("Un compte existe déjà avec cette adresse.");
      else if (/at least/i.test(message))
        setError("Le mot de passe doit contenir au moins 6 caractères.");
      else setError("Une erreur est survenue. Réessayez dans un instant.");
    } finally {
      setPending(false);
    }
  }

  async function oauth(provider: "google" | "apple") {
    reset();
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/app`,
      });
      if (result.error) {
        setError("La connexion avec ce service a échoué.");
        return;
      }
    } catch {
      setError("La connexion avec ce service a échoué.");
    }
  }

  if (info) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-xl"
      >
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-red-500/15 text-red-400">
          <MailCheck className="h-5 w-5" />
        </span>
        <p className="text-sm text-neutral-300">{info}</p>
        <button
          onClick={() => {
            setInfo(null);
            setMode("signin");
          }}
          className="mt-6 w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:bg-white/5"
        >
          Retour à la connexion
        </button>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-7 shadow-2xl backdrop-blur-xl"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-600 shadow-[0_0_10px_rgba(226,75,74,0.9)]" />
        <h1 className="text-lg font-semibold tracking-tight text-white">Espace client</h1>
      </div>
      <p className="mb-6 text-xs text-neutral-400">
        {mode === "signin" && "Connectez-vous pour suivre vos projets."}
        {mode === "signup" && "Créez votre compte en quelques secondes."}
        {mode === "forgot" && "Recevez un lien pour choisir un nouveau mot de passe."}
      </p>

      {mode === "signup" && (
        <>
          <label className="mb-1 block text-xs text-neutral-300">Nom complet</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={pending}
            autoComplete="name"
            className={`${inputClass} mb-4`}
          />
          <label className="mb-1 block text-xs text-neutral-300">
            Société <span className="text-neutral-500">(facultatif)</span>
          </label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            disabled={pending}
            autoComplete="organization"
            placeholder="Nécessaire pour un paiement au nom d'une société"
            className={`${inputClass} mb-4`}
          />
        </>
      )}

      <label className="mb-1 block text-xs text-neutral-300">E-mail</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={pending}
        autoComplete="email"
        className={`${inputClass} mb-4`}
      />

      {mode !== "forgot" && (
        <>
          <label className="mb-1 block text-xs text-neutral-300">Mot de passe</label>
          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={pending}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className={`${inputClass} pr-10`}
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
        </>
      )}

      {mode === "signup" && (
        <label className="mb-4 flex cursor-pointer items-start gap-2 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-red-600"
          />
          <span>Je souhaite recevoir les actualités et offres de Skale Visuals par e-mail.</span>
        </label>
      )}

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
        {pending
          ? "Un instant…"
          : mode === "signin"
            ? "Se connecter"
            : mode === "signup"
              ? "Créer mon compte"
              : "Envoyer le lien"}
      </motion.button>

      {mode !== "forgot" && (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">ou</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => oauth("google")}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white transition-colors hover:bg-white/10"
            >
              Continuer avec Google
            </button>
            <button
              type="button"
              onClick={() => oauth("apple")}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white transition-colors hover:bg-white/10"
            >
              Continuer avec Apple
            </button>
          </div>
        </>
      )}

      <div className="mt-6 space-y-2 text-center text-xs text-neutral-400">
        {mode === "signin" && (
          <>
            <button type="button" onClick={() => { reset(); setMode("forgot"); }} className="hover:text-white">
              Mot de passe oublié ?
            </button>
            <p>
              Pas encore de compte ?{" "}
              <button type="button" onClick={() => { reset(); setMode("signup"); }} className="text-red-400 hover:text-red-300">
                Créer un compte
              </button>
            </p>
          </>
        )}
        {mode !== "signin" && (
          <button type="button" onClick={() => { reset(); setMode("signin"); }} className="hover:text-white">
            Retour à la connexion
          </button>
        )}
      </div>
    </motion.form>
  );
}
