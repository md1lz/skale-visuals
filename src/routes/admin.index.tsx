import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  MousePointerClick,
  FileSignature,
  TrendingUp,
  ArrowRight,
  Users,
  Star,
  Video,
  Clock,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { getSiteAnalytics, getRecentActivity } from "@/lib/admin-analytics.functions";
import { getAdminProfile } from "@/lib/admin-auth.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function Initials({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <span className="text-lg font-semibold text-white">{letters || "?"}</span>;
}

function AdminHome() {
  const fetchAnalytics = useServerFn(getSiteAnalytics);
  const fetchProfile = useServerFn(getAdminProfile);

  const profileQ = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: () => fetchProfile(),
  });

  const dayQ = useQuery({
    queryKey: ["admin", "analytics", "24h", "home"],
    queryFn: () => fetchAnalytics({ data: { range: "24h" } }),
  });

  const p = profileQ.data;
  const greetingName = p?.firstName?.trim() || p?.username || "";
  const k = dayQ.data?.kpis;

  const totalVisits24h = dayQ.data?.timeseries.reduce((s, b) => s + b.visits, 0) ?? 0;
  const ctaRate = k && k.visits > 0 ? Math.round((k.ctaClicks / k.visits) * 1000) / 10 : 0;

  const sideKpis = [
    {
      label: "Taux de conversion",
      value: dayQ.isLoading ? "…" : `${k?.conversionRate ?? 0}%`,
      hint: "Visiteurs → CTA",
      icon: TrendingUp,
    },
    {
      label: "% Clics CTA",
      value: dayQ.isLoading ? "…" : `${ctaRate}%`,
      hint: `${k?.ctaClicks ?? 0} clics / ${k?.visits ?? 0} visites`,
      icon: MousePointerClick,
    },
    {
      label: "Devis soumis",
      value: dayQ.isLoading ? "…" : (k?.devisSubmitted ?? 0),
      hint: "Sur 24h",
      icon: FileSignature,
    },
  ];

  const sections = [
    {
      to: "/admin/analytiques",
      label: "Analytiques",
      desc: "Visites, CTA, conversions",
      icon: BarChart3,
    },
    { to: "/admin/videos", label: "Vidéos", desc: "Gérer le contenu vidéo", icon: Video },
    { to: "/admin/clients", label: "Clients", desc: "Base de clients", icon: Users },
    {
      to: "/admin/devis",
      label: "Devis Tally",
      desc: "Devis reçus via le site",
      icon: FileSignature,
    },
    { to: "/admin/avis", label: "Avis clients", desc: "Témoignages", icon: Star },
  ];

  return (
    <div className="px-8 pt-10 pb-8 max-w-6xl mx-auto">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-5 mb-10"
      >
        <span className="grid place-items-center h-16 w-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 ring-1 ring-white/15 overflow-hidden shrink-0">
          {p?.avatarUrl ? (
            <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Initials name={greetingName} />
          )}
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Bonjour, <span className="text-red-500">{greetingName}</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Voici un aperçu de l'activité de Skale Visuals.
          </p>
        </div>
      </motion.div>

      {/* 24h chart */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5 mb-3"
      >
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">
              Connexions au site — 24h
            </p>
            <p className="text-2xl font-semibold text-white mt-1">
              {dayQ.isLoading ? "…" : totalVisits24h}
              <span className="text-xs text-neutral-500 font-normal ml-2">visites</span>
            </p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dayQ.data?.timeseries ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="visitsHomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="bucket"
                stroke="#737373"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#737373"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#a3a3a3" }}
              />
              <Area
                type="monotone"
                dataKey="visits"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#visitsHomeGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Side KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
        {sideKpis.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * (i + 1) }}
              className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-neutral-500">
                  {c.label}
                </span>
                <Icon className="h-3.5 w-3.5 text-neutral-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{c.value}</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">{c.hint}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick navigation */}
      <h2 className="text-sm font-semibold text-neutral-300 mb-3 uppercase tracking-wider">
        Rubriques
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.to}
              to={s.to as "/admin"}
              className="group rounded-xl border border-white/10 bg-neutral-900/50 hover:bg-neutral-900 hover:border-red-600/40 p-4 transition flex items-center gap-3"
            >
              <span className="grid place-items-center h-10 w-10 rounded-lg bg-red-600/15 text-red-400 group-hover:bg-red-600/25 transition">
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{s.label}</p>
                <p className="text-xs text-neutral-500 truncate">{s.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-neutral-600 group-hover:text-red-400 group-hover:translate-x-0.5 transition" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
