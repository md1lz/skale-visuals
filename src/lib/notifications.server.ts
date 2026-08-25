import type { PushPayload } from "./web-push.server";

const MAX_STORED = 8;

/** Deep link used by the service worker when the notification is clicked. */
export function panelUrl(
  role: "admin" | "editor",
  projectId: string | null,
  videoId?: string | null,
): string {
  const base = role === "admin" ? "/crm/admin/projects" : "/crm/editor/projects";
  if (!projectId) return base;
  const v = videoId ? `&v=${videoId}` : "";
  return `${base}?p=${projectId}${v}`;
}

/** Sends a push notification to every registered device of an owner. */
export async function pushTo(
  owner: { type: "admin" | "editor"; id?: string | null },
  payload: PushPayload,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("owner_type", owner.type);
  if (owner.id) query = query.eq("owner_id", owner.id);
  const { data } = await query;
  const subs = data ?? [];
  if (!subs.length) return { sent: 0, failed: 0, devices: 0 };

  const { sendWebPush } = await import("./web-push.server");
  const dead: string[] = [];
  let sent = 0;
  const statuses = await Promise.all(
    subs.map(async (s) => {
      const status = await sendWebPush(s, payload);
      if (status === 404 || status === 410) dead.push(s.id);
      if (status >= 200 && status < 300) sent++;
      return status;
    }),
  );
  if (dead.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", dead);
  return { sent, failed: statuses.length - sent, devices: subs.length };
}

export async function notifyEditor(input: {
  recipient_id: string;
  type: string;
  project_id: string | null;
  message: string;
  push?: PushPayload;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("notifications").insert({
    recipient_type: "editor",
    recipient_id: input.recipient_id,
    type: input.type,
    project_id: input.project_id,
    message: input.message,
  });
  await pruneEditorNotifications(input.recipient_id);
  if (input.push) await pushTo({ type: "editor", id: input.recipient_id }, input.push);
}

export async function pruneEditorNotifications(recipientId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("recipient_type", "editor")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .range(MAX_STORED, MAX_STORED + 200);
  const stale = (data ?? []).map((r) => r.id);
  if (stale.length) await supabaseAdmin.from("notifications").delete().in("id", stale);
}
