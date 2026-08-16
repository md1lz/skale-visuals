import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Bell, X } from "lucide-react";
import { getPushConfig, savePushSubscription } from "@/lib/push.functions";
import { isStandaloneApp, subscribeToPush } from "@/lib/pwa";

const PROMPT_FLAG = "skale_push_prompt";

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigator as unknown as { maxTouchPoints: number }).maxTouchPoints > 1)
  );
}

/** Registers the current device for push (assumes permission is granted or requestable). */
export async function enablePushOnThisDevice(
  config: () => Promise<{ vapidPublicKey: string | null }>,
  save: (args: { data: { endpoint: string; p256dh: string; auth: string } }) => Promise<unknown>,
): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const { vapidPublicKey } = await config();
  const result = await subscribeToPush(vapidPublicKey);
  if (!result) return "unsupported";
  if ("subscription" in result && result.subscription) {
    await save({ data: result.subscription });
  }
  return result.permission;
}

/** In-app prompt shown once, then triggers the native permission request. */
export function PushSetup() {
  const config = useServerFn(getPushConfig);
  const save = useServerFn(savePushSubscription);
  const [open, setOpen] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const stored = localStorage.getItem(PROMPT_FLAG);

    if (Notification.permission === "granted") {
      // Keep the subscription fresh silently.
      void enablePushOnThisDevice(config, save).catch(() => {});
      return;
    }
    if (Notification.permission === "denied") {
      localStorage.setItem(PROMPT_FLAG, "denied");
      return;
    }
    if (stored === "denied" || stored === "done") return;
    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, [config, save]);

  async function activate() {
    if (isIOS() && !isStandaloneApp()) {
      setIosHint(true);
      return;
    }
    setBusy(true);
    try {
      const permission = await enablePushOnThisDevice(config, save);
      localStorage.setItem(PROMPT_FLAG, permission === "denied" ? "denied" : "done");
    } catch {
      /* silent */
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  function later() {
    localStorage.setItem(PROMPT_FLAG, "later");
    setOpen(false);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] grid place-items-center bg-black/70 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-950 p-6 text-center shadow-2xl"
          >
            <button
              onClick={later}
              className="absolute right-3 top-3 text-neutral-500 hover:text-white transition"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            <motion.span
              animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2 }}
              className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-red-500/15 text-red-400"
            >
              <Bell className="h-6 w-6" />
            </motion.span>
            <h2 className="mt-4 text-base font-semibold text-white">Activez les notifications</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Activez les notifications pour être alerté en temps réel des messages et mises à jour.
            </p>
            {iosHint && (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                Pour recevoir des notifications sur iPhone, installez d&apos;abord l&apos;app via
                skalevisuals.com/app
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={activate}
                disabled={busy}
                className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-60 transition"
              >
                {busy ? "Activation…" : "Activer"}
              </button>
              <button onClick={later} className="rounded-xl px-4 py-2 text-sm text-neutral-400 hover:text-white transition">
                Plus tard
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
