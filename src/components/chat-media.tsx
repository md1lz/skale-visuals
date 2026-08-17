import { useEffect, useRef, useState } from "react";
import { Pause, Play, X } from "lucide-react";

/* ------------------------------ Chat médias ------------------------------ */


export function fmtSec(total: number) {
  const s = Math.max(0, Math.floor(total || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt="Pièce jointe"
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain"
      />
    </div>
  );
}

const WAVE_BARS = Array.from({ length: 26 }, (_, i) => 30 + ((i * 37) % 70));

export function VoiceBubble({ src, duration }: { src: string; duration: number | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [rate, setRate] = useState(1);
  const total = duration || 0;
  const pct = total ? Math.min(100, (time / total) * 100) : 0;
  // Freeze the source: refreshed signed URLs must not reload/interrupt playback.
  const stableSrcRef = useRef(src);
  const stableSrc = stableSrcRef.current;

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.playbackRate = rate;
      void a.play();
    } else a.pause();
  }

  function cycleRate() {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  return (
    <div className="mt-1 flex w-full max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg bg-black/20 px-2 py-1.5 sm:w-[280px]">
      <audio
        ref={audioRef}
        src={stableSrc}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        className="hidden"
      />
      <button
        onClick={toggle}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="flex h-7 min-w-0 flex-1 items-center gap-[2px] overflow-hidden">
        {WAVE_BARS.map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}%` }}
            className={`min-w-[2px] flex-1 rounded-full ${
              (i / WAVE_BARS.length) * 100 <= pct ? "bg-red-400" : "bg-white/25"
            }`}
          />
        ))}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-[10px] leading-none tabular-nums text-neutral-400">
          {fmtSec(playing || time ? time : total)}
        </span>
        <button
          onClick={cycleRate}
          className="rounded-full border border-white/10 px-1 py-px text-[9px] leading-none text-neutral-300 transition hover:bg-white/10"
        >
          x{rate}
        </button>
      </div>
    </div>
  );
}
