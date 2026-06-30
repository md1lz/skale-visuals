import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

const SESSION_NAME = "skale_admin";

type AdminSessionData = { user?: string; loggedInAt?: number };

function sessionConfig() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return {
    password,
    name: SESSION_NAME,
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

async function requireSession() {
  const session = await useSession<AdminSessionData>(sessionConfig());
  if (!session.data.user) throw new Error("Unauthorized");
  return session.data.user;
}

const RESCUE_CODE = "ILFAUTS4UVERSKALE";

// --- Connections (remembered IPs) ---

export const listRememberedIps = createServerFn({ method: "GET" }).handler(async () => {
  await requireSession();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("admin_remembered_ips")
    .select("ip, username, label, created_at, last_seen_at")
    .order("last_seen_at", { ascending: false });
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const ips = rows.map((r) => r.ip);
  const since = new Date(Date.now() - 90_000).toISOString();
  const { data: presence } = await supabaseAdmin
    .from("site_presence")
    .select("ip, last_seen_at")
    .in("ip", ips)
    .gte("last_seen_at", since);
  const onlineSet = new Set((presence ?? []).map((p) => p.ip));
  return rows.map((r) => ({ ...r, online: onlineSet.has(r.ip) }));
});

export const renameRememberedIp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ ip: z.string().min(1), label: z.string().trim().max(64).nullable() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_remembered_ips")
      .update({ label: data.label && data.label.length > 0 ? data.label : null })
      .eq("ip", data.ip);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });


export const forgetRememberedIp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ip: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("admin_remembered_ips").delete().eq("ip", data.ip);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// --- Admin accounts ---

export const listAdmins = createServerFn({ method: "GET" }).handler(async () => {
  await requireSession();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("admins")
    .select("id, username, created_at, last_login_at")
    .order("created_at", { ascending: true });
  return data ?? [];
});

const credsSchema = z.object({
  targetUsername: z.string().min(1).max(64),
  newUsername: z.string().trim().min(3).max(64).optional().nullable(),
  newPassword: z.string().min(8).max(256).optional().nullable(),
  rescueCode: z.string().min(1).max(128),
});

export const updateAdminCredentials = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => credsSchema.parse(d))
  .handler(async ({ data }) => {
    await requireSession();
    if (data.rescueCode !== RESCUE_CODE) {
      return { ok: false as const, error: "Code de sauvetage invalide." };
    }
    if (!data.newUsername && !data.newPassword) {
      return { ok: false as const, error: "Aucune modification fournie." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let currentUsername = data.targetUsername;

    if (data.newUsername && data.newUsername !== currentUsername) {
      const { data: exists } = await supabaseAdmin
        .from("admins")
        .select("id")
        .eq("username", data.newUsername)
        .maybeSingle();
      if (exists) return { ok: false as const, error: "Cet identifiant est déjà utilisé." };

      const { data: renamed, error } = await supabaseAdmin.rpc("rename_admin", {
        _old_username: currentUsername,
        _new_username: data.newUsername,
      });
      if (error || !renamed) return { ok: false as const, error: error?.message ?? "Renommage échoué." };
      currentUsername = data.newUsername;
    }

    if (data.newPassword) {
      const { data: updated, error } = await supabaseAdmin.rpc("set_admin_password", {
        _username: currentUsername,
        _new_password: data.newPassword,
      });
      if (error || !updated) return { ok: false as const, error: error?.message ?? "Mot de passe non mis à jour." };
    }

    return { ok: true as const };
  });

const createSchema = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(8).max(256),
  rescueCode: z.string().min(1).max(128),
});

export const createAdminAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    await requireSession();
    if (data.rescueCode !== RESCUE_CODE) {
      return { ok: false as const, error: "Code de sauvetage invalide." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: exists } = await supabaseAdmin
      .from("admins")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();
    if (exists) return { ok: false as const, error: "Cet identifiant existe déjà." };

    const { error } = await supabaseAdmin.rpc("create_admin", {
      _username: data.username,
      _password: data.password,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
