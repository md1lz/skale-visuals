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

async function requireSession() {
  const session = await useSession<AdminSessionData>(sessionConfig());
  if (!session.data.user) throw new Error("Unauthorized");
  return session.data.user;
}

const DEFAULT_MESSAGE =
  "Nous effectuons actuellement une maintenance. Merci de revenir un peu plus tard.";

export type MaintenanceStatus = { enabled: boolean; message: string };

export const getMaintenanceStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<MaintenanceStatus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "maintenance")
      .maybeSingle();
    const v = (data?.value ?? {}) as Partial<MaintenanceStatus>;
    return {
      enabled: !!v.enabled,
      message: (v.message ?? "").trim() || DEFAULT_MESSAGE,
    };
  },
);

export const setMaintenanceStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        enabled: z.boolean(),
        message: z.string().trim().max(500).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const value = {
      enabled: data.enabled,
      message: data.message?.trim() || DEFAULT_MESSAGE,
    };
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: "maintenance", value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const, value };
  });