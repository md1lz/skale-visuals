import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPushConfig, savePushSubscription } from "@/lib/push.functions";
import { isStandaloneApp, subscribeToPush } from "@/lib/pwa";

const FLAG = "skale_push_asked";

/** Requests notification permission once in the installed app and stores the subscription. */
export function PushSetup() {
  const config = useServerFn(getPushConfig);
  const save = useServerFn(savePushSubscription);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isStandaloneApp()) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") return;
    if (Notification.permission === "default" && sessionStorage.getItem(FLAG)) return;
    sessionStorage.setItem(FLAG, "1");

    void (async () => {
      try {
        const { vapidPublicKey } = await config();
        if (!vapidPublicKey) return;
        const result = await subscribeToPush(vapidPublicKey);
        if (result && "subscription" in result && result.subscription) {
          await save({ data: result.subscription });
        }
      } catch {
        /* silent */
      }
    })();
  }, [config, save]);

  return null;
}
