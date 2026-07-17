import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Loader2, Trash2, Pencil, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  listClients,
  upsertClient,
  deleteClient,
  type Client,
  type ClientStatut,
} from "@/lib/admin-clients.functions";

export const Route = createFileRoute("/admin/clients")({ component: AdminClientsPage });

const STATUTS: ClientStatut[] = ["Prospect", "Actif", "En pause", "Terminé", "Archivé"];

const statutBadge: Record<ClientStatut, string> = {
  Prospect: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  Actif: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "En pause": "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  Terminé: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
  Archivé: "bg-neutral-700/20 text-neutral-400 border-neutral-700/40",
};

type SortKey = "created_desc" | "created_asc" | "name_asc" | "name_desc";

function AdminClientsPage() {
  const [rows, setRows] = useState<Client[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statutFilter, setStatutFilter] = useState<"all" | ClientStatut>("all");
  const [sort, setSort] = useState<SortKey>("created_desc");
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const [detail, setDetail] = useState<Client | null>(null);

  const refresh = async () => {
    try {
      const data = await listClients();
      setRows(data);
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
    if (statutFilter !== "all") list = list.filter((r) => r.statut === statutFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.nom_complet.toLowerCase().includes(s) ||
          (r.entreprise ?? "").toLowerCase().includes(s),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "created_asc":
          return a.created_at.localeCompare(b.created_at);
        case "name_asc":
          return a.nom_complet.localeCompare(b.nom_complet, "fr");
        case "name_desc":
          return b.nom_complet.localeCompare(a.nom_complet, "fr");
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
    return sorted;
  }, [rows, q, statutFilter, sort]);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Gère tes fiches clients : création, suivi, notes internes.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 transition-colors shadow-lg shadow-red-600/20"
        >
          <Plus className="h-4 w-4" /> Ajouter un client
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un nom ou une entreprise…"
            className="w-full rounded-lg bg-neutral-900/60 border border-white/10 pl-9 pr-3 py-2 text-sm outline-none focus:border-red-500/50"
          />
        </div>
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value as "all" | ClientStatut)}
          className="rounded-lg bg-neutral-900/60 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
        >
          <option value="all">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg bg-neutral-900/60 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
        >
          <option value="created_desc">Plus récent</option>
          <option value="created_asc">Plus ancien</option>
          <option value="name_asc">Nom A→Z</option>
          <option value="name_desc">Nom Z→A</option>
        </select>
      </div>

      <div className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1.2fr_1.1fr_0.9fr] gap-3 px-4 py-3 text-xs uppercase tracking-wider text-neutral-500 border-b border-white/10">
          <span>Nom</span>
          <span>Entreprise</span>
          <span>Instagram</span>
          <span>Statut</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            <Loader2 className="h-5 w-5 mx-auto animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            {rows && rows.length === 0
              ? "Aucun client pour l'instant. Ajoutes-en un !"
              : "Aucun résultat."}
          </div>
        ) : (
          <ul>
            {filtered.map((c) => (
              <li
                key={c.id}
                onClick={() => setDetail(c)}
                className="grid grid-cols-[1.4fr_1.2fr_1.1fr_0.9fr] gap-3 px-4 py-3 items-center text-sm border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <span className="font-medium truncate">{c.nom_complet}</span>
                <span className="text-neutral-300 truncate">{c.entreprise ?? "—"}</span>
                <span className="text-neutral-300 truncate">{c.reseaux_sociaux ?? "—"}</span>
                <span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statutBadge[c.statut]}`}
                  >
                    {c.statut}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AnimatePresence>
        {detail && !editing && (
          <ClientDetailPanel
            client={detail}
            onClose={() => setDetail(null)}
            onEdit={() => setEditing(detail)}
            onDeleted={() => {
              setDetail(null);
              refresh();
            }}
          />
        )}
        {editing && (
          <ClientFormPanel
            initial={editing === "new" ? null : editing}
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

function formatDate(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR");
  } catch {
    return d;
  }
}

function formatDateTime(d: string): string {
  try {
    return new Date(d).toLocaleString("fr-FR");
  } catch {
    return d;
  }
}

/* ---------------- Side panel primitive ---------------- */

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
        className="absolute top-0 right-0 h-full w-full max-w-xl bg-neutral-950 border-l border-white/10 flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="border-t border-white/10 px-6 py-4 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </motion.aside>
    </motion.div>
  );
}

/* ---------------- Form panel ---------------- */

type FormState = {
  nom_complet: string;
  entreprise: string;
  email: string;
  telephone: string;
  statut: ClientStatut;
  type_projet: string;
  budget: string;
  date_debut: string;
  date_fin: string;
  lien_drive: string;
  reseaux_sociaux: string;
  notes: string;
};

function toForm(c: Client | null): FormState {
  return {
    nom_complet: c?.nom_complet ?? "",
    entreprise: c?.entreprise ?? "",
    email: c?.email ?? "",
    telephone: c?.telephone ?? "",
    statut: c?.statut ?? "Prospect",
    type_projet: c?.type_projet ?? "",
    budget: c?.budget != null ? String(c.budget) : "",
    date_debut: c?.date_debut ?? "",
    date_fin: c?.date_fin ?? "",
    lien_drive: c?.lien_drive ?? "",
    reseaux_sociaux: c?.reseaux_sociaux ?? "",
    notes: c?.notes ?? "",
  };
}

function ClientFormPanel({
  initial,
  onClose,
  onSaved,
}: {
  initial: Client | null;
  onClose: () => void;
  onSaved: (c: Client) => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.nom_complet.trim()) {
      toast.error("Le nom est obligatoire.");
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Email invalide.");
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertClient({
        data: {
          id: initial?.id ?? null,
          nom_complet: form.nom_complet.trim(),
          entreprise: form.entreprise,
          email: form.email,
          telephone: form.telephone,
          statut: form.statut,
          type_projet: form.type_projet,
          budget: form.budget,
          date_debut: form.date_debut,
          date_fin: form.date_fin,
          lien_drive: form.lien_drive,
          reseaux_sociaux: form.reseaux_sociaux,
          notes: form.notes,
        },
      });
      toast.success(initial ? "Client mis à jour" : "Client créé");
      onSaved(saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel
      title={initial ? "Modifier le client" : "Nouveau client"}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm text-neutral-300 hover:bg-white/5"
          >
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
        <Field label="Nom complet *" className="col-span-2">
          <TextInput value={form.nom_complet} onChange={(v) => set("nom_complet", v)} />
        </Field>
        <Field label="Entreprise">
          <TextInput value={form.entreprise} onChange={(v) => set("entreprise", v)} />
        </Field>
        <Field label="Statut">
          <select
            value={form.statut}
            onChange={(e) => set("statut", e.target.value as ClientStatut)}
            className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50"
          >
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Email">
          <TextInput type="email" value={form.email} onChange={(v) => set("email", v)} />
        </Field>
        <Field label="Téléphone">
          <TextInput value={form.telephone} onChange={(v) => set("telephone", v)} />
        </Field>
        <Field label="Type de projet">
          <TextInput
            value={form.type_projet}
            onChange={(v) => set("type_projet", v)}
            placeholder="Vidéo YouTube, Publicité…"
          />
        </Field>
        <Field label="Budget (€)">
          <TextInput
            type="number"
            value={form.budget}
            onChange={(v) => set("budget", v)}
            placeholder="0"
          />
        </Field>
        <Field label="Date de début">
          <TextInput type="date" value={form.date_debut} onChange={(v) => set("date_debut", v)} />
        </Field>
        <Field label="Date de fin">
          <TextInput type="date" value={form.date_fin} onChange={(v) => set("date_fin", v)} />
        </Field>
        <Field label="Lien Drive" className="col-span-2">
          <TextInput
            value={form.lien_drive}
            onChange={(v) => set("lien_drive", v)}
            placeholder="https://drive.google.com/…"
          />
        </Field>
        <Field label="Réseaux sociaux" className="col-span-2">
          <TextInput
            value={form.reseaux_sociaux}
            onChange={(v) => set("reseaux_sociaux", v)}
            placeholder="@handle, liens…"
          />
        </Field>
        <Field label="Notes internes" className="col-span-2">
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={5}
            className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-red-500/50 resize-y"
          />
        </Field>
      </div>
    </SidePanel>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
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

/* ---------------- Detail panel ---------------- */

function ClientDetailPanel({
  client,
  onClose,
  onEdit,
  onDeleted,
}: {
  client: Client;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deleteClient({ data: { id: client.id } });
      toast.success("Client supprimé");
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SidePanel
      title={client.nom_complet}
      onClose={onClose}
      footer={
        <>
          {confirmDel ? (
            <>
              <button
                onClick={() => setConfirmDel(false)}
                disabled={deleting}
                className="rounded-lg px-4 py-2 text-sm text-neutral-300 hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                onClick={doDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer la suppression
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmDel(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-600/40 text-red-400 hover:bg-red-600/10 text-sm px-3 py-2"
              >
                <Trash2 className="h-4 w-4" /> Supprimer
              </button>
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2"
              >
                <Pencil className="h-4 w-4" /> Modifier
              </button>
            </>
          )}
        </>
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${statutBadge[client.statut]}`}
        >
          {client.statut}
        </span>
        {client.entreprise && (
          <span className="text-sm text-neutral-400">{client.entreprise}</span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Info label="Email" value={client.email} />
        <Info label="Téléphone" value={client.telephone} />
        <Info label="Type de projet" value={client.type_projet} />
        <Info
          label="Budget"
          value={client.budget != null ? `${client.budget.toLocaleString("fr-FR")} €` : null}
        />
        <Info label="Date de début" value={formatDate(client.date_debut)} />
        <Info label="Date de fin" value={formatDate(client.date_fin)} />
        <InfoLink label="Lien Drive" value={client.lien_drive} />
        <Info label="Réseaux sociaux" value={client.reseaux_sociaux} />
      </dl>

      {client.notes && (
        <div className="mt-6">
          <p className="text-xs font-medium text-neutral-400 mb-1.5">Notes</p>
          <div className="whitespace-pre-wrap text-sm rounded-lg border border-white/10 bg-neutral-900/60 p-3">
            {client.notes}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-white/10 text-xs text-neutral-500 space-y-1">
        <p>Créé le {formatDateTime(client.created_at)}</p>
        <p>Dernière modification le {formatDateTime(client.updated_at)}</p>
      </div>
    </SidePanel>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-neutral-200">{value && value.length > 0 ? value : "—"}</dd>
    </div>
  );
}

function InfoLink({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="col-span-2">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-neutral-200 truncate">
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
          >
            {value} <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}