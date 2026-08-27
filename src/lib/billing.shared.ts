export const QUOTE_STATUSES = ["Brouillon", "Envoyé", "Signé", "Refusé", "Expiré"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const INVOICE_STATUSES = ["Brouillon", "Envoyée", "Payée", "En retard", "Annulée"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type DocLine = {
  id?: string;
  prestation_id?: string | null;
  label: string;
  quantity: number;
  unit_price_ht: number;
  tva_rate: number;
};

export type Prestation = {
  id: string;
  label: string;
  description: string | null;
  price_ht: number;
  tva_rate: number;
  position: number;
  created_at: string;
};

export type Quote = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  client_company: string | null;
  client_siret: string | null;
  client_email: string | null;
  client_address: string | null;
  number: string;
  status: QuoteStatus;
  notes: string | null;
  conditions: string | null;
  valid_until: string | null;
  sign_token: string;
  signed_at: string | null;
  signer_name: string | null;
  created_at: string;
  lines: DocLine[];
  total_ht: number;
  total_tva: number;
  total_ttc: number;
};

export type Invoice = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  client_company: string | null;
  client_siret: string | null;
  client_email: string | null;
  client_address: string | null;
  quote_id: string | null;
  number: string;
  status: InvoiceStatus;
  notes: string | null;
  conditions: string | null;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  created_at: string;
  lines: DocLine[];
  total_ht: number;
  total_tva: number;
  total_ttc: number;
};

export type DocClient = {
  name: string;
  company?: string | null;
  siret?: string | null;
  email?: string | null;
  address?: string | null;
};


export type DocumentPayload = {
  kind: "quote" | "invoice";
  number: string;
  createdAt: string;
  issuedAt?: string | null;
  dueAt?: string | null;
  validUntil?: string | null;
  client: DocClient;
  lines: DocLine[];
  notes?: string | null;
  conditions?: string | null;
  signature?: { dataUrl: string | null; name: string | null; signedAt: string | null } | null;
};

export type DocumentBundle = { doc: DocumentPayload; settings: BillingSettings };

export type BillingSettings = {
  legalName: string;
  address: string;
  siret: string;
  vatNumber: string;
  iban: string;
  bic: string;
  email: string;
  phone: string;
  paymentTerms: string;
  legalMentions: string;
  quotePrefix: string;
  invoicePrefix: string;
  quoteStart: number;
  invoiceStart: number;
  defaultConditions: string;
};

export const DEFAULT_BILLING: BillingSettings = {
  legalName: "Skale Visuals",
  address: "",
  siret: "",
  vatNumber: "TVA non applicable, art. 293 B du CGI",
  iban: "",
  bic: "",
  email: "contact@skalevisuals.com",
  phone: "",
  paymentTerms: "Paiement à 30 jours à réception de facture.",
  legalMentions:
    "En cas de retard de paiement, une indemnité forfaitaire de 40 € pour frais de recouvrement sera exigible (art. L441-10 du Code de commerce).",
  quotePrefix: "DEV",
  invoicePrefix: "FAC",
  quoteStart: 84,
  invoiceStart: 84,
  defaultConditions:
    "Devis valable 30 jours. Acompte de 30 % à la signature, solde à la livraison.",
};

export function normalizeBilling(value: unknown): BillingSettings {
  const v = (value ?? {}) as Partial<BillingSettings>;
  return {
    ...DEFAULT_BILLING,
    ...Object.fromEntries(
      Object.entries(v).filter(([, val]) => val !== null && val !== undefined),
    ),
  } as BillingSettings;
}

export function lineTotals(line: DocLine) {
  const ht = (Number(line.quantity) || 0) * (Number(line.unit_price_ht) || 0);
  const tva = ht * ((Number(line.tva_rate) || 0) / 100);
  return { ht, tva, ttc: ht + tva };
}

export function docTotals(lines: DocLine[]) {
  let total_ht = 0;
  let total_tva = 0;
  for (const l of lines) {
    const t = lineTotals(l);
    total_ht += t.ht;
    total_tva += t.tva;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    total_ht: round(total_ht),
    total_tva: round(total_tva),
    total_ttc: round(total_ht + total_tva),
  };
}

export function formatEUR(n: number): string {
  // fr-FR uses narrow/no-break spaces that some PDF fonts render as "/" — normalize to a plain space.
  const num = (Math.round(n * 100) / 100)
    .toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/[\u202F\u00A0\u2009]/g, " ");
  return `${num} €`;
}

export function formatDateFR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export const QUOTE_STATUS_STYLE: Record<QuoteStatus, string> = {
  Brouillon: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
  "Envoyé": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Signé": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "Refusé": "bg-red-500/15 text-red-300 border-red-500/30",
  "Expiré": "bg-neutral-800 text-neutral-500 border-white/10",
};

export const INVOICE_STATUS_STYLE: Record<InvoiceStatus, string> = {
  Brouillon: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
  "Envoyée": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Payée": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "En retard": "bg-red-500/15 text-red-300 border-red-500/30",
  "Annulée": "bg-neutral-800 text-neutral-500 border-white/10",
};
