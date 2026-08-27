import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
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
  Eye,
  MousePointerClick,
  FileSignature,
  TrendingUp,
  Users,
  Video,
  Clock,
  AlertTriangle,
  MessageSquare,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Target,
} from "lucide-react";
import { getSiteAnalytics, getRecentActivity } from "@/lib/admin-analytics.functions";
import { getAdminProfile } from "@/lib/admin-auth.functions";
import { listFollowupsDue } from "@/lib/admin-prospects.functions";
import { MaintenanceCard } from "@/components/MaintenanceCard";
import { getFinanceKpis } from "@/lib/billing.functions";
import { formatEUR } from "@/lib/billing.shared";

export const Route = createFileRoute("/office/")({
  component: AdminHome,
});

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </h2>
      <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}

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
  const fetchFollowups = useServerFn(listFollowupsDue);

  const followupsQ = useQuery({
    queryKey: ["admin", "prospect-followups"],
    queryFn: () => fetchFollowups(),
    initialData: [] as Awaited<ReturnType<typeof fetchFollowups>>,
    refetchInterval: 60_000,
  });

  const profileQ = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: () => fetchProfile(),
  });

  // Same queryKey as the Analytics page so both views share cache and auto-sync
  const dayQ = useQuery({
    queryKey: ["site-analytics", "today", null, null],
    queryFn: () => fetchAnalytics({ data: { range: "today" } }),
    refetchInterval: 60_000,
  });

  const activityQ = useQuery({
    queryKey: ["admin", "activity"],
    queryFn: () => fetchActivity(),
    initialData: [] as Awaited<ReturnType<typeof fetchActivity>>,
    refetchOnMount: "always",
    refetchInterval: 20_000,
  });

  const p = profileQ.data;
  const greetingName = p?.firstName?.trim() || p?.username || "";
  const k = dayQ.data?.kpis;

  const totalVisitsToday = dayQ.data?.timeseries.reduce((s, b) => s + b.visits, 0) ?? 0;

  const fmtNum = (n?: number) => (n == null ? "—" : new Intl.NumberFormat("fr-FR").format(n));
  const fmtDuration = (ms?: number) => {
    if (!ms) return "—";
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}m ${r}s`;
  };

  const sideKpis = [
    { label: "Visites", value: dayQ.isLoading ? "…" : fmtNum(k?.visits), icon: Eye },
    { label: "Clics CTA", value: dayQ.isLoading ? "…" : fmtNum(k?.ctaClicks), icon: MousePointerClick },
    { label: "Conversion", value: dayQ.isLoading ? "…" : `${k?.conversionRate ?? 0}%`, icon: TrendingUp },
    { label: "Temps moyen", value: dayQ.isLoading ? "…" : fmtDuration(k?.avgDurationMs), icon: Clock },
    { label: "Devis soumis", value: dayQ.isLoading ? "…" : fmtNum(k?.devisSubmitted), icon: FileSignature },
  ];

  const fetchFinance = useServerFn(getFinanceKpis);
  const finance = useQuery({ queryKey: ["office", "finance-kpis"], queryFn: () => fetchFinance() });
  const fk = finance.data;
  const financeCards = [
    {
      label: "CA du mois",
      icon: TrendingUp,
      value: fk ? formatEUR(fk.revenueMonth) : "—",
      hint:
        fk && fk.revenuePrevMonth > 0
          ? `${fk.revenueMonth >= fk.revenuePrevMonth ? "+" : ""}${Math.round(
              ((fk.revenueMonth - fk.revenuePrevMonth) / fk.revenuePrevMonth) * 100,
            )} % vs mois dernier`
          : undefined,
      to: "/office/invoices",
    },
    {
      label: "En attente de paiement",
      icon: Clock,
      value: fk ? formatEUR(fk.pendingPayment) : "—",
      to: "/office/invoices",
    },
    {
      label: "Devis à signer",
      icon: FileSignature,
      value: fk ? formatEUR(fk.awaitingSignatureAmount) : "—",
      hint: fk ? `${fk.awaitingSignatureCount} devis envoyés` : undefined,
      to: "/office/quotes",
    },
    {
      label: "Factures en retard",
      icon: AlertTriangle,
      value: fk ? formatEUR(fk.overdueAmount) : "—",
      hint: fk ? `${fk.overdueCount} facture(s)` : undefined,
      danger: !!fk && fk.overdueCount > 0,
      to: "/office/invoices",
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto overflow-x-hidden px-4 pt-6 pb-10 md:px-8 md:pt-10">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8 flex items-center gap-4 md:mb-10 md:gap-5"
      >
        <span className="grid place-items-center h-14 w-14 md:h-16 md:w-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 ring-1 ring-white/15 overflow-hidden shrink-0">
          {p?.avatarUrl ? (
            <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Initials name={greetingName} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-4xl font-semibold tracking-tight break-words">
            Bonjour,{" "}
            <span className="font-script text-red-500 text-2xl md:text-4xl leading-none align-middle">
              {greetingName}
            </span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Voici un aperçu de l'activité de Skale Visuals.
          </p>
        </div>
      </motion.div>

      {/* Bloc 1 — Financier (placeholder) */}
      <SectionTitle label="Financier" />
      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {financeCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.04 * i }}
            >
              <Link
                to={c.to}
                className="block rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 backdrop-blur transition hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-500">
                    {c.label}
                  </span>
                  <Icon className="h-3.5 w-3.5 text-neutral-600" />
                </div>
                <p
                  className={`mt-3 text-2xl font-semibold ${
                    c.danger ? "text-red-400" : "text-white"
                  }`}
                >
                  {c.value}
                </p>
                {c.hint && <p className="mt-0.5 text-[11px] text-neutral-500">{c.hint}</p>}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Graphiques financiers */}
      <div className="mb-10 grid gap-3 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 backdrop-blur md:p-5 lg:col-span-2"
        >
          <p className="text-[11px] uppercase tracking-wider text-neutral-500">
            Évolution du CA — 6 derniers mois
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {fk ? formatEUR(fk.series.reduce((s, x) => s + x.revenue, 0)) : "…"}
            <span className="ml-2 text-xs font-normal text-neutral-500">cumulé HT</span>
          </p>
          <div className="mt-4 h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueSeries}
                margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#737373"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v} €`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: any) => [formatEUR(Number(v)), "CA HT"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#caGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 backdrop-blur md:p-5"
        >
          <p className="text-[11px] uppercase tracking-wider text-neutral-500">
            Statuts des devis
          </p>
          <div className="mt-2 h-56 md:h-64">
            {quoteStatusData.length === 0 ? (
              <div className="grid h-full place-items-center text-xs text-neutral-500">
                Aucun devis pour l'instant.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={quoteStatusData}
                    dataKey="count"
                    nameKey="status"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {quoteStatusData.map((entry) => (
                      <Cell key={entry.status} fill={QUOTE_STATUS_COLORS[entry.status] ?? "#737373"} />
                    ))}
                  </Pie>
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    formatter={(value) => (
                      <span style={{ color: "#a3a3a3", fontSize: 11 }}>{value}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: any, n: any) => [`${v} devis`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>



      {/* Bloc 2 — Analytiques */}
      <SectionTitle label="Analytiques" />

      {/* 24h chart */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 md:p-5 mb-3 backdrop-blur"
      >

        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">
              Connexions au site — Dernières 24h
            </p>
            <p className="text-2xl font-semibold text-white mt-1">
              {dayQ.isLoading ? "…" : totalVisitsToday}
              <span className="text-xs text-neutral-500 font-normal ml-2">visites</span>
            </p>
          </div>
        </div>
        <div className="h-56 md:h-72">
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8 md:mb-10">
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
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bloc 3 — Activité & notifications */}
      <SectionTitle label="Activité & notifications" />
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 md:p-5 backdrop-blur"
      >

        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Activité récente
          </h2>
        </div>
        {!!(followupsQ.data ?? []).length && (
          <div className="mb-4 rounded-xl border border-orange-500/25 bg-orange-500/[0.06] p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-3.5 w-3.5 text-orange-400" />
              <p className="text-[11px] uppercase tracking-wider text-orange-300 font-medium">
                Relances à faire
              </p>
            </div>
            <div className="space-y-1.5">
              {(followupsQ.data ?? []).map((f) => {
                const days = Math.max(
                  0,
                  Math.floor(
                    (Date.now() - new Date(f.next_followup_date + "T00:00:00").getTime()) / 86400000,
                  ),
                );
                return (
                  <Link
                    key={f.id}
                    to="/office/prospects"
                    search={{ p: f.id }}
                    className="flex min-h-[44px] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-white">{f.name}</span>
                    <span className="text-[11px] text-neutral-400 shrink-0">{f.platform}</span>
                    <span className="ml-auto text-xs shrink-0 text-orange-300">
                      {days === 0 ? "Aujourd'hui" : `En retard de ${days} j`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        <div className="space-y-2">
          {!(activityQ.data ?? []).length ? (
            <div className="text-sm text-neutral-400 bg-neutral-800/50 rounded-xl px-4 py-3 text-center">
              Aucune activité récente
            </div>
          ) : (
            <AnimatePresence initial={false}>
            {(activityQ.data ?? []).slice(0, 6).map((a) => {
              const typeIcons: Record<string, React.ElementType> = {
                deadline: AlertTriangle,
                avis: MessageSquare,
                video: Video,
                client: Users,
                devis: FileSignature,
                projet: FolderOpen,
              };
              const actionIcons: Record<string, React.ElementType> = {
                create: Plus,
                update: Pencil,
                delete: Trash2,
              };
              const Icon = (a.action && actionIcons[a.action]) || typeIcons[a.type] || Clock;
              const TypeIcon = typeIcons[a.type] || Clock;
              const colors: Record<string, string> = {
                red: "bg-red-500/15 text-red-400 ring-1 ring-red-500/20",
                amber: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20",
                green: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20",
                blue: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20",
                neutral: "bg-neutral-500/15 text-neutral-300 ring-1 ring-white/10",
              };
              const dotColors: Record<string, string> = {
                red: "bg-red-500",
                amber: "bg-amber-500",
                green: "bg-emerald-500",
                blue: "bg-sky-400",
                neutral: "bg-neutral-500",
              };
              const actionLabel: Record<string, string> = {
                create: "Ajout",
                update: "Modification",
                delete: "Suppression",
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
                  layout
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.25, type: "spring", stiffness: 260, damping: 26 }}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.04] transition"
                >
                  <span className={`relative grid place-items-center h-9 w-9 rounded-lg shrink-0 ${colors[a.variant]}`}>
                    <Icon className="h-4 w-4" />
                    {a.action && (
                      <span className="absolute -bottom-1 -right-1 grid place-items-center h-4 w-4 rounded-full bg-neutral-950 border border-white/10 text-neutral-300">
                        <TypeIcon className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    {a.action && (
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 leading-none mb-0.5">
                        {actionLabel[a.action]}
                      </p>
                    )}
                    <p className="text-sm text-white truncate">{a.message}</p>
                  </div>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className={`h-1.5 w-1.5 rounded-full ${dotColors[a.variant]}`} />
                    <span className="text-xs text-neutral-500">{relTime(a.time)}</span>
                  </span>
                </motion.div>
              );
            })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      <MaintenanceCard />
    </div>
  );
}
