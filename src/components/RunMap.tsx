import { useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type * as MapboxNS from "mapbox-gl";
import type { GeoPoint } from "@/lib/run-types";
import { speedToColor, smoothSpeeds } from "@/lib/run-utils";
import { MAPBOX_STYLE, MAPBOX_TOKEN } from "@/lib/mapbox";

type Props = {
  points: GeoPoint[];
  className?: string;
  follow?: boolean;
  interactive?: boolean;
  ghost?: { path: { lat: number; lng: number; t: number }[]; elapsedMs: number } | null;
};

export default function RunMap(props: Props) {
  return (
    <ClientOnly fallback={<div className={props.className} />}>
      <RunMapInner {...props} />
    </ClientOnly>
  );
}

function RunMapInner({
  points,
  className,
  follow = true,
  interactive = true,
  ghost = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxNS.Map | null>(null);
  const MRef = useRef<typeof MapboxNS | null>(null);
  const headRef = useRef<MapboxNS.Marker | null>(null);
  const ghostMarkerRef = useRef<MapboxNS.Marker | null>(null);
  const fittedOnceRef = useRef(false);
  const [ready, setReady] = useState(false);

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

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: [-0.09, 51.505],
        zoom: 14,
        attributionControl: true,
        interactive,
        pitchWithRotate: false,
      });

      map.on("load", () => {
        if (cancelled) return;
        // Empty source for run line segments (FeatureCollection of LineStrings,
        // each with a `color` property used by data-driven styling).
        map.addSource("run-segments", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "run-segments-line",
          type: "line",
          source: "run-segments",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-width": 5,
            "line-opacity": 0.95,
            "line-color": ["get", "color"],
          },
        });
        setReady(true);
      });

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      headRef.current?.remove();
      headRef.current = null;
      ghostMarkerRef.current?.remove();
      ghostMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [interactive]);

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
    // Binary search for index with t <= elapsedMs
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

  // Render segments + head marker
  useEffect(() => {
    const map = mapRef.current;
    const M = MRef.current;
    if (!map || !M || !ready) return;

    const src = map.getSource("run-segments") as MapboxNS.GeoJSONSource | undefined;
    if (!src) return;

    if (points.length === 0) {
      src.setData({ type: "FeatureCollection", features: [] });
      headRef.current?.remove();
      headRef.current = null;
      return;
    }

    const smoothed = smoothSpeeds(points.map((p) => p.speed ?? 0), 0.25);
    const features = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      // Average smoothed speed across the segment for a gradual blend between neighbors.
      const segSpeed = (smoothed[i - 1] + smoothed[i]) / 2;
      features.push({
        type: "Feature" as const,
        properties: { color: speedToColor(segSpeed) },
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [a.lng, a.lat],
            [b.lng, b.lat],
          ],
        },
      });
    }
    src.setData({ type: "FeatureCollection", features });

    const last = points[points.length - 1];
    if (!headRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:14px;height:14px;border-radius:9999px;background:oklch(0.92 0.21 130);border:2px solid #fff;box-shadow:0 0 12px oklch(0.92 0.21 130 / 0.8);";
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
    } else if (follow) {
      map.easeTo({ center: [last.lng, last.lat], duration: 600 });
    }
  }, [points, follow, ready]);

  useEffect(() => {
    if (points.length === 0) {
      fittedOnceRef.current = false;
    }
  }, [points.length]);

  return <div ref={containerRef} className={className} />;
}
