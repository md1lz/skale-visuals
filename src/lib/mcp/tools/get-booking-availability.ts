import { defineTool } from "@lovable.dev/mcp-js";

import { readSiteSetting } from "../supabase";

export default defineTool({
  name: "get_booking_availability",
  title: "Disponibilités d'appel",
  description:
    "Renvoie les disponibilités publiques pour réserver un appel de consultation avec Skale Visuals.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const availability = (await readSiteSetting("booking_availability")) ?? null;
    const payload = {
      availability,
      bookingUrl: "https://skalevisuals.com/bookacall",
      note: "Les créneaux exacts se réservent sur la page de réservation du site.",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
