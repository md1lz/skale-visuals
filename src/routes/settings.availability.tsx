import { createFileRoute } from "@tanstack/react-router";
import { Card, SettingsHeader, SettingsPage } from "@/components/office/SettingsSections";
import { AvailabilitySettings } from "@/components/office/AvailabilitySettings";

export const Route = createFileRoute("/settings/availability")({
  component: AvailabilityPage,
});

function AvailabilityPage() {
  return (
    <SettingsPage>
      <SettingsHeader title="Disponibilités" subtitle="Créneaux proposés sur la page Book a Call." />
      <Card title="Disponibilités" description="Créneaux proposés sur la page Book a Call.">
        <AvailabilitySettings />
      </Card>
    </SettingsPage>
  );
}
