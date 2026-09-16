import { defineTool } from "@lovable.dev/mcp-js";

import { readSiteSetting } from "../supabase";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default defineTool({
  name: "get_about",
  title: "À propos de l'agence",
  description:
    "Renvoie la présentation publique de Skale Visuals et de ses fondateurs (page « À propos »).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const about = ((await readSiteSetting("about")) ?? {}) as Record<string, unknown>;
    const foundersRaw = Array.isArray(about.founders) ? about.founders : [];
    const payload = {
      title: asString(about.title),
      intro: asString(about.intro) || asString(about.description),
      founders: foundersRaw.map((f) => {
        const founder = (f ?? {}) as Record<string, unknown>;
        return {
          name: asString(founder.name),
          role: asString(founder.role),
          bio: asString(founder.bio),
        };
      }),
      contact: "contact@skalevisuals.com",
      website: "https://skalevisuals.com",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
