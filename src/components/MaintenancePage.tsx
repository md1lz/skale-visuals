import { motion } from "framer-motion";
import logoAsset from "@/assets/skale-logo.png.asset.json";

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
          src={logoAsset.url}
          alt="Skale Visuals"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="h-auto w-auto max-w-40 sm:max-w-44 mx-auto mb-8"
        />

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
      </div>
    </div>
  );
}