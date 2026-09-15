import { createFileRoute } from "@tanstack/react-router";
import { AccountPanel, SettingsHeader, SettingsPage } from "@/components/office/SettingsSections";

export const Route = createFileRoute("/settings/account")({
  component: AccountPage,
});

function AccountPage() {
  return (
    <SettingsPage>
      <SettingsHeader title="Mon compte" subtitle="Profil et identifiants de connexion." />
      <div className="space-y-6">
        <AccountPanel />
      </div>
    </SettingsPage>
  );
}
