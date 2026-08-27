import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  db,
  emailInvoice,
  emailQuote,
  fetchInvoice,
  fetchInvoices,
  fetchQuote,
  fetchQuotes,
  financeKpis,
  getBillingSettings,
  mapInvoice,
  mapQuote,
  nextNumber,
  documentBundleForInvoice,
  documentBundleForQuote,
  requireAdmin,
  saveBillingSettings,
} from "@/lib/billing.server";
import {
  INVOICE_STATUSES,
  QUOTE_STATUSES,
  normalizeBilling,
  type BillingSettings,
  type Invoice,
  type Prestation,
  type Quote,
} from "@/lib/billing.shared";

const lineSchema = z.object({
  prestation_id: z.string().uuid().nullable().optional(),
  label: z.string().trim().min(1).max(300),
  quantity: z.coerce.number().min(0),
  unit_price_ht: z.coerce.number().min(0),
  tva_rate: z.coerce.number().min(0).max(100),
});

const nullDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

const nullText = z
  .string()
  .max(10000)
  .optional()
  .nullable()
  .transform((v) => (v && v.trim().length > 0 ? v : null));

/* ------------------------------- Prestations ------------------------------ */

export const listPrestations = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const sb = await db();
  const { data, error } = await sb
    .from("prestations")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Prestation[];
});

export const upsertPrestation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable().optional(),
        label: z.string().trim().min(1).max(200),
        description: nullText,
        price_ht: z.coerce.number().min(0),
        tva_rate: z.coerce.number().min(0).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await db();
    const payload = {
      label: data.label,
      description: data.description,
      price_ht: data.price_ht,
      tva_rate: data.tva_rate,
    };
    if (data.id) {
      const { error } = await sb.from("prestations").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("prestations").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deletePrestation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await db();
    const { error } = await sb.from("prestations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* --------------------------- Billing settings ----------------------------- */

export const getBillingConfig = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return await getBillingSettings();
});

export const saveBillingConfig = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => normalizeBilling(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    return (await saveBillingSettings(data)) as BillingSettings;
  });

/* --------------------------------- Quotes --------------------------------- */

export const listQuotes = createServerFn({ method: "GET" }).handler(async (): Promise<Quote[]> => {
  await requireAdmin();
  return await fetchQuotes();
});

export const saveQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable().optional(),
        client_id: z.string().uuid().nullable(),
        status: z.enum(QUOTE_STATUSES),
        notes: nullText,
        conditions: nullText,
        valid_until: nullDate,
        lines: z.array(lineSchema).min(1, "Ajoutez au moins une ligne."),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await db();
    const payload = {
      client_id: data.client_id,
      status: data.status,
      notes: data.notes,
      conditions: data.conditions,
      valid_until: data.valid_until,
      updated_at: new Date().toISOString(),
    };
    let id = data.id ?? null;
    if (id) {
      const { error } = await sb.from("quotes").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      await sb.from("quote_lines").delete().eq("quote_id", id);
    } else {
      const { data: row, error } = await sb
        .from("quotes")
        .insert({ ...payload, number: await nextNumber("quote") })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = row.id;
    }
    const { error: linesError } = await sb.from("quote_lines").insert(
      data.lines.map((l, i) => ({
        quote_id: id!,
        prestation_id: l.prestation_id ?? null,
        label: l.label,
        quantity: l.quantity,
        unit_price_ht: l.unit_price_ht,
        tva_rate: l.tva_rate,
        position: i,
      })),
    );
    if (linesError) throw new Error(linesError.message);
    return { ok: true as const, id: id! };
  });

export const setQuoteStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(QUOTE_STATUSES) }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await db();
    const { error } = await sb
      .from("quotes")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await db();
    const row = await fetchQuote(data.id);
    if (row.status !== "Brouillon") throw new Error("Seuls les brouillons peuvent être supprimés.");
    const { error } = await sb.from("quotes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const duplicateQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await db();
    const row = await fetchQuote(data.id);
    const q = mapQuote(row);
    const { data: created, error } = await sb
      .from("quotes")
      .insert({
        client_id: q.client_id,
        status: "Brouillon",
        notes: q.notes,
        conditions: q.conditions,
        valid_until: q.valid_until,
        number: await nextNumber("quote"),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await sb.from("quote_lines").insert(
      q.lines.map((l, i) => ({
        quote_id: created.id,
        prestation_id: l.prestation_id ?? null,
        label: l.label,
        quantity: l.quantity,
        unit_price_ht: l.unit_price_ht,
        tva_rate: l.tva_rate,
        position: i,
      })),
    );
    return { ok: true as const, id: created.id };
  });

export const sendQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const row = await fetchQuote(data.id);
    await emailQuote(row);
    const sb = await db();
    if (row.status === "Brouillon") {
      await sb
        .from("quotes")
        .update({ status: "Envoyé", updated_at: new Date().toISOString() })
        .eq("id", data.id);
    }
    return { ok: true as const };
  });

export const convertQuoteToInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await db();
    const row = await fetchQuote(data.id);
    const q = mapQuote(row);
    if (q.status !== "Signé") throw new Error("Le devis doit être signé.");
    const settings = await getBillingSettings();
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const { data: inv, error } = await sb
      .from("invoices")
      .insert({
        client_id: q.client_id,
        quote_id: q.id,
        number: await nextNumber("invoice"),
        status: "Brouillon",
        notes: q.notes,
        conditions: settings.paymentTerms,
        issued_at: new Date().toISOString().slice(0, 10),
        due_at: due.toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await sb.from("invoice_lines").insert(
      q.lines.map((l, i) => ({
        invoice_id: inv.id,
        label: l.label,
        quantity: l.quantity,
        unit_price_ht: l.unit_price_ht,
        tva_rate: l.tva_rate,
        position: i,
      })),
    );
    return { ok: true as const, id: inv.id };
  });

export const quoteDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    return await documentBundleForQuote(await fetchQuote(data.id));
  });

/* -------------------------------- Invoices -------------------------------- */

export const listInvoices = createServerFn({ method: "GET" }).handler(
  async (): Promise<Invoice[]> => {
    await requireAdmin();
    return await fetchInvoices();
  },
);

export const saveInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable().optional(),
        client_id: z.string().uuid().nullable(),
        status: z.enum(INVOICE_STATUSES),
        notes: nullText,
        conditions: nullText,
        issued_at: z.string().min(10),
        due_at: nullDate,
        lines: z.array(lineSchema).min(1, "Ajoutez au moins une ligne."),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await db();
    const status = data.status === "En retard" ? "Envoyée" : data.status;
    const payload = {
      client_id: data.client_id,
      status,
      notes: data.notes,
      conditions: data.conditions,
      issued_at: data.issued_at,
      due_at: data.due_at,
      updated_at: new Date().toISOString(),
    };
    let id = data.id ?? null;
    if (id) {
      const { error } = await sb.from("invoices").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      await sb.from("invoice_lines").delete().eq("invoice_id", id);
    } else {
      const { data: row, error } = await sb
        .from("invoices")
        .insert({ ...payload, number: await nextNumber("invoice") })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = row.id;
    }
    const { error: linesError } = await sb.from("invoice_lines").insert(
      data.lines.map((l, i) => ({
        invoice_id: id!,
        label: l.label,
        quantity: l.quantity,
        unit_price_ht: l.unit_price_ht,
        tva_rate: l.tva_rate,
        position: i,
      })),
    );
    if (linesError) throw new Error(linesError.message);
    return { ok: true as const, id: id! };
  });

export const markInvoicePaid = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        paid_at: z.string().min(10),
        paid_amount: z.coerce.number().min(0),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await db();
    const { error } = await sb
      .from("invoices")
      .update({
        status: "Payée",
        paid_at: new Date(`${data.paid_at}T12:00:00Z`).toISOString(),
        paid_amount: data.paid_amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setInvoiceStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(INVOICE_STATUSES) }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await db();
    const { error } = await sb
      .from("invoices")
      .update({
        status: data.status === "En retard" ? "Envoyée" : data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await db();
    const row = await fetchInvoice(data.id);
    if (mapInvoice(row).status !== "Brouillon")
      throw new Error("Seuls les brouillons peuvent être supprimés.");
    const { error } = await sb.from("invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const sendInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const row = await fetchInvoice(data.id);
    await emailInvoice(row);
    const sb = await db();
    if (row.status === "Brouillon") {
      await sb
        .from("invoices")
        .update({ status: "Envoyée", updated_at: new Date().toISOString() })
        .eq("id", data.id);
    }
    return { ok: true as const };
  });

export const invoiceDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    return await documentBundleForInvoice(await fetchInvoice(data.id));
  });

/* ---------------------------------- KPIs ---------------------------------- */

export const getFinanceKpis = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return await financeKpis();
});
