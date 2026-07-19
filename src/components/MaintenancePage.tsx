import { motion } from "framer-motion";
import { Wrench } from "lucide-react";
import faviconAsset from "@/assets/skale-favicon.png.asset.json";

export function MaintenancePage({ message }: { message: string }) {
  return (
    <div className="relative min-h-screen bg-neutral-950 text-white overflow-hidden flex items-center justify-center px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(600px 400px at 50% 20%, rgba(220,38,38,0.25), transparent 60%), radial-gradient(500px 400px at 80% 80%, rgba(59,130,246,0.15), transparent 60%)",
        }}
      />
      <div className="relative z-10 max-w-lg w-full text-center">
        <motion.img
          src={faviconAsset.url}
          alt="Skale Visuals"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="h-16 w-16 mx-auto mb-8"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.1 }}
          className="inline-grid place-items-center h-20 w-20 rounded-2xl bg-red-600/15 ring-1 ring-red-500/30 mb-8"
        >
          <motion.span
            animate={{ rotate: [0, -18, 18, -12, 12, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
            className="text-red-400"
          >
            <Wrench className="h-10 w-10" />
          </motion.span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight"
        >
          Site en{" "}
          <span className="font-script text-red-500 text-5xl md:text-6xl">maintenance</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-6 text-base text-neutral-300 leading-relaxed"
        >
          {message}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-10 flex items-center justify-center gap-2 text-xs text-neutral-500"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>Skale Visuals — retour très prochainement</span>
        </motion.div>
      </div>
    </div>
  );
}