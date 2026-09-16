import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import bg1 from "@/assets/client-bg-1.jpg";
import bg2 from "@/assets/client-bg-2.jpg";
import bg3 from "@/assets/client-bg-3.jpg";
import bg4 from "@/assets/client-bg-4.jpg";

const IMAGES = [bg1, bg2, bg3, bg4];
const INTERVAL = 6500;

/** Full-bleed dark image carousel used behind the client space. */
export function ClientBackdrop() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, INTERVAL);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-black">
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.6, ease: "easeInOut" }, scale: { duration: 8, ease: "linear" } }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${IMAGES[index]})` }}
        />
      </AnimatePresence>

      {/* readability layers */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/40 to-black" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 40rem at 50% 10%, rgba(226,27,60,0.18), transparent 65%)",
        }}
      />
      {/* dots */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
        {IMAGES.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === index ? "w-6 bg-white/70" : "w-1.5 bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
