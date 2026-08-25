import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ASSET_BUCKET = "site-assets";
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 7;

export function toAssetReference(path: string) {
  return `asset://${ASSET_BUCKET}/${path}`;
}

export function extractAssetPath(u: string | null | undefined): string | null {
  if (!u) return null;
  const ref = u.match(/^asset:\/\/site-assets\/(.+)$/);
  if (ref) return decodeURIComponent(ref[1]);
  return null;
}

export async function signAsset(u: string | null | undefined): Promise<string | null> {
  if (!u) return null;
  const path = extractAssetPath(u);
  if (!path) return u;
  const { data } = await supabaseAdmin.storage.from(ASSET_BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY);
  return data?.signedUrl ?? null;
}

export async function createAssetUploadUrl(filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const { data, error } = await supabaseAdmin.storage.from(ASSET_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Upload URL failed");
  const { data: signed } = await supabaseAdmin.storage
    .from(ASSET_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);
  return {
    uploadUrl: data.signedUrl,
    token: data.token,
    path,
    reference: toAssetReference(path),
    previewUrl: signed?.signedUrl ?? "",
  };
}
