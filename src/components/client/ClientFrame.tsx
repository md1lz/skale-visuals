import { motion } from "framer-motion";

import { ClientBackdrop } from "@/components/client/ClientBackdrop";
import type { HomeSettings } from "@/lib/home-content.functions";
import skaleSymbol from "@/assets/skale-symbol.png.asset.json";

export const clientInputClass =
  "client-auth-input w-full rounded-xl px-4 py-3.5 text-[15px] outline-none transition disabled:opacity-60";

export function ClientShell({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings?: Pick<HomeSettings, "clientCarouselTop" | "clientCarouselBottom">;
}) {
  return (
    <div className="client-space-root relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-8 sm:py-12">
      <ClientBackdrop top={settings?.clientCarouselTop} bottom={settings?.clientCarouselBottom} />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

export function ClientPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className={`client-auth-panel mx-auto w-full max-w-[24.5rem] rounded-[2rem] p-7 sm:p-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function SkaleWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2.5 ${className}`}>
      <img src={skaleSymbol.url} alt="" className="h-8 w-8 object-contain" />
      <span className="font-codec-bold mt-1 text-[1.55rem] leading-none tracking-[-0.06em]">skale</span>
    </div>
  );
}

export const WHATSAPP_URL =
  "https://wa.me/33766766153?text=" +
  encodeURIComponent("Bonjour, j'ai un problème avec mon identifiant pour l'espace client Skale.");
