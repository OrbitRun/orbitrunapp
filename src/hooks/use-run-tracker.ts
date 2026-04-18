import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoPoint, Run, Split } from "@/lib/run-types";
import { saveRun } from "@/lib/run-types";
import { genId, haversine } from "@/lib/run-utils";

type Status = "idle" | "running" | "paused" | "finished";

type State = {
  status: Status;
  startedAt: number | null;
  elapsedMs: number;
  distanceM: number;
  elevationGainM: number;
  currentPaceSecPerKm: number; // last 30s rolling
  avgPaceSecPerKm: number;
  cadenceSpm: number;
  points: GeoPoint[];
  splits: Split[];
  permissionError: string | null;
};

const initial: State = {
  status: "idle",
  startedAt: null,
  elapsedMs: 0,
  distanceM: 0,
  elevationGainM: 0,
  currentPaceSecPerKm: 0,
  avgPaceSecPerKm: 0,
  cadenceSpm: 168, // simulated baseline
  points: [],
  splits: [],
  permissionError: null,
};

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = 1;
    u.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* noop */
  }
}

function paceText(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m} minute${m === 1 ? "" : "s"} ${s} second${s === 1 ? "" : "s"} per kilometer`;
}

export function useRunTracker() {
  const [state, setState] = useState<State>(initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  const watchIdRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSplitKmRef = useRef(0);
  const pauseAccumRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);

  const haptic = useCallback((ms = 30) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        /* noop */
      }
    }
  }, []);

  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      setState((prev) => {
        if (prev.status !== "running") return prev;
        const np: GeoPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          alt: pos.coords.altitude,
          t: pos.timestamp,
          speed: pos.coords.speed,
        };
        const last = prev.points[prev.points.length - 1];
        let addDist = 0;
        let addElev = 0;
        if (last) {
          addDist = haversine(last, np);
          // ignore tiny GPS jitter (<2m) and unrealistic jumps (>50m in <2s)
          const dt = (np.t - last.t) / 1000;
          if (addDist < 2) addDist = 0;
          if (dt > 0 && addDist / dt > 12) addDist = 0; // >12 m/s sprinting cap
          if (np.alt != null && last.alt != null) {
            const da = np.alt - last.alt;
            if (da > 0.5) addElev = da;
          }
        }
        const newDist = prev.distanceM + addDist;
        const newPoints = [...prev.points, np];

        // current pace from last ~30s
        let currentPace = prev.currentPaceSecPerKm;
        const cutoff = np.t - 30000;
        const recent = newPoints.filter((p) => p.t >= cutoff);
        if (recent.length >= 2) {
          let d = 0;
          for (let i = 1; i < recent.length; i++) d += haversine(recent[i - 1], recent[i]);
          const dur = (recent[recent.length - 1].t - recent[0].t) / 1000;
          if (d > 5 && dur > 0) {
            const speedMs = d / dur;
            currentPace = 1000 / speedMs; // sec per km
          }
        }

        // splits
        const newSplits = [...prev.splits];
        const kmCount = Math.floor(newDist / 1000);
        if (kmCount > lastSplitKmRef.current) {
          for (let k = lastSplitKmRef.current + 1; k <= kmCount; k++) {
            const totalDuration = prev.elapsedMs;
            const prevTotal = newSplits.reduce((a, s) => a + s.durationMs, 0);
            const splitDur = totalDuration - prevTotal;
            const splitPace = splitDur > 0 ? splitDur / 1000 : 0;
            const split: Split = {
              km: k,
              durationMs: splitDur,
              paceSecPerKm: splitPace,
              totalDistanceM: k * 1000,
              totalDurationMs: totalDuration,
            };
            newSplits.push(split);
            haptic(80);
            speak(
              `Kilometer ${k} completed. Split pace ${paceText(splitPace)}. Total distance ${k} kilometer${k === 1 ? "" : "s"}.`,
            );
          }
          lastSplitKmRef.current = kmCount;
        }

        const avgPace =
          newDist > 50 && prev.elapsedMs > 0 ? prev.elapsedMs / 1000 / (newDist / 1000) : 0;

        // cadence: subtle drift around 165–180 based on pace
        const cad = avgPace > 0 ? Math.round(180 - Math.min(20, (avgPace - 240) / 12)) : 168;

        return {
          ...prev,
          points: newPoints,
          distanceM: newDist,
          elevationGainM: prev.elevationGainM + addElev,
          currentPaceSecPerKm: currentPace,
          avgPaceSecPerKm: avgPace,
          cadenceSpm: cad,
          splits: newSplits,
        };
      });
    },
    [haptic],
  );

  const handleError = useCallback((err: GeolocationPositionError) => {
    setState((p) => ({ ...p, permissionError: err.message || "Location unavailable" }));
  }, []);

  const start = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((p) => ({ ...p, permissionError: "Geolocation not supported in this browser." }));
      return;
    }
    haptic(40);
    lastSplitKmRef.current = 0;
    pauseAccumRef.current = 0;
    pausedAtRef.current = null;
    setState({
      ...initial,
      status: "running",
      startedAt: Date.now(),
    });

    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000,
    });

    tickRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.status !== "running" || !prev.startedAt) return prev;
        const elapsed = Date.now() - prev.startedAt - pauseAccumRef.current;
        return { ...prev, elapsedMs: elapsed };
      });
    }, 250);
  }, [handlePosition, handleError, haptic]);

  const pause = useCallback(() => {
    haptic(25);
    pausedAtRef.current = Date.now();
    setState((p) => ({ ...p, status: "paused" }));
  }, [haptic]);

  const resume = useCallback(() => {
    haptic(25);
    if (pausedAtRef.current) {
      pauseAccumRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setState((p) => ({ ...p, status: "running" }));
  }, [haptic]);

  const stop = useCallback((): Run | null => {
    haptic(60);
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const s = stateRef.current;
    if (!s.startedAt || s.distanceM < 10) {
      setState({ ...initial });
      return null;
    }
    const run: Run = {
      id: genId(),
      startedAt: s.startedAt,
      endedAt: Date.now(),
      durationMs: s.elapsedMs,
      distanceM: s.distanceM,
      elevationGainM: s.elevationGainM,
      avgPaceSecPerKm: s.avgPaceSecPerKm,
      avgCadenceSpm: s.cadenceSpm,
      points: s.points,
      splits: s.splits,
    };
    saveRun(run);
    speak(
      `Run finished. Distance ${(s.distanceM / 1000).toFixed(2)} kilometers. Average pace ${paceText(s.avgPaceSecPerKm)}.`,
    );
    setState({ ...initial, status: "finished" });
    return run;
  }, [haptic]);

  const reset = useCallback(() => setState({ ...initial }), []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  return { ...state, start, pause, resume, stop, reset };
}
