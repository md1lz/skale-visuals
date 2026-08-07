export type LinkKind = "drive" | "mp4" | "other";

export function driveFileId(url: string): string | null {
  if (!url) return null;
  const m =
    url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}

export function linkKind(url: string): LinkKind {
  if (!url) return "other";
  if (driveFileId(url)) return "drive";
  if (/^storage:\/\//.test(url)) return "mp4";
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return "mp4";
  return "other";
}

export function driveThumbnail(url: string, size = 400): string | null {
  const id = driveFileId(url);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${size}` : null;
}

export function driveEmbed(url: string): string | null {
  const id = driveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

export function normalizeHref(url: string): string {
  if (!url) return "#";
  return url.startsWith("http") ? url : `https://${url}`;
}