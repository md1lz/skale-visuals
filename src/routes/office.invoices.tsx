import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  Ban,
  ChevronDown,
  CircleDot,
  Download,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteInvoice,
  invoiceDocument,
  listInvoices,
  listPrestations,
  markInvoicePaid,
  saveInvoice,
  setInvoiceStatus,
} from "@/lib/billing.functions";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_STYLE,
  docTotals,
  formatDateFR,
  formatEUR,
  type DocLine,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/billing.shared";
import { DocLinesEditor, emptyLine } from "@/components/DocLinesEditor";
import { Field } from "@/routes/office.quotes";
import { DocumentPaper, downloadDocumentPdf } from "@/components/DocumentPaper";
import { useAdminPrefs } from "@/components/admin-prefs";

export const Route = createFileRoute("/office/invoices")({ component: InvoicesPage });

const today = () => new Date().toISOString().slice(0, 10);

function InvoicesPage() {
  const fetchInvoices = useServerFn(listInvoices);
  const fetchPrestations = useServerFn(listPrestations);
  const remove = useServerFn(deleteInvoice);
  const loadDoc = useServerFn(invoiceDocument);
  const paid = useServerFn(markInvoicePaid);
  const changeStatus = useServerFn(setInvoiceStatus);

  const invoices = useQuery({
    queryKey: ["office", "invoices"],
    queryFn: () => fetchInvoices(),
    initialData: [],
  });
  const prestations = useQuery({
    queryKey: ["office", "prestations"],
    queryFn: () => fetchPrestations(),
    initialData: [],
  });

  const [editing, setEditing] = useState<Invoice | "new" | null>(null);
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState<InvoiceStatus | "Tous">("Tous");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rows = invoices.data.filter((i) => filter === "Tous" || i.status === filter);
  const sum = (s: InvoiceStatus) =>
    invoices.data.filter((i) => i.status === s).reduce((acc, i) => acc + i.total_ttc, 0);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await fn();
      invoices.refetch();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-6 md:px-8 md:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Factures</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Émission, envoi et suivi des paiements.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500"
        >
          <Plus className="h-4 w-4" /> Nouvelle facture
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Encaissé" value={formatEUR(sum("Payée"))} />
        <Kpi label="En attente" value={formatEUR(sum("Envoyée"))} />
        <Kpi label="En retard" value={formatEUR(sum("En retard"))} danger />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["Tous", ...INVOICE_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as InvoiceStatus | "Tous")}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              filter === s ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((inv) => (
            <motion.article
              key={inv.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm text-white">{inv.number}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${INVOICE_STATUS_STYLE[inv.status]}`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-300">
                    {inv.client_name ?? "Client non défini"}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Émise le {formatDateFR(inv.issued_at)}
                    {inv.due_at ? ` · échéance ${formatDateFR(inv.due_at)}` : ""}
                    {inv.paid_at ? ` · payée le ${formatDateFR(inv.paid_at)}` : ""}
                  </p>
                </div>
                <p className="text-lg font-semibold text-white">{formatEUR(inv.total_ttc)}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Action icon={Eye} label="Aperçu" onClick={() => setPreview(inv)} />
                {inv.status === "Brouillon" && (
                  <Action icon={Pencil} label="Modifier" onClick={() => setEditing(inv)} />
                )}
                <StatusSelect
                  value={inv.status}
                  options={INVOICE_STATUSES.filter((s) => s !== "En retard")}
                  onChange={(next) =>
                    run(inv.id, () => changeStatus({ data: { id: inv.id, status: next } }))
                  }
                />
                <Action
                  icon={Download}
                  label="PDF"
                  busy={busyId === inv.id}
                  onClick={() =>
                    run(inv.id, async () => {
                      const bundle = await loadDoc({ data: { id: inv.id } });
                      await downloadDocumentPdf(bundle.doc, bundle.settings);
                    })
                  }
                />
                {inv.status !== "Payée" && inv.status !== "Annulée" && (
                  <Action icon={BadgeCheck} label="Marquer payée" onClick={() => setPayFor(inv)} />
                )}
                {inv.status !== "Annulée" && inv.status !== "Payée" && (
                  <Action
                    icon={Ban}
                    label="Annuler"
                    onClick={() =>
                      run(inv.id, () => changeStatus({ data: { id: inv.id, status: "Annulée" } }))
                    }
                  />
                )}
                {inv.status === "Brouillon" && (
                  <Action
                    icon={Trash2}
                    label="Supprimer"
                    danger
                    onClick={() => {
                      if (confirm(`Supprimer la facture ${inv.number} ?`)) {
                        run(inv.id, () => remove({ data: { id: inv.id } }));
                      }
                    }}
                  />
                )}
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      {rows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-neutral-500">
          Aucune facture {filter !== "Tous" ? `« ${filter} »` : ""} pour l'instant.
        </p>
      )}

      {editing && (
        <InvoiceModal
          value={editing === "new" ? null : editing}
          prestations={prestations.data}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invoices.refetch();
          }}
        />
      )}

      {payFor && (
        <PaymentModal
          invoice={payFor}
          onClose={() => setPayFor(null)}
          onSaved={async (date, amount) => {
            await paid({ data: { id: payFor.id, paid_at: date, paid_amount: amount } });
            setPayFor(null);
            invoices.refetch();
          }}
        />
      )}

      <AnimatePresence>
        {preview && (
          <InvoicePreview
            invoice={preview}
            onClose={() => setPreview(null)}
            onEdit={() => {
              setEditing(preview);
              setPreview(null);
            }}
            onDelete={() => {
              if (!confirm(`Supprimer la facture ${preview.number} ?`)) return;
              const id = preview.id;
              setPreview(null);
              run(id, () => remove({ data: { id } }));
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-[130] -translate-x-1/2 rounded-full border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm text-white shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InvoicePreview({
  invoice,
  onClose,
  onEdit,
  onDelete,
}: {
  invoice: Invoice;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const loadDoc = useServerFn(invoiceDocument);
  const { mode } = useAdminPrefs();
  const [downloading, setDownloading] = useState(false);

  const bundle = useQuery({
    queryKey: ["office", "invoice-doc", invoice.id],
    queryFn: () => loadDoc({ data: { id: invoice.id } }),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[125] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="mx-auto my-6 w-full max-w-3xl space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-neutral-900/80 p-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${INVOICE_STATUS_STYLE[invoice.status]}`}
            >
              {invoice.status}
            </span>
            <span className="truncate text-sm text-neutral-300">
              {invoice.client_name ?? "Client non défini"}
            </span>
            <span className="text-sm font-semibold text-white">{formatEUR(invoice.total_ttc)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {invoice.status === "Brouillon" && (
              <Action icon={Pencil} label="Modifier" onClick={onEdit} />
            )}
            <Action
              icon={Download}
              label="PDF"
              busy={downloading || bundle.isLoading}
              onClick={async () => {
                if (!bundle.data) return;
                setDownloading(true);
                try {
                  await downloadDocumentPdf(bundle.data.doc, bundle.data.settings);
                } finally {
                  setDownloading(false);
                }
              }}
            />
            {invoice.status === "Brouillon" && (
              <Action icon={Trash2} label="" danger onClick={onDelete} />
            )}
            <Action icon={X} label="" onClick={onClose} />
          </div>
        </div>

        {bundle.isLoading || !bundle.data ? (
          <div className="grid h-64 place-items-center rounded-2xl border border-white/10 bg-neutral-900/50">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
          </div>
        ) : (
          <DocumentPaper doc={bundle.data.doc} settings={bundle.data.settings} dark={mode === "dark"} />
        )}
      </motion.div>
    </motion.div>
  );
}

function Kpi({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
      <p className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${danger ? "text-red-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
  busy,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs transition disabled:opacity-60 ${
        danger ? "text-red-400 hover:bg-red-500/10" : "text-neutral-300 hover:bg-white/5"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function PaymentModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSaved: (date: string, amount: number) => Promise<void>;
}) {
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState(String(invoice.total_ttc));
  const [busy, setBusy] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          await onSaved(date, Number(amount));
          setBusy(false);
        }}
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-white">Encaisser {invoice.number}</h2>
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Date de paiement</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Montant encaissé (€)</span>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          />
        </label>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 transition hover:bg-white/5"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-70"
          >
            {busy ? "…" : "Confirmer"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function InvoiceModal({
  value,
  prestations,
  onClose,
  onSaved,
}: {
  value: Invoice | null;
  prestations: Array<any>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useServerFn(saveInvoice);
  const [clientName, setClientName] = useState(value?.client_name ?? "");
  const [clientCompany, setClientCompany] = useState(value?.client_company ?? "");
  const [clientSiret, setClientSiret] = useState(value?.client_siret ?? "");
  const [clientEmail, setClientEmail] = useState(value?.client_email ?? "");
  const [clientAddress, setClientAddress] = useState(value?.client_address ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(
    value && value.status !== "En retard" ? value.status : "Brouillon",
  );
  const [issuedAt, setIssuedAt] = useState(value?.issued_at ?? today());
  const [dueAt, setDueAt] = useState(value?.due_at ?? "");
  const [notes, setNotes] = useState(value?.notes ?? "");
  const [conditions, setConditions] = useState(value?.conditions ?? "");
  const [lines, setLines] = useState<DocLine[]>(value?.lines?.length ? value.lines : [emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await save({
        data: {
          id: value?.id ?? null,
          client_id: value?.client_id ?? null,
          client_name: clientName.trim() || null,
          client_company: clientCompany.trim() || null,
          client_siret: clientSiret.trim() || null,
          client_email: clientEmail.trim() || null,
          client_address: clientAddress.trim() || null,
          status,
          issued_at: issuedAt,
          due_at: dueAt || null,
          notes,
          conditions,
          lines,
        },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 250, damping: 24 }}
        className="my-6 w-full max-w-2xl space-y-4 rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-white">
          {value ? `Modifier ${value.number}` : "Nouvelle facture"}
        </h2>

        <div className="space-y-3 rounded-xl border border-white/10 bg-neutral-900/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-neutral-500">Client</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom du client" value={clientName} onChange={setClientName} placeholder="Jean Dupont" />
            <Field label="Entreprise" value={clientCompany} onChange={setClientCompany} placeholder="Dupont SAS" />
            <Field label="SIRET" value={clientSiret} onChange={setClientSiret} placeholder="123 456 789 00012" />
            <Field label="Email" value={clientEmail} onChange={setClientEmail} placeholder="jean@exemple.com" />
          </div>
          <Field label="Adresse" value={clientAddress} onChange={setClientAddress} placeholder="12 rue…, 75000 Paris" />
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Statut</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
            className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          >
            {INVOICE_STATUSES.filter((s) => s !== "En retard").map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] text-neutral-400">Date d'émission</span>
            <input
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-neutral-400">Échéance</span>
            <input
              type="date"
              value={dueAt ?? ""}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            />
          </label>
        </div>

        <DocLinesEditor lines={lines} onChange={setLines} prestations={prestations} />

        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Conditions de paiement</span>
          <textarea
            value={conditions ?? ""}
            onChange={(e) => setConditions(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Notes internes</span>
          <textarea
            value={notes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          />
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 transition hover:bg-white/5"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-70"
          >
            {busy ? "Enregistrement…" : `Enregistrer · ${formatEUR(docTotals(lines).total_ttc)}`}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function StatusSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="appearance-none rounded-lg border border-white/10 bg-transparent py-1.5 pl-7 pr-6 text-xs text-neutral-300 transition hover:bg-white/5 focus:border-red-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-neutral-900 text-white">
            {o}
          </option>
        ))}
      </select>
      <CircleDot className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-neutral-400" />
      <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-neutral-500" />
    </div>
  );
}
