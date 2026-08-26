import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_COMPARE, normalizeCompare, type CompareContent } from "@/lib/compare-content.shared";

export const getCompareContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<CompareContent> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return DEFAULT_COMPARE;
    const sb = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data } = await sb.from("site_settings").select("value").eq("key", "compare").maybeSingle();
    return normalizeCompare(data?.value);
  },
);
