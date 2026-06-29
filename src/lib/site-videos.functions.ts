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
  return { videos: (data ?? []) as PublicVideo[] };
});