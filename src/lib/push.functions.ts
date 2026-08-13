import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const subSchema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
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
      },
      { onConflict: "endpoint" },
    );
    return { ok: true as const };
  });
