import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { normalizeHomeSettings, type HomeContent } from "@/lib/home-content.functions";

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

/** Admin view of the home content: raw references + signed previews. */
export const getHomeAdminContent = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [settingsRes, foldersRes, videosRes] = await Promise.all([
    supabaseAdmin.from("site_settings").select("value").eq("key", "home").maybeSingle(),
    supabaseAdmin.from("home_folders").select("id, label, position").order("position"),
    supabaseAdmin
      .from("home_videos")
      .select("id, folder_id, title, author, source_url, thumbnail_url, position")
      .order("position"),
  ]);

  const settings = normalizeHomeSettings(settingsRes.data?.value);
  const { signAsset } = await import("@/lib/home-assets.server");
  const trustPreviews = await Promise.all(settings.trust.map((t) => signAsset(t.photo)));

  return {
    settings,
    trustPreviews,
    folders: foldersRes.data ?? [],
    videos: videosRes.data ?? [],
  } as HomeContent & { trustPreviews: (string | null)[] };
});

const settingsSchema = z.object({
  videosCount: z.number().int().min(0).max(1_000_000),
  clientsCount: z.number().int().min(0).max(1_000_000),
  plusLabel: z.string().trim().max(16),
  titleStyle: z.enum(["skale", "visuals"]).default("skale"),
  trust: z
    .array(z.object({ name: z.string().trim().max(80), photo: z.string().trim().max(500).nullable() }))
    .max(4),
});

export const saveHomeSettings = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: "home", value: data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------------- folders ---------------- */

export const createHomeFolder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ label: z.string().trim().min(1).max(60) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: maxRow } = await supabaseAdmin
      .from("home_folders")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: row, error } = await supabaseAdmin
      .from("home_folders")
      .insert({ label: data.label, position: (maxRow?.position ?? -1) + 1 })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const renameHomeFolder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), label: z.string().trim().min(1).max(60) }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("home_folders").update({ label: data.label }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteHomeFolder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("home_folders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const reorderHomeFolders = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(100) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all(
      data.ids.map((id, i) => supabaseAdmin.from("home_folders").update({ position: i }).eq("id", id)),
    );
    return { ok: true as const };
  });

/* ---------------- videos ---------------- */

export const createHomeVideo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        folder_id: z.string().uuid(),
        title: z.string().trim().max(200).optional().default(""),
        author: z.string().trim().max(120).optional().default("Skale Visuals"),
        source_url: z.string().trim().max(2000).optional().default(""),
        thumbnail_url: z.string().trim().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: maxRow } = await supabaseAdmin
      .from("home_videos")
      .select("position")
      .eq("folder_id", data.folder_id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: row, error } = await supabaseAdmin
      .from("home_videos")
      .insert({ ...data, position: (maxRow?.position ?? -1) + 1 })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateHomeVideo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().max(200).optional(),
        author: z.string().trim().max(120).optional(),
        source_url: z.string().trim().max(2000).optional(),
        thumbnail_url: z.string().trim().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("home_videos").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteHomeVideo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("home_videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const reorderHomeVideos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(300) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all(
      data.ids.map((id, i) => supabaseAdmin.from("home_videos").update({ position: i }).eq("id", id)),
    );
    return { ok: true as const };
  });

/* ---------------- uploads ---------------- */

export const createHomeAssetUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ filename: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { createAssetUploadUrl } = await import("@/lib/home-assets.server");
    return createAssetUploadUrl(data.filename);
  });

/** Signed upload URL for a realisation video file (site-videos bucket). */
export const createHomeVideoUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ filename: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { toStorageReference } = await import("@/lib/video-storage.server");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `home/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("site-videos")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Upload URL failed");
    return { uploadUrl: signed.signedUrl, token: signed.token, path, reference: toStorageReference(path) };
  });
