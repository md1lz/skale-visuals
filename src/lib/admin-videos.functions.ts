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

async function requireAdmin() {
  const session = await useSession<AdminSessionData>(sessionConfig());
  if (!session.data.user) throw new Error("Unauthorized");
  return session.data.user;
}

const FormatEnum = z.enum(["court", "long", "miniature"]);

// ---- list all (admin) ----
export const listAllVideos = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: carousels } = await supabaseAdmin
    .from("site_carousels")
    .select("key, label, description, position, media_kind, aspect, show_title, show_source")
    .order("position");
  const { data: videos } = await supabaseAdmin
    .from("site_videos")
    .select("id, carousel_key, title, source_url, source_label, thumbnail_url, format, visible, position")
    .order("position");
  const rows = (videos ?? []) as Array<{ source_url: string; thumbnail_url: string | null }>;
  const { addPlaybackUrls } = await import("@/lib/video-storage.server");
  await addPlaybackUrls(rows);
  return { carousels: carousels ?? [], videos: videos ?? [] };
});

// ---- create ----
const createSchema = z.object({
  carousel_key: z.string().min(1).max(64),
  title: z.string().trim().max(200).optional().default(""),
  source_url: z.string().trim().max(2000).optional().default(""),
  thumbnail_url: z.string().trim().max(2000).optional().nullable(),
  format: FormatEnum.default("long"),
  visible: z.boolean().default(true),
});

export const createVideo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: maxRow } = await supabaseAdmin
      .from("site_videos")
      .select("position")
      .eq("carousel_key", data.carousel_key)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = (maxRow?.position ?? -1) + 1;
    const { data: row, error } = await supabaseAdmin
      .from("site_videos")
      .insert({ ...data, position: nextPos })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---- update ----
const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().max(200).optional(),
  source_url: z.string().trim().max(2000).optional(),
  source_label: z.string().trim().max(200).optional(),
  thumbnail_url: z.string().trim().max(2000).optional().nullable(),
  format: FormatEnum.optional(),
  visible: z.boolean().optional(),
});

export const updateVideo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("site_videos").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- delete ----
export const deleteVideo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("site_videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- reorder (full ordered list of ids inside a carousel) ----
export const reorderVideos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ carousel_key: z.string().min(1).max(64), ids: z.array(z.string().uuid()).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all(
      data.ids.map((id, i) =>
        supabaseAdmin.from("site_videos").update({ position: i }).eq("id", id).eq("carousel_key", data.carousel_key),
      ),
    );
    return { ok: true as const };
  });

// ---- signed upload URL ----
export const createVideoUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ filename: z.string().min(1).max(200), contentType: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("site-videos")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Upload URL failed");
    // Bucket is private: store a stable internal reference in the database,
    // but return a signed playback URL for the immediate admin preview.
    const { data: pub } = await supabaseAdmin.storage
      .from("site-videos")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    const { toStorageReference } = await import("@/lib/video-storage.server");
    return {
      uploadUrl: signed.signedUrl,
      token: signed.token,
      path,
      publicUrl: toStorageReference(path),
      playbackUrl: pub?.signedUrl ?? "",
    };
  });

export const createVideoPlaybackUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createVideoSignedUrl } = await import("@/lib/video-storage.server");
    return { playbackUrl: await createVideoSignedUrl(data.path) };
  });