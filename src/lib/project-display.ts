export const STATUS_BADGE: Record<string, string> = {
  "En attente de validation client": "bg-neutral-400/15 text-neutral-200 border-neutral-400/30",
  "À faire": "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
  "En cours": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "En révision": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  Corrections: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  "Montage terminé": "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "Livrée": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "Payée": "bg-green-700/25 text-green-300 border-green-700/40",
};

export const VIDEO_STATUSES = [
  "À faire",
  "En cours",
  "En révision",
  "Approuvée",
  "Corrections à faire",
] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const EDITOR_VIDEO_STATUSES: VideoStatus[] = ["À faire", "En cours", "En révision"];

const VIDEO_STATUS_BADGE: Record<string, string> = {
  "À faire": "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
  "En cours": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "En révision": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  Approuvée: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "Corrections à faire": "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
};

export function videoStatusBadgeClass(status: string) {
  return VIDEO_STATUS_BADGE[status] ?? "bg-neutral-500/15 text-neutral-300 border-neutral-500/30";
}

export function statusBadgeClass(status: string) {
  return STATUS_BADGE[status] ?? "bg-neutral-500/15 text-neutral-300 border-neutral-500/30";
}

export function fmtDateFR(d: string | null) {
  if (!d) return "—";
  return new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateTimeFR(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function deadlineTone(deadline: string | null) {
  if (!deadline) return "text-neutral-500";
  const diff = new Date(`${deadline}T23:59:59`).getTime() - Date.now();
  if (diff < 0) return "text-red-400";
  if (diff < 24 * 3600 * 1000) return "text-red-400 animate-pulse";
  if (diff < 48 * 3600 * 1000) return "text-orange-300";
  return "text-neutral-300";
}
