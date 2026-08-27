import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/office/website")({
  beforeLoad: () => {
    throw redirect({ to: "/office/settings", search: { tab: "website" } });
  },
  component: () => null,
});
