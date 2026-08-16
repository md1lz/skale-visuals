import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Eye,
  MousePointerClick,
  TrendingUp,
  Clock,
  FileSignature,
  Activity,
  Globe,
  Smartphone,
  Loader2,
  CalendarIcon,
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSiteAnalytics } from "@/lib/admin-analytics.functions";

type Range = "today" | "7d" | "30d" | "custom";

const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "Dernières 24h" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "custom", label: "Personnalisé" },
];

const DEVICE_COLORS = ["#ef4444", "#f97316", "#fbbf24"];

export const Route = createFileRoute("/crm/admin/analytiques")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [range, setRange] = useState<Range>("today");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const fetchAnalytics = useServerFn(getSiteAnalytics);
  const queryArgs =
    range === "custom"
      ? { range, from: customFrom?.toISOString(), to: customTo?.toISOString() }
      : { range };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["site-analytics", range, range === "custom" ? customFrom?.toISOString() : null, range === "custom" ? customTo?.toISOString() : null],
    queryFn: () => fetchAnalytics({ data: queryArgs }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
    enabled: range !== "custom" || (!!customFrom && !!customTo),
  });

  // Compute tick interval so labels never overlap
  const seriesLen = data?.timeseries.length ?? 0;
  const tickInterval = seriesLen > 20 ? Math.ceil(seriesLen / 10) - 1 : seriesLen > 10 ? 1 : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Analytiques</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Activité du site Skale Visuals en temps réel.
            {isFetching && (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-neutral-500">
                <Loader2 className="h-3 w-3 animate-spin" /> sync…
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl border border-white/10 bg-neutral-900/50 p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setRange(r.value);
                  if (r.value === "custom") setCalendarOpen(true);
                }}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  range === r.value
                    ? "bg-red-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 justify-start text-left font-normal bg-neutral-900/50 border-white/10 text-neutral-200 hover:bg-neutral-800/70 hover:text-white",
                    !customFrom && "text-neutral-500",
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {customFrom && customTo
                    ? `${format(customFrom, "d MMM", { locale: fr })} → ${format(customTo, "d MMM yyyy", { locale: fr })}`
                    : "Choisir une période"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-neutral-950 border-white/10" align="end">
                <Calendar
                  mode="range"
                  locale={fr}
                  selected={{ from: customFrom, to: customTo }}
                  onSelect={(r) => {
                    setCustomFrom(r?.from);
                    setCustomTo(r?.to);
                  }}
                  numberOfMonths={2}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </header>


      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi
          icon={<Eye className="h-4 w-4" />}
          label="Visites"
          value={fmtNum(data?.kpis.visits)}
          loading={isLoading}
        />
        <Kpi
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Clics CTA"
          value={fmtNum(data?.kpis.ctaClicks)}
          loading={isLoading}
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Conversion"
          value={data ? `${data.kpis.conversionRate}%` : "—"}
          loading={isLoading}
        />
        <Kpi
          icon={<Clock className="h-4 w-4" />}
          label="Temps moyen"
          value={fmtDuration(data?.kpis.avgDurationMs)}
          loading={isLoading}
        />
        <Kpi
          icon={<FileSignature className="h-4 w-4" />}
          label="Devis soumis"
          value={fmtNum(data?.kpis.devisSubmitted)}
          loading={isLoading}
        />
      </section>

      <Panel
        title="Visites"
        subtitle={range === "today" ? "Sessions par heure (dernières 24h)" : range === "custom" && customFrom && customTo && (customTo.getTime() - customFrom.getTime()) <= 2 * 86400000 ? "Sessions par heure" : "Sessions par jour"}
        icon={<TrendingUp className="h-4 w-4 text-red-500" />}
      >
        <div className="h-72">
          {data && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="visGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="bucket" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} interval={tickInterval} minTickGap={8} tickMargin={8} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#a3a3a3" }}
                />
                <Area type="monotone" dataKey="visits" stroke="#ef4444" strokeWidth={2} fill="url(#visGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel
          title="Clics par bouton CTA"
          subtitle="Les boutons les plus cliqués"
          icon={<MousePointerClick className="h-4 w-4 text-red-500" />}
        >
          {data && data.ctaBreakdown.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...data.ctaBreakdown].sort((a,b)=>b.clicks-a.clicks).slice(0,5)} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="cta_id"
                    stroke="#a3a3a3"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={140}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="clicks" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="Aucun clic CTA enregistré sur la période." />
          )}
        </Panel>

        <Panel
          title="Pages les plus vues"
          icon={<Activity className="h-4 w-4 text-red-500" />}
        >
          {data && data.topPages.length > 0 ? (
            <ul className="divide-y divide-white/5">
              {[...data.topPages].sort((a,b)=>b.views-a.views).slice(0,5).map((p) => (
                <li key={p.path} className="flex items-center justify-between py-2.5 text-sm gap-3">
                  <span className="text-neutral-200 truncate">{(p as { label?: string }).label ?? p.path}</span>
                  <span className="text-neutral-400 tabular-nums">{p.views.toLocaleString("fr-FR")}</span>
                </li>
              ))}

            </ul>
          ) : (
            <EmptyState label="Aucune page vue sur la période." />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel
          title="Appareils"
          subtitle="Répartition des sessions"
          icon={<Smartphone className="h-4 w-4 text-red-500" />}
        >
          {data && data.devices.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.devices}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {data.devices.map((_, i) => (
                        <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#0a0a0a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#ffffff",
                      }}
                      itemStyle={{ color: "#ffffff" }}
                      labelStyle={{ color: "#ffffff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-2 text-sm">
                {data.devices.map((d, i) => (
                  <li key={d.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: DEVICE_COLORS[i % DEVICE_COLORS.length] }}
                      />
                      <span className="capitalize text-neutral-200">{d.name}</span>
                    </span>
                    <span className="text-neutral-400 tabular-nums">{d.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState label="Aucune session sur la période." />
          )}
        </Panel>

        <Panel
          title="Sources de trafic"
          icon={<Globe className="h-4 w-4 text-red-500" />}
        >
          {data && data.sources.length > 0 ? (
            <ul className="space-y-3">
              {data.sources.map((s) => (
                <li key={s.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-neutral-200 truncate">{s.name}</span>
                    <span className="text-neutral-400 tabular-nums">{s.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-gradient-to-r from-red-600 to-red-400"
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState label="Aucune source identifiée." />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4"
    >
      <div className="flex items-center gap-2 text-neutral-400 text-xs">
        <span className="text-red-500">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums min-h-[2rem]">
        {loading ? <span className="text-neutral-600">…</span> : value}
      </div>
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
    <section className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-[11px] text-neutral-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-neutral-500 py-8 text-center">{label}</p>;
}

function fmtNum(n: number | undefined): string {
  if (n === undefined) return "—";
  return n.toLocaleString("fr-FR");
}

function fmtDuration(ms: number | undefined): string {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}m ${rest.toString().padStart(2, "0")}s`;
}
