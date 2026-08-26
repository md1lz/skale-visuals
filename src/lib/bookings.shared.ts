import { z } from "zod";

export type DayAvailability = { enabled: boolean; start: string; end: string };
/** Index 0 = Monday … 6 = Sunday. */
export type Availability = { days: DayAvailability[] };

export const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

export const DEFAULT_AVAILABILITY: Availability = {
  days: [
    { enabled: true, start: "14:00", end: "18:00" },
    { enabled: true, start: "14:00", end: "18:00" },
    { enabled: true, start: "14:00", end: "18:00" },
    { enabled: true, start: "14:00", end: "18:00" },
    { enabled: true, start: "14:00", end: "18:00" },
    { enabled: false, start: "14:00", end: "18:00" },
    { enabled: false, start: "14:00", end: "18:00" },
  ],
};

export type Booking = {
  id: string;
  name: string;
  email: string;
  guests: string[];
  slot_date: string;
  slot_time: string;
  location_type: "meet" | "phone";
  phone: string | null;
  notes: string | null;
  status: "Confirmé" | "Annulé" | "Effectué";
  meet_link: string | null;
  meet_link_sent_at?: string | null;
  reminder_sent_at?: string | null;
  created_at: string;
};

/** Every 30-min slot inside the range, end exclusive. */
export function slotsBetween(start: string, end: string): string[] {
  const toMin = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const out: string[] = [];
  for (let t = toMin(start); t + 30 <= toMin(end); t += 30) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
}

/** Monday-first weekday index of an ISO date string. */
export function weekdayIndex(isoDate: string): number {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}

export const createBookingSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120),
  email: z.string().trim().email("Email invalide").max(180),
  guests: z.array(z.string().trim().email()).max(10).default([]),
  slot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  slot_time: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide"),
  location_type: z.enum(["meet", "phone"]).default("meet"),
  phone: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const availabilitySchema = z.object({
  days: z
    .array(
      z.object({
        enabled: z.boolean(),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      }),
    )
    .length(7),
});

export const bookingStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["Confirmé", "Annulé", "Effectué"]),
});

export const bookingIdSchema = z.object({ id: z.string().uuid() });

export const meetLinkSchema = z.object({
  id: z.string().uuid(),
  meet_link: z.string().trim().url("Lien invalide").max(500),
});
