import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/crm/")({
  beforeLoad: () => {
    throw redirect({ href: "/settings", statusCode: 301 });
  },
});
