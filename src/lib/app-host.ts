import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

/** Public URL of the client space (sub-domain only). */
export const CLIENT_APP_URL = "https://app.skalevisuals.com";

function hostIsClientApp(host: string) {
  return host.toLowerCase().startsWith("app.");
}

/**
 * True when the current request is served on the client-space sub-domain
 * (app.skalevisuals.com). In dev/preview, `?clientapp` forces it on.
 */
export const getIsClientAppHost = createIsomorphicFn()
  .server(() => {
    try {
      const url = getRequestUrl({ xForwardedHost: true });
      return hostIsClientApp(url.hostname) || url.searchParams.has("clientapp");
    } catch {
      return false;
    }
  })
  .client(() => {
    if (typeof window === "undefined") return false;
    return (
      hostIsClientApp(window.location.hostname) ||
      new URLSearchParams(window.location.search).has("clientapp")
    );
  });
