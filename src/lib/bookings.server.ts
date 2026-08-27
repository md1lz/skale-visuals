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
    await pushTo({ type: "admin" }, { body: message, url: "/office/calls", tag: "call-booked" });
  } catch {
    /* push is best-effort */
  }

  await sendBookingEmails({ id: inserted.id, ...data });

  return { id: inserted.id, meet_link: inserted.meet_link };
}

const ADMIN_EMAILS = ["skalevisuals086@gmail.com"];
const ADMIN_CALLS_URL = "https://skalevisuals.com/office/calls";

async function safeSend(
  templateName: string,
  to: string,
  options: { templateData?: Record<string, unknown>; idempotencyKey?: string },
) {
  try {
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    await sendTemplateEmail(templateName, to, options);
  } catch (err) {
    console.error(`[email] ${templateName} -> ${to}`, err);
  }
}

async function sendBookingEmails(booking: {
  id: string;
  name: string;
  email: string;
  guests: string[];
  slot_date: string;
  slot_time: string;
  location_type: "meet" | "phone";
  phone?: string | null;
  notes?: string | null;
}) {
  await safeSend("booking-confirmation", booking.email, {
    idempotencyKey: `booking-confirmation-${booking.id}`,
    templateData: {
      name: booking.name,
      slotDate: booking.slot_date,
      slotTime: booking.slot_time,
      locationType: booking.location_type,
    },
  });

  for (const admin of ADMIN_EMAILS) {
    await safeSend("booking-admin-alert", admin, {
      idempotencyKey: `booking-admin-${booking.id}-${admin}`,
      templateData: {
        name: booking.name,
        email: booking.email,
        slotDate: booking.slot_date,
        slotTime: booking.slot_time,
        locationType: booking.location_type,
        phone: booking.phone ?? null,
        notes: booking.notes ?? null,
        guests: booking.guests ?? [],
        adminUrl: ADMIN_CALLS_URL,
      },
    });
  }
}

/** Saves the Meet link and emails it to the client. */
export async function sendMeetLink(id: string, meetLink: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: booking } = await supabaseAdmin
    .from("call_bookings")
    .select("id, name, email, slot_date, slot_time")
    .eq("id", id)
    .maybeSingle();
  if (!booking) throw new Error("Réservation introuvable");

  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const result = await sendTemplateEmail("booking-meet-link", booking.email, {
    idempotencyKey: `booking-meet-${booking.id}-${meetLink}`,
    templateData: {
      name: booking.name,
      slotDate: booking.slot_date,
      slotTime: booking.slot_time,
      meetLink,
    },
  });

  await supabaseAdmin
    .from("call_bookings")
    .update({ meet_link: meetLink, meet_link_sent_at: new Date().toISOString() })
    .eq("id", id);

  return result;
}

/** Paris wall-clock time, one hour from now, as { date, time }. */
function parisIn(minutes: number) {
  const target = new Date(Date.now() + minutes * 60_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(target);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** Sends the 1h reminder for every upcoming call inside the next 45-75 min window. */
export async function processBookingReminders() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const from = parisIn(45);
  const to = parisIn(75);

  const { data } = await supabaseAdmin
    .from("call_bookings")
    .select("id, name, email, slot_date, slot_time, location_type, meet_link, status, reminder_sent_at")
    .eq("slot_date", from.date)
    .is("reminder_sent_at", null)
    .neq("status", "Annulé");

  const due = (data ?? []).filter(
    (b) => b.slot_time >= from.time && (to.date === from.date ? b.slot_time <= to.time : true),
  );

  for (const b of due) {
    await safeSend("booking-reminder", b.email, {
      idempotencyKey: `booking-reminder-${b.id}`,
      templateData: {
        name: b.name,
        slotTime: b.slot_time,
        meetLink: b.meet_link,
        locationType: b.location_type,
      },
    });
    await supabaseAdmin
      .from("call_bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", b.id);
  }

  return { sent: due.length };
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
