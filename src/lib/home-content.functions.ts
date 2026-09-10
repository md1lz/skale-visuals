import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type TrustClient = { name: string; photo: string | null };
export type CompanyLogo = { name: string; logo: string | null };
export type CreatorProfile = { name: string; audience: string; photo: string | null };
export type HomeTestimonial = { name: string; role: string; photo: string | null; quote: string };
export type ProjectRecap = {
  image: string | null;
  badge: string;
  title: string;
  description: string;
  avatar: string | null;
};

export type HomeSettings = {
  videosCount: number;
  clientsCount: number;
  trust: TrustClient[];
  companies: CompanyLogo[];
  creators: CreatorProfile[];
  testimonial: HomeTestimonial;
  plusLabel: string;
  projects: ProjectRecap[];
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
  companies: [],
  creators: [],
  testimonial: {
    name: "",
    role: "",
    photo: null,
    quote: "J'ai adoré l'approche de Skale\u00A0Visuals\npour notre deal",
  },
  plusLabel: "+50",
  projects: [
    {
      image: null,
      badge: "Montage vidéo",
      title: "VSL YouTube ultra-convertissant",
      description: "Un format long réédité pour accrocher dès la première seconde et guider le spectateur jusqu’à l’action.",
      avatar: null,
    },
    {
      image: null,
      badge: "Design & Miniatures",
      title: "Identité visuelle complète",
      description: "Miniatures, overlays et assets graphiques cohérents pour renforcer la reconnaissance de la chaîne.",
      avatar: null,
    },
  ],
};

export function normalizeHomeSettings(raw: unknown): HomeSettings {
  const v = (raw ?? {}) as Partial<HomeSettings>;
  const trust = Array.isArray(v.trust) ? v.trust.slice(0, 4) : [];
  while (trust.length < 4) trust.push({ name: `Client ${trust.length + 1}`, photo: null });
  const companies = Array.isArray(v.companies) ? v.companies.slice(0, 24) : [];
  const creators = Array.isArray(v.creators) ? v.creators.slice(0, 24) : [];
  const projects = Array.isArray(v.projects) ? v.projects.slice(0, 2) : [];
  while (projects.length < 2) projects.push({ ...DEFAULT_HOME_SETTINGS.projects[projects.length] });
  return {
    videosCount: Number.isFinite(Number(v.videosCount)) ? Number(v.videosCount) : DEFAULT_HOME_SETTINGS.videosCount,
    clientsCount: Number.isFinite(Number(v.clientsCount))
      ? Number(v.clientsCount)
      : DEFAULT_HOME_SETTINGS.clientsCount,
    trust: trust.map((t) => ({ name: (t?.name ?? "").toString(), photo: t?.photo ?? null })),
    companies: companies.map((company) => ({
      name: (company?.name ?? "").toString(),
      logo: company?.logo ?? null,
    })),
    creators: creators.map((creator) => ({
      name: (creator?.name ?? "").toString(),
      audience: ((creator as CreatorProfile & { followers?: string })?.audience ??
        (creator as CreatorProfile & { followers?: string })?.followers ??
        "").toString(),
      photo: creator?.photo ?? null,
    })),
    testimonial: {
      name: ((v.testimonial as HomeTestimonial | undefined)?.name ?? "").toString(),
      role: ((v.testimonial as HomeTestimonial | undefined)?.role ?? "").toString(),
      photo: (v.testimonial as HomeTestimonial | undefined)?.photo ?? null,
      quote: (
        (v.testimonial as HomeTestimonial | undefined)?.quote ?? DEFAULT_HOME_SETTINGS.testimonial.quote
      ).toString(),
    },
    plusLabel: (v.plusLabel ?? DEFAULT_HOME_SETTINGS.plusLabel).toString(),
    projects: projects.map((p) => ({
      image: (p as ProjectRecap | undefined)?.image ?? null,
      badge: ((p as ProjectRecap | undefined)?.badge ?? "").toString(),
      title: ((p as ProjectRecap | undefined)?.title ?? "").toString(),
      description: ((p as ProjectRecap | undefined)?.description ?? "").toString(),
      avatar: (p as ProjectRecap | undefined)?.avatar ?? null,
    })),
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
  settings.companies = await Promise.all(
    settings.companies.map(async (company) => ({ ...company, logo: await signAsset(company.logo) })),
  );
  settings.creators = await Promise.all(
    settings.creators.map(async (creator) => ({ ...creator, photo: await signAsset(creator.photo) })),
  );

  settings.testimonial = {
    ...settings.testimonial,
    photo: await signAsset(settings.testimonial.photo),
  };

  return { settings, folders: (foldersRes.data ?? []) as HomeFolder[], videos };
});
