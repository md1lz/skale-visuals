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
  range: z.enum(["today", "24h", "7d", "30d", "custom"]).default("today"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

type Range = z.infer<typeof rangeSchema>["range"];

function resolveWindow(input: z.infer<typeof rangeSchema>): { start: Date; end: Date; bucket: "hour" | "day" } {
  const end = new Date();
  const start = new Date();
  if (input.range === "custom" && input.from) {
    const s = new Date(input.from);
    const e = input.to ? new Date(input.to) : new Date();
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
    return { start: s, end: e, bucket: diffDays <= 2 ? "hour" : "day" };
  }
  if (input.range === "today") {
    start.setHours(0, 0, 0, 0);
    return { start, end, bucket: "hour" };
  }
  if (input.range === "24h") {
    start.setHours(start.getHours() - 24);
    return { start, end, bucket: "hour" };
  }
  if (input.range === "7d") start.setDate(start.getDate() - 7);
  else if (input.range === "30d") start.setDate(start.getDate() - 30);
  return { start, end, bucket: "day" };
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

const PAGE_LABELS: Record<string, string> = {
  "/": "Accueil",
  "/accueil": "Accueil",
  "/social-proof": "Avis vidéos (top)",
  "/temoignage": "Témoignage",
  "/services": "Nos services",
  "/methode": "Notre méthode",
  "/funnel": "Entrepreneuriat",
  "/ads": "Ads",
  "/realisations": "Nos réalisations",
  "/avis": "Avis clients",
  "/partenaire": "Partenaire #1",
  "/faq": "FAQ",
  "/contact": "Contact",
};

function labelPath(path: string): string {
  return PAGE_LABELS[path] ?? path;
}


export const getSiteAnalytics = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => rangeSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const session = await useSession<AdminSessionData>(sessionConfig());
    if (!session.data.user) throw new Error("Unauthorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { start, end, bucket } = resolveWindow(data);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const { data: events, error } = await supabaseAdmin
      .from("site_events")
      .select("type, session_id, path, cta_id, duration_ms, device, source, created_at")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
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
    while (cursor <= end) {
      const k = bucketKey(cursor, bucket);
      const v = visitBuckets.get(k)?.size ?? 0;
      series.push({ bucket: formatBucket(k, bucket), visits: v });
      if (bucket === "hour") cursor.setHours(cursor.getHours() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }

    const topPages = Array.from(pageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([path, views]) => ({ path, label: labelPath(path), views }));


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

export const getRecentActivity = createServerFn({ method: "POST" })
  .handler(async () => {
    const session = await useSession<AdminSessionData>(sessionConfig());
    if (!session.data.user) throw new Error("Unauthorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data: events } = await supabaseAdmin
      .from("site_events")
      .select("type, cta_id, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(200);

    const rows = events ?? [];
    const activity: { id: string; type: string; action?: "create" | "update" | "delete"; message: string; time: string; variant: "red" | "neutral" | "green" | "amber" | "blue" }[] = [];

    // Real events from site_events
    for (const ev of rows) {
      if (ev.type === "tally_submitted") {
        activity.push({
          id: `tally-${ev.created_at}`,
          type: "devis",
          message: "Nouveau devis soumis via le site",
          time: ev.created_at,
          variant: "red",
        });
      }
    }

    // Admin actions (saves, updates, deletions)
    const { data: adminRows } = await supabaseAdmin
      .from("admin_activity")
      .select("id, kind, message, actor_username, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(50);
    for (const a of adminRows ?? []) {
      const action: "create" | "update" | "delete" | undefined =
        a.kind.endsWith("_create") || a.kind.endsWith("_add") ? "create"
        : a.kind.endsWith("_delete") || a.kind.endsWith("_remove") ? "delete"
        : a.kind.endsWith("_update") || a.kind.endsWith("_edit") ? "update"
        : undefined;
      const variant: "red" | "neutral" | "green" | "amber" | "blue" =
        action === "create" ? "green"
        : action === "delete" ? "red"
        : action === "update" ? "blue"
        : "neutral";
      const type = a.kind.split("_")[0] || a.kind;
      activity.push({
        id: `admin-${a.id}`,
        type,
        action,
        message: a.actor_username ? `${a.message} · @${a.actor_username}` : a.message,
        time: a.created_at,
        variant,
      });
    }

    activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return activity.slice(0, 6);
  });
