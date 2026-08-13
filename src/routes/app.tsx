import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Menu,
  X,
  Eye,
  EyeOff,
  Home,
  Film,
  Users,
  Inbox,
  Video,
  HardHat,
  Star,
  LineChart,
  Settings,
  LogOut,
  ArrowLeft,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { loginAdmin, getAdminSessionFn, logoutAdminFn, getAdminProfile } from "@/lib/admin-auth.functions";
import { getSiteAnalytics, getRecentActivity } from "@/lib/admin-analytics.functions";
import { listProjects } from "@/lib/admin-projects.functions";
import { getEditorSessionFn, logoutEditorFn, listMyNotifications, listMyProjects } from "@/lib/editor.functions";
import { getPushConfig, savePushSubscription } from "@/lib/push.functions";
import { registerPushWorker, subscribeToPush } from "@/lib/pwa";
import { statusBadgeClass, deadlineTone, fmtDateFR } from "@/lib/project-display";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Skale CRM — Application mobile" },
      { name: "description", content: "Application mobile Skale Visuals : suivez vos projets, deadlines et notifications depuis votre téléphone." },
      { property: "og:title", content: "Skale CRM — Application mobile" },
      { property: "og:description", content: "Application mobile Skale Visuals : suivez vos projets, deadlines et notifications depuis votre téléphone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#0D0D0D" },
    ],
  }),
  component: MobileApp,
});

const RED = "#E24B4A";

/* ---------------------------------- shell --------------------------------- */

type NotifItem = { id: string; title: string; body: string; url?: string };

function useDynamicVh() {
  useEffect(() => {
    const set = () => {
      document.documentElement.style.setProperty("--app-vh", `${window.innerHeight * 0.01}px`);
    };
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);
}

function MobileApp() {
  useDynamicVh();
  const qc = useQueryClient();
  const fetchAdmin = useServerFn(getAdminSessionFn);
  const fetchEditor = useServerFn(getEditorSessionFn);

  const adminQ = useQuery({ queryKey: ["app", "admin-session"], queryFn: () => fetchAdmin() });
  const editorQ = useQuery({ queryKey: ["app", "editor-session"], queryFn: () => fetchEditor() });

  useEffect(() => {
    void registerPushWorker();
  }, []);

  const role = adminQ.data ? "admin" : editorQ.data ? "editor" : null;
  const loading = adminQ.isLoading || editorQ.isLoading;

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#0D0D0D] text-white">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!role) {
    return (
      <LoginScreen
        onSuccess={() => {
          void qc.invalidateQueries({ queryKey: ["app", "admin-session"] });
          void qc.invalidateQueries({ queryKey: ["app", "editor-session"] });
        }}
      />
    );
  }

  return <AppShell role={role} />;
}

/* ---------------------------------- login --------------------------------- */

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const login = useServerFn(loginAdmin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await login({ data: { username, password, remember: false } });
      if (!res.ok) {
        setError("suspended" in res && res.suspended ? "Ce compte est suspendu." : "Identifiant ou mot de passe incorrect");
        return;
      }
      onSuccess();
    } catch {
      setError("Identifiant ou mot de passe incorrect");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex flex-col bg-[#0D0D0D] px-6 text-white"
      style={{ minHeight: "calc(var(--app-vh, 1vh) * 100)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-1 flex-col justify-center py-10"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/icons/icon-192.png" alt="Skale Visuals" width={72} height={72} className="h-18 w-18 rounded-2xl" />
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Skale CRM</h1>
          <p className="mt-1.5 text-sm text-neutral-500">Panel de gestion Skale Visuals</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Identifiant"
            className="w-full rounded-2xl border border-white/10 bg-[#161616] px-4 py-3.5 text-[15px] text-white outline-none placeholder:text-neutral-600 focus:border-white/25"
          />
          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={show ? "text" : "password"}
              placeholder="Mot de passe"
              className="w-full rounded-2xl border border-white/10 bg-[#161616] px-4 py-3.5 pr-12 text-[15px] text-white outline-none placeholder:text-neutral-600 focus:border-white/25"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500"
            >
              {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{ backgroundColor: RED }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Se connecter
          </button>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pt-1 text-center text-[13px] text-red-400"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      <p className="pb-8 text-center text-[11px] text-neutral-700">Accès sur invitation uniquement</p>
    </div>
  );
}

/* ---------------------------------- shell --------------------------------- */

const ADMIN_MENU = [
  { label: "Accueil", icon: Home, active: true },
  { label: "Projets", icon: Film },
  { label: "Clients", icon: Users },
  { label: "Devis", icon: Inbox },
  { label: "Vidéos", icon: Video },
  { label: "Équipe", icon: HardHat },
  { label: "Avis clients", icon: Star },
  { label: "Analytiques", icon: LineChart },
  { label: "Paramètres", icon: Settings },
];

const EDITOR_MENU = [
  { label: "Accueil", icon: Home, active: true },
  { label: "Mes Projets", icon: Film },
  { label: "Paramètres", icon: Settings },
];

function AppShell({ role }: { role: "admin" | "editor" }) {
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [banner, setBanner] = useState<NotifItem | null>(null);
  const logoutAdmin = useServerFn(logoutAdminFn);
  const logoutEditor = useServerFn(logoutEditorFn);

  const items = role === "admin" ? ADMIN_MENU : EDITOR_MENU;

  const signOut = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.signOut();
    } catch {
      /* noop */
    }
    if (role === "admin") await logoutAdmin();
    else await logoutEditor();
    qc.clear();
    window.location.href = "/app";
  };

  return (
    <div
      className="bg-[#0D0D0D] text-white"
      style={{ minHeight: "calc(var(--app-vh, 1vh) * 100)" }}
    >
      <NotificationBanner item={banner} onClose={() => setBanner(null)} />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#0D0D0D]/95 px-4 py-3 backdrop-blur">
        <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" className="p-1.5 text-white">
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="text-sm font-semibold tracking-tight">
          {role === "admin" ? "Skale CRM" : "Skale Edition"}
        </span>
        <BellButton role={role} />
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-20 bg-black/50"
            />
            <motion.nav
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 top-[53px] z-30 border-b border-white/10 bg-[#1A1A1A]/95 px-3 py-3 backdrop-blur-md"
            >
              {items.map((item) => {
                const Icon = item.icon;
                const enabled = !!item.active;
                return (
                  <button
                    key={item.label}
                    disabled={!enabled}
                    onClick={() => enabled && setMenuOpen(false)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] ${
                      enabled ? "text-white" : "cursor-not-allowed text-neutral-600"
                    }`}
                    style={enabled ? { backgroundColor: "rgba(226,75,74,0.14)", color: RED } : undefined}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {!enabled && <span className="text-[11px] text-neutral-700">(Indisponible)</span>}
                  </button>
                );
              })}

              <div className="my-2 h-px bg-white/10" />

              <a
                href="https://skalevisuals.com"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-neutral-400"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
                Retourner sur le site
              </a>
              <button
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-neutral-400"
              >
                <LogOut className="h-4.5 w-4.5" />
                Se déconnecter
              </button>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <main className="px-4 pb-16 pt-5">
        {role === "admin" ? (
          <AdminHomeMobile onNotify={setBanner} />
        ) : (
          <EditorHomeMobile onNotify={setBanner} />
        )}
      </main>

      <PushPermissionModal role={role} />
    </div>
  );
}

function BellButton({ role }: { role: "admin" | "editor" }) {
  const fetchNotifs = useServerFn(listMyNotifications);
  const notifQ = useQuery({
    queryKey: ["app", "editor-notifs"],
    queryFn: () => fetchNotifs(),
    enabled: role === "editor",
    refetchInterval: 20_000,
  });
  const unread = (notifQ.data ?? []).filter((n) => !n.read).length;
  return (
    <button aria-label="Notifications" className="relative p-1.5 text-white">
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span
          className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0D0D0D]"
          style={{ backgroundColor: RED }}
        />
      )}
    </button>
  );
}

/* -------------------------------- banner ---------------------------------- */

function NotificationBanner({ item, onClose }: { item: NotifItem | null; onClose: () => void }) {
  useEffect(() => {
    if (!item) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key={item.id}
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          drag="y"
          dragConstraints={{ top: -120, bottom: 0 }}
          onDragEnd={(_, info) => info.offset.y < -40 && onClose()}
          onClick={onClose}
          className="fixed inset-x-2 top-2 z-50 flex items-center gap-3 rounded-2xl bg-[#1A1A1A] px-3.5 py-3 shadow-2xl shadow-black/60 ring-1 ring-white/10"
        >
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: RED }}
          >
            {item.title.trim().charAt(0).toUpperCase() || "S"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-white">{item.title}</span>
            <span className="block truncate text-[13px] text-neutral-400">{item.body}</span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Fires the in-app banner whenever a new id shows up in a live list. */
function useNewItemBanner<T>(
  rows: T[] | undefined,
  toItem: (row: T) => NotifItem,
  onNotify: (n: NotifItem) => void,
) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!rows) return;
    const items = rows.map(toItem);
    if (seen.current === null) {
      seen.current = new Set(items.map((i) => i.id));
      return;
    }
    for (const i of items) {
      if (!seen.current.has(i.id)) {
        seen.current.add(i.id);
        onNotify(i);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
}

/* ------------------------------- admin home ------------------------------- */

function AdminHomeMobile({ onNotify }: { onNotify: (n: NotifItem) => void }) {
  const fetchProfile = useServerFn(getAdminProfile);
  const fetchAnalytics = useServerFn(getSiteAnalytics);
  const fetchActivity = useServerFn(getRecentActivity);
  const fetchProjects = useServerFn(listProjects);

  const profileQ = useQuery({ queryKey: ["admin", "profile"], queryFn: () => fetchProfile() });
  const dayQ = useQuery({
    queryKey: ["site-analytics", "today", null, null],
    queryFn: () => fetchAnalytics({ data: { range: "today" } }),
    refetchInterval: 60_000,
  });
  const activityQ = useQuery({
    queryKey: ["admin", "activity"],
    queryFn: () => fetchActivity(),
    refetchInterval: 20_000,
  });
  const projectsQ = useQuery({
    queryKey: ["admin", "projects", false],
    queryFn: () => fetchProjects({ data: { archived: false } }),
    refetchInterval: 60_000,
  });

  useNewItemBanner(
    activityQ.data,
    (a) => ({ id: a.id, title: "Skale CRM", body: a.message }),
    onNotify,
  );

  const projects = projectsQ.data ?? [];
  const inProgress = projects.filter((p) => p.status !== "Livrée" && p.status !== "Payée").length;
  const monthRevenue = useMemo(() => {
    const now = new Date();
    return projects
      .filter((p) => p.status === "Payée" && new Date(p.updated_at).getMonth() === now.getMonth())
      .reduce((s, p) => s + Number(p.amount_invoiced_ht ?? 0), 0);
  }, [projects]);
  const deadlines = projects
    .filter((p) => p.deadline && p.status !== "Livrée" && p.status !== "Payée")
    .slice(0, 3);

  const name = profileQ.data?.firstName?.trim() || profileQ.data?.username || "";

  return (
    <div className="space-y-6">
      <Greeting name={name} />

      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        <Kpi label="Vidéos en cours" value={String(inProgress)} />
        <Kpi label="Devis non traités" value={String(dayQ.data?.kpis?.tallySubmits ?? 0)} />
        <Kpi label="CA du mois" value={`${new Intl.NumberFormat("fr-FR").format(monthRevenue)} €`} />
      </div>

      <Section title="Deadlines urgentes" icon={AlertTriangle}>
        {deadlines.length === 0 ? (
          <Empty>Aucune deadline à venir.</Empty>
        ) : (
          deadlines.map((p) => (
            <Row key={p.id}>
              <span className="min-w-0 flex-1 truncate text-[14px]">{p.title}</span>
              <span className={`shrink-0 text-[12px] ${deadlineTone(p.deadline)}`}>
                {p.deadline ? fmtDateFR(p.deadline) : "—"}
              </span>
            </Row>
          ))
        )}
      </Section>

      <Section title="Activité récente" icon={Bell}>
        {(activityQ.data ?? []).length === 0 ? (
          <Empty>Aucune activité récente.</Empty>
        ) : (
          (activityQ.data ?? []).slice(0, 5).map((a) => (
            <Row key={a.id}>
              <span className="min-w-0 flex-1 truncate text-[14px]">{a.message}</span>
              <span className="shrink-0 text-[12px] text-neutral-500">{relTime(a.time)}</span>
            </Row>
          ))
        )}
      </Section>
    </div>
  );
}

/* ------------------------------ editor home ------------------------------- */

function EditorHomeMobile({ onNotify }: { onNotify: (n: NotifItem) => void }) {
  const fetchMe = useServerFn(getEditorSessionFn);
  const fetchNotifs = useServerFn(listMyNotifications);
  const fetchProjects = useServerFn(listMyProjects);

  const meQ = useQuery({ queryKey: ["app", "editor-session"], queryFn: () => fetchMe() });
  const notifQ = useQuery({
    queryKey: ["app", "editor-notifs"],
    queryFn: () => fetchNotifs(),
    refetchInterval: 20_000,
  });
  const projQ = useQuery({
    queryKey: ["editor", "projects"],
    queryFn: () => fetchProjects(),
    refetchInterval: 30_000,
  });

  useNewItemBanner(
    notifQ.data,
    (n) => ({ id: n.id, title: "Skale Edition", body: n.message }),
    onNotify,
  );

  const name = (meQ.data?.displayName ?? "").split(/\s+/)[0] ?? "";
  const active = (projQ.data ?? []).filter((p) => p.status !== "Livrée" && p.status !== "Payée");

  return (
    <div className="space-y-6">
      <Greeting name={name} />

      <Section title="Notifications récentes" icon={Bell}>
        {(notifQ.data ?? []).length === 0 ? (
          <Empty>Aucune notification pour l'instant.</Empty>
        ) : (
          (notifQ.data ?? []).slice(0, 5).map((n) => (
            <Row key={n.id}>
              <span className="min-w-0 flex-1 truncate text-[14px]">{n.message}</span>
              <span className="shrink-0 text-[12px] text-neutral-500">{relTime(n.created_at)}</span>
            </Row>
          ))
        )}
      </Section>

      <Section title="Mes projets en cours" icon={Film}>
        {active.length === 0 ? (
          <Empty>Aucun projet en cours.</Empty>
        ) : (
          active.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[14px]">{p.title}</span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${statusBadgeClass(p.status)}`}>
                  {p.status}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${statusProgress(p.status)}%`, backgroundColor: RED }}
                />
              </div>
              <p className={`mt-2 text-[12px] ${deadlineTone(p.deadline)}`}>
                {p.deadline ? `Deadline ${fmtDateFR(p.deadline)}` : "Pas de deadline"}
              </p>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

function statusProgress(status: string) {
  const order = [
    "En attente de validation client",
    "À faire",
    "En cours",
    "En révision",
    "Corrections",
    "Montage terminé",
    "Livrée",
    "Payée",
  ];
  const i = order.indexOf(status);
  return i < 0 ? 0 : Math.round(((i + 1) / order.length) * 100);
}

/* --------------------------------- pieces --------------------------------- */

function Greeting({ name }: { name: string }) {
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <div>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
        Bonjour, {name} 👋
      </h1>
      <p className="mt-1 text-[13px] capitalize text-neutral-500">{today}</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[46%] shrink-0 snap-start rounded-2xl border border-white/10 bg-[#161616] px-4 py-3.5">
      <p className="text-[12px] text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#141414] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: RED }} />
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-white">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-white/[0.03] px-3 py-3 text-center text-[13px] text-neutral-500">
      {children}
    </p>
  );
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `${m} min`;
  if (h < 24) return `${h} h`;
  return `${d} j`;
}

/* ---------------------------- push permission ----------------------------- */

const PUSH_ASKED_KEY = "skale_push_asked";

function PushPermissionModal({ role }: { role: "admin" | "editor" }) {
  const [open, setOpen] = useState(false);
  const fetchConfig = useServerFn(getPushConfig);
  const saveSub = useServerFn(savePushSubscription);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (localStorage.getItem(PUSH_ASKED_KEY)) return;
    if (Notification.permission !== "default") return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const enable = async () => {
    localStorage.setItem(PUSH_ASKED_KEY, "1");
    setOpen(false);
    const cfg = await fetchConfig().catch(() => null);
    const res = await subscribeToPush(cfg?.vapidPublicKey ?? null);
    if (res && "subscription" in res && res.subscription) {
      await saveSub({ data: res.subscription }).catch(() => null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 grid place-items-end bg-black/60 p-4 pb-8"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="w-full rounded-3xl border border-white/10 bg-[#1A1A1A] p-5 text-white"
          >
            <p className="text-[15px] font-semibold">🔔 Activez les notifications</p>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
              Soyez alerté en temps réel des messages et mises à jour de {role === "admin" ? "Skale CRM" : "Skale Edition"}.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  localStorage.setItem(PUSH_ASKED_KEY, "1");
                  setOpen(false);
                }}
                className="flex-1 rounded-2xl bg-white/10 py-3 text-[14px] font-medium text-neutral-300"
              >
                Plus tard
              </button>
              <button
                onClick={enable}
                style={{ backgroundColor: RED }}
                className="flex-1 rounded-2xl py-3 text-[14px] font-semibold text-white"
              >
                Activer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
