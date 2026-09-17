import { createFileRoute } from "@tanstack/react-router";

import { WHATSAPP_URL } from "@/components/client/ClientFrame";

export const Route = createFileRoute("/espace/aide")({
  component: () => (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
      <h1 className="text-[26px] font-semibold tracking-tight">Aide</h1>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-white/55">
        Une question sur votre projet, un document ou votre accès ? Notre équipe vous répond rapidement.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-white px-5 py-2.5 text-[13.5px] font-medium text-black transition hover:bg-white/90"
        >
          Écrire sur WhatsApp
        </a>
        <a
          href="mailto:contact@skalevisuals.com"
          className="rounded-full border border-white/15 px-5 py-2.5 text-[13.5px] text-white/80 transition hover:bg-white/[0.06] hover:text-white"
        >
          contact@skalevisuals.com
        </a>
      </div>
    </div>
  ),
});
