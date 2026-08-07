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

export const PROJECT_STATUSES = [
  "En attente de validation client",
  "À faire",
  "En cours",
  "En révision",
  "Corrections",
  "Livrée",
  "Payée",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_FORMATS = ["Court", "Long"] as const;
export type ProjectFormat = (typeof PROJECT_FORMATS)[number];

export const EDITOR_RATE_TYPES = ["per_video", "per_minute"] as const;
export type EditorRateType = (typeof EDITOR_RATE_TYPES)[number];

export type Project = {
  id: string;
  title: string;
  client_id: string | null;
  editor_id: string | null;
  format: ProjectFormat;
  status: ProjectStatus;
  editor_name: string | null;
  editor_rate: number | null;
  editor_rate_type: EditorRateType;
  editor_quantity: number | null;
  editor_total_cost: number;
  amount_invoiced_ht: number;
  gross_profit: number;
  social_charges: number;
  net_profit: number;
  deadline: string | null;
  brief: string | null;
  rushs_received: boolean;
  rushs_links: string[];
  delivery_link: string | null;
  revision_link: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectStatusHistoryItem = {
  id: string;
  status: ProjectStatus;
  changed_at: string;
};

const nullableStr = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

const nullableNum = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

const dateField = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "Date invalide" });

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1, "Titre requis").max(200),
  client_id: z.string().uuid().nullable(),
  editor_id: z.string().uuid().nullable().optional().default(null),
  format: z.enum(PROJECT_FORMATS),
  status: z.enum(PROJECT_STATUSES),
  editor_name: nullableStr,
  editor_rate: nullableNum,
  editor_rate_type: z.enum(EDITOR_RATE_TYPES),
  editor_quantity: nullableNum,
  amount_invoiced_ht: nullableNum,
  deadline: dateField,
  brief: z.string().trim().max(20000).optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
  rushs_received: z.boolean(),
  rushs_links: z.array(z.string().trim().max(2000)).max(20).default([]),
  delivery_link: nullableStr,
  revision_link: nullableStr,
});

function computeFinance(inv: number | null, cost: number) {
  const invoiced = inv ?? 0;
  const gross = invoiced - cost;
  const charges = Math.round(invoiced * 0.22 * 100) / 100;
  const net = Math.round((invoiced - cost - charges) * 100) / 100;
  return { gross_profit: gross, social_charges: charges, net_profit: net };
}

export const listProjects = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ archived: z.boolean().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Auto-archive: statut Payée depuis > 7 jours
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("projects")
      .update({ archived_at: new Date().toISOString() })
      .eq("status", "Payée")
      .is("archived_at", null)
      .lt("updated_at", sevenDaysAgo);

    const q = supabaseAdmin.from("projects").select("*").order("deadline", { ascending: true, nullsFirst: false });
    const { data: rows, error } = data.archived
      ? await q.not("archived_at", "is", null)
      : await q.is("archived_at", null);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Project[];
  });

export const upsertProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const editor_total_cost = Math.round(((data.editor_rate ?? 0) * (data.editor_quantity ?? 0)) * 100) / 100;
    const fin = computeFinance(data.amount_invoiced_ht, editor_total_cost);
    const payload = {
      title: data.title,
      client_id: data.client_id,
      editor_id: data.editor_id ?? null,
      format: data.format,
      status: data.status,
      editor_name: data.editor_name,
      editor_rate: data.editor_rate,
      editor_rate_type: data.editor_rate_type,
      editor_quantity: data.editor_quantity,
      editor_total_cost,
      amount_invoiced_ht: data.amount_invoiced_ht ?? 0,
      gross_profit: fin.gross_profit,
      social_charges: fin.social_charges,
      net_profit: fin.net_profit,
      deadline: data.deadline,
      brief: data.brief,
      rushs_received: data.rushs_received,
      rushs_links: data.rushs_links,
      delivery_link: data.delivery_link,
      revision_link: data.revision_link,
    };
    if (data.id) {
      const { data: before } = await supabaseAdmin
        .from("projects")
        .select("editor_id")
        .eq("id", data.id)
        .maybeSingle();
      const { data: row, error } = await supabaseAdmin
        .from("projects")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      if (before?.editor_id !== payload.editor_id) {
        const { notifyEditor } = await import("./notifications.server");
        if (payload.editor_id) {
          await notifyEditor({
            recipient_id: payload.editor_id,
            type: "assign",
            project_id: data.id,
            message: before?.editor_id
              ? `Vous avez repris le projet ${data.title}`
              : `Tu as été assigné au projet ${data.title}`,
          });
        }
        if (before?.editor_id) {
          await notifyEditor({
            recipient_id: before.editor_id,
            type: "reassign",
            project_id: data.id,
            message: `Vous avez été remplacé sur le projet ${data.title}`,
          });
        }
      }
      return row as Project;
    }
    const { data: row, error } = await supabaseAdmin
      .from("projects")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    if (payload.editor_id) {
      const { notifyEditor } = await import("./notifications.server");
      await notifyEditor({
        recipient_id: payload.editor_id,
        type: "created",
        project_id: (row as Project).id,
        message: `Nouveau projet créé pour vous : ${data.title}`,
      });
    }
    return row as Project;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const archiveProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), archived: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("projects")
      .update({ archived_at: data.archived ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getProjectHistory = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("project_status_history")
      .select("id, status, changed_at")
      .eq("project_id", data.id)
      .order("changed_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as ProjectStatusHistoryItem[];
  });