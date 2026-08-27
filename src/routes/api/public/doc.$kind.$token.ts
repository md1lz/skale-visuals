import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/doc/$kind/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { kind, token } = params as { kind: string; token: string };
        if (kind !== "quote" && kind !== "invoice") {
          return new Response("Not found", { status: 404 });
        }
        if (!/^[A-Za-z0-9_-]{8,80}$/.test(token)) {
          return new Response("Not found", { status: 404 });
        }

        const { db, pdfBase64ForInvoice, pdfBase64ForQuote } = await import("@/lib/billing.server");
        const sb = await db();

        const select =
          kind === "quote"
            ? "*, clients(nom_complet, entreprise, email), quote_lines(*)"
            : "*, clients(nom_complet, entreprise, email), invoice_lines(*)";
        const table = kind === "quote" ? "quotes" : "invoices";
        const column = kind === "quote" ? "sign_token" : "share_token";

        const { data, error } = await sb.from(table).select(select).eq(column, token).maybeSingle();
        if (error || !data) return new Response("Not found", { status: 404 });

        const base64 =
          kind === "quote"
            ? await pdfBase64ForQuote(data)
            : await pdfBase64ForInvoice(data);
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

        return new Response(bytes, {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": `inline; filename="${(data as any).number ?? "document"}.pdf"`,
            "cache-control": "private, no-store",
          },
        });
      },
    },
  },
});
