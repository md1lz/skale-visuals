import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  deletePrestation,
  listPrestations,
  upsertPrestation,
} from "@/lib/billing.functions";
import { formatEUR, type Prestation } from "@/lib/billing.shared";

export const Route = createFileRoute("/office/services")({ component: ServicesPage });

function ServicesPage() {
  const fetchList = useServerFn(listPrestations);
  const remove = useServerFn(deletePrestation);
  const q = useQuery({ queryKey: ["office", "prestations"], queryFn: () => fetchList(), initialData: [] });
  const [editing, setEditing] = useState<Prestation | "new" | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-16 pt-6 md:px-8 md:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Prestations</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Catalogue réutilisable dans les devis et les factures.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500"
        >
          <Plus className="h-4 w-4" /> Nouvelle prestation
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {q.data.map((p) => (
            <motion.article
              key={p.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-500/15 text-red-400">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{p.label}</p>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-neutral-400">{p.description}</p>
                  )}
                  <p className="mt-2 text-sm font-semibold text-white">
                    {formatEUR(p.price_ht)} HT
                    <span className="ml-2 text-[11px] font-normal text-neutral-500">
                      TVA {p.tva_rate}%
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditing(p)}
                    className="rounded-lg border border-white/10 p-2 text-neutral-300 transition hover:bg-white/5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Supprimer « ${p.label} » ?`)) return;
                      await remove({ data: { id: p.id } });
                      q.refetch();
                    }}
                    className="rounded-lg border border-white/10 p-2 text-red-400 transition hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      {q.data.length === 0 && (
        <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-neutral-500">
          Aucune prestation pour l'instant.
        </p>
      )}

      {editing && (
        <PrestationModal
          value={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            q.refetch();
          }}
        />
      )}
    </div>
  );
}

function PrestationModal({
  value,
  onClose,
  onSaved,
}: {
  value: Prestation | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useServerFn(upsertPrestation);
  const [label, setLabel] = useState(value?.label ?? "");
  const [description, setDescription] = useState(value?.description ?? "");
  const [price, setPrice] = useState(String(value?.price_ht ?? 25));
  const [tva, setTva] = useState(String(value?.tva_rate ?? 0));
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
          label,
          description,
          price_ht: Number(price),
          tva_rate: Number(tva),
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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-white">
          {value ? "Modifier la prestation" : "Nouvelle prestation"}
        </h2>
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Intitulé</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Montage vidéo format court"
            className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">Description (optionnelle)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] text-neutral-400">Prix HT (€)</span>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-neutral-400">TVA (%)</span>
            <input
              type="number"
              step="0.1"
              value={tva}
              onChange={(e) => setTva(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
            />
          </label>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
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
            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-70"
          >
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
