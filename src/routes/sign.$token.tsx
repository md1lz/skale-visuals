import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, Eraser, Loader2, Share2, ShieldCheck } from "lucide-react";
import { getPublicDocument, signQuote } from "@/lib/billing-public.functions";
import { DocumentPaper, downloadDocumentPdf } from "@/components/DocumentPaper";

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

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
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
  const load = useServerFn(getPublicDocument);
  const submit = useServerFn(signQuote);

  const q = useQuery({
    queryKey: ["sign-doc", token],
    queryFn: () => load({ data: { kind: "quote" as const, token } }),
  });

  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-100 text-neutral-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!q.data) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-100 px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Devis introuvable</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Ce lien de signature n'est plus valide. Contactez-nous à contact@skalevisuals.com.
          </p>
        </div>
      </main>
    );
  }

  const { doc, settings } = q.data;
  const signed = !!doc.signature?.signedAt;

  async function onSign() {
    if (busy) return;
    if (!signature) return setError("Merci de signer dans le cadre prévu.");
    setBusy(true);
    setError(null);
    try {
      const res = await submit({ data: { token, signature } });
      if (!res.ok) setError(res.error);
      else await q.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-3 py-6 text-neutral-900 md:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <AnimatePresence>
          {signed && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex items-center justify-center"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25">
                <Check className="h-4 w-4" /> Signé
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <DocumentPaper doc={doc} settings={settings} />
        </motion.div>

        {signed ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-2 backdrop-blur"
          >
            <button
              onClick={async () => {
                setDownloading(true);
                try {
                  await downloadDocumentPdf(doc, settings);
                } finally {
                  setDownloading(false);
                }
              }}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              PDF
            </button>
            <button
              onClick={async () => {
                const url = window.location.href;
                if (navigator.share) {
                  await navigator.share({ title: `Devis ${doc.number}`, url }).catch(() => {});
                } else {
                  await navigator.clipboard?.writeText(url);
                }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              <Share2 className="h-4 w-4" /> Partager
            </button>
          </motion.div>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:p-7"
          >
            <p className="text-base italic text-neutral-900">Bon pour accord</p>
            <p className="mt-1 text-xs text-neutral-500">
              Signez ci-dessous avec la souris ou le doigt.
            </p>
            <div className="mt-4">
              <SignaturePad onChange={setSignature} />
            </div>
            {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
            <button
              onClick={onSign}
              disabled={busy}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {busy ? "Signature en cours…" : "Signer"}
            </button>
            <p className="mt-3 text-center text-[11px] text-neutral-400">
              En signant, vous acceptez le devis et les conditions de{" "}
              {settings.legalName || "Skale Visuals"}.
            </p>
          </motion.section>
        )}
      </div>
    </main>
  );
}
