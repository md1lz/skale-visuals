import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type TrustClient = { name: string; photo: string | null };

export type HomeSettings = {
  videosCount: number;
  clientsCount: number;
  trust: TrustClient[];
  plusLabel: string;
  titleStyle: "skale" | "visuals";
};

export type HomeFolder = { id: string; label: string; position: number };

export type HomeVideo = {
  id: string;
  folder_id: string;
  title: string;
  author: string;
  source_url: string;
  thumbnail_url: string | null;
  position: number;
};

export const DEFAULT_HOME_SETTINGS: HomeSettings = {
  videosCount: 200,
  clientsCount: 50,
  trust: [
    { name: "Client 1", photo: null },
    { name: "Client 2", photo: null },
    { name: "Client 3", photo: null },
    { name: "Client 4", photo: null },
  ],
  plusLabel: "+50",
  titleStyle: "skale",
};

export function normalizeHomeSettings(raw: unknown): HomeSettings {
  const v = (raw ?? {}) as Partial<HomeSettings>;
  const trust = Array.isArray(v.trust) ? v.trust.slice(0, 4) : [];
  while (trust.length < 4) trust.push({ name: `Client ${trust.length + 1}`, photo: null });
  return {
    videosCount: Number.isFinite(Number(v.videosCount)) ? Number(v.videosCount) : DEFAULT_HOME_SETTINGS.videosCount,
    clientsCount: Number.isFinite(Number(v.clientsCount))
      ? Number(v.clientsCount)
      : DEFAULT_HOME_SETTINGS.clientsCount,
    trust: trust.map((t) => ({ name: (t?.name ?? "").toString(), photo: t?.photo ?? null })),
    plusLabel: (v.plusLabel ?? DEFAULT_HOME_SETTINGS.plusLabel).toString(),
    titleStyle: v.titleStyle === "visuals" ? "visuals" : "skale",
  };
}

export type HomeContent = {
  settings: HomeSettings;
  folders: HomeFolder[];
  videos: HomeVideo[];
};

export const getHomeContent = createServerFn({ method: "GET" }).handler(async (): Promise<HomeContent> => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { settings: DEFAULT_HOME_SETTINGS, folders: [], videos: [] };
  const sb = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const [settingsRes, foldersRes, videosRes] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "home").maybeSingle(),
    sb.from("home_folders").select("id, label, position").order("position"),
    sb
      .from("home_videos")
      .select("id, folder_id, title, author, source_url, thumbnail_url, position")
      .order("position"),
  ]);

  const settings = normalizeHomeSettings(settingsRes.data?.value);
  const videos = (videosRes.data ?? []) as HomeVideo[];

  const { signAsset } = await import("@/lib/home-assets.server");
  const { signStorageUrls } = await import("@/lib/video-storage.server");
  await signStorageUrls(videos);
  await Promise.all(
    videos.map(async (v) => {
      v.source_url = (await signAsset(v.source_url)) ?? "";
      v.thumbnail_url = await signAsset(v.thumbnail_url);
    }),
  );
  settings.trust = await Promise.all(
    settings.trust.map(async (t) => ({ ...t, photo: await signAsset(t.photo) })),
  );

  return { settings, folders: (foldersRes.data ?? []) as HomeFolder[], videos };
});
