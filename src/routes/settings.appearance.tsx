import { createFileRoute } from "@tanstack/react-router";
import {
  BackgroundSection,
  SettingsHeader,
  SettingsPage,
  ThemeSection,
} from "@/components/office/SettingsSections";

export const Route = createFileRoute("/settings/appearance")({
  component: AppearancePage,
});

function AppearancePage() {
  return (
    <SettingsPage>
      <SettingsHeader title="Apparence" subtitle="Thème et arrière-plan de cet appareil." />
      <div className="space-y-6">
        <ThemeSection />
        <BackgroundSection />
      </div>
    </SettingsPage>
  );
}
