import { useEffect } from "react";
import { pingConnection } from "@/lib/connections.functions";

/**
 * Marque comme "en ligne" uniquement la connexion enregistrée correspondant
 * à la plateforme réellement utilisée (site web vs application installée),
 * même si les deux partagent la même IP.
 */
export function ConnectionHeartbeat() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const source: "web" | "app" = isStandalone ? "app" : "web";

    let stopped = false;
    const ping = () => {
      if (stopped || document.visibilityState !== "visible") return;
      pingConnection({ data: { source } }).catch(() => {});
    };

    ping();
    const id = window.setInterval(ping, 45_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);

  return null;
}
