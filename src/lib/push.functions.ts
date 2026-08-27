import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const subSchema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  userAgent: z.string().max(400).optional(),
});

/** Public VAPID key (safe to expose); empty when push sending isn't configured yet. */
export const getPushConfig = createServerFn({ method: "GET" }).handler(async () => ({
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
}));

export const savePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => subSchema.parse(d))
  .handler(async ({ data }) => {
    const { getAdminSessionFn } = await import("./admin-auth.functions");
    const { readEditorSession } = await import("./auth-sessions.server");

    const admin = await getAdminSessionFn();
    const editor = admin ? null : await readEditorSession();
    if (!admin && !editor) return { ok: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_subscriptions").upsert(
      {
        owner_type: admin ? "admin" : "editor",
        owner_id: admin ? admin.user : editor!.editorId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    return { ok: true as const };
  });

/** Heartbeat: marks the current app device as online. */
export const pingAppDevice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ endpoint: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("push_subscriptions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("endpoint", data.endpoint);
    return { ok: true as const };
  });

const testSchema = z.object({
  body: z.string().trim().min(1).max(300),
  url: z.string().trim().max(500).optional().default("/office"),
  target: z
    .object({ type: z.enum(["admin", "editor"]), id: z.string().min(1) })
    .nullable()
    .optional(),
});

/** Human-readable device label derived from the stored user agent. */
function deviceLabel(ua: string | null): string {
  if (!ua) return "Appareil inconnu";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : "Autre";
  const browser = /CriOS|Chrome/.test(ua)
    ? "Chrome"
    : /Firefox/.test(ua)
      ? "Firefox"
      : /Safari/.test(ua)
        ? "Safari"
        : "Navigateur";
  return `${os} · ${browser}`;
}

/** Devices registered for push. Admins see everyone, editors only their own. */
export const listPushDevices = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdminSessionFn } = await import("./admin-auth.functions");
  const { readEditorSession } = await import("./auth-sessions.server");

  const admin = await getAdminSessionFn();
  const editor = admin ? null : await readEditorSession();
  if (!admin && !editor) throw new Error("Unauthorized");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("push_subscriptions")
    .select("id, owner_type, owner_id, user_agent, created_at, last_seen_at")
    .order("last_seen_at", { ascending: false });
  if (!admin) query = query.eq("owner_type", "editor").eq("owner_id", editor!.editorId);
  const { data } = await query;
  const all = data ?? [];
  // One entry per real device (same owner + same device signature), keeping the
  // most recently active registration instead of one row per re-subscription.
  const seen = new Set<string>();
  const rows = all.filter((r) => {
    const key = `${r.owner_type}:${r.owner_id}:${r.user_agent ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const editorIds = [...new Set(rows.filter((r) => r.owner_type === "editor").map((r) => r.owner_id))];
  const names = new Map<string, string>();
  const lastLogins = new Map<string, string | null>();
  if (editorIds.length) {
    const { data: eds } = await supabaseAdmin
      .from("editor_accounts")
      .select("id, username, display_name, last_login_at")
      .in("id", editorIds);
    for (const e of eds ?? []) {
      names.set(e.id, e.display_name || e.username);
      lastLogins.set(`editor:${e.id}`, e.last_login_at);
    }
  }
  const adminIds = [...new Set(rows.filter((r) => r.owner_type === "admin").map((r) => r.owner_id))];
  if (adminIds.length) {
    const { data: ads } = await supabaseAdmin
      .from("admins")
      .select("username, last_login_at")
      .in("username", adminIds);
    for (const a of ads ?? []) lastLogins.set(`admin:${a.username}`, a.last_login_at);
  }

  return {
    isAdmin: !!admin,
    self: admin
      ? { type: "admin" as const, id: admin.user, name: admin.user }
      : { type: "editor" as const, id: editor!.editorId, name: names.get(editor!.editorId) ?? "Moi" },
    devices: rows.map((r) => ({
      id: r.id,
      ownerType: r.owner_type as "admin" | "editor",
      ownerId: r.owner_id,
      ownerName: r.owner_type === "admin" ? r.owner_id : (names.get(r.owner_id) ?? "Monteur"),
      device: deviceLabel(r.user_agent),
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at ?? r.created_at,
      online: Date.now() - new Date(r.last_seen_at ?? r.created_at).getTime() < 90_000,
      lastLoginAt: lastLogins.get(`${r.owner_type}:${r.owner_id}`) ?? null,
    })),
  };
});

/** Removes a registered app device (admin only, or the editor's own device). */
export const forgetPushDevice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { getAdminSessionFn } = await import("./admin-auth.functions");
    const { readEditorSession } = await import("./auth-sessions.server");

    const admin = await getAdminSessionFn();
    const editor = admin ? null : await readEditorSession();
    if (!admin && !editor) throw new Error("Unauthorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("push_subscriptions").delete().eq("id", data.id);
    if (!admin) q = q.eq("owner_type", "editor").eq("owner_id", editor!.editorId);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Sends a test push notification to the chosen recipient (self by default). */
export const sendTestPush = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => testSchema.parse(d))
  .handler(async ({ data }) => {
    const { getAdminSessionFn } = await import("./admin-auth.functions");
    const { readEditorSession } = await import("./auth-sessions.server");

    const admin = await getAdminSessionFn();
    const editor = admin ? null : await readEditorSession();
    if (!admin && !editor) throw new Error("Unauthorized");

    const self = admin
      ? { type: "admin" as const, id: admin.user }
      : { type: "editor" as const, id: editor!.editorId };
    // Only admins may target another account.
    const target = admin && data.target ? data.target : self;

    const { pushTo } = await import("./notifications.server");
    const res = await pushTo(
      target,
      { title: "from Skale Office", body: data.body, url: data.url || "/office", tag: `test-${Date.now()}` },
    );
    if (!res || res.devices === 0)
      throw new Error("Aucun appareil enregistré pour ce destinataire.");
    if (res.sent === 0) throw new Error("Envoi refusé par le service de notifications.");
    return { ok: true as const, sent: res.sent };
  });
