import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import type * as MapboxNS from "mapbox-gl";
import type { Run } from "@/lib/run-types";
import { formatDistance, formatDuration, formatPace } from "@/lib/run-utils";
import { MAPBOX_STYLE, MAPBOX_TOKEN } from "@/lib/mapbox";
import { buildReplaySeries, sampleAtMs, type ReplaySeries } from "@/lib/run-replay";
import { useI18n } from "@/lib/i18n";

type Props = { run: Run; className?: string };

export default function RunReplay(props: Props) {
  return (
    <ClientOnly fallback={<div className={props.className} style={{ minHeight: 280 }} />}>
      <RunReplayInner {...props} />
    </ClientOnly>
  );
}

const SPEEDS = [1, 2, 4, 8] as const;

function RunReplayInner({ run, className }: Props) {
  const { t } = useI18n();
  const series = useMemo<ReplaySeries>(() => buildReplaySeries(run), [run]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxNS.Map | null>(null);
  const MRef = useRef<typeof MapboxNS | null>(null);
  const headRef = useRef<MapboxNS.Marker | null>(null);
  const startMarkerRef = useRef<MapboxNS.Marker | null>(null);
  const fittedRef = useRef(false);
  const [ready, setReady] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedX, setSpeedX] = useState<number>(2);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Init map
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
        interactive: true,
        pitchWithRotate: false,
        cooperativeGestures: true,
        scrollZoom: false,
        doubleClickZoom: true,
      });
      map.on("load", () => {
        if (cancelled) return;
        map.addSource("replay-line", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "replay-line-border",
          type: "line",
          source: "replay-line",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-width": 6, "line-color": "#000", "line-opacity": 0.55 },
        });
        map.addLayer({
          id: "replay-line-main",
          type: "line",
          source: "replay-line",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-width": 4,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            "line-color": ["get", "color"] as any,
            "line-opacity": 1,
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
      startMarkerRef.current?.remove();
      startMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Render heatmap segments
  useEffect(() => {
    const map = mapRef.current;
    const M = MRef.current;
    if (!map || !M || !ready) return;
    const src = map.getSource("replay-line") as MapboxNS.GeoJSONSource | undefined;
    if (!src) return;
    const features = series.segments.map((seg) => ({
      type: "Feature" as const,
      properties: { color: seg.color },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [seg.from.lng, seg.from.lat],
          [seg.to.lng, seg.to.lat],
        ],
      },
    }));
    src.setData({ type: "FeatureCollection", features });

    if (!fittedRef.current && series.samples.length >= 2) {
      const bounds = new M.LngLatBounds();
      series.samples.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 40, maxZoom: 17, duration: 0 });
      fittedRef.current = true;
    }
    if (series.samples.length > 0 && !startMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:12px;height:12px;border-radius:9999px;background:#fff;border:2px solid rgba(0,0,0,0.5);";
      const first = series.samples[0];
      startMarkerRef.current = new M.Marker({ element: el })
        .setLngLat([first.lng, first.lat])
        .addTo(map);
    }
  }, [series, ready]);

  // Animate scrubber playback
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    lastTickRef.current = performance.now();
    const loop = (now: number) => {
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      setElapsed((prev) => {
        const next = prev + dt * speedX;
        if (next >= series.totalMs) {
          setPlaying(false);
          return series.totalMs;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, speedX, series.totalMs]);

  // Pause when tab is hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const current = useMemo(() => sampleAtMs(series, elapsed), [series, elapsed]);

  // Move head marker
  useEffect(() => {
    const map = mapRef.current;
    const M = MRef.current;
    if (!map || !M || !ready || !current) return;
    if (!headRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:#fff;border:3px solid oklch(0.92 0.21 130);";
      headRef.current = new M.Marker({ element: el })
        .setLngLat([current.lng, current.lat])
        .addTo(map);
    } else {
      headRef.current.setLngLat([current.lng, current.lat]);
    }
  }, [current, ready]);

  const togglePlay = useCallback(() => {
    if (elapsed >= series.totalMs) setElapsed(0);
    setPlaying((p) => !p);
  }, [elapsed, series.totalMs]);

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaying(false);
    setElapsed(parseInt(e.target.value, 10));
  };

  const pace = current?.paceSecPerKm;
  const speed = current?.speedMps;
  const alt = current?.alt;

  return (
    <div className={className}>
      <section className="rounded-3xl overflow-hidden border border-border shadow-card relative">
        <div ref={containerRef} className="h-[280px] w-full" />
      </section>

      {/* Legend */}
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

      {/* Live readouts */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <Tile label={t("stat.duration")} value={formatDuration(elapsed)} />
        <Tile label={t("stat.distance")} value={formatDistance(current?.distM ?? 0)} />
        <Tile
          label={t("stat.pace")}
          value={pace && pace > 0 ? formatPace(pace) : "—"}
          sub={speed && speed > 0 ? `${speed.toFixed(1)} m/s` : undefined}
        />
        <Tile
          label={t("replay.elevation")}
          value={typeof alt === "number" ? `${Math.round(alt)} m` : "—"}
        />
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center gap-3 px-1">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? t("replay.pause") : t("replay.play")}
          className="h-10 w-10 grid place-items-center rounded-full bg-neon text-black active:scale-95 transition"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(1, series.totalMs)}
          value={elapsed}
          onChange={onScrub}
          className="flex-1 accent-[oklch(0.92_0.21_130)]"
        />
      </div>

      <div className="mt-2 flex items-center gap-1.5 px-1">
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mr-1">
          {t("replay.speed")}
        </span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeedX(s)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
              speedX === s
                ? "bg-neon text-black border-transparent"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl glass p-2.5">
      <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
        {label}
      </div>
      <div className="text-base font-extrabold tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-[10px] tabular-nums text-muted-foreground">{sub}</div>}
    </div>
  );
}
