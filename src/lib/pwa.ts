const SW_URL = "/sw.js";

/** True when the page runs inside the installed PWA (standalone display). */
export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isBlockedContext() {
  if (typeof window === "undefined") return true;
  if (!("serviceWorker" in navigator)) return true;
  const host = window.location.hostname;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  if (window.top !== window.self) return true;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  return false;
}

/** Registers the push messaging worker (never in dev/preview/iframe). */
export async function registerPushWorker(): Promise<ServiceWorkerRegistration | null> {
  if (isBlockedContext()) {
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      for (const r of regs ?? []) {
        if (r.active?.scriptURL.endsWith(SW_URL)) await r.unregister();
      }
    } catch {
      /* noop */
    }
    return null;
  }
  try {
    return await navigator.serviceWorker.register(SW_URL);
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Asks for permission and returns a push subscription payload (or null). */
export async function subscribeToPush(vapidPublicKey?: string | null) {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { permission } as const;

  const reg = await registerPushWorker();
  if (!reg || !vapidPublicKey) return { permission } as const;

  const appKey = urlBase64ToUint8Array(vapidPublicKey);
  try {
    // Drop any subscription created with a different (or rotated) server key,
    // otherwise subscribe() throws InvalidStateError and push silently dies.
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      const current = existing.options?.applicationServerKey
        ? new Uint8Array(existing.options.applicationServerKey as ArrayBuffer)
        : null;
      const same =
        current && current.length === appKey.length && current.every((b, i) => b === appKey[i]);
      if (!same) await existing.unsubscribe();
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appKey as BufferSource,
    });
    const json = sub.toJSON();
    return {
      permission,
      subscription: {
        endpoint: json.endpoint!,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent.slice(0, 400),
      },
    } as const;
  } catch {
    return { permission } as const;
  }
}
