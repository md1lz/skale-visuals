import { createFileRoute, redirect } from "@tanstack/react-router";

/** Redirections permanentes des anciennes routes /crm vers /settings. */
export function mapLegacyCrmPath(_pathname: string): string {
  return "/settings";
}

export const Route = createFileRoute("/crm")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: mapLegacyCrmPath(location.pathname), statusCode: 301 });
  },
});
