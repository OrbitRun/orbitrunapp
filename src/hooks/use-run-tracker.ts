import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoPoint, HrSample, Run, RunWeather, Split } from "@/lib/run-types";
import { saveRun, updateRun } from "@/lib/run-types";
import { genId, haversine } from "@/lib/run-utils";
import { speakLocalized, startSilentLoop, stopSilentLoop } from "@/lib/audio-cues";
import { getStoredLang, paceToWords, type Lang } from "@/lib/i18n";
import { displayName, loadProfile, type AudioCueMeters } from "@/lib/user-profile";
import { fetchWeather } from "@/lib/weather";
import { getPrimaryShoe } from "@/lib/shoes";
import { startHeartRatePolling, stopHeartRatePolling } from "@/lib/health";
import { subscribeBtHr, type BtHrState } from "@/lib/heart-rate-bt";
import {
  bestTimeForPoints,
  checkAndUpdatePrs,
  FIXED_DISTANCES,
  loadPrs,
  type PrCategory,
} from "@/lib/personal-records";
import {
  ghostTimeAtDistance,
  loadGhost,
  type GhostRef,
} from "@/lib/ghost-runner";
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
  ghostDeltaMs: number | null;
  ghost: GhostRef | null;
  hrBpm: number | null;
  hrSource: "bt" | "health" | null;
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
  ghostDeltaMs: null,
  ghost: null,
  hrBpm: null,
  hrSource: null,
};

type PrFlags = {
  distances?: PrCategory[];
  fastestKm?: boolean;
  longestDistance?: boolean;
};

const DISTANCE_LABELS: Record<PrCategory, { en: string; da: string } | undefined> = {
  "1k": { en: "1 kilometer", da: "1 kilometer" },
  "5k": { en: "5 kilometers", da: "5 kilometer" },
  "10k": { en: "10 kilometers", da: "10 kilometer" },
  half: { en: "half marathon", da: "halvmarathon" },
  marathon: { en: "marathon", da: "maraton" },
  longest: undefined,
  fastestKm: undefined,
};

function speakSplit(
  km: number,
  paceSecPerKm: number,
  lang: Lang,
  name: string,
  intervalM: AudioCueMeters,
  prFlags?: PrFlags,
) {
  const paceWords = paceToWords(paceSecPerKm, lang);
  const distLabel =
    intervalM === 500
      ? lang === "da"
        ? `${(km * 0.5).toFixed(1).replace(".", ",")} kilometer`
        : `${(km * 0.5).toFixed(1)} kilometers`
      : lang === "da"
        ? `Kilometer ${km}`
        : `Kilometer ${km}`;
  let txt =
    lang === "da"
      ? `Godt kæmpet ${name}! ${distLabel} fuldført. Split-tempo ${paceWords}.`
      : `Great work ${name}! ${distLabel} completed. Split pace ${paceWords}.`;
  if (prFlags?.distances?.length) {
    for (const cat of prFlags.distances) {
      const label = DISTANCE_LABELS[cat];
      if (!label) continue;
      txt +=
        lang === "da"
          ? ` Ny rekord! Hurtigste ${label.da} nogensinde.`
          : ` New personal record! Your fastest ${label.en} ever.`;
    }
  }
  if (prFlags?.fastestKm) {
    txt +=
      lang === "da"
        ? " Ny rekord! Hurtigste kilometer nogensinde."
        : " New personal record! Your fastest kilometer ever.";
  }
  if (prFlags?.longestDistance) {
    txt +=
      lang === "da"
        ? " Ny rekord! Længste løbetur nogensinde."
        : " New personal record! Your longest run ever.";
  }
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
  const prVoiceEnabledRef = useRef<boolean>(true);
  // Each fixed-distance PR (1k…marathon) is announced at most once per run.
  const announcedDistancePrsRef = useRef<Set<PrCategory>>(new Set());
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
  // Ghost runner snapshot for this run.
  const ghostRef = useRef<GhostRef | null>(null);
  const ghostPassedRef = useRef(false);
  const lastGhostBehindCueAtRef = useRef(0);
  const lastGhostDeltaRef = useRef<number | null>(null);
  // Latest heart rate sample (BPM). BT chest strap takes priority over Apple Health.
  const latestBpmRef = useRef<number | null>(null);
  const hrSourceRef = useRef<"bt" | "health" | null>(null);
  const lastHealthBpmRef = useRef<number | null>(null);
  const btUnsubRef = useRef<(() => void) | null>(null);
  const hrSeriesRef = useRef<HrSample[]>([]);

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
      // Fire-and-forget weather snapshot once we have a usable GPS fix during a run.
      // Tolerate paused state (user may pause briefly right after start) and a looser
      // accuracy budget so short runs still capture conditions before stop().
      if (
        !weatherFetchedRef.current &&
        (stateRef.current.status === "running" || stateRef.current.status === "paused")
      ) {
        const acc = pos.coords.accuracy ?? 999;
        if (acc <= 150) {
          weatherFetchedRef.current = true;
          void fetchWeather(pos.coords.latitude, pos.coords.longitude).then((w) => {
            if (w) {
              weatherRef.current = w;
            } else {
              // Allow a retry on the next fix if the network call failed.
              weatherFetchedRef.current = false;
            }
          });
        }
      }
      setState((prev) => {
        if (prev.status !== "running") return prev;

        // ---- GPS quality gate -------------------------------------------------
        // Strict accuracy gate: reject any sample with reported accuracy
        // worse than 20m to prevent zig-zagging on the map. The first valid
        // sample is always accepted to seed the trace.
        const acc = pos.coords.accuracy ?? 999;
        if (acc > 20 && prev.points.length > 0) return prev;

        didUpdate = true;
        const np: GeoPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          alt: pos.coords.altitude,
          t: pos.timestamp,
          speed: pos.coords.speed,
          hrBpm: latestBpmRef.current,
        };
        const last = prev.points[prev.points.length - 1];
        let addDist = 0;
        let addElev = 0;
        if (last) {
          const rawDist = haversine(last, np);
          const dt = (np.t - last.t) / 1000;

          // Movement threshold: only record a new coordinate when the runner
          // has moved more than 3m since the last fix. Prevents cluster points
          // when standing still. Scales up with poor accuracy.
          const noiseFloor = Math.max(3, acc * 0.4);
          if (rawDist < noiseFloor) return prev;

          // Speed sanity: anything faster than ~10 m/s (~36 km/h) over a short
          // GPS gap is almost certainly a jump from a re-acquired fix, not a
          // real sprint. Drop those samples entirely.
          const speedOk = dt > 0 && rawDist / dt <= 10;
          if (!speedOk) return prev;
          addDist = rawDist;

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
          const prMap = loadPrs();
          for (let i = lastCueIndexRef.current + 1; i <= cueIndex; i++) {
            // Prefer the just-recorded split's pace when this cue lands on a km mark.
            const cueDistance = i * interval;
            const isKmBoundary = cueDistance % 1000 === 0;
            const matchingSplit = isKmBoundary
              ? newSplits.find((s) => s.totalDistanceM === cueDistance)
              : undefined;
            const paceForCue =
              matchingSplit?.paceSecPerKm || currentPace || prev.avgPaceSecPerKm || 0;
            // Live PR detection — only on true km boundaries.
            let prFlags: PrFlags | undefined;
            if (isKmBoundary && prVoiceEnabledRef.current) {
              const distancePrs: PrCategory[] = [];
              // Fixed-distance PRs (1k, 5k, 10k, half, marathon) — fire once per run each.
              for (const { category, meters } of FIXED_DISTANCES) {
                if (cueDistance < meters) continue;
                if (announcedDistancePrsRef.current.has(category)) continue;
                const liveBest = bestTimeForPoints(newPoints, meters);
                if (liveBest == null) continue;
                const existing = prMap[category]?.value;
                if (existing == null || liveBest < existing) {
                  distancePrs.push(category);
                  announcedDistancePrsRef.current.add(category);
                }
              }
              const fastestKmPr = prMap.fastestKm?.value; // ms
              const longestPr = prMap.longest?.value; // meters
              const splitPaceMs = matchingSplit ? matchingSplit.paceSecPerKm * 1000 : 0;
              const beatFastestKm =
                splitPaceMs > 0 && (fastestKmPr == null || splitPaceMs < fastestKmPr);
              const beatLongest = longestPr == null ? false : cueDistance > longestPr;
              if (distancePrs.length || beatFastestKm || beatLongest) {
                prFlags = {
                  distances: distancePrs.length ? distancePrs : undefined,
                  fastestKm: beatFastestKm,
                  longestDistance: beatLongest,
                };
              }
            }
            haptic([120, 80, 120, 80, 220]);
            speakSplit(i, paceForCue, langRef.current, nameRef.current, interval, prFlags);
          }
          lastCueIndexRef.current = cueIndex;
        }

        const avgPace =
          newDist > 50 && prev.elapsedMs > 0 ? prev.elapsedMs / 1000 / (newDist / 1000) : 0;
        const cad = avgPace > 0 ? Math.round(180 - Math.min(20, (avgPace - 240) / 12)) : 168;

        // ---- Ghost delta -----------------------------------------------------
        let ghostDelta: number | null = null;
        const g = ghostRef.current;
        if (g) {
          const ghostT = ghostTimeAtDistance(g, newDist);
          if (ghostT != null) {
            // Positive => user is AHEAD of ghost (ghost would have needed more time to cover this distance).
            ghostDelta = ghostT - prev.elapsedMs;
            const lang = langRef.current;
            const prevDelta = lastGhostDeltaRef.current;
            // Just-overtook detection: previous tick we were behind (<0), now ahead (>=0).
            if (
              !ghostPassedRef.current &&
              prevDelta != null &&
              prevDelta < 0 &&
              ghostDelta >= 0
            ) {
              ghostPassedRef.current = true;
              speakLocalized(
                lang === "da"
                  ? "Du er lige gået forbi din ghost!"
                  : "You just passed your ghost!",
                lang,
              );
            }
            // If we slip back behind, allow the cue to fire again next overtake.
            if (ghostDelta < -2000) ghostPassedRef.current = false;
            // Periodic "behind by X seconds" cue (every 60s while >10s behind).
            if (ghostDelta < -10000 && prev.elapsedMs - lastGhostBehindCueAtRef.current > 60000) {
              lastGhostBehindCueAtRef.current = prev.elapsedMs;
              const sec = Math.round(-ghostDelta / 1000);
              speakLocalized(
                lang === "da"
                  ? `Du er ${sec} sekunder bagud din ghost.`
                  : `You are ${sec} seconds behind your ghost.`,
                lang,
              );
            }
          }
          lastGhostDeltaRef.current = ghostDelta;
        }

        return {
          ...prev,
          points: newPoints,
          distanceM: newDist,
          elevationGainM: prev.elevationGainM + addElev,
          currentPaceSecPerKm: currentPace,
          avgPaceSecPerKm: avgPace,
          cadenceSpm: cad,
          splits: newSplits,
          ghostDeltaMs: ghostDelta,
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
    // High-precision tracking — request fresh fixes (maximumAge: 0) and a
    // tight 5s timeout so we never paint a stale position on the map.
    // Tracking continues while the tab is backgrounded thanks to the silent
    // audio loop (iOS) and the dedicated timer Web Worker keeping the JS
    // event loop alive while status === "running".
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000,
    });
  }, [handlePosition, handleError]);

  const start = useCallback(() => {
    haptic(40);
    langRef.current = getStoredLang();
    const profile = loadProfile();
    nameRef.current = displayName(profile, langRef.current);
    cueIntervalRef.current = profile.audioCueMeters ?? 500;
    hapticEnabledRef.current = profile.hapticEnabled !== false;
    prVoiceEnabledRef.current = profile.prVoiceEnabled !== false;
    lastSplitKmRef.current = 0;
    lastCueIndexRef.current = 0;
    announcedDistancePrsRef.current = new Set();
    lastSplitDistanceMRef.current = 0;
    lastSplitTimeMsRef.current = 0;
    smoothedAltRef.current = null;
    weatherRef.current = null;
    weatherFetchedRef.current = false;
    pauseAccumRef.current = 0;
    pausedAtRef.current = null;
    // Snapshot ghost (if armed) for the duration of this run.
    ghostRef.current = loadGhost();
    ghostPassedRef.current = false;
    lastGhostBehindCueAtRef.current = 0;
    lastGhostDeltaRef.current = null;
    latestBpmRef.current = null;
    hrSourceRef.current = null;
    lastHealthBpmRef.current = null;
    hrSeriesRef.current = [];
    const startedAt = Date.now();
    setState({
      ...initial,
      status: "running",
      startedAt,
      ghost: ghostRef.current,
      ghostDeltaMs: ghostRef.current ? 0 : null,
    });
    armGps();
    startSilentLoop(); // keep iOS from suspending JS when screen locks

    // --- Heart rate sources ---------------------------------------------------
    // Bluetooth chest strap takes priority. Apple Health is used as fallback
    // only when no BT sensor is currently streaming.
    btUnsubRef.current = subscribeBtHr((bt: BtHrState) => {
      if (bt.status === "connected" && bt.bpm != null) {
        latestBpmRef.current = bt.bpm;
        hrSourceRef.current = "bt";
        hrSeriesRef.current.push({ t: Date.now(), bpm: bt.bpm });
        setState((p) =>
          p.status === "running" || p.status === "paused"
            ? { ...p, hrBpm: bt.bpm, hrSource: "bt" }
            : p,
        );
      } else if (hrSourceRef.current === "bt") {
        // BT just dropped — fall back to last health value if any.
        const fb = lastHealthBpmRef.current;
        latestBpmRef.current = fb;
        hrSourceRef.current = fb != null ? "health" : null;
        setState((p) =>
          p.status === "running" || p.status === "paused"
            ? { ...p, hrBpm: fb, hrSource: fb != null ? "health" : null }
            : p,
        );
      }
    });

    // Begin polling Apple Health for heart rate (no-op on web).
    startHeartRatePolling((bpm, t) => {
      lastHealthBpmRef.current = bpm;
      // Only adopt Health value if BT isn't currently the active source.
      if (hrSourceRef.current === "bt") return;
      latestBpmRef.current = bpm;
      hrSourceRef.current = "health";
      hrSeriesRef.current.push({ t, bpm });
      setState((p) =>
        p.status === "running" || p.status === "paused"
          ? { ...p, hrBpm: bpm, hrSource: "health" }
          : p,
      );
    }, 5000);
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
    stopHeartRatePolling();
    const s = stateRef.current;
    if (!s.startedAt) {
      setState({ ...initial });
      return null;
    }
    const primaryShoe = getPrimaryShoe();
    const hr = hrSeriesRef.current;
    const hrAggregates =
      hr.length > 0
        ? {
            avgHrBpm: Math.round(hr.reduce((a, b) => a + b.bpm, 0) / hr.length),
            maxHrBpm: hr.reduce((a, b) => Math.max(a, b.bpm), 0),
            hrSeries: hr,
          }
        : {};
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
      ...hrAggregates,
    };
    setState((p) => ({ ...p, status: "paused" })); // freeze stats while user reviews
    return run;
  }, [haptic]);

  const commitRun = useCallback((run: Run) => {
    saveRun(run);
    // Backfill weather if the in-flight fetch never completed before stop().
    if (!run.weather && run.points.length > 0) {
      const seed = run.points[0];
      void fetchWeather(seed.lat, seed.lng).then((w) => {
        if (!w) return;
        updateRun(run.id, { weather: w });
        try {
          window.dispatchEvent(new CustomEvent("orbit:run-updated", { detail: { runId: run.id } }));
        } catch {
          /* noop */
        }
      });
    }
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
      stopHeartRatePolling();
    };
  }, []);

  return { ...state, start, pause, resume, stop, commitRun, discardRun, reset, armGps };
}
