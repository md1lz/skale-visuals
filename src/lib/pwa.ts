/**
 * PWA désactivée (phase 1) : le manifest n'est plus injecté, le service worker
 * n'est plus enregistré et les notifications push VAPID sont hors service.
 * Le code d'origine reste disponible dans l'historique Git si on réactive l'app.
 */

/** Toujours false : l'application installée n'est plus supportée. */
export function isStandaloneApp() {
  return false;
}

/** No-op : désenregistre tout service worker restant. */
export async function registerPushWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) await r.unregister();
  } catch {
    /* noop */
  }
  return null;
}

/** No-op : les notifications push sont désactivées. */
export async function subscribeToPush(_vapidPublicKey?: string | null) {
  return null;
}
