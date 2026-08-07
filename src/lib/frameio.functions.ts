import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type FrameioPreview = {
  embedUrl: string | null;
  thumbnailUrl: string | null;
  title: string | null;
};

function extractIframeSrc(html: string): string | null {
  const m = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

/**
 * Resolves a Frame.io share/review link into an embeddable player URL and a
 * poster image, using Frame.io's public oEmbed endpoint (server-side to avoid CORS).
 */
export const getFrameioPreview = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ url: z.string().min(4).max(2048) }).parse(data))
  .handler(async ({ data }): Promise<FrameioPreview> => {
    const url = data.url.startsWith("http") ? data.url : `https://${data.url}`;
    const endpoint = `https://api.frame.io/v2/oembed?url=${encodeURIComponent(url)}&format=json`;
    try {
      const res = await fetch(endpoint, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const json: any = await res.json();
      return {
        embedUrl: extractIframeSrc(String(json?.html ?? "")) ?? null,
        thumbnailUrl: json?.thumbnail_url ? String(json.thumbnail_url) : null,
        title: json?.title ? String(json.title) : null,
      };
    } catch {
      return { embedUrl: null, thumbnailUrl: null, title: null };
    }
  });
