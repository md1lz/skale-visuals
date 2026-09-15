import { createFileRoute } from "@tanstack/react-router";
import { AccountsSection, SettingsHeader, SettingsPage } from "@/components/office/SettingsSections";

export const Route = createFileRoute("/settings/admins")({
  component: AdminsPage,
});

function AdminsPage() {
  return (
    <SettingsPage>
      <SettingsHeader title="Comptes admin" subtitle="Accès à l'espace interne." />
      <AccountsSection />
    </SettingsPage>
  );
}
