import { defineTool } from "@lovable.dev/mcp-js";

import { readSiteSetting } from "../supabase";

type HomeValue = { projects?: unknown; testimonial?: unknown };

export default defineTool({
  name: "get_projects",
  title: "Projets mis en avant",
  description:
    "Liste les projets mis en avant sur la page d'accueil de Skale Visuals, avec le témoignage client public.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const home = ((await readSiteSetting("home")) ?? {}) as HomeValue;
    const list = Array.isArray(home.projects) ? home.projects : [];
    const projects = list.map((p) => {
      const item = (p ?? {}) as { title?: unknown; description?: unknown; badge?: unknown };
      return {
        title: typeof item.title === "string" ? item.title : "",
        description: typeof item.description === "string" ? item.description : "",
        badge: typeof item.badge === "string" ? item.badge : "",
      };
    });
    const t = (home.testimonial ?? {}) as { name?: unknown; role?: unknown; quote?: unknown };
    const payload = {
      projects,
      testimonial: {
        name: typeof t.name === "string" ? t.name : "",
        role: typeof t.role === "string" ? t.role : "",
        quote: typeof t.quote === "string" ? t.quote : "",
      },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
