import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoPoint, Run, RunWeather, Split } from "@/lib/run-types";
import { saveRun } from "@/lib/run-types";
import { genId, haversine } from "@/lib/run-utils";
import { speakLocalized, startSilentLoop, stopSilentLoop } from "@/lib/audio-cues";
import { getStoredLang, paceToWords, type Lang } from "@/lib/i18n";
import { displayName, loadProfile, type AudioCueMeters } from "@/lib/user-profile";
import { fetchWeather } from "@/lib/weather";
import { getPrimaryShoe } from "@/lib/shoes";
import { checkAndUpdatePrs, loadPrs } from "@/lib/personal-records";
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

function speakSplit(km: number, paceSecPerKm: number, lang: Lang, name: string, intervalM: AudioCueMeters) {
  const paceWords = paceToWords(paceSecPerKm, lang);
  const distLabel =
    intervalM === 500
      ? lang === "da"
        ? `${(km * 0.5).toFixed(1).replace(".", ",")} kilometer`
        : `${(km * 0.5).toFixed(1)} kilometers`
      : lang === "da"
        ? `Kilometer ${km}`
        : `Kilometer ${km}`;
  const txt =
    lang === "da"
      ? `Godt kæmpet ${name}! ${distLabel} fuldført. Split-tempo ${paceWords}.`
      : `Great work ${name}! ${distLabel} completed. Split pace ${paceWords}.`;
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
  const nameRef = useRef<string>("Runner");
  const cueIntervalRef = useRef<AudioCueMeters>(500);
  const lastCueIndexRef = useRef(0);
  const hapticEnabledRef = useRef<boolean>(true);
  // Distance at the exact moment the previous split (or run start) was crossed,
  // so each split duration is computed against the true km boundary — not the
  // total accumulated distance, which drifts past 1000m between GPS samples.
  const lastSplitDistanceMRef = useRef(0);
  const lastSplitTimeMsRef = useRef(0);
  // Smoothed elevation (EMA) to reject noisy single-sample altitude spikes.
  const smoothedAltRef = useRef<number | null>(null);
  // Weather snapshot captured once at the start of the run from the first GPS fix.
  const weatherRef = useRef<RunWeather | null>(null);
  const weatherFetchedRef = useRef(false);

  const haptic = useCallback((ms: number | number[] = 30) => {
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

  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      let didUpdate = false;
      // Fire-and-forget weather snapshot once we have any GPS fix during a run.
      if (!weatherFetchedRef.current && stateRef.current.status === "running") {
        const acc = pos.coords.accuracy ?? 999;
        if (acc <= 100) {
          weatherFetchedRef.current = true;
          void fetchWeather(pos.coords.latitude, pos.coords.longitude).then((w) => {
            if (w) weatherRef.current = w;
          });
        }
      }
      setState((prev) => {
        if (prev.status !== "running") return prev;

        // ---- GPS quality gate -------------------------------------------------
        // Reject samples with poor accuracy outright. ≤25m is generous enough
        // for urban canyons but rejects the 100m+ readings iOS emits when it
        // first locks on. The first valid sample is always accepted to seed.
        const acc = pos.coords.accuracy ?? 999;
        if (acc > 35 && prev.points.length > 0) return prev;

        didUpdate = true;
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
          const rawDist = haversine(last, np);
          const dt = (np.t - last.t) / 1000;

          // Drift filter: ignore tiny movements that are within GPS noise.
          // Threshold scales with reported accuracy (worse fix → larger floor)
          // to avoid accumulating phantom distance while standing still.
          const noiseFloor = Math.max(2.5, acc * 0.4);

          // Speed sanity: anything faster than ~10 m/s (~36 km/h) over a short
          // GPS gap is almost certainly a jump from a re-acquired fix, not a
          // real sprint. Drop those samples entirely.
          const speedOk = dt > 0 && rawDist / dt <= 10;

          if (rawDist >= noiseFloor && speedOk) {
            addDist = rawDist;
          }

          // Elevation: use a per-sample EMA + minimum delta to suppress the
          // ±3-5m altitude jitter typical of consumer GPS. Only count
          // sustained climbs (>1m smoothed delta).
          if (np.alt != null) {
            const prevSmoothed = smoothedAltRef.current;
            const nextSmoothed =
              prevSmoothed == null ? np.alt : prevSmoothed * 0.7 + np.alt * 0.3;
            if (prevSmoothed != null) {
              const da = nextSmoothed - prevSmoothed;
              if (da > 1) addElev = da;
            }
            smoothedAltRef.current = nextSmoothed;
          }
        } else if (np.alt != null) {
          smoothedAltRef.current = np.alt;
        }
        const newDist = prev.distanceM + addDist;
        const newPoints = [...prev.points, np];

        // ---- Rolling pace -----------------------------------------------------
        // 30s window, but require both meaningful distance AND duration to
        // avoid wild pace swings when the runner is briefly stopped.
        let currentPace = prev.currentPaceSecPerKm;
        const cutoff = np.t - 30000;
        const recent = newPoints.filter((p) => p.t >= cutoff);
        if (recent.length >= 2) {
          let d = 0;
          for (let i = 1; i < recent.length; i++) d += haversine(recent[i - 1], recent[i]);
          const dur = (recent[recent.length - 1].t - recent[0].t) / 1000;
          if (d > 10 && dur >= 5) {
            const speedMs = d / dur;
            currentPace = 1000 / speedMs;
          }
        }

        // ---- Splits with boundary interpolation -------------------------------
        // When a GPS sample carries us PAST a km boundary, estimate the exact
        // moment we crossed it by interpolating along the segment. This keeps
        // split times consistent regardless of GPS sample rate.
        const newSplits = [...prev.splits];
        const kmCount = Math.floor(newDist / 1000);
        if (kmCount > lastSplitKmRef.current && last && addDist > 0) {
          const segStartDist = newDist - addDist;
          const segDurMs = np.t - last.t;
          for (let k = lastSplitKmRef.current + 1; k <= kmCount; k++) {
            const boundaryDist = k * 1000;
            // Fraction of the current segment at which we crossed boundary.
            const frac =
              addDist > 0 ? Math.min(1, Math.max(0, (boundaryDist - segStartDist) / addDist)) : 1;
            const boundaryT = last.t + segDurMs * frac;
            // Total elapsed at boundary, accounting for paused time.
            const totalDuration = boundaryT - (prev.startedAt ?? boundaryT) - pauseAccumRef.current;
            const splitDur = totalDuration - lastSplitTimeMsRef.current;
            const splitPace = splitDur > 0 ? splitDur / 1000 : 0;
            const split: Split = {
              km: k,
              durationMs: splitDur,
              paceSecPerKm: splitPace,
              totalDistanceM: boundaryDist,
              totalDurationMs: totalDuration,
            };
            newSplits.push(split);
            lastSplitDistanceMRef.current = boundaryDist;
            lastSplitTimeMsRef.current = totalDuration;
          }
          lastSplitKmRef.current = kmCount;
        }

        // ---- Voice cues -------------------------------------------------------
        // Cue pace reflects the actual split just completed when it aligns
        // with a km boundary; otherwise falls back to rolling pace.
        const interval = cueIntervalRef.current;
        const cueIndex = Math.floor(newDist / interval);
        if (cueIndex > lastCueIndexRef.current) {
          for (let i = lastCueIndexRef.current + 1; i <= cueIndex; i++) {
            // Prefer the just-recorded split's pace when this cue lands on a km mark.
            const cueDistance = i * interval;
            const matchingSplit =
              cueDistance % 1000 === 0
                ? newSplits.find((s) => s.totalDistanceM === cueDistance)
                : undefined;
            const paceForCue =
              matchingSplit?.paceSecPerKm || currentPace || prev.avgPaceSecPerKm || 0;
            haptic([120, 80, 120, 80, 220]);
            speakSplit(i, paceForCue, langRef.current, nameRef.current, interval);
          }
          lastCueIndexRef.current = cueIndex;
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
      if (didUpdate) haptic(15);
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
    nameRef.current = displayName(profile, langRef.current);
    cueIntervalRef.current = profile.audioCueMeters ?? 500;
    hapticEnabledRef.current = profile.hapticEnabled !== false;
    lastSplitKmRef.current = 0;
    lastCueIndexRef.current = 0;
    lastSplitDistanceMRef.current = 0;
    lastSplitTimeMsRef.current = 0;
    smoothedAltRef.current = null;
    weatherRef.current = null;
    weatherFetchedRef.current = false;
    pauseAccumRef.current = 0;
    pausedAtRef.current = null;
    const startedAt = Date.now();
    setState({
      ...initial,
      status: "running",
      startedAt,
    });
    armGps();
    startSilentLoop(); // keep iOS from suspending JS when screen locks
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

  // Stops tracking and returns the in-memory Run WITHOUT persisting it.
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
    const primaryShoe = getPrimaryShoe();
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
      weather: weatherRef.current ?? undefined,
      shoeId: primaryShoe?.id,
    };
    setState((p) => ({ ...p, status: "paused" })); // freeze stats while user reviews
    return run;
  }, [haptic]);

  const commitRun = useCallback((run: Run) => {
    saveRun(run);
    try {
      const newPrs = checkAndUpdatePrs(run);
      if (newPrs.length > 0) {
        window.dispatchEvent(
          new CustomEvent("orbit:new-pr", {
            detail: { runId: run.id, categories: newPrs },
          }),
        );
      }
    } catch {
      /* PR check is non-critical */
    }
    const lang = langRef.current;
    const name = nameRef.current;
    const km = (run.distanceM / 1000).toFixed(2);
    const paceWords = paceToWords(run.avgPaceSecPerKm, lang);
    speakLocalized(
      lang === "da"
        ? `Flot klaret ${name}! Løb afsluttet. Distance ${km} kilometer. Gennemsnitstempo ${paceWords}.`
        : `Well done ${name}! Run finished. Distance ${km} kilometers. Average pace ${paceWords}.`,
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
