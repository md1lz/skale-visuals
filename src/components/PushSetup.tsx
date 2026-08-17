import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Mic, X } from "lucide-react";
import { getPushConfig, savePushSubscription, pingAppDevice } from "@/lib/push.functions";
import { isStandaloneApp, subscribeToPush } from "@/lib/pwa";

const PROMPT_FLAG = "skale_push_prompt";
const MIC_FLAG = "skale_mic_prompt";

type Step = "notifications" | "microphone" | null;

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

/** Asks for the microphone permission. */
export async function requestMicPermission() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    localStorage.setItem(MIC_FLAG, "done");
  } catch {
    localStorage.setItem(MIC_FLAG, "denied");
  }
}

/** Two-step in-app permission prompt: notifications first, then microphone. */
export function PushSetup() {
  const config = useServerFn(getPushConfig);
  const save = useServerFn(savePushSubscription);
  const ping = useServerFn(pingAppDevice);
  const [step, setStep] = useState<Step>(null);
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);

  // Presence heartbeat so the settings list can show which app devices are online.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    let stopped = false;
    async function beat() {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub && !stopped) await ping({ data: { endpoint: sub.endpoint } });
      } catch {
        /* noop */
      }
    }
    void beat();
    const id = window.setInterval(beat, 45_000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [ping]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const stored = localStorage.getItem(PROMPT_FLAG);
    const micStored = localStorage.getItem(MIC_FLAG);

    const notificationsAnswered =
      Notification.permission === "granted" ||
      Notification.permission === "denied" ||
      stored === "done" ||
      stored === "denied" ||
      stored === "later";

    const micAnswered =
      micStored === "done" || micStored === "denied" || micStored === "later";

    if (notificationsAnswered && micAnswered) return;

    if (Notification.permission === "granted") {
      // Keep the subscription fresh silently.
      void enablePushOnThisDevice(config, save).catch(() => {});
    }

    const t = window.setTimeout(
      () => setStep(notificationsAnswered ? "microphone" : "notifications"),
      1200,
    );
    return () => window.clearTimeout(t);
  }, [config, save]);

  async function activateNotifications() {
    if (isIOS() && !isStandaloneApp()) {
      setIosHint(true);
      return;
    }
    setBusy(true);
    try {
      const permission = await enablePushOnThisDevice(config, save);
      localStorage.setItem(PROMPT_FLAG, permission === "denied" ? "denied" : "done");
    } catch {
      localStorage.setItem(PROMPT_FLAG, "denied");
    } finally {
      setBusy(false);
      setIosHint(false);
      setStep("microphone");
    }
  }

  function laterNotifications() {
    localStorage.setItem(PROMPT_FLAG, "later");
    setStep("microphone");
  }

  async function activateMicrophone() {
    setBusy(true);
    try {
      await requestMicPermission();
    } finally {
      setBusy(false);
      setStep(null);
    }
  }

  function laterMicrophone() {
    localStorage.setItem(MIC_FLAG, "later");
    setStep(null);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {step && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] grid place-items-center bg-black/70 backdrop-blur-sm px-4"
        >
          <AnimatePresence mode="wait">
            {step === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-950 p-6 text-center shadow-2xl"
              >
                <button
                  onClick={laterNotifications}
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
                <h2 className="mt-4 text-base font-semibold text-white">Notifications</h2>
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
                    onClick={activateNotifications}
                    disabled={busy}
                    className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-60 transition"
                  >
                    {busy ? "Activation…" : "Activer"}
                  </button>
                  <button
                    onClick={laterNotifications}
                    className="rounded-xl px-4 py-2 text-sm text-neutral-400 hover:text-white transition"
                  >
                    Plus tard
                  </button>
                </div>
              </motion.div>
            )}

            {step === "microphone" && (
              <motion.div
                key="microphone"
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-950 p-6 text-center shadow-2xl"
              >
                <button
                  onClick={laterMicrophone}
                  className="absolute right-3 top-3 text-neutral-500 hover:text-white transition"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
                <motion.span
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.5 }}
                  className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-red-500/15 text-red-400"
                >
                  <Mic className="h-6 w-6" />
                </motion.span>
                <h2 className="mt-4 text-base font-semibold text-white">Microphone</h2>
                <p className="mt-2 text-sm text-neutral-400">
                  Autorisez l&apos;accès au microphone pour envoyer des messages vocaux.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    onClick={activateMicrophone}
                    disabled={busy}
                    className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-60 transition"
                  >
                    {busy ? "Activation…" : "Activer"}
                  </button>
                  <button
                    onClick={laterMicrophone}
                    className="rounded-xl px-4 py-2 text-sm text-neutral-400 hover:text-white transition"
                  >
                    Plus tard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
