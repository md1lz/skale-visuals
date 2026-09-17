import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type TrustClient = { name: string; photo: string | null };
export type CompanyLogo = { name: string; logo: string | null };
export type FooterLogo = { name: string; logo: string | null };
export type CreatorProfile = { name: string; audience: string; photo: string | null };
export type HomeTestimonial = { name: string; role: string; photo: string | null; quote: string };
export type ProjectRecap = {
  image: string | null;
  badge: string;
  title: string;
  description: string;
  avatar: string | null;
};

export type ServiceCard = {
  image: string | null;
  title: string;
  description: string;
};

export type ServiceHeader = {
  image: string | null;
  title: string;
  description: string;
  primaryCta: string;
  primaryLink: string;
  secondaryCta: string;
  secondaryLink: string;
};

export type ClientPromo = {
  enabled: boolean;
  title: string;
  text: string;
  cta: string;
  link: string;
};

export type HomeSettings = {
  videosCount: number;
  clientsCount: number;
  trust: TrustClient[];
  companies: CompanyLogo[];
  creators: CreatorProfile[];
  footerLogos: FooterLogo[];
  testimonial: HomeTestimonial;
  plusLabel: string;
  projects: ProjectRecap[];
  serviceCards: ServiceCard[];
  serviceHeader: ServiceHeader;
  clientCarouselTop: (string | null)[];
  clientCarouselBottom: (string | null)[];
  clientPromo: ClientPromo;
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
  footerLogos: [],
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
      badge: "Clipping vidéo",
      title: "Formats courts ultra-dynamiques",
      description: "Des extraits courts pensés pour capter l’attention, maximiser la rétention et multiplier ta présence sur les réseaux.",
      avatar: null,
    },
  ],
  serviceCards: [
    {
      image: null,
      title: "Le **montage stratégique**, conçu pour **convertir**.",
      description:
        "Vidéos ultra-efficaces qui accrochent dès les premières secondes, retiennent l’attention et poussent chaque vue à l’action.",
    },
    {
      image: null,
      title: "Le **clipping**, conçu pour **capter** et **convertir**.",
      description:
        "Des formats courts percutants, extraits de tes contenus longs pour accrocher dès les premières secondes et toucher une audience plus large.",
    },
  ],
  serviceHeader: {
    image: null,
    title: "Le montage stratégique, conçu pour convertir.",
    description: "Vidéos ultra-efficaces qui accrochent dès les premières secondes, retiennent l’attention et poussent chaque vue à l’action.",
    primaryCta: "Réserver un appel",
    primaryLink: "/bookacall",
    secondaryCta: "Voir nos projets",
    secondaryLink: "/#projets",
  },
  clientCarouselTop: [],
  clientCarouselBottom: [],
  clientPromo: {
    enabled: true,
    title: "Besoin de plus de contenu ?",
    text: "Ajoutez un pack de montages à votre offre et publiez encore plus vite.",
    cta: "Réserver un appel",
    link: "https://skalevisuals.com/bookacall",
  },
};

export function normalizeHomeSettings(raw: unknown): HomeSettings {
  const v = (raw ?? {}) as Partial<HomeSettings>;
  const trust = Array.isArray(v.trust) ? v.trust.slice(0, 4) : [];
  while (trust.length < 4) trust.push({ name: `Client ${trust.length + 1}`, photo: null });
  const companies = Array.isArray(v.companies) ? v.companies.slice(0, 24) : [];
  const creators = Array.isArray(v.creators) ? v.creators.slice(0, 24) : [];
  const footerLogos = Array.isArray(v.footerLogos) ? v.footerLogos.slice(0, 24) : [];
  const projects = Array.isArray(v.projects) ? v.projects.slice(0, 2) : [];
  while (projects.length < 2) projects.push({ ...DEFAULT_HOME_SETTINGS.projects[projects.length] });
  const serviceCards = Array.isArray(v.serviceCards) ? v.serviceCards.slice(0, 2) : [];
  const clientCarouselTop = Array.isArray(v.clientCarouselTop) ? v.clientCarouselTop.slice(0, 16) : [];
  const clientCarouselBottom = Array.isArray(v.clientCarouselBottom) ? v.clientCarouselBottom.slice(0, 16) : [];
  while (serviceCards.length < 2)
    serviceCards.push({ ...DEFAULT_HOME_SETTINGS.serviceCards[serviceCards.length] });
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
    footerLogos: footerLogos.map((item) => ({
      name: (item?.name ?? "").toString(),
      logo: item?.logo ?? null,
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
    serviceCards: serviceCards.map((c, i) => ({
      image: (c as ServiceCard | undefined)?.image ?? null,
      title: ((c as ServiceCard | undefined)?.title ?? DEFAULT_HOME_SETTINGS.serviceCards[i].title).toString(),
      description: (
        (c as ServiceCard | undefined)?.description ?? DEFAULT_HOME_SETTINGS.serviceCards[i].description
      ).toString(),
    })),
    serviceHeader: {
      image: (v.serviceHeader as ServiceHeader | undefined)?.image ?? DEFAULT_HOME_SETTINGS.serviceHeader.image,
      title: ((v.serviceHeader as ServiceHeader | undefined)?.title ?? DEFAULT_HOME_SETTINGS.serviceHeader.title).toString(),
      description: ((v.serviceHeader as ServiceHeader | undefined)?.description ?? DEFAULT_HOME_SETTINGS.serviceHeader.description).toString(),
      primaryCta: ((v.serviceHeader as ServiceHeader | undefined)?.primaryCta ?? DEFAULT_HOME_SETTINGS.serviceHeader.primaryCta).toString(),
      primaryLink: ((v.serviceHeader as ServiceHeader | undefined)?.primaryLink ?? DEFAULT_HOME_SETTINGS.serviceHeader.primaryLink).toString(),
      secondaryCta: ((v.serviceHeader as ServiceHeader | undefined)?.secondaryCta ?? DEFAULT_HOME_SETTINGS.serviceHeader.secondaryCta).toString(),
      secondaryLink: ((v.serviceHeader as ServiceHeader | undefined)?.secondaryLink ?? DEFAULT_HOME_SETTINGS.serviceHeader.secondaryLink).toString(),
    },
    clientCarouselTop: clientCarouselTop.map((image) => image?.toString() ?? null),
    clientCarouselBottom: clientCarouselBottom.map((image) => image?.toString() ?? null),
    clientPromo: {
      enabled: (v.clientPromo as ClientPromo | undefined)?.enabled ?? DEFAULT_HOME_SETTINGS.clientPromo.enabled,
      title: ((v.clientPromo as ClientPromo | undefined)?.title ?? DEFAULT_HOME_SETTINGS.clientPromo.title).toString(),
      text: ((v.clientPromo as ClientPromo | undefined)?.text ?? DEFAULT_HOME_SETTINGS.clientPromo.text).toString(),
      cta: ((v.clientPromo as ClientPromo | undefined)?.cta ?? DEFAULT_HOME_SETTINGS.clientPromo.cta).toString(),
      link: ((v.clientPromo as ClientPromo | undefined)?.link ?? DEFAULT_HOME_SETTINGS.clientPromo.link).toString(),
    },
  };
}

export type HomeContent = {
  settings: HomeSettings;
  folders: HomeFolder[];
  videos: HomeVideo[];
};

export const getHomeContent = createServerFn({ method: "GET" }).handler(async (): Promise<HomeContent> => {
  setResponseHeader("Cache-Control", "no-store");
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
  settings.footerLogos = await Promise.all(
    settings.footerLogos.map(async (item) => ({ ...item, logo: await signAsset(item.logo) })),
  );
  settings.projects = await Promise.all(
    settings.projects.map(async (p) => ({
      ...p,
      image: await signAsset(p.image),
      avatar: await signAsset(p.avatar),
    })),
  );

  settings.testimonial = {
    ...settings.testimonial,
    photo: await signAsset(settings.testimonial.photo),
  };
  settings.serviceCards = await Promise.all(
    settings.serviceCards.map(async (c) => ({ ...c, image: await signAsset(c.image) })),
  );
  settings.serviceHeader = {
    ...settings.serviceHeader,
    image: await signAsset(settings.serviceHeader.image),
  };
  settings.clientCarouselTop = await Promise.all(
    settings.clientCarouselTop.map((image) => signAsset(image)),
  );
  settings.clientCarouselBottom = await Promise.all(
    settings.clientCarouselBottom.map((image) => signAsset(image)),
  );

  return { settings, folders: (foldersRes.data ?? []) as HomeFolder[], videos };
});
