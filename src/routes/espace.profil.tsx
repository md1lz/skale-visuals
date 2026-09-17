import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/espace/profil")({
  component: ProfilePage,
});

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[14px] text-white outline-none transition focus:border-white/25 disabled:opacity-60";

function ProfilePage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("full_name, company")
        .eq("id", user.id)
        .maybeSingle();
      setFullName(profile?.full_name ?? "");
      setCompany(profile?.company ?? "");
    })();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) throw new Error("Session expirée.");
      const { error: err } = await supabase
        .from("client_profiles")
        .update({ full_name: fullName, company: company || null })
        .eq("id", user.id);
      if (err) throw err;
      setMessage("Profil mis à jour.");
    } catch {
      setError("Enregistrement impossible.");
    } finally {
      setPending(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setPassword("");
      setMessage("Mot de passe mis à jour.");
    } catch {
      setError("Modification du mot de passe impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8">
      <h1 className="text-[26px] font-semibold tracking-tight">Profil</h1>
      <p className="mt-2 text-[14px] text-white/55">Vos informations et votre mot de passe.</p>

      <form onSubmit={saveProfile} className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <input value={email} disabled className={inputClass} />
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nom complet"
          className={inputClass}
        />
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Société (facultatif)"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending}
          className="!mt-4 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
        >
          Enregistrer
        </button>
      </form>

      <form onSubmit={changePassword} className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[14px] font-medium">Changer de mot de passe</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          autoComplete="new-password"
          placeholder="Nouveau mot de passe"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending}
          className="!mt-4 rounded-full border border-white/15 px-5 py-2.5 text-[13.5px] text-white/85 transition hover:bg-white/[0.06] disabled:opacity-60"
        >
          Mettre à jour
        </button>
      </form>

      {message && <p className="mt-4 text-[13px] text-emerald-400">{message}</p>}
      {error && <p className="mt-4 text-[13px] text-red-400">{error}</p>}
    </div>
  );
}
