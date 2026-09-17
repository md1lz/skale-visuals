import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { ClientPanel, ClientShell, SkaleWordmark, clientInputClass } from "@/components/client/ClientFrame";
import { Button } from "@/components/ui/button";
import { checkPasswordToken, setClientPassword } from "@/lib/client-auth.functions";
import { DEFAULT_HOME_SETTINGS, getHomeContent, type HomeSettings } from "@/lib/home-content.functions";

export const Route = createFileRoute("/creer-mot-de-passe")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Créez votre mot de passe — Skale Visuals" },
      { name: "description", content: "Créez le mot de passe de votre espace client Skale Visuals." },
      { property: "og:title", content: "Créez votre mot de passe — Skale Visuals" },
      { property: "og:description", content: "Créez le mot de passe de votre espace client Skale Visuals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CreatePasswordPage,
});

function CreatePasswordPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<HomeSettings>(DEFAULT_HOME_SETTINGS);
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHomeContent()
      .then((content) => setSettings(content.settings))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(value);
    if (!value) {
      setState("invalid");
      return;
    }
    checkPasswordToken({ data: { token: value } })
      .then((res) => {
        if (res.valid) {
          setEmail(res.email ?? "");
          setState("ready");
        } else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !token) return;
    setError(null);
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    try {
      await setClientPassword({ data: { token, password } });
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        await navigate({ to: "/login", replace: true });
        return;
      }
      await navigate({ to: "/espace", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <ClientShell settings={settings}>
      <ClientPanel>
        <div className="mb-8 text-center text-client-foreground">
          <SkaleWordmark className="mb-7" />
          <h1 className="text-[26px] font-medium leading-tight">Créez votre
            <br />mot de passe unique</h1>
          <p className="mt-2 text-sm leading-relaxed text-client-muted">
            {state === "invalid"
              ? "Ce lien n'est plus valable. Contactez-nous pour en recevoir un nouveau."
              : email || "Un mot de passe, saisi deux fois pour confirmation"}
          </p>
        </div>

        {state === "checking" && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-client-muted" />
          </div>
        )}

        {state === "ready" && (
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={pending}
                autoComplete="new-password"
                placeholder="Votre mot de passe"
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
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              disabled={pending}
              autoComplete="new-password"
              placeholder="Confirmez le mot de passe"
              className={clientInputClass}
            />
            {error && <p className="text-[12.5px] text-destructive">{error}</p>}
            <Button
              type="submit"
              disabled={pending}
              className="!mt-5 h-12 w-full rounded-xl bg-client-segment text-[15px] font-medium text-client-segment-foreground hover:bg-client-segment-hover"
            >
              {pending ? "Un instant…" : "Créer mon mot de passe"}
            </Button>
          </form>
        )}

        {state === "invalid" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/login" })}
            className="h-12 w-full rounded-xl border-client-border bg-client-control text-client-foreground hover:bg-client-control-hover hover:text-client-foreground"
          >
            Aller à la connexion
          </Button>
        )}
      </ClientPanel>
    </ClientShell>
  );
}
