import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { getAdminSession, logoutAdmin } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminPanel,
});

type Session = { user: string; at: number } | null;

function AdminPanel() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = getAdminSession();
    if (!s) {
      navigate({ to: "/" });
      return;
    }
    setSession(s);
    setReady(true);
  }, [navigate]);

  const data = useMemo(() => generateMockData(), []);

  if (!ready || !session) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse" />
            <div>
              <h1 className="text-lg font-semibold">Skale Admin</h1>
              <p className="text-[11px] text-neutral-400">
                Connecté en tant que <span className="text-neutral-200">{session.user}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logoutAdmin();
              navigate({ to: "/" });
            }}
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
            Vue d'ensemble des connexions et de l'activité des 30 derniers jours.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users className="h-4 w-4" />} label="Visiteurs uniques" value={data.totals.visitors.toLocaleString("fr-FR")} delta="+12.4%" trend="up" />
          <StatCard icon={<Eye className="h-4 w-4" />} label="Pages vues" value={data.totals.pageViews.toLocaleString("fr-FR")} delta="+8.1%" trend="up" />
          <StatCard icon={<MousePointerClick className="h-4 w-4" />} label="Sessions" value={data.totals.sessions.toLocaleString("fr-FR")} delta="+5.7%" trend="up" />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Durée moy." value={data.totals.avgDuration} delta="-1.2%" trend="down" />
        </div>

        {/* Traffic chart */}
        <Panel
          title="Trafic — 30 derniers jours"
          subtitle="Visiteurs uniques par jour"
          icon={<TrendingUp className="h-4 w-4 text-red-500" />}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

        {/* Two-col: Top pages + Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Pages les plus vues" icon={<Eye className="h-4 w-4 text-red-500" />}>
            <ul className="divide-y divide-white/5">
              {data.topPages.map((p) => (
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
                <BarChart data={data.sources} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
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

        {/* Devices + Recent logins */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Répartition par appareil" icon={<Activity className="h-4 w-4 text-red-500" />}>
            <div className="space-y-4">
              {data.devices.map((d) => (
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

          <Panel title="Connexions admin récentes" icon={<Users className="h-4 w-4 text-red-500" />}>
            <ul className="divide-y divide-white/5">
              {data.recentLogins.map((l, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="text-neutral-200">{l.user}</p>
                    <p className="text-[11px] text-neutral-500">{l.ip} · {l.location}</p>
                  </div>
                  <span className="text-xs text-neutral-400">{l.when}</span>
                </li>
              ))}
            </ul>
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
  delta,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5"
    >
      <div className="flex items-center justify-between text-neutral-400 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-red-500">{icon}</span>
          {label}
        </div>
        <span className={trend === "up" ? "text-emerald-400" : "text-red-400"}>{delta}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
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

function generateMockData() {
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
      sessions: Math.round(totalVisitors * 1.3),
      avgDuration: "2 min 47 s",
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
    recentLogins: [
      { user: "didiolorenzo", ip: "82.66.14.221", location: "Paris, FR", when: "il y a 2 min" },
      { user: "harroismadi", ip: "92.184.97.12", location: "Lyon, FR", when: "il y a 1 h" },
      { user: "didiolorenzo", ip: "82.66.14.221", location: "Paris, FR", when: "Hier, 18:42" },
      { user: "harroismadi", ip: "92.184.97.12", location: "Lyon, FR", when: "Hier, 09:15" },
    ],
  };
}
