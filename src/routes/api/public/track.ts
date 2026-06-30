import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const eventSchema = z.object({
  type: z.enum(["page_view", "cta_click", "session_start", "session_heartbeat", "tally_submitted"]),
  session_id: z.string().min(1).max(80),
  path: z.string().max(500).optional().nullable(),
  cta_id: z.string().max(120).optional().nullable(),
  duration_ms: z.number().int().min(0).max(86_400_000).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
});

function detectDevice(ua: string | null): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!ua) return "unknown";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  return "desktop";
}

function detectSource(referrer: string | null | undefined): string {
  if (!referrer) return "Direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("google")) return "Google";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("tiktok")) return "TikTok";
    if (host.includes("youtube")) return "YouTube";
    if (host.includes("linkedin")) return "LinkedIn";
    if (host.includes("facebook") || host.includes("fb.com")) return "Facebook";
    if (host.includes("x.com") || host.includes("twitter")) return "X";
    if (host.includes("bing")) return "Bing";
    return host;
  } catch {
    return "Direct";
  }
}

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json();
          const parsed = eventSchema.safeParse(raw);
          if (!parsed.success) return new Response("Invalid", { status: 400 });

          const ua = request.headers.get("user-agent");
          const device = detectDevice(ua);
          const source = detectSource(parsed.data.referrer);
          const ip =
            request.headers.get("cf-connecting-ip") ||
            request.headers.get("x-real-ip") ||
            (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
            null;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("site_events").insert({
            type: parsed.data.type,
            session_id: parsed.data.session_id,
            path: parsed.data.path ?? null,
            cta_id: parsed.data.cta_id ?? null,
            duration_ms: parsed.data.duration_ms ?? null,
            referrer: parsed.data.referrer ?? null,
            source,
            user_agent: ua,
            device,
          });

          if (ip) {
            await supabaseAdmin.from("site_presence").upsert(
              { ip, last_seen_at: new Date().toISOString(), user_agent: ua },
              { onConflict: "ip" },
            );
          }

          return new Response(null, { status: 204 });
        } catch {
          return new Response("err", { status: 500 });
        }
      },
    },
  },
});
