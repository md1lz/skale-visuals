import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Loader2, X, Archive, ArchiveRestore, Trash2, Link as LinkIcon, ExternalLink, ArrowLeft, ChevronDown, FileText, Inbox, Pencil, Euro, RefreshCw, AlertTriangle } from "lucide-react";
import { ProjectVideosBoard, RushLink, useWorkspace } from "@/components/VideoWorkspace";
import { ProjectProgress } from "@/components/ProjectProgress";

import { toast } from "sonner";
import {
  listProjects,
  upsertProject,
  deleteProject,
  archiveProject,
  getProjectHistory,
  resetProjectStatusAuto,
  PROJECT_STATUSES,
  PROJECT_FORMATS,
  type Project,
  type ProjectStatus,
  type ProjectFormat,
  type EditorRateType,
  type ProjectStatusHistoryItem,
} from "@/lib/admin-projects.functions";
import { listClients, type Client } from "@/lib/admin-clients.functions";
import {
  listActiveEditors,
  getProjectThread,
  postAdminComment,
  deleteProjectComment,
} from "@/lib/admin-editors.functions";
import { logAdminActivity } from "@/lib/admin-activity.functions";

export const Route = createFileRoute("/admin/projets")({ component: AdminProjectsPage });

const statusBadge: Record<ProjectStatus, string> = {
  "En attente de validation client": "bg-neutral-400/15 text-neutral-200 border-neutral-400/30",
  "À faire": "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
  "En cours": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "En révision": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  Corrections: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  "Montage terminé": "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Livrée: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Payée: "bg-green-700/25 text-green-300 border-green-700/40",
};

const formatBadge: Record<ProjectFormat, string> = {
  Court: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  Long: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

const statusIcon: Record<ProjectStatus, string> = {
  "En attente de validation client": "⏳",
  "À faire": "📋",
  "En cours": "🎬",
  "En révision": "👀",
  Corrections: "🔧",
  "Montage terminé": "🟣",
  Livrée: "🟢",
  Payée: "✅",
};

function AdminProjectsPage() {
  const [rows, setRows] = useState<Project[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [formatFilter, setFormatFilter] = useState<"all" | ProjectFormat>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [detail, setDetail] = useState<Project | null>(null);

  const refresh = async () => {
    try {
      const [p, c] = await Promise.all([
        listProjects({ data: { archived: showArchived } }),
        listClients(),
      ]);
      setRows(p);
      setClients(c);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const clientById = useMemo(() => {
    const m = new Map<string, Client>();
    clients.forEach((c) => m.set(c.id, c));
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (formatFilter !== "all") list = list.filter((r) => r.format === formatFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((r) => {
        const client = r.client_id ? clientById.get(r.client_id) : undefined;
        return (
          r.title.toLowerCase().includes(s) ||
          (client?.nom_complet ?? "").toLowerCase().includes(s)
        );
      });
    }
    return [...list].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  }, [rows, q, statusFilter, formatFilter, clientById]);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projets</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Suivi de tes projets : montage, deadlines, facturation, bénéfices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 hover:bg-white/5 text-neutral-300 text-sm px-3 py-2 transition-colors"
          >
            {showArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {showArchived ? "Projets actifs" : "Voir les archivés"}
          </button>
          {!showArchived && (
            <button
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 transition-colors shadow-lg shadow-red-600/20"
            >
              <Plus className="h-4 w-4" /> Nouveau projet
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un titre ou un client…"
            className="w-full rounded-lg bg-neutral-900/60 border border-white/10 pl-9 pr-3 py-2 text-sm outline-none focus:border-red-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | ProjectStatus)}
          className="rounded-lg bg-neutral-900/60 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
        >
          <option value="all">Tous les statuts</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value as "all" | ProjectFormat)}
          className="rounded-lg bg-neutral-900/60 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
        >
          <option value="all">Tous formats</option>
          {PROJECT_FORMATS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1.3fr_0.7fr_1fr_1.2fr_1fr_1fr_1fr] gap-3 px-4 py-3 text-xs uppercase tracking-wider text-neutral-500 border-b border-white/10">
          <span>Titre</span>
          <span>Client</span>
          <span>Format</span>
          <span>Monteur</span>
          <span>Statut</span>
          <span>Deadline</span>
          <span className="text-right">Facturé</span>
          <span className="text-right">Bénéfice net</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            <Loader2 className="h-5 w-5 mx-auto animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            {rows && rows.length === 0
              ? showArchived ? "Aucun projet archivé." : "Aucun projet pour l'instant."
              : "Aucun résultat."}
          </div>
        ) : (
          <ul>
            {filtered.map((p) => {
              const client = p.client_id ? clientById.get(p.client_id) : null;
              const dl = deadlineStyle(p);
              return (
                <li
                  key={p.id}
                  onClick={() => setDetail(p)}
                  className="grid grid-cols-[1.6fr_1.3fr_0.7fr_1fr_1.2fr_1fr_1fr_1fr] gap-3 px-4 py-3 items-center text-sm border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors"
                >
                  <span className="font-medium truncate">{p.title}</span>
                  <span className="text-neutral-300 truncate">{client?.nom_complet ?? "—"}</span>
                  <span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${formatBadge[p.format]}`}>
                      {p.format}
                    </span>
                  </span>
                  <span className="text-neutral-300 truncate">{p.editor_name ?? "—"}</span>
                  <span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusBadge[p.status]}`}>
                      {p.status}
                    </span>
                  </span>
                  <span className={dl.className}>{dl.label}</span>
                  <span className="text-right tabular-nums">{fmtEuro(p.amount_invoiced_ht)}</span>
                  <span className={`text-right tabular-nums font-medium ${p.net_profit < 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {fmtEuro(p.net_profit)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AnimatePresence>
        {detail && !editing && (
          <ProjectDetailPanel
            project={detail}
            client={detail.client_id ? clientById.get(detail.client_id) ?? null : null}
            onClose={() => setDetail(null)}
            onEdit={() => setEditing(detail)}
            onChanged={() => {
              setDetail(null);
              refresh();
            }}
          />
        )}
        {editing && (
          <ProjectFormPanel
            initial={editing === "new" ? null : editing}
            clients={clients}
            onClose={() => setEditing(null)}
            onSaved={(saved) => {
              setEditing(null);
              if (detail && detail.id === saved.id) setDetail(saved);
              refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Utils ---------------- */

function fmtEuro(v: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(v);
}

function fmtDateFR(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function fmtDateTimeFR(d: string): string {
  try {
    return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return d;
  }
}

function deadlineStyle(p: Project): { label: string; className: string } {
  if (!p.deadline) return { label: "—", className: "text-neutral-500" };
  const done = p.status === "Livrée" || p.status === "Payée";
  const label = fmtDateFR(p.deadline);
  if (done) return { label, className: "text-neutral-500 line-through" };
  const ms = new Date(p.deadline + "T23:59:59").getTime() - Date.now();
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return { label, className: "text-red-400 font-semibold animate-pulse" };
  if (hours < 48) return { label, className: "text-orange-400 font-medium" };
  return { label, className: "text-white" };
}

/* ---------------- Side panel ---------------- */

function SidePanel({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 60, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0 right-0 h-full w-full max-w-2xl bg-neutral-950 border-l border-white/10 flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold truncate pr-3">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="border-t border-white/10 px-6 py-4 flex items-center justify-end gap-2">{footer}</div>
        )}
      </motion.aside>
    </motion.div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-xs font-medium text-neutral-400 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
    />
  );
}

function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: readonly T[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

/* ---------------- Form ---------------- */

type FormState = {
  title: string;
  client_id: string;
  editor_id: string;
  format: ProjectFormat;
  status: ProjectStatus;
  editor_name: string;
  editor_rate: string;
  editor_rate_type: EditorRateType;
  editor_quantity: string;
  amount_invoiced_ht: string;
  deadline: string;
  brief: string;
  rushs_received: boolean;
  rushs_links: string[];
  delivery_link: string;
  revision_link: string;
};

function toForm(p: Project | null): FormState {
  return {
    title: p?.title ?? "",
    client_id: p?.client_id ?? "",
    editor_id: p?.editor_id ?? "",
    format: p?.format ?? "Court",
    status: p?.status ?? "En attente de validation client",
    editor_name: p?.editor_name ?? "",
    editor_rate: p?.editor_rate != null ? String(p.editor_rate) : "",
    editor_rate_type: p?.editor_rate_type ?? "per_video",
    editor_quantity: p?.editor_quantity != null ? String(p.editor_quantity) : "",
    amount_invoiced_ht: p?.amount_invoiced_ht != null ? String(p.amount_invoiced_ht) : "",
    deadline: p?.deadline ?? "",
    brief: p?.brief ?? "",
    rushs_received: p?.rushs_received ?? false,
    rushs_links: p?.rushs_links ?? [],
    delivery_link: p?.delivery_link ?? "",
    revision_link: p?.revision_link ?? "",
  };
}

function ProjectFormPanel({
  initial,
  clients,
  onClose,
  onSaved,
}: {
  initial: Project | null;
  clients: Client[];
  onClose: () => void;
  onSaved: (p: Project) => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [editors, setEditors] = useState<{ id: string; display_name: string; username: string }[]>([]);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    listActiveEditors()
      .then(setEditors)
      .catch(() => {});
  }, []);

  const rate = Number(form.editor_rate) || 0;
  const qty = Number(form.editor_quantity) || 0;
  const editorTotal = Math.round(rate * qty * 100) / 100;
  const invoiced = Number(form.amount_invoiced_ht) || 0;
  const grossProfit = invoiced - editorTotal;
  const socialCharges = Math.round(invoiced * 0.22 * 100) / 100;
  const netProfit = Math.round((invoiced - editorTotal - socialCharges) * 100) / 100;

  const filteredClients = useMemo(() => {
    if (!clientQuery.trim()) return clients;
    const s = clientQuery.trim().toLowerCase();
    return clients.filter(
      (c) => c.nom_complet.toLowerCase().includes(s) || (c.entreprise ?? "").toLowerCase().includes(s),
    );
  }, [clients, clientQuery]);

  const selectedClient = clients.find((c) => c.id === form.client_id);

  const save = async () => {
    if (!form.title.trim()) return toast.error("Le titre est obligatoire.");
    if (!form.client_id) return toast.error("Sélectionne un client.");
    if (!form.deadline) return toast.error("La deadline est obligatoire.");
    setSaving(true);
    try {
      const saved = await upsertProject({
        data: {
          id: initial?.id ?? null,
          title: form.title.trim(),
          client_id: form.client_id,
          editor_id: form.editor_id || null,
          format: form.format,
          status: form.status,
          editor_name: form.editor_name,
          editor_rate: form.editor_rate,
          editor_rate_type: form.editor_rate_type,
          editor_quantity: form.editor_quantity,
          amount_invoiced_ht: form.amount_invoiced_ht,
          deadline: form.deadline,
          brief: form.brief,
          rushs_received: form.rushs_received,
          rushs_links: form.rushs_links.map((l) => l.trim()).filter(Boolean),
          delivery_link: form.delivery_link,
          revision_link: form.revision_link,
        },
      });
      toast.success(initial ? "✓ Projet enregistré" : "✓ Projet créé");
      logAdminActivity({
        data: {
          kind: initial ? "project_update" : "project_add",
          message: initial ? `Projet modifié : ${saved.title}` : `Nouveau projet : ${saved.title}`,
        },
      }).catch(() => {});
      onSaved(saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel
      title={initial ? "Modifier le projet" : "Nouveau projet"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2 text-sm text-neutral-300 hover:bg-white/5">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Titre du projet *" className="col-span-2">
          <TextInput value={form.title} onChange={(v) => set("title", v)} placeholder="Ex : Vidéo YouTube #12" />
        </Field>

        <Field label="Client *" className="col-span-2">
          {clients.length === 0 ? (
            <p className="text-xs text-orange-300 rounded-lg bg-orange-500/10 border border-orange-500/30 px-3 py-2">
              Aucun client enregistré. Crée d'abord un client dans la rubrique Clients.
            </p>
          ) : (
            <div className="space-y-2">
              <input
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                placeholder="Rechercher un client…"
                className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-neutral-900/60">
                {filteredClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set("client_id", c.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center justify-between ${form.client_id === c.id ? "bg-red-500/10 text-red-200" : "text-neutral-200"}`}
                  >
                    <span className="truncate">{c.nom_complet}</span>
                    <span className="text-xs text-neutral-500 truncate ml-3">
                      {c.entreprise ?? c.reseaux_sociaux ?? ""}
                    </span>
                  </button>
                ))}
                {filteredClients.length === 0 && (
                  <div className="px-3 py-2 text-xs text-neutral-500">Aucun résultat.</div>
                )}
              </div>
              {selectedClient && (
                <p className="text-xs text-neutral-400">Sélectionné : <span className="text-white">{selectedClient.nom_complet}</span></p>
              )}
            </div>
          )}
        </Field>

        <Field label="Format *">
          <Select value={form.format} onChange={(v) => set("format", v)} options={PROJECT_FORMATS} />
        </Field>
        <Field label="Statut *">
          <Select value={form.status} onChange={(v) => set("status", v)} options={PROJECT_STATUSES} />
        </Field>

        <Field label="Deadline *" className="col-span-2">
          <TextInput type="date" value={form.deadline} onChange={(v) => set("deadline", v)} />
        </Field>

        <div className="col-span-2 border-t border-white/10 pt-4">
          <h3 className="text-sm font-semibold text-white mb-3">Monteur & coût</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monteur assigné" className="col-span-2">
              <select
                value={form.editor_id}
                onChange={(e) => {
                  const id = e.target.value;
                  set("editor_id", id);
                  const ed = editors.find((x) => x.id === id);
                  set("editor_name", ed?.display_name ?? "");
                }}
                className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
              >
                <option value="">— Aucun monteur —</option>
                {editors.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.display_name} (@{e.username})
                  </option>
                ))}
              </select>
              {editors.length === 0 && (
                <p className="text-xs text-neutral-500 mt-1.5">
                  Aucun compte monteur actif. Crée-en un dans « Monteurs ».
                </p>
              )}
            </Field>
            <Field label="Tarif">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.editor_rate}
                  onChange={(e) => set("editor_rate", e.target.value)}
                  placeholder="15"
                  className="w-1/2 rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
                />
                <select
                  value={form.editor_rate_type}
                  onChange={(e) => set("editor_rate_type", e.target.value as EditorRateType)}
                  className="w-1/2 rounded-lg bg-neutral-900 border border-white/10 px-2 py-2 text-sm outline-none focus:border-red-500/50"
                >
                  <option value="per_video">/ vidéo</option>
                  <option value="per_minute">/ minute</option>
                </select>
              </div>
            </Field>
            <Field label={form.editor_rate_type === "per_video" ? "Nombre de vidéos" : "Nombre de minutes"}>
              <input
                type="number"
                value={form.editor_quantity}
                onChange={(e) => set("editor_quantity", e.target.value)}
                className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
              />
            </Field>
            <div className="col-span-2 rounded-lg bg-neutral-900/60 border border-white/10 px-4 py-3 text-sm flex items-center justify-between">
              <span className="text-neutral-400">Coût monteur total</span>
              <span className="font-semibold tabular-nums">{fmtEuro(editorTotal)}</span>
            </div>
          </div>
        </div>

        <div className="col-span-2 border-t border-white/10 pt-4">
          <h3 className="text-sm font-semibold text-white mb-3">Facturation & bénéfice</h3>
          <Field label="Montant facturé au client (HT)">
            <input
              type="number"
              value={form.amount_invoiced_ht}
              onChange={(e) => set("amount_invoiced_ht", e.target.value)}
              className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
            />
          </Field>
          <div className="mt-3 rounded-xl border border-white/10 bg-neutral-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">Bénéfice brut HT</span>
              <span className="tabular-nums">{fmtEuro(grossProfit)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">Charges sociales (22%)</span>
              <span className="tabular-nums text-neutral-300">−{fmtEuro(socialCharges)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-sm font-medium text-neutral-300">Bénéfice net</span>
              <span className={`text-2xl font-bold tabular-nums ${netProfit < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {fmtEuro(netProfit)}
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-2 border-t border-white/10 pt-4">
          <Field label="Brief & instructions" className="col-span-2">
            <textarea
              value={form.brief}
              onChange={(e) => set("brief", e.target.value)}
              rows={5}
              placeholder="Ce que veut le client, références, instructions de montage…"
              className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50 resize-y"
            />
          </Field>
        </div>

        <div className="col-span-2 border-t border-white/10 pt-4">
          <h3 className="text-sm font-semibold text-white mb-3">Fichiers</h3>
          <div className="flex items-center justify-between rounded-lg bg-neutral-900/60 border border-white/10 px-4 py-3 mb-3">
            <span className="text-sm text-neutral-300">Rushs reçus</span>
            <button
              type="button"
              onClick={() => set("rushs_received", !form.rushs_received)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.rushs_received ? "bg-red-500" : "bg-neutral-700"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${form.rushs_received ? "translate-x-5" : ""}`}
              />
            </button>
          </div>
          {form.rushs_received && (
            <div className="space-y-2 mb-3">
              {form.rushs_links.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={link}
                    onChange={(e) => {
                      const next = [...form.rushs_links];
                      next[i] = e.target.value;
                      set("rushs_links", next);
                    }}
                    placeholder="https://drive.google.com/… ou https://wetransfer.com/…"
                    className="flex-1 rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => set("rushs_links", form.rushs_links.filter((_, j) => j !== i))}
                    className="rounded-lg p-2 text-neutral-400 hover:text-red-400 hover:bg-white/5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set("rushs_links", [...form.rushs_links, ""])}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm px-3 py-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un lien
              </button>
            </div>
          )}
          <Field label="Drive de livraison finale" className="col-span-2">
            <TextInput value={form.delivery_link} onChange={(v) => set("delivery_link", v)} placeholder="drive.google.com/…" />
          </Field>
          <div className="h-3" />
          <Field label="Lien Frame.io" className="col-span-2">
            <TextInput value={form.revision_link} onChange={(v) => set("revision_link", v)} placeholder="frame.io/…" />
          </Field>
        </div>
      </div>
    </SidePanel>
  );
}

/* ---------------- Detail ---------------- */

function ProjectDetailPanel({
  project,
  client,
  onClose,
  onEdit,
  onChanged,
}: {
  project: Project;
  client: Client | null;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [history, setHistory] = useState<ProjectStatusHistoryItem[]>([]);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [briefOpen, setBriefOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [delText, setDelText] = useState("");

  const q = useWorkspace(project.id);
  const videos = q.data?.videos ?? [];
  const approved = videos.filter((v) => v.status === "Approuvée" || v.status === "Livrée").length;
  const refreshWorkspace = () => q.refetch();

  useEffect(() => {
    getProjectHistory({ data: { id: project.id } })
      .then(setHistory)
      .catch(() => {});
  }, [project.id]);

  const doDelete = async () => {
    if (delText.trim() !== project.title.trim()) {
      toast.error("Le nom saisi ne correspond pas au titre du projet.");
      return;
    }
    setBusy(true);
    try {
      await deleteProject({ data: { id: project.id } });
      logAdminActivity({ data: { kind: "project_delete", message: `Projet supprimé : ${project.title}` } }).catch(() => {});
      toast.success("Projet supprimé");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const doArchive = async () => {
    setBusy(true);
    try {
      const isArchived = !!project.archived_at;
      await archiveProject({ data: { id: project.id, archived: !isArchived } });
      toast.success(isArchived ? "Projet restauré" : "Projet archivé");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };


  const doAutoStatus = async () => {
    setBusy(true);
    try {
      await resetProjectStatusAuto({ data: { id: project.id } });
      toast.success("Statut recalculé automatiquement");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const dl = deadlineStyle(project);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[200] flex flex-col bg-neutral-950"
    >
      <div className="shrink-0 border-b border-white/10 bg-neutral-950/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Projets
          </button>
          <div className="h-6 w-px bg-white/10" />
          <h1 className="truncate text-lg font-semibold text-white">{project.title}</h1>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusBadge[project.status]}`}>
            {project.status}
          </span>
          {project.status_override && (
            <button
              onClick={doAutoStatus}
              disabled={busy}
              title="Le statut est figé manuellement — cliquer pour repasser en automatique"
              className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[11px] text-yellow-300 transition hover:bg-yellow-500/20"
            >
              <RefreshCw className="h-3 w-3" /> Statut manuel — repasser en auto
            </button>
          )}
          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${formatBadge[project.format]}`}>
            {project.format}
          </span>
          <span className={`text-xs ${dl.className}`}>Deadline {dl.label}</span>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </button>
            <button
              onClick={doArchive}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-300 transition hover:bg-white/5"
            >
              {project.archived_at ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  Restaurer
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Archiver
                </>
              )}
            </button>
            <button
              onClick={() => {
                setDelText("");
                setConfirmDel(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          </div>
        </div>
        <div className="mt-3 flex justify-center">
          <ProjectProgress approved={approved} total={videos.length} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-[1600px] space-y-5">
          <section className="rounded-2xl border border-white/10 bg-neutral-900/40">
            <button
              onClick={() => setBriefOpen((v) => !v)}
              className="flex w-full items-center gap-2 px-5 py-3.5 text-left"
            >
              <FileText className="h-4 w-4 text-red-400" />
              <span className="text-sm font-semibold uppercase tracking-wider text-white">
                Brief & Rushs du projet
              </span>
              <ChevronDown
                className={`ml-auto h-4 w-4 text-neutral-400 transition-transform duration-300 ${
                  briefOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {briefOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 px-5 pb-5">
                    <div className="whitespace-pre-wrap rounded-xl border border-white/5 bg-neutral-950/60 px-4 py-3 text-sm leading-relaxed text-neutral-200">
                      {project.brief?.trim() || "Aucun brief pour l'instant."}
                    </div>
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Inbox className="h-4 w-4 text-red-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Rushs
                        </span>
                      </div>
                      {project.rushs_links.length === 0 ? (
                        <p className="text-sm text-neutral-500">Aucun rush déposé.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {project.rushs_links.map((l, i) => (
                            <li key={i} className="rounded-lg border border-white/5 bg-neutral-950/60 px-3 py-2">
                              <RushLink href={l} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {(project.delivery_link || project.revision_link) && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {project.delivery_link && (
                          <div className="rounded-lg border border-white/5 bg-neutral-950/60 px-3 py-2">
                            <div className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">Livraison</div>
                            <LinkOut href={project.delivery_link} />
                          </div>
                        )}
                        {project.revision_link && (
                          <div className="rounded-lg border border-white/5 bg-neutral-950/60 px-3 py-2">
                            <div className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">Frame.io</div>
                            <LinkOut href={project.revision_link} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="rounded-2xl border border-white/10 bg-neutral-900/40">
            <button
              onClick={() => setFinanceOpen((v) => !v)}
              className="flex w-full items-center gap-2 px-5 py-3.5 text-left"
            >
              <Euro className="h-4 w-4 text-red-400" />
              <span className="text-sm font-semibold uppercase tracking-wider text-white">
                Informations & Finance
              </span>
              <ChevronDown
                className={`ml-auto h-4 w-4 text-neutral-400 transition-transform duration-300 ${
                  financeOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {financeOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-4 px-5 pb-5 lg:grid-cols-3">
                    <div className="grid grid-cols-2 gap-3 text-sm lg:col-span-2">
                      <Info label="Client" value={client?.nom_complet ?? "—"} />
                      <Info label="Monteur" value={project.editor_name ?? "—"} />
                      <Info
                        label="Tarif"
                        value={
                          project.editor_rate != null
                            ? `${project.editor_rate} € ${
                                project.editor_rate_type === "per_video" ? "/ vidéo" : "/ minute"
                              }`
                            : "—"
                        }
                      />
                      <Info
                        label="Quantité"
                        value={project.editor_quantity != null ? String(project.editor_quantity) : "—"}
                      />
                      <Info label="Coût monteur" value={fmtEuro(project.editor_total_cost)} />
                      <Info label="Facturé (HT)" value={fmtEuro(project.amount_invoiced_ht)} />
                    </div>
                    <div className="space-y-2 rounded-xl border border-white/10 bg-neutral-900/60 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-400">Bénéfice brut HT</span>
                        <span className="tabular-nums">{fmtEuro(project.gross_profit)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-400">Charges sociales (22%)</span>
                        <span className="tabular-nums text-neutral-300">−{fmtEuro(project.social_charges)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/10 pt-2">
                        <span className="text-sm font-medium text-neutral-300">Bénéfice net</span>
                        <span
                          className={`text-2xl font-bold tabular-nums ${
                            project.net_profit < 0 ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          {fmtEuro(project.net_profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {q.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement du projet…
            </div>
          ) : (
            <ProjectVideosBoard projectId={project.id} role="admin" onRefresh={refreshWorkspace} />
          )}

          <ProjectThread projectId={project.id} />

          <section className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5">
            <h4 className="mb-3 text-xs uppercase tracking-wider text-neutral-500">Historique des statuts</h4>
            {history.length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun changement pour l'instant.</p>
            ) : (
              <ul className="space-y-1.5">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-neutral-950/60 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span>{statusIcon[h.status]}</span>
                      <span className="font-medium">{h.status}</span>
                    </span>
                    <span className="text-xs text-neutral-500">{fmtDateTimeFR(h.changed_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {confirmDel && (
          <div
            className="fixed inset-0 z-[400] grid place-items-center bg-black/75 p-4"
            onClick={() => setConfirmDel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-red-500/30 bg-neutral-900 p-6"
            >
              <div className="mb-3 flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-semibold">Suppression définitive</h3>
              </div>
              <p className="text-sm text-neutral-300">
                Cette action supprimera le projet, ses vidéos, versions et commentaires. Elle est
                irréversible.
              </p>
              <p className="mt-3 text-sm text-neutral-400">
                Pour confirmer, saisis le titre exact du projet :{" "}
                <span className="font-medium text-white">{project.title}</span>
              </p>
              <input
                autoFocus
                value={delText}
                onChange={(e) => setDelText(e.target.value)}
                placeholder="Titre du projet"
                className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDel(false)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-neutral-300 transition hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  onClick={doDelete}
                  disabled={busy || delText.trim() !== project.title.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-40"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Supprimer définitivement
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-900/60 border border-white/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-sm text-white truncate">{value}</div>
    </div>
  );
}

function LinkOut({ href }: { href: string }) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-red-300 hover:text-red-200 break-all"
    >
      <LinkIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{href}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
    </a>
  );
}
function ProjectThread({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getProjectThread>> | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    getProjectThread({ data: { id: projectId } })
      .then(setData)
      .catch(() => {});
  };

  useEffect(load, [projectId]);

  const send = async () => {
    if (!message.trim() || busy) return;
    setBusy(true);
    try {
      await postAdminComment({ data: { project_id: projectId, content: message.trim() } });
      setMessage("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const remove = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteProjectComment({ data: { comment_id: id } });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">COMMENTAIRES & RETOURS SUR LE PROJET</h4>
        <div className="space-y-2 mb-2">
          {!data || data.comments.length === 0 ? (
            <p className="text-sm text-neutral-500">Aucun commentaire.</p>
          ) : (
            data.comments.map((c) => (
              <div
                key={c.id}
                className={`group rounded-xl px-3 py-2.5 border ${
                  c.author_type === "admin" ? "bg-red-500/10 border-red-500/20" : "bg-white/[0.03] border-white/10"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-white">{c.author_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-500">{fmt(c.created_at)}</span>
                    <button
                      onClick={() => remove(c.id)}
                      title="Supprimer ce retour"
                      className="rounded-full p-1 text-neutral-500 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-neutral-200 whitespace-pre-wrap">{c.content}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Laisser un retour au monteur…"
            className="flex-1 rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
          />
          <button
            onClick={send}
            disabled={busy}
            className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-sm text-white transition disabled:opacity-60"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
