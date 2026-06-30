import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VIDEO_BUCKET = "site-videos";
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 7;

type StorageUrlRow = { source_url: string; thumbnail_url: string | null };

export function toStorageReference(path: string) {
  return `storage://${VIDEO_BUCKET}/${path}`;
}

export function extractStoragePath(u: string | null | undefined): string | null {
  if (!u) return null;
  const ref = u.match(/^storage:\/\/site-videos\/(.+)$/);
  if (ref) return decodeURIComponent(ref[1]);
  const m = u.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/site-videos\/([^?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function signStorageUrls(rows: StorageUrlRow[]) {
  const needs = rows.some(
    (r) => extractStoragePath(r.source_url) || (r.thumbnail_url && extractStoragePath(r.thumbnail_url)),
  );
  if (!needs) return;

  await Promise.all(
    rows.map(async (r) => {
      const sp = extractStoragePath(r.source_url);
      if (sp) {
        const { data: s } = await supabaseAdmin.storage.from(VIDEO_BUCKET).createSignedUrl(sp, SIGNED_URL_EXPIRY);
        if (s?.signedUrl) r.source_url = s.signedUrl;
      }

      const tp = extractStoragePath(r.thumbnail_url);
      if (tp) {
        const { data: s } = await supabaseAdmin.storage.from(VIDEO_BUCKET).createSignedUrl(tp, SIGNED_URL_EXPIRY);
        if (s?.signedUrl) r.thumbnail_url = s.signedUrl;
      }
    }),
  );
}

export async function addPlaybackUrls<
  T extends { source_url: string; thumbnail_url: string | null; playback_url?: string; thumbnail_playback_url?: string | null },
>(rows: T[]) {
  await Promise.all(
    rows.map(async (r) => {
      const sp = extractStoragePath(r.source_url);
      r.playback_url = r.source_url;
      if (sp) {
        r.source_url = toStorageReference(sp);
        const { data: s } = await supabaseAdmin.storage.from(VIDEO_BUCKET).createSignedUrl(sp, SIGNED_URL_EXPIRY);
        if (s?.signedUrl) r.playback_url = s.signedUrl;
      }

      r.thumbnail_playback_url = r.thumbnail_url;
      const tp = extractStoragePath(r.thumbnail_url);
      if (tp) {
        r.thumbnail_url = toStorageReference(tp);
        const { data: s } = await supabaseAdmin.storage.from(VIDEO_BUCKET).createSignedUrl(tp, SIGNED_URL_EXPIRY);
        if (s?.signedUrl) r.thumbnail_playback_url = s.signedUrl;
      }
    }),
  );
}

export async function createVideoSignedUrl(path: string) {
  const { data, error } = await supabaseAdmin.storage.from(VIDEO_BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Preview URL failed");
  return data.signedUrl;
}