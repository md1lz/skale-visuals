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

export type ClientAccount = {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
};

const emailSchema = z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(255);
const nameSchema = z.string().trim().max(200);
const companySchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

export const listClientAccounts = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error(error.message);

  const users = data.users ?? [];
  const ids = users.map((u) => u.id);
  const profiles = ids.length
    ? (
        await supabaseAdmin
          .from("client_profiles")
          .select("id, full_name, company")
          .in("id", ids)
      ).data ?? []
    : [];
  const byId = new Map(profiles.map((p) => [p.id, p]));

  return users
    .map((u): ClientAccount => {
      const profile = byId.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name:
          profile?.full_name ||
          (u.user_metadata?.["full_name"] as string | undefined) ||
          "",
        company: profile?.company ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        confirmed: Boolean(u.email_confirmed_at),
      };
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
});

export const createClientAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ email: emailSchema, full_name: nameSchema, company: companySchema })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, company: data.company ?? "" },
    });
    if (error) throw new Error(error.message);
    const id = created.user?.id;
    if (!id) throw new Error("Création impossible");

    await supabaseAdmin
      .from("client_profiles")
      .upsert({ id, full_name: data.full_name, company: data.company }, { onConflict: "id" });

    return { id };
  });

export const updateClientAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        email: emailSchema,
        full_name: nameSchema,
        company: companySchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      email: data.email,
      user_metadata: { full_name: data.full_name, company: data.company ?? "" },
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("client_profiles")
      .upsert(
        { id: data.id, full_name: data.full_name, company: data.company },
        { onConflict: "id" },
      );

    return { ok: true as const };
  });

export const deleteClientAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
