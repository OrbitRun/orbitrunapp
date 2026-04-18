import { useEffect, useRef } from "react";
import L from "leaflet";
import type { GeoPoint } from "@/lib/run-types";
import { speedToColor } from "@/lib/run-utils";

type Props = {
  points: GeoPoint[];
  className?: string;
  follow?: boolean;
  interactive?: boolean;
};

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export default function RunMap({
  points,
  className,
  follow = true,
  interactive = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const segmentsRef = useRef<L.Polyline[]>([]);
  const headRef = useRef<L.CircleMarker | null>(null);
  const fittedOnceRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      keyboard: interactive,
    }).setView([51.505, -0.09], 15);

    L.tileLayer(DARK_TILES, {
      attribution: "© OpenStreetMap © CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      segmentsRef.current = [];
      headRef.current = null;
    };
  }, [interactive]);

  // Render segments
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clear old
    segmentsRef.current.forEach((s) => s.remove());
    segmentsRef.current = [];

    if (points.length === 0) return;

    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const seg = L.polyline(
        [
          [a.lat, a.lng],
          [b.lat, b.lng],
        ],
        {
          color: speedToColor(b.speed),
          weight: 5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        },
      ).addTo(map);
      segmentsRef.current.push(seg);
    }

    const last = points[points.length - 1];
    if (!headRef.current) {
      headRef.current = L.circleMarker([last.lat, last.lng], {
        radius: 7,
        color: "#ffffff",
        weight: 2,
        fillColor: "oklch(0.92 0.21 130)",
        fillOpacity: 1,
      }).addTo(map);
    } else {
      headRef.current.setLatLng([last.lat, last.lng]);
    }

    if (!fittedOnceRef.current && points.length >= 2) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      fittedOnceRef.current = true;
    } else if (follow) {
      map.panTo([last.lat, last.lng], { animate: true, duration: 0.6 });
    }
  }, [points, follow]);

  // When tracking restarts (points cleared), recenter next time
  useEffect(() => {
    if (points.length === 0) {
      fittedOnceRef.current = false;
      if (headRef.current) {
        headRef.current.remove();
        headRef.current = null;
      }
    }
  }, [points.length]);

  return <div ref={containerRef} className={className} />;
}
