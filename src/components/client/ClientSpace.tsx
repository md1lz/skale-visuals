import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { ClientBackdrop } from "@/components/client/ClientBackdrop";
import { Button } from "@/components/ui/button";
import { DEFAULT_HOME_SETTINGS, getHomeContent, type HomeSettings } from "@/lib/home-content.functions";
import skaleSymbol from "@/assets/skale-symbol.png.asset.json";


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

const WHATSAPP_URL =
  "https://wa.me/33766766153?text=" +
  encodeURIComponent("Bonjour, j'ai un problème avec mon identifiant pour l'espace client Skale.");

function AuthCard() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (err) throw err;
      setInfo(
        "Lien de connexion envoyé. Ouvrez l'e-mail que nous venons de vous adresser pour accéder à votre espace.",
      );
    } catch {
      setError("Une erreur est survenue. Réessayez dans un instant.");
    } finally {
      setPending(false);
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
          onClick={() => setInfo(null)}
          className="mt-6 h-12 w-full rounded-xl border-client-border bg-client-control text-client-foreground hover:bg-client-control-hover hover:text-client-foreground"
        >
          Retour
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
          Bienvenue sur votre<br />espace client
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-client-muted">Accédez à votre projet</p>
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={pending}
          autoComplete="email"
          placeholder="Votre adresse e-mail"
          className={inputClass}
        />

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="client-auth-help mt-3 flex items-center justify-center rounded-xl px-4 py-3 text-[13px] text-client-muted transition hover:text-client-foreground"
        >
          J'ai un problème avec mon identifiant
        </a>

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

        <Button
          type="submit"
          disabled={pending}
          className="mt-5 h-12 w-full rounded-xl bg-client-segment text-[15px] font-medium text-client-segment-foreground hover:bg-client-segment-hover"
        >
          {pending ? "Un instant…" : "Se connecter"}
        </Button>
      </form>
    </Panel>
  );
}
