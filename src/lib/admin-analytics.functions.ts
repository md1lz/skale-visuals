import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

type AdminSessionData = { user?: string; loggedInAt?: number };

const SESSION_NAME = "skale_admin";

function sessionConfig() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("ADMIN_SESSION_SECRET missing");
  return {
    password,
    name: SESSION_NAME,
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

const rangeSchema = z.object({
  range: z.enum(["today", "24h", "7d", "30d", "3m"]).default("30d"),
});

type Range = z.infer<typeof rangeSchema>["range"];

function rangeStart(range: Range): Date {
  const d = new Date();
  if (range === "today") {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "24h") {
    d.setHours(d.getHours() - 24);
    return d;
  }
  if (range === "7d") d.setDate(d.getDate() - 7);
  else if (range === "30d") d.setDate(d.getDate() - 30);
  else if (range === "3m") d.setMonth(d.getMonth() - 3);
  return d;
}

function bucketSize(range: Range): "hour" | "day" {
  return range === "today" || range === "24h" ? "hour" : "day";
}

function bucketKey(date: Date, size: "hour" | "day"): string {
  const d = new Date(date);
  if (size === "hour") {
    d.setMinutes(0, 0, 0);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

function formatBucket(iso: string, size: "hour" | "day"): string {
  const d = new Date(iso);
  if (size === "hour") {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export const getSiteAnalytics = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => rangeSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const session = await useSession<AdminSessionData>(sessionConfig());
    if (!session.data.user) throw new Error("Unauthorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const start = rangeStart(data.range);
    const startIso = start.toISOString();
    const bucket = bucketSize(data.range);

    const { data: events, error } = await supabaseAdmin
      .from("site_events")
      .select("type, session_id, path, cta_id, duration_ms, device, source, created_at")
      .gte("created_at", startIso)
      .order("created_at", { ascending: true })
      .limit(50_000);

    if (error) throw new Error(error.message);
    const rows = events ?? [];

    // Sessions
    const sessionFirstSeen = new Map<string, string>();
    const sessionCtaClicks = new Map<string, number>();
    const sessionDurations = new Map<string, number>();
    const sessionDevice = new Map<string, string>();

    // Buckets
    const visitBuckets = new Map<string, Set<string>>();
    const pageCounts = new Map<string, number>();
    const ctaCounts = new Map<string, number>();
    const deviceCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();

    let pageViews = 0;
    let ctaClicks = 0;
    let devisSubmitted = 0;

    for (const ev of rows) {
      if (!sessionFirstSeen.has(ev.session_id)) {
        sessionFirstSeen.set(ev.session_id, ev.created_at);
        if (ev.device) sessionDevice.set(ev.session_id, ev.device);
      }
      if (ev.type === "session_start" || ev.type === "page_view") {
        const key = bucketKey(new Date(ev.created_at), bucket);
        if (!visitBuckets.has(key)) visitBuckets.set(key, new Set());
        visitBuckets.get(key)!.add(ev.session_id);
      }
      if (ev.type === "page_view") {
        pageViews += 1;
        const p = ev.path || "/";
        pageCounts.set(p, (pageCounts.get(p) ?? 0) + 1);
      }
      if (ev.type === "cta_click") {
        ctaClicks += 1;
        sessionCtaClicks.set(ev.session_id, (sessionCtaClicks.get(ev.session_id) ?? 0) + 1);
        if (ev.cta_id) ctaCounts.set(ev.cta_id, (ctaCounts.get(ev.cta_id) ?? 0) + 1);
      }
      if (ev.type === "tally_submitted") devisSubmitted += 1;
      if (typeof ev.duration_ms === "number") {
        const cur = sessionDurations.get(ev.session_id) ?? 0;
        if (ev.duration_ms > cur) sessionDurations.set(ev.session_id, ev.duration_ms);
      }
      if (ev.source) sourceCounts.set(ev.source, (sourceCounts.get(ev.source) ?? 0) + 1);
    }

    for (const dev of sessionDevice.values()) {
      deviceCounts.set(dev, (deviceCounts.get(dev) ?? 0) + 1);
    }

    const uniqueVisits = sessionFirstSeen.size;
    const convertingSessions = Array.from(sessionCtaClicks.keys()).length;
    const conversionRate = uniqueVisits ? (convertingSessions / uniqueVisits) * 100 : 0;

    const durations = Array.from(sessionDurations.values()).filter((v) => v > 1000);
    const avgDurationMs = durations.length
      ? durations.reduce((s, v) => s + v, 0) / durations.length
      : 0;

    // Fill timeseries with zero-buckets for the window
    const series: { bucket: string; visits: number }[] = [];
    const cursor = new Date(start);
    const now = new Date();
    while (cursor <= now) {
      const k = bucketKey(cursor, bucket);
      const v = visitBuckets.get(k)?.size ?? 0;
      series.push({ bucket: formatBucket(k, bucket), visits: v });
      if (bucket === "hour") cursor.setHours(cursor.getHours() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }

    const topPages = Array.from(pageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([path, views]) => ({ path, views }));

    const ctaBreakdown = Array.from(ctaCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cta_id, clicks]) => ({ cta_id, clicks }));

    const deviceTotal = Array.from(deviceCounts.values()).reduce((s, v) => s + v, 0) || 1;
    const devices = Array.from(deviceCounts.entries()).map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / deviceTotal) * 100),
    }));

    const sourcesTotal = Array.from(sourceCounts.values()).reduce((s, v) => s + v, 0) || 1;
    const sources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / sourcesTotal) * 100),
      }));

    return {
      range: data.range,
      kpis: {
        visits: uniqueVisits,
        pageViews,
        ctaClicks,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgDurationMs: Math.round(avgDurationMs),
        devisSubmitted,
      },
      timeseries: series,
      topPages,
      ctaBreakdown,
      devices,
      sources,
    };
  });
