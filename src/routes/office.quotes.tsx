import { createFileRoute } from "@tanstack/react-router";
import { FileSignature } from "lucide-react";
import { OfficePlaceholder } from "@/components/OfficePlaceholder";

export const Route = createFileRoute("/office/quotes")({ component: QuotesPage });

function QuotesPage() {
  return (
    <OfficePlaceholder
      title="Devis"
      description="Création, suivi et signature des devis clients."
      icon={FileSignature}
    />
  );
}
