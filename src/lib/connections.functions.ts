import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type RememberedConnection = {
  id: string;
  ip: string;
  username: string;
  label: string | null;
  source: "web" | "app";
  ownerType: "admin" | "editor";
  ownerName: string;
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

    const editorIds = Array.from(
      new Set(list.filter((r) => r.owner_type === "editor" && r.owner_id).map((r) => r.owner_id as string)),
    );
    const names = new Map<string, string>();
    if (editorIds.length > 0) {
      const { data: editors } = await supabaseAdmin
        .from("editor_accounts")
        .select("id, display_name")
        .in("id", editorIds);
      for (const e of editors ?? []) names.set(e.id, e.display_name);
    }

    const onlineThreshold = Date.now() - 90_000;

    return list.map((r) => ({
      id: r.id,
      ip: r.ip,
      username: r.username,
      label: r.label,
      source: (r.source === "app" ? "app" : "web") as "web" | "app",
      ownerType: (r.owner_type === "editor" ? "editor" : "admin") as "admin" | "editor",
      ownerName:
        r.owner_type === "editor" ? names.get(r.owner_id ?? "") ?? r.username : r.username,
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at,
      online: new Date(r.last_seen_at).getTime() >= onlineThreshold,
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

export const pingConnection = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => sourceSchema.parse(d))
  .handler(async ({ data }) => {
    const caller = await resolveCaller();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const ip = (() => {
      try {
        const fwd = getRequestHeader("x-forwarded-for");
        return fwd ? fwd.split(",")[0]!.trim() : getRequestHeader("cf-connecting-ip") ?? null;
      } catch {
        return null;
      }
    })();
    if (!ip) return { ok: false as const };

    let q = supabaseAdmin
      .from("admin_remembered_ips")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("ip", ip)
      .eq("source", data.source);
    q = caller.role === "editor"
      ? q.eq("owner_type", "editor").eq("owner_id", caller.id)
      : q.eq("owner_type", "admin").eq("username", caller.username);
    await q;
    return { ok: true as const };
  });
