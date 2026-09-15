import { useEffect, useRef, useState } from "react";

// Réglages de l'effet
const CHROMA_START_TIME = 3.2; // secondes avant l'activation du chroma key
const CHROMA_THRESHOLD = 40; // seuil en dessous duquel un pixel noir devient transparent
const MOBILE_BREAKPOINT = 768;

function isMobileDevice() {
  if (typeof window === "undefined") return true;
  const narrow = window.innerWidth < MOBILE_BREAKPOINT;
  const ua = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
    navigator.userAgent,
  );
  return narrow || ua;
}

function IntroCanvas({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Fond noir plein écran tant que le chroma key n'a pas commencé :
  // le site reste masqué pendant le chargement et le début de la vidéo.
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

    const video = document.createElement("video");
    video.src = "/intro-animation.mp4";
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      if (stopped) return;
      raf = requestAnimationFrame(draw);
      if (video.readyState < 2 || !video.videoWidth) return;

      const cw = canvas.width;
      const ch = canvas.height;
      // cover
      const scale = Math.max(cw / video.videoWidth, ch / video.videoHeight);
      const dw = video.videoWidth * scale;
      const dh = video.videoHeight * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(video, dx, dy, dw, dh);

      if (video.currentTime >= CHROMA_START_TIME) {
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
          // frame non lisible : on continue sans chroma key
        }
      }
    };

    const handleEnded = () => onDone();
    const handleError = () => onDone();
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    const start = () => {
      void video.play().catch(() => onDone());
      raf = requestAnimationFrame(draw);
    };
    if (video.readyState >= 2) start();
    else video.addEventListener("loadeddata", start, { once: true });

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      <canvas ref={canvasRef} className="h-full w-full" />
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
