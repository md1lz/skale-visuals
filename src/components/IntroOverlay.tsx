import { useEffect, useRef, useState } from "react";

// Réglages de l'effet
const CHROMA_START_TIME = 3.2; // secondes avant l'activation du chroma key
const CHROMA_THRESHOLD = 40; // seuil en dessous duquel un pixel noir devient transparent
const MOBILE_BREAKPOINT = 768;
const MAX_CANVAS_WIDTH = 1920; // on limite la résolution de traitement pour rester fluide

function isMobileDevice() {
  if (typeof window === "undefined") return true;
  const narrow = window.innerWidth < MOBILE_BREAKPOINT;
  const ua = /Android|iPhone|iPod|Opera Mini|IEMobile|Mobile/i.test(
    navigator.userAgent,
  );
  return narrow || ua;
}

function IntroCanvas({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [blackout, setBlackout] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      onDone();
      return;
    }

    let raf = 0;
    let stopped = false;
    let chromaOk = true; // passe à false si getImageData échoue (canvas "tainted")

    const finish = () => {
      if (stopped) return;
      onDone();
    };

    const video = document.createElement("video");
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.preload = "auto";
    video.src = "/intro-animation.mp4";

    const resize = () => {
      const scale = Math.min(1, MAX_CANVAS_WIDTH / Math.max(1, window.innerWidth));
      canvas.width = Math.round(window.innerWidth * scale);
      canvas.height = Math.round(window.innerHeight * scale);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      if (stopped) return;
      raf = requestAnimationFrame(draw);
      if (video.readyState < 2 || !video.videoWidth) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.max(cw / video.videoWidth, ch / video.videoHeight);
      const dw = video.videoWidth * scale;
      const dh = video.videoHeight * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(video, dx, dy, dw, dh);

      if (video.currentTime >= CHROMA_START_TIME) {
        setBlackout(false);
        if (chromaOk) {
          try {
            const frame = ctx.getImageData(0, 0, cw, ch);
            const d = frame.data;
            for (let i = 0; i < d.length; i += 4) {
              if (
                d[i] < CHROMA_THRESHOLD &&
                d[i + 1] < CHROMA_THRESHOLD &&
                d[i + 2] < CHROMA_THRESHOLD
              ) {
                d[i + 3] = 0;
              }
            }
            ctx.putImageData(frame, 0, 0);
          } catch {
            // lecture de frame impossible sur cet appareil : on arrête l'intro
            chromaOk = false;
            finish();
          }
        }
      }
    };

    video.addEventListener("ended", finish);
    video.addEventListener("error", finish);
    video.addEventListener("stalled", () => {
      if (video.readyState < 2) finish();
    });

    let started = false;
    const start = () => {
      if (started || stopped) return;
      started = true;
      clearTimeout(startTimeout);
      raf = requestAnimationFrame(draw);
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => finish());
    };

    // On démarre dès que des données sont disponibles, quel que soit l'appareil.
    video.addEventListener("loadeddata", start, { once: true });
    video.addEventListener("canplay", start, { once: true });
    if (video.readyState >= 2) start();
    // Si la vidéo ne peut pas démarrer rapidement, on affiche directement le site.
    const startTimeout = setTimeout(() => {
      if (!started) finish();
    }, 4000);

    // Filet de sécurité : si la lecture se bloque, on libère le site.
    let lastTime = -1;
    let stuckTicks = 0;
    const watchdog = setInterval(() => {
      if (!started) return;
      if (video.currentTime === lastTime && !video.ended) {
        stuckTicks += 1;
        if (stuckTicks >= 4) finish(); // ~4s sans progression
      } else {
        stuckTicks = 0;
        lastTime = video.currentTime;
      }
    }, 1000);

    const onVisibility = () => {
      if (document.hidden) finish();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      clearTimeout(startTimeout);
      clearInterval(watchdog);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      video.removeEventListener("ended", finish);
      video.removeEventListener("error", finish);
      try {
        video.pause();
      } catch {
        /* ignore */
      }
      video.removeAttribute("src");
      video.load();
    };
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {blackout ? <div className="absolute inset-0 bg-black" /> : null}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

export function IntroOverlay() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (isMobileDevice()) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) return;
    setActive(true);
    const onResize = () => {
      if (window.innerWidth < MOBILE_BREAKPOINT) setActive(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!active) return null;
  return <IntroCanvas onDone={() => setActive(false)} />;
}
