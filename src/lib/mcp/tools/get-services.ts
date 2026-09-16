import { defineTool } from "@lovable.dev/mcp-js";

import { readSiteSetting } from "../supabase";

type HomeValue = {
  serviceCards?: unknown;
  serviceHeader?: unknown;
  videosCount?: unknown;
  clientsCount?: unknown;
};

const FALLBACK = {
  services: [
    {
      title: "Montage vidéo",
      description:
        "Montage short form et long form, tout inclus, prix fixes et retours illimités.",
    },
    {
      title: "Clipping",
      description: "Découpage et diffusion de vos contenus en clips courts pensés pour convertir.",
    },
  ],
};

export default defineTool({
  name: "get_services",
  title: "Services de l'agence",
  description:
    "Lit les services publics de Skale Visuals (montage vidéo, clipping) tels qu'affichés sur le site.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const home = ((await readSiteSetting("home")) ?? {}) as HomeValue;
    const cards = Array.isArray(home.serviceCards) ? home.serviceCards : [];
    const services = cards.length
      ? cards.map((c) => {
          const card = (c ?? {}) as { title?: unknown; description?: unknown };
          return {
            title: typeof card.title === "string" ? card.title : "",
            description: typeof card.description === "string" ? card.description : "",
          };
        })
      : FALLBACK.services;
    const payload = {
      services,
      videosCount: typeof home.videosCount === "number" ? home.videosCount : null,
      clientsCount: typeof home.clientsCount === "number" ? home.clientsCount : null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
