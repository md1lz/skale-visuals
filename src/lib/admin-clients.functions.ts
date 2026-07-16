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

const STATUTS = ["Prospect", "Actif", "En pause", "Terminé", "Archivé"] as const;
export type ClientStatut = (typeof STATUTS)[number];

export type Client = {
  id: string;
  nom_complet: string;
  entreprise: string | null;
  email: string | null;
  telephone: string | null;
  statut: ClientStatut;
  type_projet: string | null;
  budget: number | null;
  date_debut: string | null;
  date_fin: string | null;
  lien_drive: string | null;
  reseaux_sociaux: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const nullableStr = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

const emailField = z
  .string()
  .trim()
  .max(255)
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Email invalide" });

const dateField = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "Date invalide" });

const budgetField = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  nom_complet: z.string().trim().min(1, "Nom requis").max(200),
  entreprise: nullableStr,
  email: emailField,
  telephone: nullableStr,
  statut: z.enum(STATUTS),
  type_projet: nullableStr,
  budget: budgetField,
  date_debut: dateField,
  date_fin: dateField,
  lien_drive: nullableStr,
  reseaux_sociaux: nullableStr,
  notes: z.string().trim().max(10000).optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
});

export const listClients = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Client[];
});

export const upsertClient = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      nom_complet: data.nom_complet,
      entreprise: data.entreprise,
      email: data.email,
      telephone: data.telephone,
      statut: data.statut,
      type_projet: data.type_projet,
      budget: data.budget,
      date_debut: data.date_debut,
      date_fin: data.date_fin,
      lien_drive: data.lien_drive,
      reseaux_sociaux: data.reseaux_sociaux,
      notes: data.notes,
    };
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("clients")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row as Client;
    }
    const { data: row, error } = await supabaseAdmin
      .from("clients")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as Client;
  });

export const deleteClient = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });