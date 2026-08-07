import {
  Outlet,
  createFileRoute,
  redirect,
  Link,
  useRouterState,
} from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";

import {
  Home,
  BarChart3,
  Video,
  Users,
  FolderKanban,
  FileSignature,
  Star,
  Settings,
  Scissors,
} from "lucide-react";
import { getAdminSessionFn } from "@/lib/admin-auth.functions";
import { getEditorSessionFn } from "@/lib/editor.functions";
import { AdminProfileMenu } from "@/components/AdminProfileMenu";
import { AdminPrefsProvider, ThemeStyleInjector, useAdminPrefs } from "@/components/admin-prefs";


export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await getAdminSessionFn();
    if (!session) {
      const editor = await getEditorSessionFn();
      if (editor) throw redirect({ to: "/monteur" });
      throw redirect({ to: "/" });
    }
    return { session };
  },
  component: AdminLayout,
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

const NAV: { to: string; label: string; icon: typeof BarChart3; exact?: boolean }[] = [
  { to: "/admin", label: "Accueil", icon: Home, exact: true },
  { to: "/admin/analytiques", label: "Analytiques", icon: BarChart3 },
  { to: "/admin/videos", label: "Vidéos", icon: Video },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/projets", label: "Projets", icon: FolderKanban },
  { to: "/admin/monteurs", label: "Monteurs", icon: Scissors },
  { to: "/admin/devis", label: "Devis Tally", icon: FileSignature },
  { to: "/admin/avis", label: "Avis clients", icon: Star },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings },
];

function AdminLayout() {
  return (
    <AdminPrefsProvider>
      <ThemeStyleInjector />
      <AdminLayoutInner />
    </AdminPrefsProvider>
  );
}

function AdminLayoutInner() {
  const session = Route.useRouteContext().session;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { background } = useAdminPrefs();

  return (
    <div
      className="admin-themed min-h-screen flex bg-neutral-950 text-white relative"
      style={{ zoom: 1.25 }}
    >
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
      <aside className="w-60 shrink-0 border-r border-white/10 bg-neutral-950/80 backdrop-blur flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse" />
          <p className="text-sm font-semibold">Skale Admin</p>
        </div>

        <div className="px-5 pb-3">
          <a
            href="https://skalevisuals.com"
            className="text-[11px] text-neutral-500 underline underline-offset-2 hover:text-neutral-300 transition-colors"
          >
            ← Retourner sur l'accueil
          </a>
        </div>

        <div className="px-5 py-3 border-b border-white/10">
          {session?.user && <AdminProfileMenu initialUsername={session.user} />}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as "/admin"}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-red-600/15 text-white border border-red-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {active && (
                  <motion.span
                    layoutId="admin-nav-dot"
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500"
                  />
                )}
              </Link>
            );
          })}
        </nav>

      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
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
