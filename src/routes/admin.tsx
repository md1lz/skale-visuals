import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
  Link,
  useRouterState,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  BarChart3,
  Video,
  Users,
  FolderKanban,
  FileSignature,
  Star,
  Settings,
  LogOut,
} from "lucide-react";
import { getAdminSessionFn, logoutAdminFn } from "@/lib/admin-auth.functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await getAdminSessionFn();
    if (!session) throw redirect({ to: "/" });
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

const NAV = [
  { to: "/admin", label: "Analytiques", icon: BarChart3, exact: true },
  { to: "/admin/videos", label: "Vidéos", icon: Video },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/projets", label: "Projets", icon: FolderKanban },
  { to: "/admin/devis", label: "Devis Tally", icon: FileSignature },
  { to: "/admin/avis", label: "Avis clients", icon: Star },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const router = useRouter();
  const logout = useServerFn(logoutAdminFn);
  const session = Route.useRouteContext().session;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleLogout() {
    await logout();
    await router.invalidate();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex bg-neutral-950 text-white">
      <aside className="w-60 shrink-0 border-r border-white/10 bg-neutral-950 flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">Skale Admin</p>
            <p className="text-[10px] text-neutral-500 truncate">{session?.user}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
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

        <button
          onClick={handleLogout}
          className="m-3 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
