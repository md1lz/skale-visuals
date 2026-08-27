import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  db,
  documentBundleForInvoice,
  documentBundleForQuote,
  fetchQuote,
  fetchQuoteByToken,
  mapQuote,
  notifyQuoteSigned,
} from "@/lib/billing.server";
import { getBillingSettings } from "@/lib/billing.server";
import type { BillingSettings, DocumentBundle, Quote } from "@/lib/billing.shared";

export const getQuoteForSigning = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(8).max(80) }).parse(d))
  .handler(async ({ data }): Promise<{ quote: Quote; settings: BillingSettings } | null> => {
    const row = await fetchQuoteByToken(data.token).catch(() => null);
    if (!row) return null;
    const settings = await getBillingSettings();
    return { quote: mapQuote(row), settings };
  });

export const getPublicDocument = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        kind: z.enum(["quote", "invoice"]),
        token: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<DocumentBundle | null> => {
    const sb = await db();
    const isQuote = data.kind === "quote";
    const { data: row } = await (sb.from(isQuote ? "quotes" : "invoices") as any)
      .select(
        isQuote
          ? "*, clients(nom_complet, entreprise, email), quote_lines(*)"
          : "*, clients(nom_complet, entreprise, email), invoice_lines(*)",
      )
      .eq(isQuote ? "sign_token" : "share_token", data.token)
      .maybeSingle();
    if (!row) return null;
    return isQuote ? await documentBundleForQuote(row) : await documentBundleForInvoice(row);
  });


export const signQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().min(8).max(80),
        signerName: z.string().trim().min(2).max(120),
        signature: z
          .string()
          .min(50)
          .max(400_000)
          .refine((v) => v.startsWith("data:image/png;base64,"), "Signature invalide."),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const row = await fetchQuoteByToken(data.token).catch(() => null);
    if (!row) return { ok: false as const, error: "Devis introuvable." };
    const quote = mapQuote(row);
    if (quote.status === "Signé") return { ok: false as const, error: "Ce devis est déjà signé." };
    if (quote.status === "Refusé" || quote.status === "Expiré")
      return { ok: false as const, error: "Ce devis n'est plus valable." };
    if (quote.valid_until && quote.valid_until < new Date().toISOString().slice(0, 10))
      return { ok: false as const, error: "Ce devis a expiré." };

    const sb = await db();
    const { error } = await sb
      .from("quotes")
      .update({
        status: "Signé",
        signer_name: data.signerName,
        signature_data_url: data.signature,
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", quote.id);
    if (error) return { ok: false as const, error: error.message };

    const fresh = await fetchQuote(quote.id);
    await notifyQuoteSigned(fresh).catch(() => {});
    return { ok: true as const };
  });
