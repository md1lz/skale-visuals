import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { normalizeAbout, type AboutContent } from "@/lib/about-content.shared";

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

export const getAboutAdminContent = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "about")
    .maybeSingle();
  const about = normalizeAbout(data?.value);
  const { signAsset } = await import("@/lib/home-assets.server");
  const photoPreviews = await Promise.all(about.founders.map((f) => signAsset(f.photo)));
  return { about, photoPreviews } as { about: AboutContent; photoPreviews: (string | null)[] };
});

const founderSchema = z.object({
  name: z.string().trim().max(120),
  role: z.string().trim().max(160),
  bio: z.string().trim().max(4000),
  photo: z.string().trim().max(500).nullable(),
});

const aboutSchema = z.object({
  introTitle: z.string().trim().max(200),
  introText: z.string().trim().max(1200),
  founders: z.tuple([founderSchema, founderSchema]),
  storyTitle: z.string().trim().max(200),
  storyText: z.string().trim().max(3000),
  visionTitle: z.string().trim().max(200),
  visionText: z.string().trim().max(3000),
  valuesTitle: z.string().trim().max(200),
  values: z
    .array(
      z.object({
        emoji: z.string().trim().max(8),
        title: z.string().trim().max(80),
        text: z.string().trim().max(300),
      }),
    )
    .max(3),
  teamTitle: z.string().trim().max(200),
  teamText: z.string().trim().max(3000),
  ctaTitle: z.string().trim().max(200),
  ctaButton: z.string().trim().max(80),
});

export const saveAboutContent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => aboutSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: "about", value: data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
