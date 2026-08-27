import { createFileRoute, redirect } from "@tanstack/react-router";

/** Redirections permanentes des anciennes routes /crm vers /office et /studio. */
export function mapLegacyCrmPath(pathname: string): string {
  const rest = pathname.replace(/^\/crm/, "");
  if (rest.startsWith("/editor")) return `/studio${rest.slice("/editor".length)}` || "/studio";
  if (rest.startsWith("/admin")) return `/office${rest.slice("/admin".length)}` || "/office";
  return "/office";
}

export const Route = createFileRoute("/crm")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: mapLegacyCrmPath(location.pathname), statusCode: 301 });
  },
});
