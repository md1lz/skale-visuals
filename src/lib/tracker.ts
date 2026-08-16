// Client-side anonymous analytics tracker for the Skale Visuals public site.
// Sends events to /api/public/track. No PII collected.

const ENDPOINT = "/api/public/track";
const SESSION_KEY = "skale_sid";
const HEARTBEAT_MS = 30_000;

type EventPayload = {
  type: "page_view" | "cta_click" | "session_start" | "session_heartbeat";
  session_id: string;
  path?: string;
  cta_id?: string;
  duration_ms?: number;
  referrer?: string | null;
};

let started = false;
let sessionStart = 0;
let lastPath = "";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function send(payload: EventPayload, useBeacon = false) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify(payload);
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    return;
  }
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

function isAdminPath(path: string): boolean {
  return path.startsWith("/crm");
}

function describeCta(el: HTMLElement): string | null {
  const explicit = el.closest("[data-cta]") as HTMLElement | null;
  if (explicit) return (explicit.getAttribute("data-cta") || "").slice(0, 80) || null;
  const interactive = el.closest("a,button") as HTMLElement | null;
  if (!interactive) return null;
  if (interactive.getAttribute("aria-label") === "Admin login") return null;
  const text = (interactive.textContent || "").trim().replace(/\s+/g, " ");
  if (!text) return null;
  if (text.length > 60) return null;
  return text;
}

function bindClicks(sid: string) {
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (isAdminPath(location.pathname)) return;
      const label = describeCta(target);
      if (!label) return;
      send({
        type: "cta_click",
        session_id: sid,
        path: location.pathname,
        cta_id: label,
      });
    },
    { capture: true },
  );
}

function bindUnload(sid: string) {
  const flush = () => {
    send(
      {
        type: "session_heartbeat",
        session_id: sid,
        path: location.pathname,
        duration_ms: Date.now() - sessionStart,
      },
      true,
    );
  };
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

function bindHeartbeat(sid: string) {
  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    if (isAdminPath(location.pathname)) return;
    send({
      type: "session_heartbeat",
      session_id: sid,
      path: location.pathname,
      duration_ms: Date.now() - sessionStart,
    });
  }, HEARTBEAT_MS);
}

function bindSectionViews(sid: string) {
  if (isAdminPath(location.pathname)) return;
  const seen = new Set<string>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (entry.intersectionRatio < 0.35) continue;
        const el = entry.target as HTMLElement;
        const name = el.getAttribute("data-section") || el.id;
        if (!name || seen.has(name)) continue;
        seen.add(name);
        send({
          type: "page_view",
          session_id: sid,
          path: `/${name}`,
        });
      }
    },
    { threshold: [0.35] },
  );
  const scan = () => {
    document.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => {
      if (!el.dataset.skTracked) {
        el.dataset.skTracked = "1";
        observer.observe(el);
      }
    });
  };
  scan();
  // Rescan after navigation/hydration churn
  setTimeout(scan, 800);
  setTimeout(scan, 2500);
}

export function initTracker() {
  if (started || typeof window === "undefined") return;
  started = true;
  const sid = getSessionId();
  sessionStart = Date.now();
  const referrer = document.referrer || null;

  if (!isAdminPath(location.pathname)) {
    send({
      type: "session_start",
      session_id: sid,
      path: location.pathname,
      referrer,
    });
    lastPath = location.pathname;
  }

  bindClicks(sid);
  bindHeartbeat(sid);
  bindUnload(sid);
  bindSectionViews(sid);
}

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  if (isAdminPath(path)) return;
  if (path === lastPath) return;
  lastPath = path;
  send({
    type: "page_view",
    session_id: getSessionId(),
    path,
  });
}

