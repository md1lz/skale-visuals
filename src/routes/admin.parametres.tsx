import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/admin/parametres")({
  component: () => (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <p className="text-sm text-neutral-400 mt-1">Comptes admin, intégrations, sécurité.</p>
      <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-neutral-900/30 p-10 text-center">
        <Construction className="h-8 w-8 mx-auto text-red-500" />
        <p className="mt-3 text-sm text-neutral-300">Bientôt disponible.</p>
      </div>
    </div>
  ),
});
