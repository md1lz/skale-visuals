import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Wrench, ShieldCheck, Save } from "lucide-react";
import {
  getMaintenanceStatus,
  setMaintenanceStatus,
} from "@/lib/site-settings.functions";

const DEFAULT_MESSAGE =
  "Nous effectuons actuellement une maintenance. Merci de revenir un peu plus tard.";

export function MaintenanceCard() {
  const fetchStatus = useServerFn(getMaintenanceStatus);
  const saveStatus = useServerFn(setMaintenanceStatus);
  const qc = useQueryClient();

  const statusQ = useQuery({
    queryKey: ["site", "maintenance"],
    queryFn: () => fetchStatus(),
  });

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (statusQ.data) {
      setEnabled(statusQ.data.enabled);
      setMessage(statusQ.data.message);
    }
  }, [statusQ.data]);

  const dirty =
    !!statusQ.data &&
    (enabled !== statusQ.data.enabled ||
      (message || DEFAULT_MESSAGE) !== statusQ.data.message);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await saveStatus({
        data: { enabled, message: message.trim() },
      });
      await qc.invalidateQueries({ queryKey: ["site", "maintenance"] });
      toast.success(
        res.value.enabled
          ? "Mode maintenance activé"
          : "Mode maintenance désactivé",
      );
    } catch (e) {
      toast.error("Impossible d'enregistrer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-10 rounded-2xl border-2 border-dashed border-white/15 bg-neutral-900/40 p-6"
    >
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center h-10 w-10 rounded-xl bg-amber-500/15 ring-1 ring-amber-500/30 text-amber-400">
            <Wrench className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Mode Maintenance</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Bloque temporairement l'accès public au site. Les admins gardent l'accès.
            </p>
          </div>
        </div>
        <StatusBadge enabled={enabled} />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-neutral-950/40 px-4 py-3 mb-5">
        <div>
          <p className="text-sm text-white font-medium">Activer le mode maintenance</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            Les visiteurs verront une page dédiée au lieu du site.
          </p>
        </div>
        <Toggle checked={enabled} onChange={setEnabled} />
      </div>

      <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">
        Message affiché aux visiteurs (optionnel)
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder={DEFAULT_MESSAGE}
        className="w-full rounded-xl bg-neutral-950/60 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/60 transition-colors resize-none"
      />
      <div className="flex items-center justify-between mt-3">
        <p className="text-[11px] text-neutral-500">
          {message.length}/500 — laisser vide pour le message par défaut
        </p>
        <motion.button
          onClick={handleSave}
          disabled={saving || !dirty}
          whileTap={saving || !dirty ? undefined : { scale: 0.97 }}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? "Enregistrement…" : "Enregistrer"}
        </motion.button>
      </div>
    </motion.section>
  );
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 ring-1 ring-amber-500/30 text-amber-300 px-3 py-1 text-xs font-medium">
      <Wrench className="h-3.5 w-3.5" />
      Site en maintenance
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-300 px-3 py-1 text-xs font-medium">
      <ShieldCheck className="h-3.5 w-3.5" />
      Site en ligne
    </span>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        checked ? "bg-red-600" : "bg-neutral-700"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md ${
          checked ? "right-0.5" : "left-0.5"
        }`}
      />
    </button>
  );
}