import { createServerFn } from "@tanstack/react-start";

import {
  availabilitySchema,
  bookingIdSchema,
  bookingStatusSchema,
  createBookingSchema,
  meetLinkSchema,
} from "./bookings.shared";

export const getBookingPublicData = createServerFn({ method: "GET" }).handler(async () => {
  const { publicBookingData } = await import("./bookings.server");
  return publicBookingData();
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createBookingSchema.parse(d))
  .handler(async ({ data }) => {
    const { insertBooking } = await import("./bookings.server");
    return insertBooking(data);
  });

export const getBookingAdminData = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin, adminBookingData } = await import("./bookings.server");
  await requireAdmin();
  return adminBookingData();
});

export const setAvailability = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => availabilitySchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./bookings.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("site_settings")
      .upsert({ key: "booking_availability", value: data, updated_at: new Date().toISOString() });
    return { ok: true };
  });

export const setBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => bookingStatusSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./bookings.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("call_bookings").update({ status: data.status }).eq("id", data.id);
    return { ok: true };
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => bookingIdSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./bookings.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("call_bookings").delete().eq("id", data.id);
    return { ok: true };
  });

export const sendBookingMeetLink = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => meetLinkSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin, sendMeetLink } = await import("./bookings.server");
    await requireAdmin();
    return sendMeetLink(data.id, data.meet_link);
  });
