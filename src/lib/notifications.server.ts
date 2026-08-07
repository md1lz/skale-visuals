const MAX_STORED = 8;

export async function notifyEditor(input: {
  recipient_id: string;
  type: string;
  project_id: string | null;
  message: string;
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
