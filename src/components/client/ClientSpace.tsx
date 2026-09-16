import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { ClientBackdrop } from "@/components/client/ClientBackdrop";
import skaleLogo from "@/assets/skale-logo-dark.png.asset.json";

type Mode = "signin" | "signup" | "forgot";

const SITE_URL = "https://skalevisuals.com";

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[15px] text-white outline-none transition-all placeholder:text-white/35 focus:border-white/25 focus:bg-white/[0.09] disabled:opacity-60";

function Menu() {
  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex justify-center px-4 pt-4">
      <nav className="flex w-full max-w-3xl items-center justify-between rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 backdrop-blur-xl">
        <a href={SITE_URL} className="flex items-center gap-2 pl-1">
          <img src={skaleLogo.url} alt="Skale Visuals" className="h-6 w-auto" />
        </a>
        <div className="flex items-center gap-1">
          <a
            href={SITE_URL}
            className="rounded-full px-3 py-1.5 text-[13px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Le site
          </a>
          <a
            href={`${SITE_URL}/bookacall`}
            className="flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-black transition-transform hover:scale-[1.03]"
          >
            Réserver un appel
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </nav>
    </header>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-black px-4 py-24">
      <ClientBackdrop />
      <Menu />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className={`mx-auto w-full max-w-[26rem] rounded-[28px] border border-white/12 bg-white/[0.07] p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function ClientSpace() {
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
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/50" />
        </div>
      </Shell>
    );
  }

  return <Shell>{session ? <ClientHome /> : <AuthCard />}</Shell>;
}

function ClientHome() {
  const [name, setName] = useState("");

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
    <Panel className="text-center">
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Espace client</p>
      <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight text-white">
        Bonjour {name || "👋"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-white/55">
        Votre espace est prêt. Vos projets et livrables apparaîtront ici très bientôt.
      </p>
      <button
        onClick={() => supabase.auth.signOut()}
        className="mt-7 w-full rounded-2xl border border-white/12 px-4 py-3 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
      >
        Se déconnecter
      </button>
    </Panel>
  );
}

function Segmented({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const items: { key: Mode; label: string }[] = [
    { key: "signin", label: "Connexion" },
    { key: "signup", label: "Inscription" },
  ];
  return (
    <div className="mb-6 flex rounded-2xl border border-white/10 bg-black/30 p-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className="relative flex-1 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"
        >
          {mode === item.key && (
            <motion.span
              layoutId="client-seg"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-xl bg-white/90"
            />
          )}
          <span className={`relative ${mode === item.key ? "text-black" : "text-white/60"}`}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
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
            emailRedirectTo: `${window.location.origin}/`,
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
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
        setInfo(
          "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.",
        );
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
        setError("Le mot de passe doit contenir au moins 8 caractères.");
      else setError("Une erreur est survenue. Réessayez dans un instant.");
    } finally {
      setPending(false);
    }
  }

  async function oauth(provider: "google" | "apple") {
    reset();
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/`,
      });
      if (result.error) setError("La connexion avec ce service a échoué.");
    } catch {
      setError("La connexion avec ce service a échoué.");
    }
  }

  if (info) {
    return (
      <Panel className="text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white">
          <MailCheck className="h-5 w-5" />
        </span>
        <p className="text-sm leading-relaxed text-white/70">{info}</p>
        <button
          onClick={() => {
            setInfo(null);
            setMode("signin");
          }}
          className="mt-6 w-full rounded-2xl border border-white/12 px-4 py-3 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          Retour à la connexion
        </button>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="mb-6 text-center">
        <h1 className="text-[26px] font-semibold tracking-tight text-white">
          {mode === "forgot" ? "Mot de passe oublié" : "Espace client"}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-white/50">
          {mode === "signin" && "Connectez-vous pour suivre vos projets."}
          {mode === "signup" && "Créez votre compte en quelques secondes."}
          {mode === "forgot" && "Recevez un lien pour choisir un nouveau mot de passe."}
        </p>
      </div>

      {mode !== "forgot" && (
        <Segmented
          mode={mode}
          onChange={(m) => {
            reset();
            setMode(m);
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={pending}
              autoComplete="name"
              placeholder="Nom complet"
              className={inputClass}
            />
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={pending}
              autoComplete="organization"
              placeholder="Société (facultatif)"
              className={inputClass}
            />
          </>
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={pending}
          autoComplete="email"
          placeholder="E-mail"
          className={inputClass}
        />

        {mode !== "forgot" && (
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={pending}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="Mot de passe"
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        )}

        {mode === "signup" && (
          <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-[12px] leading-relaxed text-white/50">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-white"
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
              className="text-[12.5px] text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={pending}
          whileHover={pending ? undefined : { scale: 1.015 }}
          whileTap={pending ? undefined : { scale: 0.98 }}
          className="!mt-5 w-full rounded-2xl bg-white px-4 py-3 text-[15px] font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-60"
        >
          {pending
            ? "Un instant…"
            : mode === "signin"
              ? "Se connecter"
              : mode === "signup"
                ? "Créer mon compte"
                : "Envoyer le lien"}
        </motion.button>
      </form>

      {mode !== "forgot" && (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">ou</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => oauth("apple")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-[14px] text-white transition-colors hover:bg-white/12"
            >
              <AppleIcon /> Continuer avec Apple
            </button>
            <button
              type="button"
              onClick={() => oauth("google")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-[14px] text-white transition-colors hover:bg-white/12"
            >
              <GoogleIcon /> Continuer avec Google
            </button>
          </div>
        </>
      )}

      <div className="mt-6 text-center text-[12.5px] text-white/45">
        {mode === "signin" ? (
          <button
            type="button"
            onClick={() => {
              reset();
              setMode("forgot");
            }}
            className="transition-colors hover:text-white"
          >
            Mot de passe oublié ?
          </button>
        ) : mode === "forgot" ? (
          <button
            type="button"
            onClick={() => {
              reset();
              setMode("signin");
            }}
            className="transition-colors hover:text-white"
          >
            Retour à la connexion
          </button>
        ) : (
          <span>En créant un compte, vous acceptez nos conditions d'utilisation.</span>
        )}
      </div>
    </Panel>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 384 512" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C39.6 35.9 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
