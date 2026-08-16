import { useEffect, useState } from "react";
import { isStandaloneApp } from "@/lib/pwa";

/** Lien "Retourner sur l'accueil" — désactivé dans l'app installée. */
export function BackToSiteLink() {
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(isStandaloneApp()), []);

  if (!inApp) {
    return (
      <a
        href="https://skalevisuals.com"
        className="text-[11px] text-neutral-500 underline underline-offset-2 hover:text-neutral-300 transition-colors"
      >
        ← Retourner sur l'accueil
      </a>
    );
  }

  return (
    <div className="group relative inline-block">
      <span
        aria-disabled="true"
        className="cursor-default select-none text-[11px] text-neutral-700 underline underline-offset-2 opacity-60"
      >
        ← Retourner sur l'accueil
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 w-52 rounded-lg border border-white/10 bg-black/90 px-2.5 py-2 text-[11px] leading-snug text-neutral-200 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
        Vous êtes sur le panel de l'application. Revenez sur le site web pour y accéder.
      </span>
    </div>
  );
}
