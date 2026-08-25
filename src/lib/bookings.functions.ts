import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

/* ---------------- types ---------------- */

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
  created_at: string;
};

/* ---------------- helpers ---------------- */

type AdminSessionData = { user?: string; loggedInAt?: number };

function sessionConfig() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return {
    password,
    name: "skale_admin",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

async function requireAdmin() {
  const session = await useSession<AdminSessionData>(sessionConfig());
  if (!session.data.user) throw new Error("Unauthorized");
  return session.data.user;
}

function normalizeAvailability(raw: unknown): Availability {
  const days = (raw as Availability | null)?.days;
  if (!Array.isArray(days) || days.length !== 7) return DEFAULT_AVAILABILITY;
  return {
    days: days.map((d, i) => ({
      enabled: !!d?.enabled,
      start: typeof d?.start === "string" ? d.start : DEFAULT_AVAILABILITY.days[i].start,
      end: typeof d?.end === "string" ? d.end : DEFAULT_AVAILABILITY.days[i].end,
    })),
  };
}

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

async function loadAvailability(): Promise<Availability> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "booking_availability")
    .maybeSingle();
  return normalizeAvailability(data?.value ?? null);
}

/* ---------------- public ---------------- */

export const getBookingPublicData = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ availability: Availability; taken: string[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const availability = await loadAvailability();
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabaseAdmin
      .from("call_bookings")
      .select("slot_date, slot_time, status")
      .gte("slot_date", today)
      .neq("status", "Annulé");
    return {
      availability,
      taken: (data ?? []).map((b) => `${b.slot_date}T${b.slot_time}`),
    };
  },
);

const createSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120),
  email: z.string().trim().email("Email invalide").max(180),
  guests: z.array(z.string().trim().email()).max(10).default([]),
  slot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  slot_time: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide"),
  location_type: z.enum(["meet", "phone"]).default("meet"),
  phone: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const availability = await loadAvailability();
    const day = availability.days[weekdayIndex(data.slot_date)];
    if (!day?.enabled || !slotsBetween(day.start, day.end).includes(data.slot_time)) {
      throw new Error("Créneau indisponible");
    }
    if (data.slot_date < new Date().toISOString().slice(0, 10)) throw new Error("Créneau passé");

    const meetLink =
      data.location_type === "meet"
        ? `https://meet.google.com/lookup/skale-${Math.random().toString(36).slice(2, 10)}`
        : null;

    const { data: inserted, error } = await supabaseAdmin
      .from("call_bookings")
      .insert({
        name: data.name,
        email: data.email,
        guests: data.guests,
        slot_date: data.slot_date,
        slot_time: data.slot_time,
        location_type: data.location_type,
        phone: data.location_type === "phone" ? (data.phone ?? null) : null,
        notes: data.notes ?? null,
        meet_link: meetLink,
      })
      .select("id, meet_link")
      .single();
    if (error) throw new Error("Ce créneau vient d'être réservé");

    const pretty = new Date(`${data.slot_date}T${data.slot_time}:00`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
    await supabaseAdmin.from("notifications").insert({
      recipient_type: "admin",
      recipient_id: null,
      type: "call_booked",
      project_id: null,
      message: `Nouveau call réservé par ${data.name} le ${pretty} à ${data.slot_time}`,
    });
    try {
      const { pushTo } = await import("./notifications.server");
      await pushTo(
        { type: "admin" },
        {
          body: `Nouveau call réservé par ${data.name} le ${pretty} à ${data.slot_time}`,
          url: "/crm/admin/appels",
          tag: "call-booked",
        },
      );
    } catch {
      /* push is best-effort */
    }

    return { id: inserted.id, meet_link: inserted.meet_link };
  });

/* ---------------- admin ---------------- */

export const getBookingAdminData = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ availability: Availability; bookings: Booking[] }> => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const availability = await loadAvailability();
    const { data } = await supabaseAdmin
      .from("call_bookings")
      .select("*")
      .order("slot_date", { ascending: false })
      .order("slot_time", { ascending: false });
    return { availability, bookings: (data ?? []) as Booking[] };
  },
);

export const setAvailability = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        days: z
          .array(
            z.object({
              enabled: z.boolean(),
              start: z.string().regex(/^\d{2}:\d{2}$/),
              end: z.string().regex(/^\d{2}:\d{2}$/),
            }),
          )
          .length(7),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("site_settings")
      .upsert({ key: "booking_availability", value: data, updated_at: new Date().toISOString() });
    return { ok: true };
  });

export const setBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["Confirmé", "Annulé", "Effectué"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("call_bookings").update({ status: data.status }).eq("id", data.id);
    return { ok: true };
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("call_bookings").delete().eq("id", data.id);
    return { ok: true };
  });
