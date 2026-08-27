import { Outlet, createFileRoute, redirect, Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Home, FolderKanban, Settings } from "lucide-react";
import { getEditorSessionFn } from "@/lib/editor.functions";
import { EditorProfileMenu } from "@/components/EditorProfileMenu";
import { AdminPrefsProvider, ThemeStyleInjector, useAdminPrefs } from "@/components/admin-prefs";
import { BackToSiteLink } from "@/components/BackToSiteLink";
import { ConnectionHeartbeat } from "@/components/ConnectionHeartbeat";
import { MessagePing } from "@/components/MessagePing";
import { PanelMobileNav } from "@/components/PanelMobileNav";

export const Route = createFileRoute("/studio")({
  beforeLoad: async () => {
    const session = await getEditorSessionFn();
    if (!session) {
      const { getAdminSessionFn } = await import("@/lib/admin-auth.functions");
      const admin = await getAdminSessionFn();
      if (admin) throw redirect({ to: "/office" });
      throw redirect({ to: "/" });
    }
    return { editor: session };
  },
  component: EditorLayout,
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

const NAV: { to: string; label: string; icon: typeof Home; exact?: boolean }[] = [
  { to: "/studio", label: "Accueil", icon: Home, exact: true },
  { to: "/studio/projects", label: "Mes projets", icon: FolderKanban },
  { to: "/studio/settings", label: "Paramètres", icon: Settings },
];

function EditorLayout() {
  return (
    <AdminPrefsProvider>
      <ThemeStyleInjector />
      <ConnectionHeartbeat />
      <MessagePing role="editor" />
      <EditorLayoutInner />
    </AdminPrefsProvider>
  );
}

function EditorLayoutInner() {
  const editor = Route.useRouteContext().editor;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { background, mode } = useAdminPrefs();

  return (
    <div
      className={`admin-themed mode-${mode} panel-zoom min-h-screen flex bg-neutral-950 text-white relative`}
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
        <aside className="hidden md:flex w-60 shrink-0 border-r border-white/10 bg-neutral-950/80 backdrop-blur flex flex-col">
          <div className="px-5 py-5 flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse" />
            <p className="text-sm font-semibold">Skale Studio</p>
          </div>

          <div className="px-5 pb-3">
            <BackToSiteLink />
          </div>

          <div className="px-5 py-3 border-b border-white/10">
            <EditorProfileMenu
              initial={{
                username: editor.username,
                displayName: editor.displayName,
                avatarUrl: editor.avatarUrl,
              }}
            />
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to as "/studio"}
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
                      layoutId="editor-nav-dot"
                      className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 overflow-x-hidden">
          <PanelMobileNav
            title="Skale Studio"
            items={NAV}
            profile={{
              name: editor.displayName || editor.username,
              role: "Monteur",
              avatarUrl: editor.avatarUrl ?? null,
            }}
          >
            <EditorProfileMenu
              initial={{
                username: editor.username,
                displayName: editor.displayName,
                avatarUrl: editor.avatarUrl,
              }}
            />
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
