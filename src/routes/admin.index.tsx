import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart3,
  Eye,
  MousePointerClick,
  FileSignature,
  TrendingUp,
  ArrowRight,
  Users,
  Star,
  Video,
} from "lucide-react";
import { getSiteAnalytics } from "@/lib/admin-analytics.functions";
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

  const analyticsQ = useQuery({
    queryKey: ["admin", "analytics", "30d", "home"],
    queryFn: () => fetchAnalytics({ data: { range: "30d" } }),
  });

  const p = profileQ.data;
  const greetingName = p?.firstName?.trim() || p?.username || "";
  const k = analyticsQ.data?.kpis;

  const kpiCards = [
    { label: "Visites (30j)", value: k?.visits ?? 0, icon: Eye },
    { label: "Clics CTA", value: k?.ctaClicks ?? 0, icon: MousePointerClick },
    { label: "Devis soumis", value: k?.devisSubmitted ?? 0, icon: FileSignature },
    { label: "Conversion", value: `${k?.conversionRate ?? 0}%`, icon: TrendingUp },
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
    <div className="px-8 py-8 max-w-6xl">
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {kpiCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="rounded-xl border border-white/10 bg-neutral-900/50 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider text-neutral-500">
                  {c.label}
                </span>
                <Icon className="h-3.5 w-3.5 text-neutral-500" />
              </div>
              <p className="text-2xl font-semibold text-white">
                {analyticsQ.isLoading ? "…" : c.value}
              </p>
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
