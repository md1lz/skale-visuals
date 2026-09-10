import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteAdminPanel } from "@/components/office/SiteAdminPanel";

export const Route = createFileRoute("/office/website")({
  component: WebsiteAdminPage,
});

function WebsiteAdminPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-16 md:px-8 md:pt-10">
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/office/settings"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-neutral-300 transition hover:bg-white/5 hover:text-white"
          aria-label="Retour aux paramètres"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Gestion du site web</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Contenu de la page d'accueil : logo, carrousels de confiance, avis client et projets.
          </p>
        </div>
      </div>
      <SiteAdminPanel />
    </div>
  );
}
