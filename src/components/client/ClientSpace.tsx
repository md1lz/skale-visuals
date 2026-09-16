import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { ClientBackdrop } from "@/components/client/ClientBackdrop";
import { Button } from "@/components/ui/button";
import { DEFAULT_HOME_SETTINGS, getHomeContent, type HomeSettings } from "@/lib/home-content.functions";
import skaleSymbol from "@/assets/skale-symbol.png.asset.json";

type Mode = "signin" | "signup" | "forgot";

const inputClass =
  "client-auth-input w-full rounded-xl px-4 py-3.5 text-[15px] outline-none transition disabled:opacity-60";

function Shell({ children, settings }: { children: React.ReactNode; settings: HomeSettings }) {
  return (
    <div className="client-space-root relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-8 sm:py-12">
      <ClientBackdrop top={settings.clientCarouselTop} bottom={settings.clientCarouselBottom} />
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
      className={`client-auth-panel mx-auto w-full max-w-[24.5rem] rounded-[2rem] p-7 sm:p-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function ClientSpace() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<HomeSettings>(DEFAULT_HOME_SETTINGS);

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

  useEffect(() => {
    getHomeContent().then((content) => setSettings(content.settings)).catch(() => {});
  }, []);

  if (loading) {
    return (
      <Shell settings={settings}>
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-client-muted" />
        </div>
      </Shell>
    );
  }

  return <Shell settings={settings}>{session ? <ClientHome /> : <AuthCard />}</Shell>;
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
    <Panel className="text-center text-client-foreground">
      <p className="text-[11px] uppercase text-client-muted">Espace client</p>
      <h1 className="mt-3 text-[28px] font-semibold leading-tight">
        Bonjour {name || "👋"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-client-muted">
        Votre espace est prêt. Vos projets et livrables apparaîtront ici très bientôt.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={() => supabase.auth.signOut()}
        className="mt-7 h-12 w-full rounded-xl border-client-border bg-client-control text-client-foreground hover:bg-client-control-hover hover:text-client-foreground"
      >
        Se déconnecter
      </Button>
    </Panel>
  );
}

function Segmented({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const items: { key: Mode; label: string }[] = [
    { key: "signin", label: "Connexion" },
    { key: "signup", label: "Inscription" },
  ];
  return (
    <div className="relative mb-7 flex rounded-2xl bg-client-control p-1">
      {items.map((item) => (
        <Button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          variant="ghost"
          className="relative h-9 flex-1 rounded-xl px-3 text-[13px] font-medium hover:bg-transparent"
        >
          {mode === item.key && (
            <motion.span
              layoutId="client-seg"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-xl bg-client-segment shadow-sm"
            />
          )}
           <span className={`relative ${mode === item.key ? "text-client-segment-foreground" : "text-client-muted"}`}>
            {item.label}
          </span>
        </Button>
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

  async function oauth() {
    reset();
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/`,
      });
      if (result.error) setError("La connexion avec Google a échoué.");
    } catch {
      setError("La connexion avec Google a échoué.");
    }
  }

  if (info) {
    return (
      <Panel className="text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-client-control text-client-foreground">
          <MailCheck className="h-5 w-5" />
        </span>
        <p className="text-sm leading-relaxed text-client-muted">{info}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setInfo(null);
            setMode("signin");
          }}
          className="mt-6 h-12 w-full rounded-xl border-client-border bg-client-control text-client-foreground hover:bg-client-control-hover hover:text-client-foreground"
        >
          Retour à la connexion
        </Button>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="mb-9 text-center text-client-foreground">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <img src={skaleSymbol.url} alt="" className="h-8 w-8 object-contain" />
          <span className="font-codec-bold mt-1 text-[1.55rem] leading-none tracking-[-0.06em]">skale</span>
        </div>
        <h1 className="text-[26px] font-medium leading-tight">
          {mode === "forgot" ? "Mot de passe oublié" : <>Bienvenue sur votre<br />espace client</>}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-client-muted">
          {mode === "forgot" ? "Recevez un lien pour choisir un nouveau mot de passe." : "Accédez à votre projet"}
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

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === "signup" && (
            <motion.div
              key="signup-fields"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3 overflow-hidden pb-3"
            >
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
            </motion.div>
          )}
        </AnimatePresence>

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
          <div className="mt-3">
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
            <Button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 text-client-muted hover:bg-transparent hover:text-client-foreground"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </Button>
            </div>
            {mode === "signin" && (
              <Button
                type="button"
                variant="link"
                onClick={() => { reset(); setMode("forgot"); }}
                className="mt-1.5 h-auto px-1 py-0 text-[12px] text-client-muted hover:text-client-foreground"
              >
                Mot de passe oublié ?
              </Button>
            )}
          </div>
        )}

        {mode === "signup" && (
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 pt-1 text-[12px] leading-relaxed text-client-muted">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-client-segment"
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
               className="mt-3 text-[12.5px] text-destructive"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <Button type="submit" disabled={pending} className="mt-5 h-12 w-full rounded-xl bg-client-segment text-[15px] font-medium text-client-segment-foreground hover:bg-client-segment-hover">
          {pending
            ? "Un instant…"
            : mode === "signin"
              ? "Se connecter"
              : mode === "signup"
                ? "Créer mon compte"
                : "Envoyer le lien"}
        </Button>
      </form>

      {mode !== "forgot" && (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-client-border" />
            <span className="text-[10px] uppercase text-client-muted">ou</span>
            <span className="h-px flex-1 bg-client-border" />
          </div>
          <div>
            <Button
              type="button"
              onClick={() => oauth()}
              variant="outline"
              className="h-12 w-full rounded-xl border-client-border bg-client-control text-[14px] text-client-foreground hover:bg-client-control-hover hover:text-client-foreground"
            >
              <GoogleIcon /> Continuer avec Google
            </Button>
          </div>
        </>
      )}

      <div className="mt-6 text-center text-[12.5px] text-client-muted">
        {mode === "forgot" ? (
          <Button
            type="button"
            variant="link"
            onClick={() => {
              reset();
              setMode("signin");
            }}
            className="h-auto p-0 text-client-muted hover:text-client-foreground"
          >
            Retour à la connexion
          </Button>
        ) : mode === "signup" ? (
          <span>En créant un compte, vous acceptez nos conditions d'utilisation.</span>
        ) : null}
      </div>
    </Panel>
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
