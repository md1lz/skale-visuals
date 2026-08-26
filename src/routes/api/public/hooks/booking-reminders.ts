import { createFileRoute } from "@tanstack/react-router";

/**
 * Called every 15 minutes by pg_cron. Sends the 1-hour reminder for upcoming calls.
 * Authenticated with the project's publishable key in the `apikey` header.
 */
export const Route = createFileRoute("/api/public/hooks/booking-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey");
        if (!key || key !== process.env["SUPABASE_PUBLISHABLE_KEY"]) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { processBookingReminders } = await import("@/lib/bookings.server");
        const result = await processBookingReminders();
        return Response.json(result);
      },
    },
  },
});
