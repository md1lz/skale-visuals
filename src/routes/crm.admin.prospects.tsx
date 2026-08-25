import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Loader2,
  X,
  ExternalLink,
  Archive,
  CalendarClock,
  Mail,
  Youtube,
  Instagram,
  Linkedin,
  Music2,
  Twitter,
  Send,
  Trophy,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  listProspects,
  upsertProspect,
  archiveProspect,
  listInteractions,
  addInteraction,
  convertProspectToClient,
  PROSPECT_STATUSES,
  PLATFORMS,
  NICHES,
  INTERESTS,
  type Prospect,
  type ProspectStatus,
  type ProspectInteraction,
  type Interested,
} from "@/lib/admin-prospects.functions";

export const Route = createFileRoute("/crm/admin/prospects")({
  validateSearch: (s: Record<string, unknown>) => ({ p: typeof s.p === "string" ? s.p : undefined }),
  component: AdminProspectionPage,
});

const statusBadge: Record<ProspectStatus, string> = {
  "À contacter": "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
  Contacté: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "Relance 1": "bg-orange-400/15 text-orange-300 border-orange-400/30",
  "Relance 2": "bg-orange-600/20 text-orange-400 border-orange-600/40",
  Intéressé: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  "En discussion": "bg-emerald-600/20 text-emerald-400 border-emerald-600/40",
  Signé: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "Pas intéressé": "bg-red-500/15 text-red-300 border-red-500/30",
  "No reply": "bg-neutral-800/60 text-neutral-400 border-neutral-700",
};

const platformBadge: Record<string, string> = {
  Instagram: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  YouTube: "bg-red-500/15 text-red-300 border-red-500/30",
  TikTok: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  Email: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  LinkedIn: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Twitter/X": "bg-neutral-400/15 text-neutral-200 border-neutral-400/30",
};

const platformIcon: Record<string, React.ElementType> = {
  Instagram,
  YouTube: Youtube,
  TikTok: Music2,
  Email: Mail,
  LinkedIn: Linkedin,
  "Twitter/X": Twitter,
};

const todayStr = () => new Date().toISOString().slice(0, 10);

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
}

function followupTone(d: string | null) {
  if (!d) return "text-neutral-500";
  const t = todayStr();
  if (d < t) return "text-red-400 font-medium";
  if (d === t) return "text-orange-400 font-medium";
  return "text-neutral-300";
}

function PlatformBadge({ platform }: { platform: string }) {
  const Icon = platformIcon[platform] ?? Send;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${
        platformBadge[platform] ?? "bg-neutral-500/15 text-neutral-300 border-neutral-500/30"
      }`}
    >
      <Icon className="h-3 w-3" />
      {platform}
    </span>
  );
}

const inputCls =
  "w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-red-500/50";
const labelCls = "block text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5";

function AdminProspectionPage() {
  const { p: initialId } = Route.useSearch();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Prospect[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProspectStatus>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [nicheFilter, setNicheFilter] = useState<string>("all");
  const [interestFilter, setInterestFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    try {
      setRows(await listProspects());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (platformFilter !== "all") list = list.filter((r) => r.platform === platformFilter);
    if (nicheFilter !== "all") list = list.filter((r) => (r.niche ?? "") === nicheFilter);
    if (interestFilter !== "all") list = list.filter((r) => r.interested === interestFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (r) => r.name.toLowerCase().includes(s) || (r.email ?? "").toLowerCase().includes(s),
      );
    }
    return [...list].sort((a, b) => {
      const av = a.next_followup_date ?? "9999-99-99";
      const bv = b.next_followup_date ?? "9999-99-99";
      if (av !== bv) return av.localeCompare(bv);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [rows, q, statusFilter, platformFilter, nicheFilter, interestFilter]);

  const kpis = useMemo(() => {
    const list = rows ?? [];
    const month = new Date().toISOString().slice(0, 7);
    const thisMonth = list.filter((r) => r.created_at.slice(0, 7) === month).length;
    const contacted = list.filter((r) => r.status !== "À contacter");
    const replied = contacted.filter((r) => r.status !== "No reply");
    const signed = list.filter((r) => r.status === "Signé");
    const byPlatform = new Map<string, { total: number; replied: number }>();
    for (const r of contacted) {
      const e = byPlatform.get(r.platform) ?? { total: 0, replied: 0 };
      e.total += 1;
      if (r.status !== "No reply") e.replied += 1;
      byPlatform.set(r.platform, e);
    }
    let best = "—";
    let bestRate = -1;
    for (const [k, v] of byPlatform) {
      const rate = v.replied / v.total;
      if (rate > bestRate) {
        bestRate = rate;
        best = `${k} (${Math.round(rate * 100)}%)`;
      }
    }
    return {
      thisMonth,
      replyRate: contacted.length ? Math.round((replied.length / contacted.length) * 100) : 0,
      conversionRate: contacted.length ? Math.round((signed.length / contacted.length) * 100) : 0,
      best,
    };
  }, [rows]);

  const selected = (rows ?? []).find((r) => r.id === selectedId) ?? null;

  const closePanel = () => {
    setSelectedId(null);
    setCreating(false);
    if (initialId) navigate({ to: "/crm/admin/prospection", search: { p: undefined } });
  };

  const kpiCards = [
    { label: "Prospections ce mois", value: String(kpis.thisMonth), icon: Send },
    { label: "Taux de réponse", value: `${kpis.replyRate}%`, icon: MessageSquare },
    { label: "Taux de conversion", value: `${kpis.conversionRate}%`, icon: CheckCircle2 },
    { label: "Meilleure plateforme", value: kpis.best, icon: Trophy },
  ];

  return (
    <div className="w-full max-w-[1400px] overflow-x-hidden p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Prospection</h1>
          <p className="text-sm text-neutral-400 mt-1">Pipeline de prospects et suivi des relances.</p>
        </div>
        <button
          onClick={() => {
            setSelectedId(null);
            setCreating(true);
          }}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-3.5 py-2 text-sm font-medium text-white transition sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Nouveau prospect
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpiCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider text-neutral-500">{c.label}</span>
                <Icon className="h-3.5 w-3.5 text-neutral-500" />
              </div>
              <p className="text-xl font-semibold text-white truncate">{c.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <div className="relative col-span-2 min-w-0 sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (pseudo, nom, mail)"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as never)} className={`${inputCls} min-h-[44px] sm:w-auto`}>
          <option value="all">Tous statuts</option>
          {PROSPECT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className={`${inputCls} min-h-[44px] sm:w-auto`}>
          <option value="all">Toutes plateformes</option>
          {PLATFORMS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={nicheFilter} onChange={(e) => setNicheFilter(e.target.value)} className={`${inputCls} min-h-[44px] sm:w-auto`}>
          <option value="all">Toutes niches</option>
          {NICHES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={interestFilter} onChange={(e) => setInterestFilter(e.target.value)} className={`${inputCls} min-h-[44px] sm:w-auto`}>
          <option value="all">Intéressé : tous</option>
          {INTERESTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-4 items-start">
        {/* Mobile cards */}
        <div className="w-full min-w-0 space-y-3 lg:hidden">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-8 text-center text-neutral-500">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : !filtered.length ? (
            <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-8 text-center text-sm text-neutral-500">
              Aucun prospect
            </div>
          ) : (
            filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setCreating(false);
                  setSelectedId(r.id);
                }}
                className="w-full rounded-2xl border border-white/10 bg-neutral-900/50 p-4 text-left transition active:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 break-words text-base font-semibold text-white">
                    {r.name}
                  </p>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${statusBadge[r.status]}`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <PlatformBadge platform={r.platform} />
                  {r.niche && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-neutral-300">
                      {r.niche}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className={followupTone(r.next_followup_date)}>
                    Relance : {fmtDate(r.next_followup_date)}
                  </span>
                  <span className="text-neutral-500">Intéressé : {r.interested}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Table (desktop) */}
        <div className="hidden lg:block flex-1 min-w-0 rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 border-b border-white/10">
                  <th className="px-4 py-3">Pseudo / Nom</th>
                  <th className="px-4 py-3">Plateforme</th>
                  <th className="px-4 py-3">Niche</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">1er contact</th>
                  <th className="px-4 py-3">Dernier</th>
                  <th className="px-4 py-3">Relance</th>
                  <th className="px-4 py-3">Intéressé</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-neutral-500">
                      <Loader2 className="h-5 w-5 animate-spin inline" />
                    </td>
                  </tr>
                ) : !filtered.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-neutral-500">Aucun prospect</td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => {
                        setCreating(false);
                        setSelectedId(r.id);
                      }}
                      className={`border-b border-white/5 cursor-pointer transition hover:bg-white/[0.03] ${
                        selectedId === r.id ? "bg-white/[0.05]" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-white whitespace-nowrap">{r.name}</td>
                      <td className="px-4 py-3"><PlatformBadge platform={r.platform} /></td>
                      <td className="px-4 py-3">
                        {r.niche ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-neutral-300">
                            {r.niche}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap ${statusBadge[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">{fmtDate(r.first_contact_date)}</td>
                      <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">{fmtDate(r.last_contact_date)}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${followupTone(r.next_followup_date)}`}>
                        {fmtDate(r.next_followup_date)}
                      </td>
                      <td className="px-4 py-3 text-neutral-300">{r.interested}</td>
                      <td className="px-4 py-3">
                        <button
                          title="Archiver"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`Archiver ${r.name} ?`)) return;
                            try {
                              await archiveProspect({ data: { id: r.id } });
                              if (selectedId === r.id) setSelectedId(null);
                              toast.success("Prospect archivé");
                              refresh();
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Erreur");
                            }
                          }}
                          className="text-neutral-500 hover:text-red-400 transition"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side panel */}
        <AnimatePresence>
          {(selected || creating) && (
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block w-[420px] shrink-0"
            >
              <ProspectPanel
                key={selected?.id ?? "new"}
                prospect={selected}
                onClose={closePanel}
                onSaved={refresh}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile panel */}
      <AnimatePresence>
        {(selected || creating) && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="lg:hidden fixed inset-0 z-[60] bg-neutral-950 overflow-y-auto p-4"
          >
            <ProspectPanel prospect={selected} onClose={closePanel} onSaved={refresh} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProspectPanel({
  prospect,
  onClose,
  onSaved,
}: {
  prospect: Prospect | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: prospect?.name ?? "",
    platform: prospect?.platform ?? "Instagram",
    profile_url: prospect?.profile_url ?? "",
    email: prospect?.email ?? "",
    niche: prospect?.niche ?? "",
    customNiche: prospect?.niche && !NICHES.includes(prospect.niche as never) ? prospect.niche : "",
    subscriber_count: prospect?.subscriber_count?.toString() ?? "",
    status: (prospect?.status ?? "À contacter") as ProspectStatus,
    interested: (prospect?.interested ?? "En attente") as Interested,
    first_contact_date: prospect?.first_contact_date ?? "",
    last_contact_date: prospect?.last_contact_date ?? "",
    next_followup_date: prospect?.next_followup_date ?? "",
    notes: prospect?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [interactions, setInteractions] = useState<ProspectInteraction[]>([]);
  const [addingInteraction, setAddingInteraction] = useState(false);
  const [newInter, setNewInter] = useState({ type: "Relance 1", note: "", date: todayStr() });
  const [convertFor, setConvertFor] = useState<Prospect | null>(null);

  const nicheIsCustom = form.niche === "Autre" || (!!form.customNiche && !NICHES.includes(form.niche as never));

  useEffect(() => {
    if (!prospect) return;
    listInteractions({ data: { prospectId: prospect.id } })
      .then(setInteractions)
      .catch(() => setInteractions([]));
  }, [prospect?.id]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (overrides?: Partial<typeof form>) => {
    const f = { ...form, ...overrides };
    if (!f.name.trim()) {
      toast.error("Le nom est obligatoire.");
      return null;
    }
    setSaving(true);
    try {
      const niche = f.niche === "Autre" ? f.customNiche || "Autre" : f.niche || null;
      const row = await upsertProspect({
        data: {
          id: prospect?.id ?? null,
          name: f.name,
          platform: f.platform,
          profile_url: f.profile_url || null,
          email: f.email || null,
          niche,
          subscriber_count: f.subscriber_count || null,
          status: f.status,
          interested: f.interested,
          first_contact_date: f.first_contact_date || null,
          last_contact_date: f.last_contact_date || null,
          next_followup_date: f.next_followup_date || null,
          notes: f.notes || null,
        },
      });
      toast.success("✓ Enregistré");
      onSaved();
      if (row.status === "Signé" && !row.converted_to_client) setConvertFor(row);
      return row;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const markFollowedUpToday = async () => {
    if (!prospect) return;
    const next = prompt("Prochaine relance (AAAA-MM-JJ) — laisser vide pour aucune", "") ?? "";
    await addInteraction({
      data: {
        prospect_id: prospect.id,
        type: "Relance",
        note: null,
        date: todayStr(),
        next_followup_date: next || null,
      },
    });
    setForm((f) => ({ ...f, last_contact_date: todayStr(), next_followup_date: next || "" }));
    setInteractions(await listInteractions({ data: { prospectId: prospect.id } }));
    onSaved();
    toast.success("Relance enregistrée");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4 space-y-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
          {prospect ? "Fiche prospect" : "Nouveau prospect"}
        </h2>
        <button onClick={onClose} className="text-neutral-500 hover:text-white transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Infos */}
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Pseudo / Nom</label>
          <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Plateforme</label>
            <select className={inputCls} value={form.platform} onChange={(e) => set("platform", e.target.value)}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Niche</label>
            <select
              className={inputCls}
              value={nicheIsCustom ? "Autre" : form.niche}
              onChange={(e) => set("niche", e.target.value)}
            >
              <option value="">—</option>
              {NICHES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        {nicheIsCustom && (
          <input
            className={inputCls}
            placeholder="Niche personnalisée"
            value={form.customNiche}
            onChange={(e) => set("customNiche", e.target.value)}
          />
        )}
        <div>
          <label className={labelCls}>Lien du profil</label>
          <div className="flex gap-2">
            <input className={inputCls} value={form.profile_url} onChange={(e) => set("profile_url", e.target.value)} />
            {form.profile_url && (
              <a
                href={form.profile_url}
                target="_blank"
                rel="noreferrer"
                className="grid place-items-center rounded-lg border border-white/10 px-3 text-neutral-400 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Abonnés</label>
            <input
              type="number"
              className={inputCls}
              value={form.subscriber_count}
              onChange={(e) => set("subscriber_count", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Statut</label>
            <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
              {PROSPECT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Intéressé</label>
            <div className="flex gap-1">
              {INTERESTS.map((i) => (
                <button
                  key={i}
                  onClick={() => set("interested", i)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-[11px] transition ${
                    form.interested === i
                      ? "bg-red-600/20 border-red-500/40 text-white"
                      : "border-white/10 text-neutral-400 hover:text-white"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Suivi */}
      <div className="space-y-3 border-t border-white/10 pt-4">
        <p className="text-[11px] uppercase tracking-wider text-neutral-500">Suivi des contacts</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>1er contact</label>
            <input type="date" className={inputCls} value={form.first_contact_date} onChange={(e) => set("first_contact_date", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Dernier</label>
            <input type="date" className={inputCls} value={form.last_contact_date} onChange={(e) => set("last_contact_date", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Relance</label>
            <input
              type="date"
              className={`${inputCls} ${followupTone(form.next_followup_date || null)}`}
              value={form.next_followup_date}
              onChange={(e) => set("next_followup_date", e.target.value)}
            />
          </div>
        </div>
        {prospect && (
          <button
            onClick={markFollowedUpToday}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200 hover:bg-white/10 transition"
          >
            <CalendarClock className="h-3.5 w-3.5" /> Marquer comme relancé aujourd'hui
          </button>
        )}
      </div>

      {/* Historique */}
      {prospect && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">Historique des contacts</p>
            <button
              onClick={() => setAddingInteraction((v) => !v)}
              className="text-xs text-red-400 hover:text-red-300"
            >
              + Ajouter une interaction
            </button>
          </div>
          {addingInteraction && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="grid grid-cols-2 gap-2">
                <select className={inputCls} value={newInter.type} onChange={(e) => setNewInter((s) => ({ ...s, type: e.target.value }))}>
                  {["Premier message", "Relance 1", "Relance 2", "Réponse reçue", "Appel", "Autre"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input type="date" className={inputCls} value={newInter.date} onChange={(e) => setNewInter((s) => ({ ...s, date: e.target.value }))} />
              </div>
              <input
                className={inputCls}
                placeholder="Note (optionnel)"
                value={newInter.note}
                onChange={(e) => setNewInter((s) => ({ ...s, note: e.target.value }))}
              />
              <button
                onClick={async () => {
                  try {
                    await addInteraction({
                      data: {
                        prospect_id: prospect.id,
                        type: newInter.type,
                        note: newInter.note || null,
                        date: newInter.date,
                      },
                    });
                    setInteractions(await listInteractions({ data: { prospectId: prospect.id } }));
                    setForm((f) => ({ ...f, last_contact_date: newInter.date }));
                    setNewInter({ type: "Relance 1", note: "", date: todayStr() });
                    setAddingInteraction(false);
                    onSaved();
                    toast.success("Interaction ajoutée");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Erreur");
                  }
                }}
                className="w-full rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-xs font-medium text-white transition"
              >
                Ajouter
              </button>
            </div>
          )}
          <div className="space-y-2">
            {!interactions.length ? (
              <p className="text-xs text-neutral-500">Aucune interaction.</p>
            ) : (
              interactions.map((i) => (
                <div key={i.id} className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-white">
                      {i.type} <span className="text-neutral-500">· {fmtDate(i.date)}</span>
                    </p>
                    {i.note && <p className="text-xs text-neutral-400 mt-0.5">{i.note}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="border-t border-white/10 pt-4">
        <label className={labelCls}>Notes</label>
        <textarea
          rows={4}
          className={inputCls}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Ton du contenu, budget estimé, observations…"
        />
      </div>

      <button
        onClick={() => save()}
        disabled={saving}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 px-3 py-2.5 text-sm font-medium text-white transition"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
      </button>

      {convertFor && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5">
            <p className="text-sm text-white mb-4">
              Créer automatiquement une fiche client pour <strong>{convertFor.name}</strong> ?
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await convertProspectToClient({ data: { id: convertFor.id } });
                    toast.success("Fiche client créée");
                    setConvertFor(null);
                    onSaved();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Erreur");
                  }
                }}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-sm text-white transition"
              >
                Oui, créer
              </button>
              <button
                onClick={() => setConvertFor(null)}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 transition"
              >
                Non, plus tard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
