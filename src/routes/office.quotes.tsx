import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Download,
  FileSignature,
  Link2,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import {
  convertQuoteToInvoice,
  deleteQuote,
  duplicateQuote,
  listPrestations,
  listQuotes,
  quotePdf,
  saveQuote,
  sendQuote,
  setQuoteStatus,
} from "@/lib/billing.functions";
import { listClients } from "@/lib/admin-clients.functions";
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_STYLE,
  docTotals,
  formatDateFR,
  formatEUR,
  type DocLine,
  type Quote,
  type QuoteStatus,
} from "@/lib/billing.shared";
import { DocLinesEditor, downloadPdf, emptyLine } from "@/components/DocLinesEditor";

export const Route = createFileRoute("/office/quotes")({ component: QuotesPage });

function QuotesPage() {
  const fetchQuotes = useServerFn(listQuotes);
  const fetchPrestations = useServerFn(listPrestations);
  const fetchClients = useServerFn(listClients);
  const removeQuote = useServerFn(deleteQuote);
  const duplicate = useServerFn(duplicateQuote);
  const send = useServerFn(sendQuote);
  const pdf = useServerFn(quotePdf);
  const convert = useServerFn(convertQuoteToInvoice);
  const changeStatus = useServerFn(setQuoteStatus);

  const quotes = useQuery({ queryKey: ["office", "quotes"], queryFn: () => fetchQuotes(), initialData: [] });
  const prestations = useQuery({
    queryKey: ["office", "prestations"],
    queryFn: () => fetchPrestations(),
    initialData: [],
  });
  const clients = useQuery({
    queryKey: ["office", "clients"],
    queryFn: () => fetchClients(),
    initialData: [],
  });

  const [editing, setEditing] = useState<Quote | "new" | null>(null);
  const [filter, setFilter] = useState<QuoteStatus | "Tous">("Tous");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rows = quotes.data.filter((q) => filter === "Tous" || q.status === filter);
  const signedTotal = quotes.data
    .filter((q) => q.status === "Signé")
    .reduce((s, q) => s + q.total_ttc, 0);
  const pendingTotal = quotes.data
    .filter((q) => q.status === "Envoyé")
    .reduce((s, q) => s + q.total_ttc, 0);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await fn();
      quotes.refetch();
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
          <h1 className="text-3xl font-semibold tracking-tight">Devis</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Création, envoi par email et signature électronique.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500"
        >
          <Plus className="h-4 w-4" /> Nouveau devis
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Devis signés" value={formatEUR(signedTotal)} hint={`${quotes.data.filter((q) => q.status === "Signé").length} devis`} />
        <Kpi label="En attente de signature" value={formatEUR(pendingTotal)} hint={`${quotes.data.filter((q) => q.status === "Envoyé").length} devis`} />
        <Kpi label="Total émis" value={String(quotes.data.length)} hint="tous statuts" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["Tous", ...QUOTE_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as QuoteStatus | "Tous")}
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
          {rows.map((q) => (
            <motion.article
              key={q.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm text-white">{q.number}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${QUOTE_STATUS_STYLE[q.status]}`}>
                      {q.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-300">{q.client_name ?? "Client non défini"}</p>
                  <p className="text-[11px] text-neutral-500">
                    Émis le {formatDateFR(q.created_at)}
                    {q.valid_until ? ` · valable jusqu'au ${formatDateFR(q.valid_until)}` : ""}
                    {q.signed_at ? ` · signé par ${q.signer_name} le ${formatDateFR(q.signed_at)}` : ""}
                  </p>
                </div>
                <p className="text-lg font-semibold text-white">{formatEUR(q.total_ttc)}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Action icon={Pencil} label="Modifier" onClick={() => setEditing(q)} />
                <Action
                  icon={Mail}
                  label="Envoyer"
                  busy={busyId === q.id}
                  onClick={() =>
                    run(q.id, async () => {
                      await send({ data: { id: q.id } });
                      flash(`Devis ${q.number} envoyé par email.`);
                    })
                  }
                />
                <Action
                  icon={Link2}
                  label="Lien de signature"
                  onClick={() => {
                    const url = `${window.location.origin}/sign/${q.sign_token}`;
                    navigator.clipboard?.writeText(url);
                    flash("Lien de signature copié.");
                  }}
                />
                <Action
                  icon={Download}
                  label="PDF"
                  busy={busyId === q.id}
                  onClick={() =>
                    run(q.id, async () => {
                      const res = await pdf({ data: { id: q.id } });
                      downloadPdf(res.base64, res.filename);
                    })
                  }
                />
                <Action
                  icon={Copy}
                  label="Dupliquer"
                  onClick={() => run(q.id, () => duplicate({ data: { id: q.id } }))}
                />
                {q.status === "Signé" && !q.invoiced && (
                  <Action
                    icon={Receipt}
                    label="Convertir en facture"
                    onClick={() =>
                      run(q.id, async () => {
                        await convert({ data: { id: q.id } });
                        flash("Facture créée depuis le devis.");
                      })
                    }
                  />
                )}
                {q.status === "Envoyé" && (
                  <Action
                    icon={FileSignature}
                    label="Marquer refusé"
                    onClick={() => run(q.id, () => changeStatus({ data: { id: q.id, status: "Refusé" } }))}
                  />
                )}
                {q.status === "Brouillon" && (
                  <Action
                    icon={Trash2}
                    label="Supprimer"
                    danger
                    onClick={() => {
                      if (confirm(`Supprimer le devis ${q.number} ?`)) {
                        run(q.id, () => removeQuote({ data: { id: q.id } }));
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
          Aucun devis {filter !== "Tous" ? `« ${filter} »` : ""} pour l'instant.
        </p>
      )}

      {editing && (
        <QuoteModal
          value={editing === "new" ? null : editing}
          clients={clients.data}
          prestations={prestations.data}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            quotes.refetch();
          }}
        />
      )}

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

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
      <p className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      {hint && <p className="text-[11px] text-neutral-500">{hint}</p>}
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

function QuoteModal({
  value,
  clients,
  prestations,
  onClose,
  onSaved,
}: {
  value: Quote | null;
  clients: Array<{ id: string; nom_complet: string; entreprise: string | null }>;
  prestations: Array<any>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useServerFn(saveQuote);
  const [clientId, setClientId] = useState(value?.client_id ?? "");
  const [status, setStatus] = useState<QuoteStatus>(value?.status ?? "Brouillon");
  const [validUntil, setValidUntil] = useState(value?.valid_until ?? "");
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
          client_id: clientId || null,
          status,
          valid_until: validUntil || null,
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
          {value ? `Modifier ${value.number}` : "Nouveau devis"}
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] text-neutral-400">Client</span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            >
              <option value="">— Sélectionner —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom_complet}
                  {c.entreprise ? ` · ${c.entreprise}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-neutral-400">Statut</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as QuoteStatus)}
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            >
              {QUOTE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Valable jusqu'au</span>
          <input
            type="date"
            value={validUntil ?? ""}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          />
        </label>

        <DocLinesEditor lines={lines} onChange={setLines} prestations={prestations} />

        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Conditions</span>
          <textarea
            value={conditions ?? ""}
            onChange={(e) => setConditions(e.target.value)}
            rows={2}
            placeholder="Devis valable 30 jours. Acompte de 30 % à la signature."
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
            {busy ? "Enregistrement…" : `Enregistrer · ${formatEUR(docTotals(lines).ttc)}`}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
