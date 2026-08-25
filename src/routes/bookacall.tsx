import { createFileRoute, Link } from "@tanstack/react-router";

const CTA_URL = "https://calendly.com/skalevisuals086/30min";

export const Route = createFileRoute("/bookacall")({
  head: () => ({
    meta: [
      { title: "Réserver un call — Skale Visuals" },
      {
        name: "description",
        content: "Réservez un appel de 30 minutes avec Skale Visuals pour parler de vos besoins en montage vidéo.",
      },
      { property: "og:title", content: "Réserver un call — Skale Visuals" },
      { property: "og:description", content: "30 minutes pour cadrer vos besoins vidéo avec l'équipe Skale Visuals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookACall,
});

function BookACall() {
  return (
    <div className="site-root min-h-screen px-4 py-10">
      <div className="mx-auto max-w-4xl text-center">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour
        </Link>
        <h1 className="font-kangge mt-6 text-4xl text-foreground sm:text-5xl">
          réserver un call<span className="text-primary">.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          30 minutes pour comprendre vos besoins et vous montrer comment on peut accélérer votre production vidéo.
        </p>
        <div className="site-surface mt-8 overflow-hidden rounded-2xl">
          <iframe
            src={CTA_URL}
            title="Réserver un appel"
            className="h-[720px] w-full"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
