import { createFileRoute, redirect } from "@tanstack/react-router";

import { mapLegacyCrmPath } from "./crm";

export const Route = createFileRoute("/crm/$")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: mapLegacyCrmPath(location.pathname), statusCode: 301 });
  },
});
