import { useSession } from "@tanstack/react-start/server";
import {
  DEFAULT_BILLING,
  docTotals,
  normalizeBilling,
  type BillingSettings,
  type DocLine,
  type DocumentBundle,
  type Invoice,
  type InvoiceStatus,
  type Quote,
  type QuoteStatus,
} from "@/lib/billing.shared";

type AdminSessionData = { user?: string; loggedInAt?: number };

function sessionConfig() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return {
    password,
    name: "skale_admin",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

export async function requireAdmin() {
  const session = await useSession<AdminSessionData>(sessionConfig());
  if (!session.data.user) throw new Error("Unauthorized");
  return session.data.user;
}

export async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getBillingSettings(): Promise<BillingSettings> {
  const sb = await db();
  const { data } = await sb
    .from("site_settings")
    .select("value")
    .eq("key", "billing")
    .maybeSingle();
  return data ? normalizeBilling(data.value) : DEFAULT_BILLING;
}

export async function saveBillingSettings(next: BillingSettings) {
  const sb = await db();
  await sb
    .from("site_settings")
    .upsert({ key: "billing", value: next as never, updated_at: new Date().toISOString() });
  return next;
}

export async function nextNumber(kind: "quote" | "invoice"): Promise<string> {
  const settings = await getBillingSettings();
  const sb = await db();
  const prefix = kind === "quote" ? settings.quotePrefix : settings.invoicePrefix;
  const start = kind === "quote" ? settings.quoteStart : settings.invoiceStart;
  const year = new Date().getFullYear();
  const table = kind === "quote" ? "quotes" : "invoices";
  const { data } = await sb
    .from(table)
    .select("number")
    .like("number", `${prefix}-${year}-%`)
    .order("number", { ascending: false })
    .limit(1);
  const last = data?.[0]?.number as string | undefined;
  const lastSeq = last ? Number(last.split("-").pop()) : NaN;
  const seq = Number.isFinite(lastSeq) ? lastSeq + 1 : Math.max(1, start);
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

type RawLine = {
  id: string;
  label: string;
  quantity: number;
  unit_price_ht: number;
  tva_rate: number;
  prestation_id?: string | null;
  position: number;
};

function toLines(rows: RawLine[] | null | undefined): DocLine[] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      id: r.id,
      prestation_id: r.prestation_id ?? null,
      label: r.label,
      quantity: Number(r.quantity),
      unit_price_ht: Number(r.unit_price_ht),
      tva_rate: Number(r.tva_rate),
    }));
}

function isExpired(q: { valid_until: string | null; status: string }) {
  return (
    q.status === "Envoyé" &&
    !!q.valid_until &&
    new Date(`${q.valid_until}T23:59:59Z`).getTime() < Date.now()
  );
}

export function mapQuote(row: any): Quote {
  const lines = toLines(row.quote_lines);
  const totals = docTotals(lines);
  const status = (isExpired(row) ? "Expiré" : row.status) as QuoteStatus;
  return {
    id: row.id,
    client_id: row.client_id,
    client_name: row.clients?.nom_complet ?? null,
    number: row.number,
    status,
    notes: row.notes,
    conditions: row.conditions,
    valid_until: row.valid_until,
    sign_token: row.sign_token,
    signed_at: row.signed_at,
    signer_name: row.signer_name,
    created_at: row.created_at,
    lines,
    ...totals,
  };
}

export function mapInvoice(row: any): Invoice {
  const lines = toLines(row.invoice_lines);
  const totals = docTotals(lines);
  const overdue =
    row.status === "Envoyée" &&
    !!row.due_at &&
    new Date(`${row.due_at}T23:59:59Z`).getTime() < Date.now();
  return {
    id: row.id,
    client_id: row.client_id,
    client_name: row.clients?.nom_complet ?? null,
    quote_id: row.quote_id,
    number: row.number,
    status: (overdue ? "En retard" : row.status) as InvoiceStatus,
    notes: row.notes,
    conditions: row.conditions,
    issued_at: row.issued_at,
    due_at: row.due_at,
    paid_at: row.paid_at,
    paid_amount: row.paid_amount === null ? null : Number(row.paid_amount),
    created_at: row.created_at,
    lines,
    ...totals,
  };
}

const QUOTE_SELECT = "*, clients(nom_complet, entreprise, email), quote_lines(*)";
const INVOICE_SELECT = "*, clients(nom_complet, entreprise, email), invoice_lines(*)";

export async function fetchQuotes(): Promise<Quote[]> {
  const sb = await db();
  const { data, error } = await sb
    .from("quotes")
    .select(QUOTE_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapQuote);
}

export async function fetchQuote(id: string) {
  const sb = await db();
  const { data, error } = await sb.from("quotes").select(QUOTE_SELECT).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data as any;
}

export async function fetchQuoteByToken(token: string) {
  const sb = await db();
  const { data, error } = await sb
    .from("quotes")
    .select(QUOTE_SELECT)
    .eq("sign_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as any;
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const sb = await db();
  const { data, error } = await sb
    .from("invoices")
    .select(INVOICE_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapInvoice);
}

export async function fetchInvoice(id: string) {
  const sb = await db();
  const { data, error } = await sb.from("invoices").select(INVOICE_SELECT).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data as any;
}

export function clientBlock(row: any) {
  return {
    name: row.clients?.nom_complet ?? "Client",
    company: row.clients?.entreprise ?? null,
    email: row.clients?.email ?? null,
    address: null,
  };
}

export async function documentBundleForQuote(row: any): Promise<DocumentBundle> {
  const settings = await getBillingSettings();
  const q = mapQuote(row);
  return {
    settings,
    doc: {
      kind: "quote",
      number: q.number,
      createdAt: q.created_at,
      validUntil: q.valid_until,
      client: clientBlock(row),
      lines: q.lines,
      notes: q.notes,
      conditions: q.conditions ?? settings.defaultConditions,
      signature: q.signed_at
        ? {
            dataUrl: row.signature_data_url ?? row.signature_data ?? null,
            name: q.signer_name,
            signedAt: q.signed_at,
          }
        : null,
    },
  };
}

export async function documentBundleForInvoice(row: any): Promise<DocumentBundle> {
  const settings = await getBillingSettings();
  const inv = mapInvoice(row);
  return {
    settings,
    doc: {
      kind: "invoice",
      number: inv.number,
      createdAt: inv.created_at,
      issuedAt: inv.issued_at,
      dueAt: inv.due_at,
      client: clientBlock(row),
      lines: inv.lines,
      notes: inv.notes,
      conditions: inv.conditions ?? settings.paymentTerms,
      signature: null,
    },
  };
}


export function base64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Financial KPIs: "CA" = quotes in progress + invoices in progress for a month. */
export async function financeKpis() {
  const sb = await db();
  const [{ data: q }, { data: inv }] = await Promise.all([
    sb.from("quotes").select("*, quote_lines(*)"),
    sb.from("invoices").select("*, invoice_lines(*)"),
  ]);
  const quotes = (q ?? []).map(mapQuote);
  const invoices = (inv ?? []).map(mapInvoice);

  const monthKey = (iso: string) => iso.slice(0, 7);
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }

  const activeQuote = (s: string) => s === "Envoyé" || s === "Signé";
  const activeInvoice = (s: string) => s === "Envoyée" || s === "Payée" || s === "En retard";

  const revenueFor = (m: string) =>
    quotes
      .filter((x) => activeQuote(x.status) && monthKey(x.created_at) === m)
      .reduce((s, x) => s + x.total_ht, 0) +
    invoices
      .filter((x) => activeInvoice(x.status) && monthKey(x.issued_at) === m)
      .reduce((s, x) => s + x.total_ht, 0);

  const series = months.map((m) => ({ month: m, revenue: Math.round(revenueFor(m) * 100) / 100 }));
  const current = series[series.length - 1].revenue;
  const previous = revenueFor(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7),
  );

  const pendingPayment = invoices
    .filter((x) => x.status === "Envoyée" || x.status === "En retard")
    .reduce((s, x) => s + x.total_ttc, 0);
  const awaitingSignature = quotes.filter((x) => x.status === "Envoyé");
  const overdue = invoices.filter((x) => x.status === "En retard");

  return {
    revenueMonth: current,
    revenuePrevMonth: Math.round(previous * 100) / 100,
    pendingPayment: Math.round(pendingPayment * 100) / 100,
    awaitingSignatureCount: awaitingSignature.length,
    awaitingSignatureAmount:
      Math.round(awaitingSignature.reduce((s, x) => s + x.total_ht, 0) * 100) / 100,
    overdueCount: overdue.length,
    overdueAmount: Math.round(overdue.reduce((s, x) => s + x.total_ttc, 0) * 100) / 100,
    series,
  };
}

const SITE_ORIGIN = "https://skalevisuals.com";

export function signUrlFor(token: string) {
  return `${SITE_ORIGIN}/sign/${token}`;
}

export function publicPdfUrl(kind: "quote" | "invoice", token: string) {
  return `${SITE_ORIGIN}/doc/${kind}/${token}`;
}

export async function emailQuote(row: any) {
  const email = row.clients?.email as string | undefined;
  if (!email) throw new Error("Ce client n'a pas d'adresse email.");
  const q = mapQuote(row);
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  await sendTemplateEmail("quote-sent", email, {
    templateData: {
      name: q.client_name ?? "",
      number: q.number,
      amount: `${q.total_ttc.toFixed(2).replace(".", ",")} €`,
      validUntil: q.valid_until
        ? new Date(`${q.valid_until}T12:00:00Z`).toLocaleDateString("fr-FR")
        : "",
      signUrl: signUrlFor(q.sign_token),
    },
  });
}

export async function emailInvoice(row: any) {
  const email = row.clients?.email as string | undefined;
  if (!email) throw new Error("Ce client n'a pas d'adresse email.");
  const inv = mapInvoice(row);
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  await sendTemplateEmail("invoice-sent", email, {
    templateData: {
      name: inv.client_name ?? "",
      number: inv.number,
      amount: `${inv.total_ttc.toFixed(2).replace(".", ",")} €`,
      dueAt: inv.due_at ? new Date(`${inv.due_at}T12:00:00Z`).toLocaleDateString("fr-FR") : "",
      pdfUrl: publicPdfUrl("invoice", row.share_token),
    },
  });
}

export async function notifyQuoteSigned(row: any) {
  const q = mapQuote(row);
  const sb = await db();
  await sb.from("notifications").insert({
    recipient_type: "admin",
    recipient_id: null,
    type: "quote_signed",
    message: `Devis ${q.number} signé par ${q.signer_name ?? q.client_name ?? "le client"} — ${q.total_ttc.toFixed(2)} €`,
    read: false,
  });
  await sb.from("admin_activity").insert({
    kind: "quote_signed",
    message: `Devis ${q.number} signé (${q.total_ttc.toFixed(2)} € TTC)`,
  });
  const email = row.clients?.email as string | undefined;
  if (email) {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("quote-signed", email, {
      templateData: {
        name: q.client_name ?? "",
        number: q.number,
        amount: `${q.total_ttc.toFixed(2).replace(".", ",")} €`,
        signedAt: q.signed_at ? new Date(q.signed_at).toLocaleString("fr-FR") : "",
        pdfUrl: publicPdfUrl("quote", q.sign_token),
      },
    });
  }
}
