import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type RememberedConnection = {
  id: string;
  ip: string;
  username: string;
  label: string | null;
  source: "web" | "app";
  ownerType: "admin" | "editor";
  createdAt: string;
  lastSeenAt: string;
  online: boolean;
};

type Caller =
  | { role: "admin"; username: string }
  | { role: "editor"; id: string; username: string };

async function resolveCaller(): Promise<Caller> {
  const { readEditorSession, requireAdminUser } = await import("./auth-sessions.server");
  try {
    const username = await requireAdminUser();
    return { role: "admin", username };
  } catch {
    /* not an admin */
  }
  const editor = await readEditorSession();
  if (editor) return { role: "editor", id: editor.editorId, username: editor.username };
  throw new Error("Unauthorized");
}

const sourceSchema = z.object({ source: z.enum(["web", "app"]) });

export const listConnections = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => sourceSchema.parse(d))
  .handler(async ({ data }): Promise<RememberedConnection[]> => {
    const caller = await resolveCaller();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("admin_remembered_ips")
      .select("id, ip, username, label, source, owner_type, owner_id, created_at, last_seen_at")
      .eq("source", data.source)
      .order("last_seen_at", { ascending: false });

    if (caller.role === "editor") {
      query = query.eq("owner_type", "editor").eq("owner_id", caller.id);
    }

    const { data: rows } = await query;
    const list = rows ?? [];
    if (list.length === 0) return [];

    const since = new Date(Date.now() - 90_000).toISOString();
    const { data: presence } = await supabaseAdmin
      .from("site_presence")
      .select("ip, last_seen_at")
      .in("ip", list.map((r) => r.ip))
      .gte("last_seen_at", since);
    const online = new Set((presence ?? []).map((p) => p.ip));

    return list.map((r) => ({
      id: r.id,
      ip: r.ip,
      username: r.username,
      label: r.label,
      source: (r.source === "app" ? "app" : "web") as "web" | "app",
      ownerType: (r.owner_type === "editor" ? "editor" : "admin") as "admin" | "editor",
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at,
      online: online.has(r.ip),
    }));
  });

async function assertOwnership(id: string) {
  const caller = await resolveCaller();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("admin_remembered_ips")
    .select("id, owner_type, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) throw new Error("Introuvable");
  if (caller.role === "editor" && (row.owner_type !== "editor" || row.owner_id !== caller.id)) {
    throw new Error("Unauthorized");
  }
  return supabaseAdmin;
}

export const renameConnection = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().min(1), label: z.string().trim().max(64).nullable() }).parse(d),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await assertOwnership(data.id);
    const { error } = await supabaseAdmin
      .from("admin_remembered_ips")
      .update({ label: data.label && data.label.length > 0 ? data.label : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const forgetConnection = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const supabaseAdmin = await assertOwnership(data.id);
    const { error } = await supabaseAdmin.from("admin_remembered_ips").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
