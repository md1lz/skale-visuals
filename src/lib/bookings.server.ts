import { useSession } from "@tanstack/react-start/server";

import {
  DEFAULT_AVAILABILITY,
  slotsBetween,
  weekdayIndex,
  type Availability,
  type Booking,
} from "./bookings.shared";

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

export async function requireAdmin() {
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

export async function loadAvailability(): Promise<Availability> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "booking_availability")
    .maybeSingle();
  return normalizeAvailability(data?.value ?? null);
}

export async function publicBookingData(): Promise<{ availability: Availability; taken: string[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const availability = await loadAvailability();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from("call_bookings")
    .select("slot_date, slot_time, status")
    .gte("slot_date", today)
    .neq("status", "Annulé");
  return { availability, taken: (data ?? []).map((b) => `${b.slot_date}T${b.slot_time}`) };
}

export async function insertBooking(data: {
  name: string;
  email: string;
  guests: string[];
  slot_date: string;
  slot_time: string;
  location_type: "meet" | "phone";
  phone?: string | null;
  notes?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const availability = await loadAvailability();
  const day = availability.days[weekdayIndex(data.slot_date)];
  if (!day?.enabled || !slotsBetween(day.start, day.end).includes(data.slot_time)) {
    throw new Error("Créneau indisponible");
  }
  if (data.slot_date < new Date().toISOString().slice(0, 10)) throw new Error("Créneau passé");

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
      meet_link: null,
    })
    .select("id, meet_link")
    .single();
  if (error) throw new Error("Ce créneau vient d'être réservé");

  const pretty = new Date(`${data.slot_date}T${data.slot_time}:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
  const message = `Nouveau call réservé par ${data.name} le ${pretty} à ${data.slot_time}`;
  await supabaseAdmin.from("notifications").insert({
    recipient_type: "admin",
    recipient_id: null,
    type: "call_booked",
    project_id: null,
    message,
  });
  try {
    const { pushTo } = await import("./notifications.server");
    await pushTo({ type: "admin" }, { body: message, url: "/crm/admin/calls", tag: "call-booked" });
  } catch {
    /* push is best-effort */
  }

  return { id: inserted.id, meet_link: inserted.meet_link };
}

export async function adminBookingData(): Promise<{ availability: Availability; bookings: Booking[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const availability = await loadAvailability();
  const { data } = await supabaseAdmin
    .from("call_bookings")
    .select("*")
    .order("slot_date", { ascending: false })
    .order("slot_time", { ascending: false });
  return { availability, bookings: (data ?? []) as Booking[] };
}
