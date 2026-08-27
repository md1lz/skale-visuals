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
      throw redirect({ to: "/office" });
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
          <div className="px-5 py-6 flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_10px_rgba(226,75,74,0.9)] animate-pulse" />
            <p className="text-[15px] font-semibold tracking-tight">Skale Studio</p>
          </div>

          <div className="px-5 pb-3">
            <BackToSiteLink />
          </div>

          <div className="mx-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2">
            <EditorProfileMenu
              initial={{
                username: editor.username,
                displayName: editor.displayName,
                avatarUrl: editor.avatarUrl,
              }}
            />
          </div>

          <nav className="flex-1 px-3 py-5 space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to as "/studio"}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200 ${
                    active
                      ? "bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="editor-nav-bar"
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
