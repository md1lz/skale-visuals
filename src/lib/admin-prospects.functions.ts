import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

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

async function requireAdmin() {
  const session = await useSession<AdminSessionData>(sessionConfig());
  if (!session.data.user) throw new Error("Unauthorized");
  return session.data.user;
}

export const PROSPECT_STATUSES = [
  "À contacter",
  "Contacté",
  "Relance 1",
  "Relance 2",
  "Intéressé",
  "En discussion",
  "Signé",
  "Pas intéressé",
  "No reply",
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const PLATFORMS = ["Instagram", "YouTube", "TikTok", "Email", "LinkedIn", "Twitter/X"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const NICHES = [
  "Ads",
  "Vlogs",
  "Podcast",
  "Gaming",
  "Lifestyle",
  "Business",
  "Finance",
  "Sport",
  "Food",
  "Tech",
  "Autre",
] as const;

export const INTERESTS = ["Oui", "Non", "En attente"] as const;
export type Interested = (typeof INTERESTS)[number];

export type Prospect = {
  id: string;
  name: string;
  platform: string;
  profile_url: string | null;
  email: string | null;
  niche: string | null;
  subscriber_count: number | null;
  status: ProspectStatus;
  interested: Interested;
  first_contact_date: string | null;
  last_contact_date: string | null;
  next_followup_date: string | null;
  notes: string | null;
  converted_to_client: boolean;
  client_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProspectInteraction = {
  id: string;
  prospect_id: string;
  type: string;
  note: string | null;
  date: string;
  created_at: string;
};

const nullableStr = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

const dateField = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "Date invalide" });

const numField = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1, "Nom requis").max(200),
  platform: z.string().trim().min(1).max(50),
  profile_url: nullableStr,
  email: nullableStr,
  niche: nullableStr,
  subscriber_count: numField,
  status: z.enum(PROSPECT_STATUSES),
  interested: z.enum(INTERESTS),
  first_contact_date: dateField,
  last_contact_date: dateField,
  next_followup_date: dateField,
  notes: z.string().trim().max(10000).optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
});

export const listProspects = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("prospects")
    .select("*")
    .is("archived_at", null)
    .order("next_followup_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Prospect[];
});

export const upsertProspect = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      name: data.name,
      platform: data.platform,
      profile_url: data.profile_url,
      email: data.email,
      niche: data.niche,
      subscriber_count: data.subscriber_count,
      status: data.status,
      interested: data.interested,
      first_contact_date: data.first_contact_date,
      last_contact_date: data.last_contact_date,
      next_followup_date: data.next_followup_date,
      notes: data.notes,
    };
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("prospects")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row as unknown as Prospect;
    }
    const { data: row, error } = await supabaseAdmin
      .from("prospects")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as Prospect;
  });

export const archiveProspect = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("prospects")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listInteractions = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ prospectId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("prospect_interactions")
      .select("*")
      .eq("prospect_id", data.prospectId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as ProspectInteraction[];
  });

export const addInteraction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        prospect_id: z.string().uuid(),
        type: z.string().trim().min(1).max(80),
        note: nullableStr,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        next_followup_date: dateField.optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("prospect_interactions")
      .insert({
        prospect_id: data.prospect_id,
        type: data.type,
        note: data.note,
        date: data.date,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const update: { last_contact_date: string; next_followup_date?: string | null } = {
      last_contact_date: data.date,
    };
    if (data.next_followup_date !== undefined) update.next_followup_date = data.next_followup_date;
    await supabaseAdmin.from("prospects").update(update).eq("id", data.prospect_id);

    return row as unknown as ProspectInteraction;
  });

export const convertProspectToClient = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prospect, error: pErr } = await supabaseAdmin
      .from("prospects")
      .select("*")
      .eq("id", data.id)
      .single();
    if (pErr) throw new Error(pErr.message);
    const p = prospect as unknown as Prospect;
    if (p.client_id) return { clientId: p.client_id };

    const { data: client, error: cErr } = await supabaseAdmin
      .from("clients")
      .insert({
        nom_complet: p.name,
        email: p.email,
        statut: "Actif",
        type_projet: p.niche,
        reseaux_sociaux: [p.platform, p.profile_url].filter(Boolean).join(" — ") || null,
        notes: p.notes,
      })
      .select("id")
      .single();
    if (cErr) throw new Error(cErr.message);

    await supabaseAdmin
      .from("prospects")
      .update({ converted_to_client: true, client_id: client.id, status: "Signé" })
      .eq("id", p.id);

    return { clientId: client.id as string };
  });

export const listFollowupsDue = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from("prospects")
    .select("id,name,platform,next_followup_date,status")
    .is("archived_at", null)
    .not("next_followup_date", "is", null)
    .lte("next_followup_date", today)
    .order("next_followup_date", { ascending: true })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string; platform: string; next_followup_date: string; status: string }[];
});
