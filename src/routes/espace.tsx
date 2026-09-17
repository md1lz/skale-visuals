import { Outlet, createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Home, FolderKanban, ReceiptText, UserRound, LifeBuoy, LogOut, Loader2, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_HOME_SETTINGS, getHomeContent, type HomeSettings } from "@/lib/home-content.functions";
import skaleSymbol from "@/assets/skale-symbol.png.asset.json";

export const Route = createFileRoute("/espace")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Espace client — Skale Visuals" },
      { name: "description", content: "Vos projets, devis et factures Skale Visuals au même endroit." },
      { property: "og:title", content: "Espace client — Skale Visuals" },
      { property: "og:description", content: "Vos projets, devis et factures Skale Visuals au même endroit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientAreaLayout,
});

const NAV: { to: "/espace" | "/espace/projets" | "/espace/factures" | "/espace/profil" | "/espace/aide"; label: string; icon: typeof Home; exact?: boolean }[] = [
  { to: "/espace", label: "Accueil", icon: Home, exact: true },
  { to: "/espace/projets", label: "Mes projets", icon: FolderKanban },
  { to: "/espace/factures", label: "Devis & factures", icon: ReceiptText },
  { to: "/espace/profil", label: "Profil", icon: UserRound },
  { to: "/espace/aide", label: "Aide", icon: LifeBuoy },
];

function ClientAreaLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<HomeSettings>(DEFAULT_HOME_SETTINGS);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
      if (!data.session) void navigate({ to: "/login", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      if (!s) void navigate({ to: "/login", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    getHomeContent()
      .then((content) => setSettings(content.settings))
      .catch(() => {});
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (loading || !session) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-white/50" />
      </div>
    );
  }

  const promo = settings.clientPromo;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <img src={skaleSymbol.url} alt="" className="h-7 w-7 object-contain" />
        <span className="font-codec-bold mt-1 text-[1.4rem] leading-none tracking-[-0.06em] text-white">skale</span>
        <span className="ml-1 text-[9px] font-medium uppercase tracking-[0.25em] text-white/40">Client</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-all ${
                active ? "bg-white/[0.07] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="client-nav-bar"
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-red-500"
                />
              )}
              <Icon className={`h-[17px] w-[17px] ${active ? "text-red-400" : "text-white/40"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {promo.enabled && (promo.title || promo.text) && (
        <div className="mx-4 mb-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-4">
          {promo.title && <p className="text-[13.5px] font-semibold text-white">{promo.title}</p>}
          {promo.text && <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/55">{promo.text}</p>}
          {promo.cta && promo.link && (
            <a
              href={promo.link}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-black transition hover:bg-white/90"
            >
              {promo.cta}
            </a>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          await navigate({ to: "/login", replace: true });
        }}
        className="mx-4 mb-5 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] text-white/55 transition hover:bg-white/[0.05] hover:text-white"
      >
        <LogOut className="h-[17px] w-[17px] text-white/40" />
        Se déconnecter
      </button>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] bg-[#0a0a0a] text-white">
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.07] bg-black/40 md:block">{sidebar}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3 md:hidden">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5 text-white/70" />
          </button>
          <span className="font-codec-bold mt-1 text-[1.15rem] leading-none tracking-[-0.06em]">skale</span>
        </header>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 md:hidden"
              onClick={() => setMenuOpen(false)}
            >
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="h-full w-[17rem] border-r border-white/[0.07] bg-[#0a0a0a]"
              >
                <button
                  type="button"
                  aria-label="Fermer le menu"
                  onClick={() => setMenuOpen(false)}
                  className="absolute right-4 top-4 text-white/50"
                >
                  <X className="h-5 w-5" />
                </button>
                {sidebar}
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
