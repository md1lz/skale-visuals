import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { OfficePlaceholder } from "@/components/OfficePlaceholder";

export const Route = createFileRoute("/office/invoices")({ component: InvoicesPage });

function InvoicesPage() {
  return (
    <OfficePlaceholder
      title="Factures"
      description="Émission des factures et suivi des paiements."
      icon={Receipt}
    />
  );
}
