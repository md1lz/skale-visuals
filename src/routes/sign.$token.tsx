import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Eraser, FileSignature, Loader2, ShieldCheck } from "lucide-react";
import { getQuoteForSigning, signQuote } from "@/lib/billing-public.functions";
import { docTotals, formatDateFR, formatEUR, lineTotals } from "@/lib/billing.shared";

export const Route = createFileRoute("/sign/$token")({
  head: () => ({
    meta: [
      { title: "Signature de devis — Skale Visuals" },
      {
        name: "description",
        content:
          "Consultez et signez électroniquement votre devis Skale Visuals en quelques secondes.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Signature de devis — Skale Visuals" },
      {
        property: "og:description",
        content: "Consultez et signez électroniquement votre devis Skale Visuals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignPage,
});

function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a0a0a";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current && canvasRef.current) onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    onChange(null);
  }, [onChange]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-40 w-full touch-none rounded-2xl border border-dashed border-neutral-300 bg-white"
      />
      <button
        type="button"
        onClick={clear}
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-neutral-500 transition hover:text-neutral-900"
      >
        <Eraser className="h-3.5 w-3.5" /> Effacer la signature
      </button>
    </div>
  );
}

function SignPage() {
  const { token } = Route.useParams();
  const load = useServerFn(getQuoteForSigning);
  const submit = useServerFn(signQuote);

  const q = useQuery({
    queryKey: ["sign", token],
    queryFn: () => load({ data: { token } }),
  });

  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-50 text-neutral-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!q.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-50 px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Devis introuvable</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Ce lien de signature n'est plus valide. Contactez-nous à contact@skalevisuals.com.
          </p>
        </div>
      </div>
    );
  }

  const { quote, settings } = q.data;
  const totals = docTotals(quote.lines);
  const alreadySigned = quote.status === "Signé" || done;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (signerName.trim().length < 2) return setError("Indiquez votre nom complet.");
    if (!signature) return setError("Merci de signer dans le cadre prévu.");
    setBusy(true);
    setError(null);
    try {
      const res = await submit({ data: { token, signerName: signerName.trim(), signature } });
      if (!res.ok) setError(res.error);
      else setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-900 md:py-16">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="font-kangge text-3xl tracking-tight">Skale Visuals</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
            Devis {quote.number}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {quote.client_name ?? "Client"} · émis le {formatDateFR(quote.created_at)}
            {quote.valid_until ? ` · valable jusqu'au ${formatDateFR(quote.valid_until)}` : ""}
          </p>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:p-7"
        >
          <div className="space-y-3">
            {quote.lines.map((l, i) => {
              const t = lineTotals(l);
              return (
                <div
                  key={i}
                  className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{l.label}</p>
                    <p className="text-xs text-neutral-500">
                      {l.quantity} × {formatEUR(l.unit_price_ht)} HT · TVA {l.tva_rate}%
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{formatEUR(t.ht)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 space-y-1.5 border-t border-neutral-200 pt-4 text-sm">
            <div className="flex justify-between text-neutral-500">
              <span>Total HT</span>
              <span>{formatEUR(totals.ht)}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>TVA</span>
              <span>{formatEUR(totals.tva)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total TTC</span>
              <span>{formatEUR(totals.ttc)}</span>
            </div>
          </div>

          {quote.conditions && (
            <p className="mt-5 whitespace-pre-line rounded-2xl bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-500">
              {quote.conditions}
            </p>
          )}
        </motion.section>

        {alreadySigned ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center"
          >
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-500 text-white">
              <Check className="h-5 w-5" />
            </span>
            <h2 className="mt-3 text-lg font-semibold text-emerald-900">Devis signé</h2>
            <p className="mt-1 text-sm text-emerald-800/80">
              Merci ! Une copie signée vous a été envoyée par email. Nous revenons vers vous très
              vite.
            </p>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={onSubmit}
            className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:p-7"
          >
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <FileSignature className="h-4 w-4 text-rose-500" />
              Signature électronique
            </div>
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-500">Nom et prénom</span>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Julie Martin"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-900"
              />
            </label>
            <div className="mt-4">
              <span className="mb-1 block text-xs text-neutral-500">
                Signez ci-dessous (souris ou doigt)
              </span>
              <SignaturePad onChange={setSignature} />
            </div>
            {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {busy ? "Signature en cours…" : "Signer le devis"}
            </button>
            <p className="mt-3 text-center text-[11px] text-neutral-400">
              En signant, vous acceptez le devis et les conditions de {settings.legalName}.
            </p>
          </motion.form>
        )}
      </div>
    </main>
  );
}
