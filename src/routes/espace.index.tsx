import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/espace/")({
  component: ClientHomePage,
});

function ClientHomePage() {
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
        (user.user_metadata?.["full_name"] as string | undefined) ?? user.email?.split("@")[0] ?? "";
      setName((data?.full_name || fallback || "").trim());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Espace client</p>
      <h1 className="mt-3 text-[30px] font-semibold leading-tight">Bonjour {name || "👋"}</h1>
      <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-white/55">
        Votre espace est prêt. Retrouvez ici l'avancement de vos projets, vos devis et vos factures.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          { title: "Mes projets", text: "Suivez l'avancement de vos montages en cours." },
          { title: "Devis & factures", text: "Consultez et téléchargez vos documents." },
        ].map((card) => (
          <div key={card.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[15px] font-medium">{card.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">{card.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
