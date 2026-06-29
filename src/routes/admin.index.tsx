import { createFileRoute } from "@tanstack/react-router";
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
  MousePointerClick,
  FileSignature,
  TrendingUp,
  Users,
  Video,
  Clock,
  AlertTriangle,
  MessageSquare,
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
  const fetchActivity = useServerFn(getRecentActivity);

  const profileQ = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: () => fetchProfile(),
  });

  const dayQ = useQuery({
    queryKey: ["admin", "analytics", "24h", "home"],
    queryFn: () => fetchAnalytics({ data: { range: "24h" } }),
  });

  const activityQ = useQuery({
    queryKey: ["admin", "activity"],
    queryFn: () => fetchActivity(),
    initialData: [] as Awaited<ReturnType<typeof fetchActivity>>,
    refetchOnMount: "always",
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

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Activité récente
          </h2>
        </div>
        <div className="space-y-2">
          {activityQ.isLoading ? (
            <div className="text-sm text-neutral-500">Chargement…</div>
          ) : !(activityQ.data ?? []).length ? (
            <div className="text-sm text-neutral-400 bg-neutral-800/50 rounded-xl px-4 py-3 text-center">
              Aucune activité récente
            </div>
          ) : (
            (activityQ.data ?? []).map((a, i) => {
              const icons: Record<string, React.ElementType> = {
                deadline: AlertTriangle,
                avis: MessageSquare,
                video: Video,
                client: Users,
                devis: FileSignature,
                projet: FolderOpen,
              };
              const Icon = icons[a.type] || Clock;
              const colors: Record<string, string> = {
                red: "bg-red-500/15 text-red-400",
                amber: "bg-amber-500/15 text-amber-400",
                green: "bg-emerald-500/15 text-emerald-400",
                neutral: "bg-neutral-500/15 text-neutral-400",
              };
              const dotColors: Record<string, string> = {
                red: "bg-red-500",
                amber: "bg-amber-500",
                green: "bg-emerald-500",
                neutral: "bg-neutral-500",
              };
              const relTime = (iso: string) => {
                const diff = Date.now() - new Date(iso).getTime();
                const m = Math.floor(diff / 60000);
                const h = Math.floor(diff / 3600000);
                const d = Math.floor(diff / 86400000);
                if (m < 1) return "À l'instant";
                if (m < 60) return `Il y a ${m} min`;
                if (h < 24) return `Il y a ${h} h`;
                return `Il y a ${d} j`;
              };
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 * i }}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.04] transition"
                >
                  <span className={`grid place-items-center h-8 w-8 rounded-lg shrink-0 ${colors[a.variant]}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{a.message}</p>
                  </div>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className={`h-1.5 w-1.5 rounded-full ${dotColors[a.variant]}`} />
                    <span className="text-xs text-neutral-500">{relTime(a.time)}</span>
                  </span>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
