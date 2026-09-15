import { createFileRoute } from "@tanstack/react-router";
import { SettingsHeader, SettingsPage } from "@/components/office/SettingsSections";
import { RememberedConnections } from "@/components/RememberedConnections";

export const Route = createFileRoute("/settings/connections")({
  component: ConnectionsPage,
});

function ConnectionsPage() {
  return (
    <SettingsPage>
      <SettingsHeader title="Connexions" subtitle="Appareils mémorisés et connexions récentes." />
      <RememberedConnections />
    </SettingsPage>
  );
}
