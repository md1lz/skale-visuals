import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_ABOUT, normalizeAbout, type AboutContent } from "@/lib/about-content.shared";

export const getAboutContent = createServerFn({ method: "GET" }).handler(async (): Promise<AboutContent> => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return DEFAULT_ABOUT;
  const sb = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb.from("site_settings").select("value").eq("key", "about").maybeSingle();
  const about = normalizeAbout(data?.value);
  const { signAsset } = await import("@/lib/home-assets.server");
  const founders = await Promise.all(
    about.founders.map(async (f) => ({ ...f, photo: await signAsset(f.photo) })),
  );
  return { ...about, founders: [founders[0], founders[1]] };
});
