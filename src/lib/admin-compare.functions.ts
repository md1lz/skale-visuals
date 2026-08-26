import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { normalizeCompare, type CompareContent } from "@/lib/compare-content.shared";

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

export const getCompareAdminContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<CompareContent> => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "compare")
      .maybeSingle();
    return normalizeCompare(data?.value);
  },
);

const compareSchema = z.object({
  badge: z.string().trim().max(120),
  title: z.string().trim().max(200),
  subtitle: z.string().trim().max(600),
  otherLabel: z.string().trim().max(80),
  skaleLabel: z.string().trim().max(80),
  rows: z
    .array(
      z.object({
        criterion: z.string().trim().max(80),
        other: z.string().trim().max(400),
        skaleTitle: z.string().trim().max(160),
        skaleText: z.string().trim().max(400),
      }),
    )
    .max(30),
});

export const saveCompareContent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => compareSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: "compare", value: data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
