export function progressColor(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 80) return "bg-blue-500";
  if (pct >= 41) return "bg-orange-500";
  return "bg-[#E24B4A]";
}

export function ProjectProgress({
  approved,
  total,
  compact = false,
}: {
  approved: number;
  total: number;
  compact?: boolean;
}) {
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  const done = pct >= 100 && total > 0;
  return (
    <div className={compact ? "w-40" : "w-full max-w-sm"}>
      <div className="flex items-center gap-2">
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-700 ease-out ${progressColor(pct)} ${
              done ? "animate-pulse" : ""
            }`}
            style={{ width: `${pct}%` }}
          />
          {done && (
            <div className="pointer-events-none absolute inset-0 animate-[shimmer_1.8s_linear_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent [background-size:200%_100%]" />
          )}
        </div>
        <span className={`tabular-nums text-xs ${done ? "text-emerald-300" : "text-neutral-300"}`}>{pct}%</span>
      </div>
      {!compact && (
        <p className="mt-1 text-[11px] text-neutral-500">
          {approved} / {total} vidéo{total > 1 ? "s" : ""} approuvée{approved > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}