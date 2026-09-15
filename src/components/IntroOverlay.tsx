import { useEffect, useRef, useState } from "react";

// Réglages de l'effet
const CHROMA_START_TIME = 3.2; // secondes avant l'activation du chroma key
const CHROMA_THRESHOLD = 40; // seuil en dessous duquel un pixel noir devient transparent
const MOBILE_BREAKPOINT = 768;
const MAX_CANVAS_WIDTH = 1280; // résolution de traitement (perf Safari/Mac)

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
    let chromaOk = true;

    const video = document.createElement("video");
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.preload = "auto";
    video.src = "/intro-animation.mp4";

    const resize = () => {
      const s = Math.min(1, MAX_CANVAS_WIDTH / Math.max(1, window.innerWidth));
      canvas.width = Math.max(1, Math.round(window.innerWidth * s));
      canvas.height = Math.max(1, Math.round(window.innerHeight * s));
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
            // impossible de lire les pixels : on garde la vidéo visible telle quelle
            chromaOk = false;
          }
        }
      }
    };

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onDone();
    };
    const handleEnded = () => finish();
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleEnded);

    // Lecture forcée : on réessaie tant que la vidéo n'a pas démarré.
    const tryPlay = () => {
      if (stopped) return;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => undefined);
    };
    const playLoop = setInterval(() => {
      if (stopped) return;
      if (video.paused && !video.ended) tryPlay();
    }, 500);

    // Certains navigateurs (Safari) n'autorisent la lecture qu'après une interaction.
    const onUserGesture = () => tryPlay();
    window.addEventListener("pointerdown", onUserGesture);
    window.addEventListener("keydown", onUserGesture);

    video.addEventListener("loadeddata", tryPlay, { once: true });
    video.addEventListener("canplay", tryPlay, { once: true });
    if (video.readyState >= 2) tryPlay();

    raf = requestAnimationFrame(draw);

    return () => {
      stopped = true;
      clearInterval(playLoop);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onUserGesture);
      window.removeEventListener("keydown", onUserGesture);
      video.removeEventListener("ended", handleEnded);
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
