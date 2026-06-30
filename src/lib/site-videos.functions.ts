import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicVideo = {
  id: string;
  carousel_key: string;
  title: string;
  source_url: string;
  source_label: string;
  thumbnail_url: string | null;
  format: "court" | "long" | "miniature";
  position: number;
};

export const listPublicVideos = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { videos: [] as PublicVideo[] };
  const sb = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb
    .from("site_videos")
    .select("id, carousel_key, title, source_url, source_label, thumbnail_url, format, position")
    .eq("visible", true)
    .order("position");
  const videos = (data ?? []) as PublicVideo[];
  await signStorageUrls(videos);
  return { videos };
});

export type AdminVideoWithPlayback = PublicVideo & {
  visible: boolean;
  playback_url: string;
  thumbnail_playback_url: string | null;
};

// Re-sign any URL that points at our private "site-videos" bucket so the
// <video>/<iframe> in the browser can actually fetch the bytes.
export async function signStorageUrls(
  rows: Array<{ source_url: string; thumbnail_url: string | null }>,
) {
  const needs = rows.some(
    (r) =>
      extractStoragePath(r.source_url) || (r.thumbnail_url && extractStoragePath(r.thumbnail_url)),
  );
  if (!needs) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const EXPIRY = 60 * 60 * 24 * 7; // 7 days
  await Promise.all(
    rows.map(async (r) => {
      const sp = extractStoragePath(r.source_url);
      if (sp) {
        const { data: s } = await supabaseAdmin.storage.from("site-videos").createSignedUrl(sp, EXPIRY);
        if (s?.signedUrl) r.source_url = s.signedUrl;
      }
      if (r.thumbnail_url) {
        const tp = extractStoragePath(r.thumbnail_url);
        if (tp) {
          const { data: s } = await supabaseAdmin.storage.from("site-videos").createSignedUrl(tp, EXPIRY);
          if (s?.signedUrl) r.thumbnail_url = s.signedUrl;
        }
      }
    }),
  );
}

export async function addPlaybackUrls<
  T extends { source_url: string; thumbnail_url: string | null; playback_url?: string; thumbnail_playback_url?: string | null },
>(rows: T[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const EXPIRY = 60 * 60 * 24 * 7;
  await Promise.all(
    rows.map(async (r) => {
      const sp = extractStoragePath(r.source_url);
      r.playback_url = r.source_url;
      if (sp) {
        r.source_url = toStorageReference(sp);
        const { data: s } = await supabaseAdmin.storage.from("site-videos").createSignedUrl(sp, EXPIRY);
        if (s?.signedUrl) r.playback_url = s.signedUrl;
      }

      r.thumbnail_playback_url = r.thumbnail_url;
      const tp = extractStoragePath(r.thumbnail_url);
      if (tp) {
        r.thumbnail_url = toStorageReference(tp);
        const { data: s } = await supabaseAdmin.storage.from("site-videos").createSignedUrl(tp, EXPIRY);
        if (s?.signedUrl) r.thumbnail_playback_url = s.signedUrl;
      }
    }),
  );
}

export function toStorageReference(path: string) {
  return `storage://site-videos/${path}`;
}

function extractStoragePath(u: string | null | undefined): string | null {
  if (!u) return null;
  const ref = u.match(/^storage:\/\/site-videos\/(.+)$/);
  if (ref) return decodeURIComponent(ref[1]);
  const m = u.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/site-videos\/([^?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}