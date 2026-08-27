import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { initTracker, trackPageView } from "../lib/tracker";
import { Toaster } from "../components/ui/sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMaintenanceStatus } from "@/lib/site-settings.functions";
import { getAdminSessionFn } from "@/lib/admin-auth.functions";
import { MaintenancePage } from "../components/MaintenancePage";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Skale Visuals" },
      { name: "description", content: "Montage vidéo professionnel, color grading, sous-titres et motion design. Livraison en 72h. +120 clients, +850 vidéos livrées." },
      { property: "og:title", content: "Skale Visuals" },
      { property: "og:description", content: "Montage vidéo professionnel, color grading, sous-titres et motion design. Livraison en 72h. +120 clients, +850 vidéos livrées." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Skale Visuals" },
      { name: "twitter:description", content: "Montage vidéo professionnel, color grading, sous-titres et motion design. Livraison en 72h. +120 clients, +850 vidéos livrées." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1595f4cb-765d-47fa-ba8e-8ea1899c9d85/id-preview-8a89de20--b2671d23-9490-4363-bfc0-aecd2bf36530.lovable.app-1782754415975.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1595f4cb-765d-47fa-ba8e-8ea1899c9d85/id-preview-8a89de20--b2671d23-9490-4363-bfc0-aecd2bf36530.lovable.app-1782754415975.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  loader: async () => {
    const [maintenance, session] = await Promise.all([
      getMaintenanceStatus(),
      getAdminSessionFn(),
    ]);
    return { maintenance, session };
  },
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <RootInner />
    </QueryClientProvider>
  );
}

function RootInner() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const loaderData = Route.useLoaderData();
  const isAdmin =
    pathname.startsWith("/office") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/crm");

  useEffect(() => {
    initTracker();
  }, []);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    // Safety: the PWA manifest must only be present on /app. Remove any stale
    // manifest link that could leak onto the public site or other routes.
    const manifestLink = document.querySelector("link[rel='manifest']");
    if (manifestLink && !pathname.startsWith("/app")) {
      manifestLink.remove();
    }
  }, [pathname]);

  const fetchMaintenance = useServerFn(getMaintenanceStatus);
  const fetchSession = useServerFn(getAdminSessionFn);
  const maintenanceQ = useQuery({
    queryKey: ["site", "maintenance"],
    queryFn: () => fetchMaintenance(),
    initialData: loaderData?.maintenance,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const sessionQ = useQuery({
    queryKey: ["admin", "session"],
    queryFn: () => fetchSession(),
    initialData: loaderData?.session,
    staleTime: 60_000,
  });

  const isMaintenance = !!maintenanceQ.data?.enabled;
  const isAdminUser = !!sessionQ.data?.user;
  const forcePreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("maintenance") === "preview";
  const showMaintenance =
    !isAdmin && (forcePreview || (isMaintenance && !isAdminUser));

  return (
    <>
      {showMaintenance ? (
        <MaintenancePage
          message={
            maintenanceQ.data?.message ??
            "Nous effectuons actuellement une maintenance. Merci de revenir un peu plus tard."
          }
        />
      ) : (
        <Outlet />
      )}
      <Toaster richColors position="bottom-right" theme="dark" />
    </>
  );
}
