import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  Eye,
  LogOut,
  MousePointerClick,
  TrendingUp,
  Users,
  Clock,
  Globe,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import {
  getAdminAnalytics,
  getAdminSessionFn,
  logoutAdminFn,
} from "@/lib/admin-auth.functions";

const analyticsQuery = queryOptions({
  queryKey: ["admin-analytics"],
  queryFn: () => getAdminAnalytics(),
});

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await getAdminSessionFn();
    if (!session) throw redirect({ to: "/" });
    return { session };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(analyticsQuery),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-6">
      <p className="text-sm text-neutral-400">Impossible de charger le panneau ({error.message}).</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-6">
      <p className="text-sm text-neutral-400">Introuvable.</p>
    </div>
  ),
  component: AdminPanel,
});

function AdminPanel() {
  const navigate = useNavigate();
  const router = useRouter();
  const logout = useServerFn(logoutAdminFn);
  const { data } = useSuspenseQuery(analyticsQuery);
  const mock = useMemo(() => generateTrafficMock(), []);

  async function handleLogout() {
    await logout();
    await router.invalidate();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse" />
            <div>
              <h1 className="text-lg font-semibold">Skale Admin</h1>
              <p className="text-[11px] text-neutral-400">
                Connecté en tant que <span className="text-neutral-200">{data.currentUser}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/5 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold">Analyses</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Activité du site et historique d'accès au panneau (30 derniers jours).
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Connexions réussies"
            value={data.totals.successful.toLocaleString("fr-FR")}
            sub={`${data.totals.uniqueUsers} admin${data.totals.uniqueUsers > 1 ? "s" : ""}`}
          />
          <StatCard
            icon={<ShieldAlert className="h-4 w-4" />}
            label="Tentatives échouées"
            value={data.totals.failed.toLocaleString("fr-FR")}
            sub={`sur ${data.totals.totalAttempts} tentatives`}
            tone={data.totals.failed > 0 ? "warn" : "ok"}
          />
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Visiteurs uniques"
            value={mock.totals.visitors.toLocaleString("fr-FR")}
            sub="+12.4% vs. 30j"
          />
          <StatCard
            icon={<Eye className="h-4 w-4" />}
            label="Pages vues"
            value={mock.totals.pageViews.toLocaleString("fr-FR")}
            sub="+8.1% vs. 30j"
          />
        </div>

        <Panel
          title="Trafic — 30 derniers jours"
          subtitle="Visiteurs uniques par jour"
          icon={<TrendingUp className="h-4 w-4 text-red-500" />}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mock.timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="visGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#a3a3a3" }}
                />
                <Area type="monotone" dataKey="visitors" stroke="#ef4444" strokeWidth={2} fill="url(#visGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Pages les plus vues" icon={<Eye className="h-4 w-4 text-red-500" />}>
            <ul className="divide-y divide-white/5">
              {mock.topPages.map((p) => (
                <li key={p.path} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-neutral-200 truncate">{p.path}</span>
                  <span className="text-neutral-400 tabular-nums">{p.views.toLocaleString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Sources de trafic" icon={<Globe className="h-4 w-4 text-red-500" />}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mock.sources} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="visits" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Répartition par appareil" icon={<Activity className="h-4 w-4 text-red-500" />}>
            <div className="space-y-4">
              {mock.devices.map((d) => (
                <div key={d.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-neutral-200">{d.name}</span>
                    <span className="text-neutral-400 tabular-nums">{d.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-red-600 to-red-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Connexions admin récentes" icon={<MousePointerClick className="h-4 w-4 text-red-500" />}>
            {data.recent.length === 0 ? (
              <p className="text-sm text-neutral-500 py-4">Aucune connexion enregistrée pour l'instant.</p>
            ) : (
              <ul className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                {data.recent.map((l, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5 text-sm gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${l.success ? "bg-emerald-400" : "bg-red-500"}`}
                        />
                        <span className="text-neutral-200 truncate">{l.username}</span>
                        {!l.success && (
                          <span className="text-[10px] uppercase tracking-wide text-red-400">échec</span>
                        )}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {l.ip ?? "IP inconnue"}
                        {l.user_agent ? ` · ${shortUA(l.user_agent)}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-neutral-400 whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatWhen(l.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "ok",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5"
    >
      <div className="flex items-center justify-between text-neutral-400 text-xs">
        <div className="flex items-center gap-2">
          <span className={tone === "warn" ? "text-amber-400" : "text-red-500"}>{icon}</span>
          {label}
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <p className="mt-1 text-[11px] text-neutral-500">{sub}</p>}
    </motion.div>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-[11px] text-neutral-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function shortUA(ua: string): string {
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Autre";
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffMin < 24 * 60) return `il y a ${Math.round(diffMin / 60)} h`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function generateTrafficMock() {
  const days = 30;
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const timeseries = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const base = 80 + i * 4;
    const visitors = Math.round(base + rand() * 60);
    return {
      day: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      visitors,
    };
  });

  const totalVisitors = timeseries.reduce((s, d) => s + d.visitors, 0);

  return {
    totals: {
      visitors: totalVisitors,
      pageViews: Math.round(totalVisitors * 2.7),
    },
    timeseries,
    topPages: [
      { path: "/", views: 4821 },
      { path: "/#realisations", views: 1932 },
      { path: "/#methode", views: 1204 },
      { path: "/#faq", views: 876 },
      { path: "/#contact", views: 542 },
    ],
    sources: [
      { name: "Direct", visits: 1820 },
      { name: "Instagram", visits: 1450 },
      { name: "Google", visits: 1180 },
      { name: "TikTok", visits: 720 },
      { name: "LinkedIn", visits: 310 },
    ],
    devices: [
      { name: "Mobile", pct: 62 },
      { name: "Desktop", pct: 31 },
      { name: "Tablette", pct: 7 },
    ],
  };
}
