import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { OfficePlaceholder } from "@/components/OfficePlaceholder";

export const Route = createFileRoute("/office/services")({ component: ServicesPage });

function ServicesPage() {
  return (
    <OfficePlaceholder
      title="Prestations"
      description="Catalogue des prestations et tarifs Skale Visuals."
      icon={Sparkles}
    />
  );
}
