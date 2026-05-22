import { useCallback, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Crosshair } from "lucide-react";
import type * as MapboxNS from "mapbox-gl";
import type { GeoPoint } from "@/lib/run-types";
import { catmullRomSpline, smoothCoordinates } from "@/lib/run-utils";
import { MAPBOX_STYLE, MAPBOX_TOKEN, mapboxTransformRequest } from "@/lib/mapbox";
import { buildPaceSegmentsFromPoints } from "@/lib/run-replay";
import { useI18n } from "@/lib/i18n";
import {
  isNativeGeolocationAvailable,
  nativeClearWatch,
  nativeGetCurrentPosition,
  nativeWatchPosition,
  requestNativeGeolocationPermission,
  toBrowserPosition,
} from "@/lib/geolocation-native";

type Props = {
  points: GeoPoint[];
  className?: string;
  follow?: boolean;
  interactive?: boolean;
  ghost?: { path: { lat: number; lng: number; t: number }[]; elapsedMs: number } | null;
  /** Optional pulsing highlight marker (e.g. driven by the HR scrubber). */
  highlight?: { lat: number; lng: number } | null;
  /** Render the route as a pace heatmap (fast→slow color ramp). */
  heatmap?: boolean;
  /** Show a fast/slow legend below the map (only when heatmap is on). */
  showLegend?: boolean;
};

export default function RunMap(props: Props) {
  return (
    <ClientOnly fallback={<div className={props.className} />}>
      <RunMapInner {...props} />
    </ClientOnly>
  );
}

// Resolve the neon green primary token at runtime so the path matches the
// rest of the Orbit Run aesthetic without hard-coding hex values.
// Mapbox GL's color parser does not handle oklch() — return a hex equivalent
// of the neon token so layers render correctly instead of falling back to black.
function readNeonColor(): string {
  return "#C6F432";
}

function RunMapInner({
  points,
  className,
  follow = true,
  interactive = true,
  ghost = null,
  highlight = null,
  heatmap = false,
  showLegend = false,
}: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxNS.Map | null>(null);
  const MRef = useRef<typeof MapboxNS | null>(null);
  const startRef = useRef<MapboxNS.Marker | null>(null);
  const headRef = useRef<MapboxNS.Marker | null>(null);
  const ghostMarkerRef = useRef<MapboxNS.Marker | null>(null);
  const highlightMarkerRef = useRef<MapboxNS.Marker | null>(null);
  const userLocMarkerRef = useRef<MapboxNS.Marker | null>(null);
  const userLocCenteredRef = useRef(false);
  const fittedOnceRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [userMoved, setUserMoved] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<
    "idle" | "locating" | "ready" | "denied" | "unavailable" | "error"
  >("idle");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("orbit.lastUserLoc");
      return raw ? (JSON.parse(raw) as { lat: number; lng: number }) : null;
    } catch {
      return null;
    }
  });

  // Init map (client-only, dynamic import)
  useEffect(() => {
    let cancelled = false;
    if (typeof window === "undefined") return;

    (async () => {
      const mod = await import("mapbox-gl");
      const mapboxgl = (mod.default ?? mod) as unknown as typeof MapboxNS;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapboxgl as any).accessToken = MAPBOX_TOKEN;
      MRef.current = mapboxgl;

      // Default center: cached last user location if available, else a
      // geographically neutral Denmark center so the fallback doesn't look
      // like London when the GPS fix is still pending.
      const initialCenter: [number, number] = userLoc
        ? [userLoc.lng, userLoc.lat]
        : [10.2, 56.15];
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: initialCenter,
        zoom: userLoc ? 15 : 6,
        attributionControl: true,
        interactive,
        pitchWithRotate: false,
        cooperativeGestures: interactive,
        scrollZoom: false,
        boxZoom: false,
        doubleClickZoom: interactive,
        touchPitch: false,
        transformRequest: mapboxTransformRequest,
      });

      const markUserMoved = (e: unknown) => {
        if ((e as { originalEvent?: Event }).originalEvent) setUserMoved(true);
      };
      map.on("dragstart", markUserMoved);
      map.on("zoomstart", markUserMoved);

      map.on("load", () => {
        if (cancelled) return;
        const neon = readNeonColor();
        map.addSource("run-line", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        if (!heatmap) {
          // Live mode: neon glow underlay for clear visibility on the dark map.
          map.addLayer({
            id: "run-line-glow",
            type: "line",
            source: "run-line",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-width": 14,
              "line-color": neon,
              "line-opacity": 0.35,
              "line-blur": 8,
            },
          });
        }
        map.addLayer({
          id: "run-line-main",
          type: "line",
          source: "run-line",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-width": 5,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            "line-color": (heatmap ? (["coalesce", ["get", "color"], neon] as any) : neon),
            "line-opacity": 1,
          },
        });
        setReady(true);
      });

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      startRef.current?.remove();
      startRef.current = null;
      headRef.current?.remove();
      headRef.current = null;
      ghostMarkerRef.current?.remove();
      ghostMarkerRef.current = null;
      highlightMarkerRef.current?.remove();
      highlightMarkerRef.current = null;
      userLocMarkerRef.current?.remove();
      userLocMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [interactive, heatmap]);

  // GPS warm-up: subscribe to user location before a run starts so the map
  // can center immediately and we keep the GPS chip warm for an accurate
  // first fix when the runner taps Start.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (points.length > 0) return; // run started — tracker takes over
    let cancelled = false;
    let webWatchId: number | null = null;
    let nativeId: string | null = null;

    const onPos = (lat: number, lng: number) => {
      if (cancelled) return;
      // eslint-disable-next-line no-console
      console.log("[map] userLoc fix", lat, lng);
      setUserLoc({ lat, lng });
      setGpsStatus("ready");
      setGpsError(null);
      try {
        window.localStorage.setItem("orbit.lastUserLoc", JSON.stringify({ lat, lng }));
      } catch {
        /* noop */
      }
    };

    setGpsStatus("locating");

    (async () => {
      if (isNativeGeolocationAvailable()) {
        const status = await requestNativeGeolocationPermission();
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.log("[map] native perm status", status);
        if (status === "denied") {
          setGpsStatus("denied");
          setGpsError("Lokationsadgang er ikke tilladt. Åbn Indstillinger → Orbit Run → Lokation → Mens appen er i brug.");
          return;
        }
        if (status === "unavailable") {
          setGpsStatus("unavailable");
          setGpsError("GPS-pluginnet er ikke tilgængeligt i denne build.");
          return;
        }
        for (let i = 0; i < 3 && !cancelled; i++) {
          const fix = await nativeGetCurrentPosition();
          if (fix) {
            const b = toBrowserPosition(fix);
            onPos(b.coords.latitude, b.coords.longitude);
            break;
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
        if (cancelled) return;
        nativeId = await nativeWatchPosition(
          (p) => {
            const b = toBrowserPosition(p);
            onPos(b.coords.latitude, b.coords.longitude);
          },
          (err) => {
            // eslint-disable-next-line no-console
            console.warn("[map] native watch error", err);
            setGpsStatus("error");
            setGpsError(err.message || "GPS-fejl");
          },
        );
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) => onPos(p.coords.latitude, p.coords.longitude),
          (e) => {
            setGpsStatus("error");
            setGpsError(e.message || "GPS-fejl");
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
        );
        webWatchId = navigator.geolocation.watchPosition(
          (p) => onPos(p.coords.latitude, p.coords.longitude),
          (e) => {
            setGpsStatus("error");
            setGpsError(e.message || "GPS-fejl");
          },
          { enableHighAccuracy: true, maximumAge: 2000 },
        );
      } else {
        setGpsStatus("unavailable");
        setGpsError("Geolocation er ikke understøttet.");
      }
    })();

    return () => {
      cancelled = true;
      if (webWatchId != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(webWatchId);
      }
      if (nativeId) void nativeClearWatch(nativeId);
    };
  }, [points.length]);

  // Render pulsating neon user-location marker (only before a run).
  useEffect(() => {
    const map = mapRef.current;
    const M = MRef.current;
    if (!map || !M || !ready) return;
    if (points.length > 0 || !userLoc) {
      userLocMarkerRef.current?.remove();
      userLocMarkerRef.current = null;
      return;
    }
    if (!userLocMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "position:relative;width:14px;height:14px;border-radius:9999px;background:#C6F432;border:2px solid #0a0a0a;box-shadow:0 0 10px #C6F432;";
      const halo = document.createElement("div");
      halo.style.cssText =
        "position:absolute;inset:-6px;border-radius:9999px;background:#C6F432;opacity:0.35;animation:user-loc-pulse 1.6s ease-out infinite;";
      el.appendChild(halo);
      userLocMarkerRef.current = new M.Marker({ element: el })
        .setLngLat([userLoc.lng, userLoc.lat])
        .addTo(map);
    } else {
      userLocMarkerRef.current.setLngLat([userLoc.lng, userLoc.lat]);
    }
    // Center on the very first user fix; afterwards follow if user hasn't panned.
    if (!userLocCenteredRef.current) {
      userLocCenteredRef.current = true;
      map.easeTo({ center: [userLoc.lng, userLoc.lat], zoom: 16, duration: 600 });
    } else if (follow && !userMoved) {
      map.easeTo({ center: [userLoc.lng, userLoc.lat], duration: 800 });
    }
  }, [userLoc, ready, points.length, follow, userMoved]);

  // Scrubber highlight marker — pulsing neon dot at the synced HR sample.
  useEffect(() => {
    const map = mapRef.current;
    const M = MRef.current;
    if (!map || !M || !ready) return;
    if (!highlight) {
      highlightMarkerRef.current?.remove();
      highlightMarkerRef.current = null;
      return;
    }
    if (!highlightMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "position:relative;width:14px;height:14px;border-radius:9999px;background:oklch(0.92 0.21 130);border:2px solid #000;box-shadow:0 0 12px oklch(0.92 0.21 130);";
      const halo = document.createElement("div");
      halo.style.cssText =
        "position:absolute;inset:-6px;border-radius:9999px;background:oklch(0.92 0.21 130);opacity:0.35;animation:hr-marker-pulse 1.4s ease-out infinite;";
      el.appendChild(halo);
      highlightMarkerRef.current = new M.Marker({ element: el })
        .setLngLat([highlight.lng, highlight.lat])
        .addTo(map);
    } else {
      highlightMarkerRef.current.setLngLat([highlight.lng, highlight.lat]);
    }
  }, [highlight, ready]);


  // Ghost marker: hollow white circle interpolated along saved path.
  useEffect(() => {
    const map = mapRef.current;
    const M = MRef.current;
    if (!map || !M || !ready) return;
    if (!ghost || ghost.path.length < 2) {
      ghostMarkerRef.current?.remove();
      ghostMarkerRef.current = null;
      return;
    }
    const total = ghost.path[ghost.path.length - 1].t;
    if (ghost.elapsedMs > total) {
      ghostMarkerRef.current?.remove();
      ghostMarkerRef.current = null;
      return;
    }
    let lo = 0;
    let hi = ghost.path.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ghost.path[mid].t <= ghost.elapsedMs) lo = mid;
      else hi = mid - 1;
    }
    const a = ghost.path[lo];
    const b = ghost.path[Math.min(lo + 1, ghost.path.length - 1)];
    const span = b.t - a.t;
    const frac = span > 0 ? (ghost.elapsedMs - a.t) / span : 0;
    const lat = a.lat + (b.lat - a.lat) * frac;
    const lng = a.lng + (b.lng - a.lng) * frac;
    if (!ghostMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:14px;height:14px;border-radius:9999px;background:transparent;border:2px solid rgba(255,255,255,0.75);box-shadow:none;";
      ghostMarkerRef.current = new M.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    } else {
      ghostMarkerRef.current.setLngLat([lng, lat]);
    }
  }, [ghost, ready]);

  // Render smoothed path + start/head markers.
  useEffect(() => {
    const map = mapRef.current;
    const M = MRef.current;
    if (!map || !M || !ready) return;

    const src = map.getSource("run-line") as MapboxNS.GeoJSONSource | undefined;
    if (!src) return;

    if (points.length === 0) {
      src.setData({ type: "FeatureCollection", features: [] });
      startRef.current?.remove();
      startRef.current = null;
      headRef.current?.remove();
      headRef.current = null;
      return;
    }

    if (heatmap) {
      const segments = buildPaceSegmentsFromPoints(points);
      const features = segments.length
        ? segments.map((seg) => ({
            type: "Feature" as const,
            properties: { color: seg.color },
            geometry: {
              type: "LineString" as const,
              coordinates: [
                [seg.from.lng, seg.from.lat],
                [seg.to.lng, seg.to.lat],
              ],
            },
          }))
        : [];
      src.setData({ type: "FeatureCollection", features });
    } else {
      // Smooth the raw GPS trace, then interpolate with a Catmull-Rom spline so
      // the rendered polyline reads as smooth curves rather than jagged lines.
      const smoothed = smoothCoordinates(points, 0.45);
      const curve = catmullRomSpline(smoothed, 10);
      const coords = curve.map((p) => [p.lng, p.lat]);

      src.setData({
        type: "FeatureCollection",
        features:
          coords.length >= 2
            ? [
                {
                  type: "Feature",
                  properties: {},
                  geometry: { type: "LineString", coordinates: coords },
                },
              ]
            : [],
      });
    }

    // Clean white start dot
    const first = points[0];
    if (!startRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:12px;height:12px;border-radius:9999px;background:#fff;border:2px solid rgba(0,0,0,0.5);box-shadow:none;";
      startRef.current = new M.Marker({ element: el })
        .setLngLat([first.lng, first.lat])
        .addTo(map);
    } else {
      startRef.current.setLngLat([first.lng, first.lat]);
    }

    // Bold neon current-position marker (white core + neon ring, no glow)
    const last = points[points.length - 1];
    if (!headRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:#fff;border:3px solid oklch(0.92 0.21 130);box-shadow:none;";
      headRef.current = new M.Marker({ element: el })
        .setLngLat([last.lng, last.lat])
        .addTo(map);
    } else {
      headRef.current.setLngLat([last.lng, last.lat]);
    }

    if (!fittedOnceRef.current && points.length >= 2) {
      const bounds = new M.LngLatBounds();
      points.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 40, maxZoom: 17, duration: 0 });
      fittedOnceRef.current = true;
    } else if (follow && !userMoved) {
      // Smoothly follow the runner's current position — no abrupt jumps.
      map.easeTo({ center: [last.lng, last.lat], duration: 800 });
    }
  }, [points, follow, ready, userMoved, heatmap]);

  useEffect(() => {
    if (points.length === 0) {
      fittedOnceRef.current = false;
    }
  }, [points.length]);

  const recenter = useCallback(() => {
    const map = mapRef.current;
    const M = MRef.current;
    if (!map || !M) return;
    if (points.length >= 2) {
      const bounds = new M.LngLatBounds();
      points.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 40, maxZoom: 17, duration: 400 });
    } else if (points.length === 1) {
      map.easeTo({ center: [points[0].lng, points[0].lat], duration: 400, zoom: 16 });
    }
    setUserMoved(false);
  }, [points]);

  const showRecenter = interactive && userMoved && points.length > 0;
  const legend = heatmap && showLegend && points.length >= 2;
  return (
    <>
      <div ref={containerRef} className={`relative ${className ?? ""}`}>
        {showRecenter && (
          <button
            type="button"
            onClick={recenter}
            aria-label="Recenter on location"
            className="absolute right-3 bottom-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/80 backdrop-blur border border-border text-foreground shadow-card hover:bg-background pointer-events-auto"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        )}
      </div>
      {legend && (
        <div className="mt-3 flex items-center gap-2 px-1 text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
          <span>{t("replay.legend.fast")}</span>
          <div
            className="h-1.5 flex-1 rounded-full"
            style={{
              background:
                "linear-gradient(to right, oklch(0.92 0.21 130), oklch(0.85 0.17 85), oklch(0.65 0.22 25))",
            }}
          />
          <span>{t("replay.legend.slow")}</span>
        </div>
      )}
    </>
  );
}
