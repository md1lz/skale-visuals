import { Plus, Trash2 } from "lucide-react";
import { docTotals, formatEUR, lineTotals, type DocLine, type Prestation } from "@/lib/billing.shared";

export function downloadPdf(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const emptyLine = (): DocLine => ({
  prestation_id: null,
  label: "",
  quantity: 1,
  unit_price_ht: 0,
  tva_rate: 0,
});

export function DocLinesEditor({
  lines,
  onChange,
  prestations,
}: {
  lines: DocLine[];
  onChange: (lines: DocLine[]) => void;
  prestations: Prestation[];
}) {
  const totals = docTotals(lines);

  function patch(i: number, next: Partial<DocLine>) {
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...next } : l)));
  }

  return (
    <div className="space-y-3">
      {prestations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {prestations.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                onChange([
                  ...lines,
                  {
                    prestation_id: p.id,
                    label: p.label,
                    quantity: 1,
                    unit_price_ht: p.price_ht,
                    tva_rate: p.tva_rate,
                  },
                ])
              }
              className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-neutral-300 transition hover:border-red-500/50 hover:text-white"
            >
              + {p.label} · {formatEUR(p.price_ht)}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="flex gap-2">
              <input
                value={l.label}
                onChange={(e) => patch(i, { label: e.target.value, prestation_id: null })}
                placeholder="Désignation"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onChange(lines.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded-lg border border-white/10 p-2 text-red-400 transition hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-500">Qté</span>
                <input
                  type="number"
                  step="0.5"
                  value={l.quantity}
                  onChange={(e) => patch(i, { quantity: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/10 bg-neutral-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-500">PU HT</span>
                <input
                  type="number"
                  step="0.01"
                  value={l.unit_price_ht}
                  onChange={(e) => patch(i, { unit_price_ht: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/10 bg-neutral-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-500">TVA %</span>
                <input
                  type="number"
                  step="0.1"
                  value={l.tva_rate}
                  onChange={(e) => patch(i, { tva_rate: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/10 bg-neutral-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </label>
              <div>
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-500">Total HT</span>
                <p className="px-2 py-1.5 text-sm font-semibold text-white">
                  {formatEUR(lineTotals(l).ht)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...lines, emptyLine()])}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-300 transition hover:bg-white/5"
      >
        <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
      </button>

      <div className="space-y-1 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
        <div className="flex justify-between text-neutral-400">
          <span>Total HT</span>
          <span>{formatEUR(totals.ht)}</span>
        </div>
        <div className="flex justify-between text-neutral-400">
          <span>TVA</span>
          <span>{formatEUR(totals.tva)}</span>
        </div>
        <div className="flex justify-between font-semibold text-white">
          <span>Total TTC</span>
          <span>{formatEUR(totals.ttc)}</span>
        </div>
      </div>
    </div>
  );
}
