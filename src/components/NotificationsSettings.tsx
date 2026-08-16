import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, Send } from "lucide-react";
import { toast } from "sonner";
import { getPushConfig, savePushSubscription, sendTestPush } from "@/lib/push.functions";
import { enablePushOnThisDevice, isIOS } from "@/components/PushSetup";
import { isStandaloneApp } from "@/lib/pwa";

/** Notification status banner + test notification sender, shown in both settings pages. */
export function NotificationsSettings({ defaultUrl }: { defaultUrl: string }) {
  const config = useServerFn(getPushConfig);
  const save = useServerFn(savePushSubscription);
  const send = useServerFn(sendTestPush);

  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [title, setTitle] = useState("Skale CRM");
  const [body, setBody] = useState("Ceci est une notification test");
  const [url, setUrl] = useState(defaultUrl);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  async function activate() {
    if (isIOS() && !isStandaloneApp()) {
      toast.error("Pour recevoir des notifications sur iPhone, installez d'abord l'app via skalevisuals.com/app");
      return;
    }
    setBusy(true);
    try {
      const p = await enablePushOnThisDevice(config, save);
      setPermission(p);
      if (p === "granted") toast.success("Notifications activées sur cet appareil.");
    } catch {
      toast.error("Impossible d'activer les notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      await send({ data: { title: title.trim(), body: body.trim(), url: url.trim() || "/crm" } });
      toast.success("Notification test envoyée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white/25 transition";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5"
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="grid place-items-center h-9 w-9 rounded-lg bg-red-500/15 text-red-400 shrink-0">
          <Bell className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Notification test</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Envoie une notification push uniquement sur tes appareils connectés.
          </p>
        </div>
      </div>

      {permission === "denied" && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300">
          <BellOff className="h-4 w-4 shrink-0 mt-0.5" />
          Les notifications sont désactivées. Activez-les dans les réglages de votre appareil.
        </div>
      )}
      {permission === "default" && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-neutral-300">
          Les notifications ne sont pas encore activées sur cet appareil.
          <button
            onClick={activate}
            disabled={busy}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-400 disabled:opacity-60 transition"
          >
            Activer
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-xs text-neutral-400">Titre</span>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-neutral-400">Corps</span>
          <input className={input} value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-neutral-400">Redirection</span>
          <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/crm/admin" />
        </label>
      </div>

      <button
        onClick={test}
        disabled={busy || permission !== "granted"}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-50 transition"
      >
        <Send className="h-4 w-4" />
        Envoyer la notification test
      </button>
    </motion.section>
  );
}
