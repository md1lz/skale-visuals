import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  ClientPanel,
  ClientShell,
  SkaleWordmark,
  WHATSAPP_URL,
  clientInputClass,
} from "@/components/client/ClientFrame";
import { Button } from "@/components/ui/button";
import { requestPasswordCode, verifyPasswordCode, setClientPassword } from "@/lib/client-auth.functions";
import { DEFAULT_HOME_SETTINGS, getHomeContent, type HomeSettings } from "@/lib/home-content.functions";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion — Espace client Skale Visuals" },
      { name: "description", content: "Connectez-vous à votre espace client Skale Visuals." },
      { property: "og:title", content: "Connexion — Espace client Skale Visuals" },
      { property: "og:description", content: "Connectez-vous à votre espace client Skale Visuals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

type Step = "login" | "code-request" | "code-verify" | "code-password";

function LoginPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<HomeSettings>(DEFAULT_HOME_SETTINGS);
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    getHomeContent()
      .then((content) => setSettings(content.settings))
      .catch(() => {});
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/espace", replace: true });
    });
  }, [navigate]);

  async function run(fn: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "login") {
      void run(async () => {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw new Error("E-mail ou mot de passe incorrect.");
        await navigate({ to: "/espace", replace: true });
      });
      return;
    }
    if (step === "code-request") {
      void run(async () => {
        await requestPasswordCode({ data: { email } });
        setInfo("Si un compte existe, un code vient d'être envoyé par e-mail.");
        setStep("code-verify");
      });
      return;
    }
    if (step === "code-verify") {
      void run(async () => {
        const res = await verifyPasswordCode({ data: { email, code } });
        setToken(res.token);
        setInfo(null);
        setStep("code-password");
      });
      return;
    }
    void run(async () => {
      if (password !== confirm) throw new Error("Les deux mots de passe ne correspondent pas.");
      await setClientPassword({ data: { token, password } });
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw new Error("Mot de passe modifié. Connectez-vous.");
      await navigate({ to: "/espace", replace: true });
    });
  };

  const title =
    step === "login"
      ? "Bienvenue sur votre\nespace client"
      : step === "code-request"
        ? "Mot de passe oublié"
        : step === "code-verify"
          ? "Entrez votre code"
          : "Nouveau mot de passe";

  const subtitle =
    step === "login"
      ? "Accédez à votre projet"
      : step === "code-request"
        ? "Nous vous envoyons un code par e-mail"
        : step === "code-verify"
          ? "Le code reçu par e-mail (6 chiffres)"
          : "Choisissez votre nouveau mot de passe";

  return (
    <ClientShell settings={settings}>
      <ClientPanel>
        <div className="mb-8 text-center text-client-foreground">
          <SkaleWordmark className="mb-7" />
          <h1 className="whitespace-pre-line text-[26px] font-medium leading-tight">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-client-muted">{subtitle}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={step}
            onSubmit={submit}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="space-y-3"
          >
            {(step === "login" || step === "code-request") && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={pending}
                autoComplete="email"
                placeholder="Votre adresse e-mail"
                className={clientInputClass}
              />
            )}

            {(step === "login" || step === "code-password") && (
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={pending}
                  autoComplete={step === "login" ? "current-password" : "new-password"}
                  placeholder="Mot de passe"
                  className={`${clientInputClass} pr-11`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-client-muted transition hover:text-client-foreground"
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            )}

            {step === "code-password" && (
              <input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                disabled={pending}
                autoComplete="new-password"
                placeholder="Confirmer le mot de passe"
                className={clientInputClass}
              />
            )}

            {step === "code-verify" && (
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                disabled={pending}
                placeholder="000000"
                className={`${clientInputClass} text-center text-[22px] tracking-[0.5em]`}
              />
            )}

            {step === "login" && (
              <button
                type="button"
                onClick={() => {
                  setStep("code-request");
                  setError(null);
                  setPassword("");
                }}
                className="w-full text-right text-[13px] text-client-muted transition hover:text-client-foreground"
              >
                Mot de passe oublié ?
              </button>
            )}

            {step !== "login" && (
              <button
                type="button"
                onClick={() => {
                  setStep("login");
                  setError(null);
                  setInfo(null);
                  setCode("");
                }}
                className="w-full text-left text-[13px] text-client-muted transition hover:text-client-foreground"
              >
                ← Retour à la connexion
              </button>
            )}

            {info && <p className="text-[12.5px] text-client-muted">{info}</p>}
            {error && <p className="text-[12.5px] text-destructive">{error}</p>}

            <Button
              type="submit"
              disabled={pending}
              className="!mt-5 h-12 w-full rounded-xl bg-client-segment text-[15px] font-medium text-client-segment-foreground hover:bg-client-segment-hover"
            >
              {pending
                ? "Un instant…"
                : step === "login"
                  ? "Se connecter"
                  : step === "code-request"
                    ? "Envoyer le code"
                    : step === "code-verify"
                      ? "Valider le code"
                      : "Enregistrer"}
            </Button>
          </motion.form>
        </AnimatePresence>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="client-auth-help mt-3 flex items-center justify-center rounded-xl px-4 py-3 text-[13px] text-client-muted transition hover:text-client-foreground"
        >
          J'ai un problème avec mon identifiant
        </a>
      </ClientPanel>
    </ClientShell>
  );
}
