import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Check, Loader2, Phone, Trash2, Video } from "lucide-react";

import {
  DAY_LABELS,
  DEFAULT_AVAILABILITY,
  slotsBetween,
  type Availability,
  type Booking,
} from "@/lib/bookings.shared";
import {
  deleteBooking,
  getBookingAdminData,
  setAvailability as saveAvailability,
  setBookingStatus,
} from "@/lib/bookings.functions";

export const Route = createFileRoute("/crm/admin/appels")({
  component: AppelsPage,
});

const STATUSES = ["Confirmé", "Annulé", "Effectué"] as const;

function AppelsPage() {
  const [availability, setAvailability] = useState<Availability>(DEFAULT_AVAILABILITY);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () =>
    getBookingAdminData()
      .then((d) => {
        setAvailability(d.availability);
        setBookings(d.bookings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
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

  const changeStatus = async (id: string, status: (typeof STATUSES)[number]) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    await setBookingStatus({ data: { id, status } });
  };

  const remove = async (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
    await deleteBooking({ data: { id } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Book a Call</h1>
        <p className="text-sm text-neutral-400">Disponibilités et réservations d'appels.</p>
      </div>

      {/* availability */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-medium">Disponibilités</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Les créneaux sont générés automatiquement toutes les 30 minutes.
        </p>
        <div className="mt-4 space-y-2">
          {availability.days.map((d, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 px-3 py-2.5"
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
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? "Enregistré" : "Enregistrer"}
        </button>
      </section>

      {/* bookings */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-medium">Réservations ({bookings.length})</h2>
        {bookings.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">Aucune réservation pour le moment.</p>
        ) : (
          <>
            {/* desktop */}
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="py-2 pr-3">Client</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Notes</th>
                    <th className="py-2 pr-3">Statut</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-white/5 align-top">
                      <td className="py-3 pr-3">
                        <span className="block">{b.name}</span>
                        <span className="block text-xs text-neutral-400">{b.email}</span>
                        {b.guests.length > 0 && (
                          <span className="block text-xs text-neutral-500">+ {b.guests.join(", ")}</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {new Date(`${b.slot_date}T12:00:00`).toLocaleDateString("fr-FR")} · {b.slot_time}
                      </td>
                      <td className="py-3 pr-3">
                        {b.location_type === "meet" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <Video className="h-3.5 w-3.5" /> Meet
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <Phone className="h-3.5 w-3.5" /> {b.phone || "Téléphone"}
                          </span>
                        )}
                        {b.meet_link && (
                          <a
                            href={b.meet_link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block max-w-[180px] truncate text-xs text-red-400 hover:underline"
                          >
                            {b.meet_link}
                          </a>
                        )}
                      </td>
                      <td className="max-w-[220px] py-3 pr-3 text-xs text-neutral-400">{b.notes || "—"}</td>
                      <td className="py-3 pr-3">
                        <select
                          value={b.status}
                          onChange={(e) => changeStatus(b.id, e.target.value as (typeof STATUSES)[number])}
                          className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-xs"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          aria-label="Supprimer"
                          onClick={() => remove(b.id)}
                          className="rounded-lg p-1.5 text-neutral-500 transition hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile */}
            <div className="mt-4 space-y-3 md:hidden">
              {bookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-white/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm">{b.name}</p>
                      <p className="text-xs text-neutral-400">{b.email}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Supprimer"
                      onClick={() => remove(b.id)}
                      className="text-neutral-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-300">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(`${b.slot_date}T12:00:00`).toLocaleDateString("fr-FR")} · {b.slot_time}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {b.location_type === "meet" ? "Google Meet" : `Téléphone · ${b.phone || "—"}`}
                  </p>
                  {b.notes && <p className="mt-1 text-xs text-neutral-500">{b.notes}</p>}
                  <select
                    value={b.status}
                    onChange={(e) => changeStatus(b.id, e.target.value as (typeof STATUSES)[number])}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-900 px-2 py-1.5 text-xs"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
