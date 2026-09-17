import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/espace/factures")({
  component: () => (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
      <h1 className="text-[26px] font-semibold tracking-tight">Devis & factures</h1>
      <p className="mt-2 text-[14px] text-white/55">
        Vos devis à signer et vos factures seront disponibles ici.
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-10 text-center text-[13.5px] text-white/45">
        Aucun document pour le moment.
      </div>
    </div>
  ),
});
