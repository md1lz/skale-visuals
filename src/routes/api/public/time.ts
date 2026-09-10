import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/time")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          { now: Date.now() },
          {
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          },
        ),
    },
  },
});