import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import BottomNav from "@/components/BottomNav";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-black text-neon">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-neon px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Back to running
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { name: "theme-color", content: "#0a0d12" },
      { title: "PULSE — Running Tracker" },
      {
        name: "description",
        content:
          "Premium GPS running tracker with live splits, speed-heatmap routes, music hub and audio cues.",
      },
      { property: "og:title", content: "PULSE — Running Tracker" },
      {
        property: "og:description",
        content:
          "Track every run in style. Live pace, splits, elevation, and a glowing speed-heatmap route.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "PULSE — Running Tracker" },
      { name: "description", content: "Apex Run tracks your runs with GPS, displaying distance, pace, and elevation on a dynamic speed-heatmap." },
      { property: "og:description", content: "Apex Run tracks your runs with GPS, displaying distance, pace, and elevation on a dynamic speed-heatmap." },
      { name: "twitter:description", content: "Apex Run tracks your runs with GPS, displaying distance, pace, and elevation on a dynamic speed-heatmap." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f61edd5-5fb3-4369-95b7-e71159faea82/id-preview-95b44da7--3d047850-7640-45ab-ac2e-13edce4313d1.lovable.app-1776502351867.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f61edd5-5fb3-4369-95b7-e71159faea82/id-preview-95b44da7--3d047850-7640-45ab-ac2e-13edce4313d1.lovable.app-1776502351867.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
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
  return (
    <div className="min-h-screen pb-24">
      <Outlet />
      <BottomNav />
    </div>
  );
}
