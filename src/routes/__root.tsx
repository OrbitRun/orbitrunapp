import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import BottomNav from "@/components/BottomNav";
import PrAchievement from "@/components/PrAchievement";
import SplashScreen from "@/components/SplashScreen";
import FreezeDiagnostics from "@/components/FreezeDiagnostics";
import { I18nProvider } from "@/lib/i18n";
import { useHealthAutoSync } from "@/hooks/use-health-auto-sync";
import { useSpotifyRunControl } from "@/hooks/use-spotify-run-control";
import { useBodyUnlock } from "@/hooks/use-body-unlock";

import { initSpotifyDeepLinkListener } from "@/lib/spotify";

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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" },
      { name: "theme-color", content: "#000000" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "ORBIT" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "format-detection", content: "telephone=no" },
      { title: "ORBIT RUN" },
      { name: "description", content: "Premium GPS running tracker with live splits, speed-heatmap routes, music hub and audio cues." },
      { property: "og:title", content: "ORBIT RUN" },
      {
        property: "og:description",
        content:
          "Track every run in style. Live pace, splits, elevation, and a glowing speed-heatmap route.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "ORBIT RUN" },
      { name: "description", content: "ORBIT RUN tracks your runs with GPS, displaying distance, pace, and elevation on a dynamic speed-heatmap." },
      { property: "og:description", content: "Premium GPS running tracker with live splits, speed-heatmap routes, music hub and audio cues." },
      { name: "twitter:description", content: "Premium GPS running tracker with live splits, speed-heatmap routes, music hub and audio cues." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/cLilpdIvaNfHpg6kReeYM1BgB8i1/social-images/social-1777668607279-Orbit_Run_Logo_-_full_1024x1024.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/cLilpdIvaNfHpg6kReeYM1BgB8i1/social-images/social-1777668607279-Orbit_Run_Logo_-_full_1024x1024.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap",
      },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "mask-icon", href: "/safari-pinned-tab.svg", color: "#C6F432" },
    ],
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
  useHealthAutoSync();
  useSpotifyRunControl();
  useBodyUnlock();

  
  useEffect(() => initSpotifyDeepLinkListener(), []);
  return (
    <I18nProvider>
      <div className="app-shell">
        <div className="app-content">
          <Outlet />
        </div>
        <BottomNav />
        <PrAchievement />
      </div>
      <FreezeDiagnostics />
      <SplashScreen />
    </I18nProvider>
  );
}
