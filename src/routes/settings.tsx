import { Outlet, createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";

import {
  LayoutDashboard,
  Users,
  Palette,
  Plug,
  Globe,
  LogOut,
  BarChart3,
  CalendarClock,
  CalendarCheck,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminSessionFn, logoutAdminFn } from "@/lib/admin-auth.functions";
import { AdminPrefsProvider, ThemeStyleInjector, useAdminPrefs } from "@/components/admin-prefs";
import { BackToSiteLink } from "@/components/BackToSiteLink";
import { ConnectionHeartbeat } from "@/components/ConnectionHeartbeat";
import { OfficeLogin } from "@/components/OfficeLogin";
import { PanelMobileNav } from "@/components/PanelMobileNav";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Skale Settings — Espace équipe" },
      { name: "description", content: "Espace de réglages interne de Skale Visuals." },
      { property: "og:title", content: "Skale Settings — Espace équipe" },
      { property: "og:description", content: "Espace de réglages interne de Skale Visuals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const session = await getAdminSessionFn();
    return { session };
  },
  component: SettingsLayout,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-6">
      <p className="text-sm text-neutral-400">Erreur ({error.message}).</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-6">
      <p className="text-sm text-neutral-400">Introuvable.</p>
    </div>
  ),
});

const NAV: {
  to: string;
  label: string;
  icon: typeof Users;
  exact?: boolean;
  desktopOnly?: boolean;
}[] = [
  { to: "/settings", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/settings/analytics", label: "Analytiques", icon: BarChart3 },
  { to: "/settings/calls", label: "Book a Call", icon: CalendarClock },
  
  { to: "/settings/appearance", label: "Apparence", icon: Palette },
  { to: "/settings/connections", label: "Connexions", icon: Plug },
  { to: "/settings/availability", label: "Disponibilités", icon: CalendarCheck },
  { to: "/settings/website", label: "Gestion du site web", icon: Globe },
  { to: "/settings/admins", label: "Comptes admin", icon: Users },
];

function SettingsLayout() {
  const session = Route.useRouteContext().session;
  if (!session) return <OfficeLogin />;

  return (
    <AdminPrefsProvider>
      <ThemeStyleInjector />
      <ConnectionHeartbeat />
      <SettingsLayoutInner />
    </AdminPrefsProvider>
  );
}

function LogoutButton() {
  const logout = useServerFn(logoutAdminFn);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await logout();
        } finally {
          window.location.replace("/settings");
        }
      }}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] text-neutral-300 transition-colors hover:bg-white/[0.05] hover:text-white"
    >
      <LogOut className="h-[17px] w-[17px] text-neutral-500" />
      Se déconnecter
    </button>
  );
}

function SettingsLayoutInner() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { background, mode } = useAdminPrefs();


  return (
    <div
      className={`admin-themed mode-${mode} panel-zoom min-h-screen flex bg-neutral-950 text-white relative`}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-70"
        style={{
          background:
            "radial-gradient(60rem 40rem at 12% -10%, rgba(226,75,74,0.14), transparent 60%), radial-gradient(50rem 35rem at 100% 0%, rgba(255,255,255,0.05), transparent 55%)",
        }}
      />
      {background && (
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `url(${background})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.25,
          }}
        />
      )}
      <div className="relative z-10 flex w-full">
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/[0.07] bg-neutral-950/70 backdrop-blur-xl">
          <div className="flex items-center gap-1.5 px-5 py-6">
            <span className="font-codec-bold text-[26px] leading-none text-white">skale.</span>
            <span className="text-[9px] font-medium uppercase tracking-[0.28em] text-neutral-500">
              Settings
            </span>
          </div>

          <div className="px-5 pb-4">
            <BackToSiteLink />
          </div>

          <div className="mx-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2">
            {session?.user && <AdminProfileMenu initialUsername={session.user} />}
          </div>

          <nav className="flex-1 px-3 py-5 space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to as "/settings"}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200 ${
                    active
                      ? "bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-nav-bar"
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(226,75,74,0.8)]"
                    />
                  )}
                  <Icon
                    className={`h-[17px] w-[17px] transition-colors ${active ? "text-red-400" : "text-neutral-500 group-hover:text-neutral-300"}`}
                  />
                  <span className="tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 overflow-x-hidden">
          <PanelMobileNav
            title="Skale Settings"
            items={NAV}
            profile={{
              name: profile?.firstName?.trim() || profile?.username || session?.user || "Admin",
              role: "Administrateur",
              avatarUrl: profile?.avatarUrl ?? null,
            }}
          >
            {session?.user && <AdminProfileMenu initialUsername={session.user} />}
          </PanelMobileNav>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
