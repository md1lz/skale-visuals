import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { getPublicDocument } from "@/lib/billing-public.functions";
import { DocumentPaper, downloadDocumentPdf } from "@/components/DocumentPaper";

export const Route = createFileRoute("/doc/$kind/$token")({
  head: () => ({
    meta: [
      { title: "Document — Skale Visuals" },
      {
        name: "description",
        content: "Consultez et téléchargez votre document Skale Visuals au format PDF.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Document — Skale Visuals" },
      {
        property: "og:description",
        content: "Consultez et téléchargez votre document Skale Visuals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicDocPage,
});

function PublicDocPage() {
  const { kind, token } = Route.useParams();
  const load = useServerFn(getPublicDocument);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["public-doc", kind, token],
    queryFn: () => load({ data: { kind: kind as "quote" | "invoice", token } }),
  });

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-50 text-neutral-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!q.data) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-50 px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Document introuvable</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Ce lien n'est plus valide. Contactez-nous à contact@skalevisuals.com.
          </p>
        </div>
      </main>
    );
  }

  const { doc, settings } = q.data;

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 md:py-14">
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">
            {doc.kind === "quote" ? "Devis" : "Facture"} {doc.number}
          </p>
          <button
            onClick={async () => {
              setBusy(true);
              try {
                await downloadDocumentPdf(doc, settings);
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Télécharger le PDF
          </button>
        </div>
        <DocumentPaper doc={doc} settings={settings} />
      </div>
    </main>
  );
}
