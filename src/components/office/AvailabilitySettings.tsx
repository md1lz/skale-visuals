import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import {
  DAY_LABELS,
  DEFAULT_AVAILABILITY,
  slotsBetween,
  type Availability,
} from "@/lib/bookings.shared";
import { getBookingAdminData, setAvailability as saveAvailability } from "@/lib/bookings.functions";

export function AvailabilitySettings() {
  const [availability, setAvailability] = useState<Availability>(DEFAULT_AVAILABILITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getBookingAdminData()
      .then((d) => setAvailability(d.availability))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const patchDay = (i: number, patch: Partial<Availability["days"][number]>) =>
    setAvailability((a) => ({ days: a.days.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));

  const save = async () => {
    setSaving(true);
    try {
      await saveAvailability({ data: availability });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-neutral-400">
        Les créneaux Book a Call sont générés automatiquement toutes les 30 minutes.
      </p>
      <div className="mt-4 space-y-2">
        {availability.days.map((d, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
          >
            <label className="flex w-20 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={d.enabled}
                onChange={(e) => patchDay(i, { enabled: e.target.checked })}
                className="h-4 w-4 accent-red-500"
              />
              {DAY_LABELS[i]}
            </label>
            <input
              type="time"
              step={1800}
              value={d.start}
              disabled={!d.enabled}
              onChange={(e) => patchDay(i, { start: e.target.value })}
              className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-sm disabled:opacity-40"
            />
            <span className="text-neutral-500">→</span>
            <input
              type="time"
              step={1800}
              value={d.end}
              disabled={!d.enabled}
              onChange={(e) => patchDay(i, { end: e.target.value })}
              className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-sm disabled:opacity-40"
            />
            <span className="text-xs text-neutral-500">
              {d.enabled ? `${slotsBetween(d.start, d.end).length} créneaux` : "Indisponible"}
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <Check className="h-4 w-4" />
        ) : null}
        {saved ? "Enregistré" : "Enregistrer"}
      </button>
    </div>
  );
}
