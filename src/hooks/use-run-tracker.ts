import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoPoint, Run, Split } from "@/lib/run-types";
import { saveRun } from "@/lib/run-types";
import { genId, haversine } from "@/lib/run-utils";
import { beep, speakLocalized, startSilentLoop, stopSilentLoop } from "@/lib/audio-cues";
import { getStoredLang, paceToWords, type Lang } from "@/lib/i18n";
import { loadProfile, getDisplayName, cueIntervalKm, type Level } from "@/lib/user-profile";
import { addDistanceToActiveShoe, loadShoes } from "@/lib/shoes";
import { loadSettings } from "@/lib/settings";
import { fetchWeather, type WeatherSnapshot } from "@/lib/weather";
import TimerWorker from "@/workers/timer.worker.ts?worker";

type Status = "idle" | "running" | "paused" | "finished";

type State = {
  status: Status;
  startedAt: number | null;
  elapsedMs: number;
  distanceM: number;
  elevationGainM: number;
  currentPaceSecPerKm: number;
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
  cadenceSpm: 168,
  points: [],
  splits: [],
  permissionError: null,
};

function speakSplit(km: number, paceSecPerKm: number, lang: Lang, name: string) {
  const paceWords = paceToWords(paceSecPerKm, lang);
  const greeting = name
    ? lang === "da"
      ? `Godt kæmpet, ${name}! `
      : `Nice work, ${name}! `
    : "";
  const kmLabel = Number.isInteger(km) ? `${km}` : km.toFixed(1);
  const txt =
    lang === "da"
      ? `${greeting}${kmLabel} kilometer fuldført. Tempo ${paceWords}.`
      : `${greeting}${kmLabel} kilometers done. Pace ${paceWords}.`;
  speakLocalized(txt, lang);
}

export function useRunTracker() {
  const [state, setState] = useState<State>(initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  const watchIdRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const lastSplitKmRef = useRef(0);
  const pauseAccumRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const langRef = useRef<Lang>("en");
  const nameRef = useRef<string>("");
  const cueIntervalKmRef = useRef<number>(1);
  const lastCueKmRef = useRef<number>(0);
  const levelRef = useRef<Level>("beginner");
  // Auto-pause: speed under 2 km/h (~0.555 m/s) sustained for 3s.
  const autoPauseEnabledRef = useRef(true);
  const autoPausedRef = useRef(false);
  const slowSinceRef = useRef<number | null>(null);
  const hapticEnabledRef = useRef(true);
  const shoeSnapshotRef = useRef<{ brand: string; model: string } | null>(null);
  const weatherRef = useRef<WeatherSnapshot | null>(null);
  const weatherFetchedRef = useRef(false);
  // GPS smoothing: rolling buffer of recent raw fixes used for moving average,
  // plus a min-distance gate so we don't append tiny zigzag jitter to the path.
  const rawBufferRef = useRef<GeoPoint[]>([]);
  const SMOOTH_WINDOW = 5;
  const MIN_MOVE_M = 3;
  const MAX_ACCURACY_M = 30;

  const haptic = useCallback((ms = 30) => {
    if (!hapticEnabledRef.current) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        /* noop */
      }
    }
  }, []);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const w = new TimerWorker();
    w.onmessage = (ev: MessageEvent<{ type: "tick"; elapsedMs: number }>) => {
      if (ev.data?.type === "tick") {
        setState((p) => (p.status === "running" || p.status === "paused" ? { ...p, elapsedMs: ev.data.elapsedMs } : p));
      }
    };
    workerRef.current = w;
    return w;
  }, []);

  const pauseFnRef = useRef<() => void>(() => {});
  const resumeFnRef = useRef<() => void>(() => {});

  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      // Fetch weather snapshot once per run from the first GPS fix.
      if (!weatherFetchedRef.current && stateRef.current.startedAt) {
        weatherFetchedRef.current = true;
        void fetchWeather(pos.coords.latitude, pos.coords.longitude, langRef.current).then((w) => {
          if (w) weatherRef.current = w;
        });
      }
      // Auto-pause detection (runs regardless of running/paused)
      if (autoPauseEnabledRef.current && stateRef.current.startedAt) {
        const speedMs = pos.coords.speed; // null on some devices
        const slow = speedMs != null && speedMs < 0.555; // <2 km/h
        const status = stateRef.current.status;
        if (status === "running") {
          if (slow) {
            if (slowSinceRef.current == null) slowSinceRef.current = pos.timestamp;
            else if (!autoPausedRef.current && pos.timestamp - slowSinceRef.current >= 3000) {
              autoPausedRef.current = true;
              beep(440, 120, 0.18);
              pauseFnRef.current();
            }
          } else {
            slowSinceRef.current = null;
          }
        } else if (status === "paused" && autoPausedRef.current) {
          // Movement detected — resume.
          if (speedMs != null && speedMs > 0.83) {
            autoPausedRef.current = false;
            slowSinceRef.current = null;
            beep(880, 100, 0.2);
            resumeFnRef.current();
          }
        }
      }

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
          const dt = (np.t - last.t) / 1000;
          if (addDist < 2) addDist = 0;
          if (dt > 0 && addDist / dt > 12) addDist = 0;
          if (np.alt != null && last.alt != null) {
            const da = np.alt - last.alt;
            if (da > 0.5) addElev = da;
          }
        }
        const newDist = prev.distanceM + addDist;
        const newPoints = [...prev.points, np];

        let currentPace = prev.currentPaceSecPerKm;
        const cutoff = np.t - 30000;
        const recent = newPoints.filter((p) => p.t >= cutoff);
        if (recent.length >= 2) {
          let d = 0;
          for (let i = 1; i < recent.length; i++) d += haversine(recent[i - 1], recent[i]);
          const dur = (recent[recent.length - 1].t - recent[0].t) / 1000;
          if (d > 5 && dur > 0) {
            const speedMs = d / dur;
            currentPace = 1000 / speedMs;
          }
        }

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
          }
          lastSplitKmRef.current = kmCount;
        }
        // Voice cue at user-configured interval (1km beginner, 0.5km expert)
        const interval = cueIntervalKmRef.current;
        const totalKm = newDist / 1000;
        const reachedCue = Math.floor(totalKm / interval) * interval;
        if (reachedCue > lastCueKmRef.current + 1e-6 && reachedCue >= interval) {
          const lastSplitPace = newSplits.length
            ? newSplits[newSplits.length - 1].paceSecPerKm
            : prev.avgPaceSecPerKm;
          speakSplit(reachedCue, lastSplitPace, langRef.current, nameRef.current);
          // Haptic pulse at every cue interval (500 m or 1 km).
          haptic(120);
          lastCueKmRef.current = reachedCue;
        }

        const avgPace =
          newDist > 50 && prev.elapsedMs > 0 ? prev.elapsedMs / 1000 / (newDist / 1000) : 0;
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

  // Pre-arm GPS as soon as Start (countdown) is pressed, so points already flow when run begins.
  const armGps = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((p) => ({ ...p, permissionError: "Geolocation not supported in this browser." }));
      return;
    }
    if (watchIdRef.current != null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000,
    });
  }, [handlePosition, handleError]);

  const start = useCallback(() => {
    haptic(40);
    langRef.current = getStoredLang();
    const profile = loadProfile();
    nameRef.current = profile ? getDisplayName(profile, langRef.current) : "";
    levelRef.current = profile?.level ?? "beginner";
    const settings = loadSettings();
    // User-controlled voice cue interval (settings) overrides the level default.
    cueIntervalKmRef.current = settings.cueIntervalKm ?? cueIntervalKm(levelRef.current);
    autoPauseEnabledRef.current = settings.autoPause;
    hapticEnabledRef.current = settings.haptic;
    autoPausedRef.current = false;
    slowSinceRef.current = null;
    lastSplitKmRef.current = 0;
    lastCueKmRef.current = 0;
    pauseAccumRef.current = 0;
    pausedAtRef.current = null;
    // Snapshot active shoe + reset weather fetch flag for this run.
    const activeShoe = loadShoes().find((s) => s.active) ?? null;
    shoeSnapshotRef.current = activeShoe
      ? { brand: activeShoe.brand, model: activeShoe.model }
      : null;
    weatherRef.current = null;
    weatherFetchedRef.current = false;
    const startedAt = Date.now();
    setState({
      ...initial,
      status: "running",
      startedAt,
    });
    armGps();
    startSilentLoop();
    const w = ensureWorker();
    w.postMessage({ type: "start", startedAt, pauseAccum: 0 });
  }, [haptic, armGps, ensureWorker]);

  const pause = useCallback(() => {
    haptic(25);
    pausedAtRef.current = Date.now();
    workerRef.current?.postMessage({ type: "pause", at: pausedAtRef.current });
    setState((p) => ({ ...p, status: "paused" }));
  }, [haptic]);

  const resume = useCallback(() => {
    haptic(25);
    const at = Date.now();
    if (pausedAtRef.current) {
      pauseAccumRef.current += at - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    workerRef.current?.postMessage({ type: "resume", at });
    setState((p) => ({ ...p, status: "running" }));
  }, [haptic]);

  // Bind ref-callable versions for handlePosition's auto-pause path.
  pauseFnRef.current = pause;
  resumeFnRef.current = resume;

  // Caller decides whether to save (commitRun) or discard (discardRun).
  const stop = useCallback((): Run | null => {
    haptic(60);
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    workerRef.current?.postMessage({ type: "stop" });
    stopSilentLoop();
    const s = stateRef.current;
    if (!s.startedAt) {
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
      shoe: shoeSnapshotRef.current,
      weather: weatherRef.current,
    };
    setState((p) => ({ ...p, status: "paused" })); // freeze stats while user reviews
    return run;
  }, [haptic]);

  const commitRun = useCallback((run: Run) => {
    saveRun(run);
    addDistanceToActiveShoe(run.distanceM);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("orbit:run-saved"));
    }
    const lang = langRef.current;
    const km = (run.distanceM / 1000).toFixed(2);
    const paceWords = paceToWords(run.avgPaceSecPerKm, lang);
    const name = nameRef.current;
    const prefix = name ? (lang === "da" ? `${name}, ` : `${name}, `) : "";
    speakLocalized(
      lang === "da"
        ? `${prefix}løb afsluttet. Distance ${km} kilometer. Gennemsnitstempo ${paceWords}.`
        : `${prefix}run finished. Distance ${km} kilometers. Average pace ${paceWords}.`,
      lang,
    );
    setState({ ...initial, status: "finished" });
  }, []);

  const discardRun = useCallback(() => {
    setState({ ...initial });
  }, []);

  const reset = useCallback(() => setState({ ...initial }), []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      workerRef.current?.terminate();
      workerRef.current = null;
      stopSilentLoop();
    };
  }, []);

  return { ...state, start, pause, resume, stop, commitRun, discardRun, reset, armGps };
}
