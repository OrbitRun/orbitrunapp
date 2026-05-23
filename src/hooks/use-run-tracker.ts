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
import { hrrDrop60s, timeFractionInZone5, DEFAULT_MAX_HR } from "@/lib/hr-analysis";
import { bestEstimateVo2MaxWithSource } from "@/lib/vo2max";
import { classifyHrrGrade } from "@/lib/hr-zones";
import { loadHrZones } from "@/lib/hr-zones-config";
import { computeTrimp } from "@/lib/readiness-engine";
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
import {
  clearSnapshot as clearFlightSnapshot,
  createDebouncedRecorder,
  type DebouncedRecorder,
  type FlightSnapshot,
} from "@/lib/flight-recorder";
import TimerWorker from "@/workers/timer.worker.ts?worker";
import {
  isNativeGeolocationAvailable,
  nativeClearWatch,
  nativeGetCurrentPosition,
  nativeWatchPosition,
  requestNativeGeolocationPermission,
  toBrowserPosition,
} from "@/lib/geolocation-native";
import type { MotionSource } from "@/lib/motion-source";
import { startCadenceAccelerometer, type CadenceSample } from "@/lib/cadence-accelerometer";
import { startCadenceCamera } from "@/lib/cadence-camera";

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
  gpsAccuracyM: number | null;
  gpsReady: boolean;
  ghostDeltaMs: number | null;
  ghost: GhostRef | null;
  hrBpm: number | null;
  hrSource: "bt" | "health" | null;
  maxHrBpm: number | null;
  avgHrBpm: number | null;
  // True when the runner is paused because the auto-pause heuristic fired
  // (vs a manual pause). Used by FocusRunView to surface a chip.
  autoPaused: boolean;
  // Active data source feeding the live tracker. "gps" outdoors;
  // "watch" / "phone" / "camera" when the run is in indoor mode.
  motionSource: MotionSource;
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
  gpsAccuracyM: null,
  gpsReady: false,
  ghostDeltaMs: null,
  ghost: null,
  hrBpm: null,
  hrSource: null,
  maxHrBpm: null,
  avgHrBpm: null,
  autoPaused: false,
  motionSource: "gps",
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
  speakLocalized(txt, lang, "coach");
}

export function useRunTracker() {
  const [state, setState] = useState<State>(initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  const watchIdRef = useRef<number | null>(null);
  // When running inside a Capacitor native shell, we use the native plugin
  // instead of `navigator.geolocation`. The native watch id is a string.
  const nativeWatchIdRef = useRef<string | null>(null);
  // Background-geolocation plugin watcher id (iOS/Android, runs while screen
  // is locked / app in background — requires UIBackgroundModes=location).
  
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
  // Sliding ~60s window used to detect rapid HR climbs during a run.
  const hrWindowRef = useRef<HrSample[]>([]);
  const lastSpikeAtRef = useRef(0);
  // Post-stop HR capture: BT + Health keep streaming for ~75s after stop so
  // we can compute the heart-rate-recovery drop, then we tear down listeners.
  const postStopSeriesRef = useRef<HrSample[] | null>(null);
  const postStopRunIdRef = useRef<string | null>(null);
  const postStopTimerRef = useRef<number | null>(null);

  // ---- Auto-pause --------------------------------------------------------
  const autoPauseEnabledRef = useRef<boolean>(true);
  // True only when the *current* paused state was triggered by auto-pause
  // (so a manual pause doesn't get auto-resumed).
  const autoPausedRef = useRef<boolean>(false);
  // Sliding window of (t, distance) for short-window movement detection.
  const movementWindowRef = useRef<{ t: number; d: number }[]>([]);
  // Cumulative moving distance counter (independent of `state.distanceM` so
  // the auto-pause logic can run before setState commits).
  const cumDistanceRef = useRef<number>(0);
  // Continuous time the runner has been moving fast enough to auto-resume.
  const autoResumeMovingSinceRef = useRef<number | null>(null);
  // Throttle the spoken auto-pause/resume cues.
  const lastAutoCueAtRef = useRef<number>(0);
  // Captured run identity — populated on `start()`.
  const runIdRef = useRef<string | null>(null);

  // ---- Indoor mode -------------------------------------------------------
  // When set, GPS is bypassed and distance/cadence are driven by the
  // accelerometer or front-camera fallback.
  const indoorEnabledRef = useRef<boolean>(false);
  const indoorStrideMRef = useRef<number>(0.78);
  const indoorStopRef = useRef<(() => void) | null>(null);
  const indoorBaseStepsRef = useRef<number>(0);
  const indoorActiveSourceRef = useRef<MotionSource>("phone");
  const indoorCameraStartedRef = useRef<boolean>(false);
  const indoorLowMotionSinceRef = useRef<number | null>(null);

  // ---- Flight recorder ---------------------------------------------------
  const flightRecorderEnabledRef = useRef<boolean>(true);
  const recorderRef = useRef<DebouncedRecorder | null>(null);
  const getRecorder = useCallback(() => {
    if (!recorderRef.current) recorderRef.current = createDebouncedRecorder(1000);
    return recorderRef.current;
  }, []);

  // Called whenever a fresh BPM sample arrives (BT or Health). Maintains the
  // rolling window, dispatches a `orbit:hr-spike` event when BPM rises >25 bpm
  // versus ~30s ago, and appends to the post-stop series when finalizing HRR.
  const noteBpmSample = useCallback((bpm: number, t: number) => {
    // Post-stop capture takes priority — we keep recording even when status
    // has flipped to "paused" / "finished" so HRR can settle.
    if (postStopSeriesRef.current) {
      postStopSeriesRef.current.push({ t, bpm });
    }
    if (stateRef.current.status !== "running") return;
    const win = hrWindowRef.current;
    win.push({ t, bpm });
    const cutoff = t - 60_000;
    while (win.length > 0 && win[0].t < cutoff) win.shift();
    // Need ≥25s of history before a spike call has any meaning.
    const ref = win.find((s) => s.t <= t - 25_000);
    if (!ref) return;
    if (bpm - ref.bpm >= 25 && t - lastSpikeAtRef.current > 90_000) {
      lastSpikeAtRef.current = t;
      try {
        window.dispatchEvent(
          new CustomEvent("orbit:hr-spike", { detail: { bpm, from: ref.bpm } }),
        );
      } catch {
        /* noop */
      }
    }
  }, []);


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
        const acc = pos.coords.accuracy ?? 999;
        const gpsReady = acc < 100;
        // Always reflect latest GPS quality, even before the run starts, so
        // the "Finder signal…" chip can disappear as soon as a usable fix
        // arrives during the warm-up phase.
        if (prev.status !== "running") {
          if (prev.gpsAccuracyM === acc && prev.gpsReady === gpsReady) return prev;
          return { ...prev, gpsAccuracyM: acc, gpsReady };
        }

        // ---- GPS quality gate -------------------------------------------------
        // Tightened accuracy gate AFTER the route is seeded: reject samples
        // worse than 30m to prevent zig-zag, but always accept the very first
        // sample so the map starts drawing immediately even on a cold fix
        // (iOS often reports 30–50m for the first few seconds).
        if (acc > 30 && prev.points.length > 0) {
          return { ...prev, gpsAccuracyM: acc, gpsReady };
        }

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
          const noiseFloor = Math.max(5, acc * 0.4);
          if (rawDist < noiseFloor) return { ...prev, gpsAccuracyM: acc, gpsReady };

          // Speed sanity: anything faster than ~10 m/s (~36 km/h) over a short
          // GPS gap is almost certainly a jump from a re-acquired fix, not a
          // real sprint. Drop those samples entirely.
          const speedOk = dt > 0 && rawDist / dt <= 10;
          if (!speedOk) return { ...prev, gpsAccuracyM: acc, gpsReady };
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
                "coach",
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
                "coach",
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
          gpsAccuracyM: acc,
          gpsReady,
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
    // Native path (Capacitor iOS/Android) — uses kCLLocationAccuracyBestForNavigation
    // / PRIORITY_HIGH_ACCURACY and keeps streaming while the screen is locked
    // when the iOS shell declares the `location` background mode.
    if (isNativeGeolocationAvailable()) {
      if (nativeWatchIdRef.current != null) return;
      void (async () => {
        const perm = await requestNativeGeolocationPermission();
        // Only an explicit "denied" should surface the error overlay.
        // "prompt" / "unavailable" → still attempt a fix; the system dialog
        // may resolve mid-flight, and watchPosition's own error callback
        // will report a real failure if it happens.
        if (perm === "denied") {
          setState((p) => ({ ...p, permissionError: "Location permission denied." }));
          return;
        }
        // Immediate single-shot fix for a fast first callback.
        const first = await nativeGetCurrentPosition();
        if (first) {
          setState((p) => (p.permissionError ? { ...p, permissionError: null } : p));
          handlePosition(toBrowserPosition(first));
        }
        // Native @capacitor/geolocation watcher. With UIBackgroundModes
        // = ["location"] in Info.plist + "Always" location permission,
        // iOS keeps delivering high-accuracy fixes while the screen is
        // locked or the app is backgrounded.
        const id = await nativeWatchPosition(
          (pos) => {
            setState((p) => (p.permissionError ? { ...p, permissionError: null } : p));
            handlePosition(toBrowserPosition(pos));
          },
          (err) => handleError({ message: err.message } as GeolocationPositionError),
        );
        if (id) nativeWatchIdRef.current = id;
      })();
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((p) => ({ ...p, permissionError: "Geolocation not supported in this browser." }));
      return;
    }
    if (watchIdRef.current != null) return;
    // Trigger an immediate fix so the first callback arrives faster than
    // waiting for watchPosition's first tick (especially on iOS Safari).
    navigator.geolocation.getCurrentPosition(handlePosition, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 8000,
    });
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

  // Idempotent variant used to warm GPS as soon as the app opens, so that the
  // first fix is already cached when the user taps Start.
  const warmGps = useCallback(() => {
    // Native: just call armGps — the plugin handles permission state.
    if (isNativeGeolocationAvailable()) {
      if (nativeWatchIdRef.current != null) return;
      armGps();
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (watchIdRef.current != null) return;
    if (typeof navigator.permissions?.query === "function") {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((p) => {
          if (p.state === "granted") armGps();
        })
        .catch(() => {});
      return;
    }
    // No Permissions API — skip silent warm-up to avoid an unexpected prompt.
  }, [armGps]);

  const start = useCallback(() => {
    haptic(40);
    langRef.current = getStoredLang();
    const profile = loadProfile();
    nameRef.current = displayName(profile, langRef.current);
    cueIntervalRef.current = profile.audioCueMeters ?? 500;
    hapticEnabledRef.current = profile.hapticEnabled !== false;
    prVoiceEnabledRef.current = profile.prVoiceEnabled !== false;
    autoPauseEnabledRef.current = profile.autoPauseEnabled !== false;
    flightRecorderEnabledRef.current = profile.flightRecorderEnabled !== false;
    // Clear any stale snapshot from a previous session before this run starts
    // accumulating new data.
    clearFlightSnapshot();
    recorderRef.current?.cancel();
    autoPausedRef.current = false;
    movementWindowRef.current = [];
    cumDistanceRef.current = 0;
    autoResumeMovingSinceRef.current = null;
    lastAutoCueAtRef.current = 0;
    runIdRef.current = genId();
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
    hrWindowRef.current = [];
    lastSpikeAtRef.current = 0;
    const startedAt = Date.now();

    // ---- Indoor mode bootstrap --------------------------------------------
    indoorEnabledRef.current = profile.activityEnvironment === "indoor";
    indoorBaseStepsRef.current = 0;
    indoorCameraStartedRef.current = false;
    indoorLowMotionSinceRef.current = null;
    if (indoorEnabledRef.current) {
      // Stride heuristic: 0.413 × height (m) for women / 0.415 × height for men.
      const heightCm = profile.coach?.heightCm;
      indoorStrideMRef.current =
        heightCm && heightCm > 0 ? 0.413 * (heightCm / 100) : 0.78;
      // BT strap connected → watch is primary; otherwise default to phone.
      indoorActiveSourceRef.current = hrSourceRef.current === "bt" ? "watch" : "phone";
    }

    setState({
      ...initial,
      status: "running",
      startedAt,
      ghost: ghostRef.current,
      ghostDeltaMs: ghostRef.current ? 0 : null,
      motionSource: indoorEnabledRef.current ? indoorActiveSourceRef.current : "gps",
      gpsReady: indoorEnabledRef.current ? true : false,
    });

    if (indoorEnabledRef.current) {
      // Skip GPS entirely indoors. Subscribe to accelerometer; if motion
      // variance stays low for ≥5s we escalate to the camera-based source.
      const onSample = (s: CadenceSample) => {
        const startedAtNow = stateRef.current.startedAt ?? startedAt;
        const elapsed = Date.now() - startedAtNow - pauseAccumRef.current;
        const distM = Math.max(0, s.totalDistanceM - indoorBaseStepsRef.current);
        const avgPace = distM > 5 && elapsed > 0 ? elapsed / 1000 / (distM / 1000) : 0;
        // Rolling pace: use cadence × stride as instantaneous speed proxy.
        const speedMs = (s.cadenceSpm * indoorStrideMRef.current) / 60;
        const currentPace = speedMs > 0.3 ? 1000 / speedMs : 0;
        setState((p) =>
          p.status === "running"
            ? {
                ...p,
                distanceM: distM,
                cadenceSpm: s.cadenceSpm > 0 ? s.cadenceSpm : p.cadenceSpm,
                avgPaceSecPerKm: avgPace,
                currentPaceSecPerKm: currentPace,
              }
            : p,
        );
        // Holder-mode escalation: low variance for 5s and not yet using camera.
        if (
          !indoorCameraStartedRef.current &&
          indoorActiveSourceRef.current !== "watch"
        ) {
          if (s.motionVariance < 0.4) {
            const t0 = indoorLowMotionSinceRef.current ?? Date.now();
            indoorLowMotionSinceRef.current = t0;
            if (Date.now() - t0 >= 5000) {
              indoorCameraStartedRef.current = true;
              void startCadenceCamera({
                strideM: indoorStrideMRef.current,
                onSample,
              }).then((stopFn) => {
                // If camera fails to start the returned no-op silently absorbs
                // the cleanup; accelerometer keeps providing samples.
                indoorActiveSourceRef.current = "camera";
                setState((p) =>
                  p.status === "running" || p.status === "paused"
                    ? { ...p, motionSource: "camera" }
                    : p,
                );
                const prevStop = indoorStopRef.current;
                indoorStopRef.current = () => {
                  prevStop?.();
                  stopFn();
                };
              });
            }
          } else {
            indoorLowMotionSinceRef.current = null;
          }
        }
      };
      void startCadenceAccelerometer({
        strideM: indoorStrideMRef.current,
        onSample,
      }).then((stopFn) => {
        indoorStopRef.current = stopFn;
      });
    } else {
      armGps();
    }
    startSilentLoop(); // keep iOS from suspending JS when screen locks

    // --- Heart rate sources ---------------------------------------------------
    // Bluetooth chest strap takes priority. Apple Health is used as fallback
    // only when no BT sensor is currently streaming.
    btUnsubRef.current = subscribeBtHr((bt: BtHrState) => {
      if (bt.status === "connected" && bt.bpm != null) {
        latestBpmRef.current = bt.bpm;
        hrSourceRef.current = "bt";
        const tNow = Date.now();
        hrSeriesRef.current.push({ t: tNow, bpm: bt.bpm });
        noteBpmSample(bt.bpm, tNow);
        const series = hrSeriesRef.current;
        const max = series.reduce((a, b) => Math.max(a, b.bpm), 0);
        const avg = Math.round(series.reduce((a, b) => a + b.bpm, 0) / series.length);
        const upgradeIndoorToWatch =
          indoorEnabledRef.current && indoorActiveSourceRef.current !== "watch";
        if (upgradeIndoorToWatch) indoorActiveSourceRef.current = "watch";
        setState((p) =>
          p.status === "running" || p.status === "paused"
            ? {
                ...p,
                hrBpm: bt.bpm,
                hrSource: "bt",
                maxHrBpm: max,
                avgHrBpm: avg,
                motionSource: upgradeIndoorToWatch ? "watch" : p.motionSource,
              }
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
      noteBpmSample(bpm, t);
      const series = hrSeriesRef.current;
      const max = series.reduce((a, b) => Math.max(a, b.bpm), 0);
      const avg = Math.round(series.reduce((a, b) => a + b.bpm, 0) / series.length);
      setState((p) =>
        p.status === "running" || p.status === "paused"
          ? { ...p, hrBpm: bpm, hrSource: "health", maxHrBpm: max, avgHrBpm: avg }
          : p,
      );
    }, 5000);
    const w = ensureWorker();
    w.postMessage({ type: "start", startedAt, pauseAccum: 0 });
  }, [haptic, armGps, ensureWorker, noteBpmSample]);

  // Internal: shared pause primitive used by both manual and auto-pause.
  const doPause = useCallback((auto: boolean) => {
    haptic(25);
    pausedAtRef.current = Date.now();
    workerRef.current?.postMessage({ type: "pause", at: pausedAtRef.current });
    autoPausedRef.current = auto;
    setState((p) =>
      p.status === "running"
        ? { ...p, status: "paused", autoPaused: auto, currentPaceSecPerKm: 0 }
        : p,
    );
  }, [haptic]);

  const doResume = useCallback(() => {
    haptic(25);
    const at = Date.now();
    if (pausedAtRef.current) {
      pauseAccumRef.current += at - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    workerRef.current?.postMessage({ type: "resume", at });
    autoPausedRef.current = false;
    autoResumeMovingSinceRef.current = null;
    setState((p) =>
      p.status === "paused" ? { ...p, status: "running", autoPaused: false } : p,
    );
  }, [haptic]);

  const pause = useCallback(() => doPause(false), [doPause]);
  const resume = useCallback(() => doResume(), [doResume]);

  // Stops tracking and returns the in-memory Run WITHOUT persisting it.
  // Caller decides whether to save (commitRun) or discard (discardRun).
  const stop = useCallback((): Run | null => {
    haptic(60);
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (nativeWatchIdRef.current != null) {
      const id = nativeWatchIdRef.current;
      nativeWatchIdRef.current = null;
      void nativeClearWatch(id);
    }
    workerRef.current?.postMessage({ type: "stop" });
    stopSilentLoop();
    indoorStopRef.current?.();
    indoorStopRef.current = null;
    indoorEnabledRef.current = false;
    const s = stateRef.current;
    if (!s.startedAt) {
      stopHeartRatePolling();
      btUnsubRef.current?.();
      btUnsubRef.current = null;
      setState({ ...initial });
      return null;
    }
    const primaryShoe = getPrimaryShoe();
    const hr = hrSeriesRef.current;
    const z5Pct =
      hr.length > 1 ? Math.round(timeFractionInZone5(hr, DEFAULT_MAX_HR) * 1000) / 10 : 0;
    const hrAggregates =
      hr.length > 0
        ? {
            avgHrBpm: Math.round(hr.reduce((a, b) => a + b.bpm, 0) / hr.length),
            maxHrBpm: hr.reduce((a, b) => Math.max(a, b.bpm), 0),
            hrSeries: hr,
            zone5PctTime: z5Pct,
          }
        : {};
    const runId = genId();
    const baseRun: Run = {
      id: runId,
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
    const profileForVo2 = loadProfile();
    const coachForVo2 = profileForVo2.coach;
    let run: Run = baseRun;
    if (coachForVo2?.preferKnownVo2max && coachForVo2.vo2maxKnown && coachForVo2.vo2maxKnown > 0) {
      run = { ...baseRun, vo2maxEst: coachForVo2.vo2maxKnown, vo2maxSource: "user" };
    } else {
      const restHrForVo2 = (() => {
        try {
          // Read latest vitals from storage to seed VO2 calc with personal RHR.
          const raw = typeof window !== "undefined" ? window.localStorage.getItem("orbit:vitals:v1") : null;
          if (!raw) return undefined;
          const v = JSON.parse(raw) as { restingHr?: number };
          return v?.restingHr && v.restingHr > 0 ? v.restingHr : undefined;
        } catch {
          return undefined;
        }
      })();
      const vo2 = bestEstimateVo2MaxWithSource(baseRun, { coach: coachForVo2, restHr: restHrForVo2 });
      if (vo2 != null) run = { ...baseRun, vo2maxEst: vo2.value, vo2maxSource: vo2.source };
    }

    // --- Heart-rate recovery capture ----------------------------------------
    // Keep BT + Health subscribers active for ~75s after stop so we can sample
    // how fast BPM falls. The `noteBpmSample` callback above pushes into
    // `postStopSeriesRef` whenever it is non-null. After the window closes we
    // tear listeners down and patch the saved run with hrrDrop60s.
    if (hr.length > 0 && latestBpmRef.current != null) {
      postStopSeriesRef.current = [{ t: Date.now(), bpm: latestBpmRef.current }];
      postStopRunIdRef.current = runId;
      if (postStopTimerRef.current != null) window.clearTimeout(postStopTimerRef.current);
      postStopTimerRef.current = window.setTimeout(() => {
        const series = postStopSeriesRef.current ?? [];
        const drop = hrrDrop60s(series);
        // Tear down HR sources now that the recovery window has closed.
        stopHeartRatePolling();
        btUnsubRef.current?.();
        btUnsubRef.current = null;
        if (drop != null && postStopRunIdRef.current) {
          const grade = classifyHrrGrade(drop);
          updateRun(postStopRunIdRef.current, { hrrDrop60s: drop, recoveryGrade: grade });
          try {
            window.dispatchEvent(
              new CustomEvent("orbit:run-updated", {
                detail: { runId: postStopRunIdRef.current, hrrDrop60s: drop, recoveryGrade: grade },
              }),
            );
          } catch {
            /* noop */
          }
        }
        postStopSeriesRef.current = null;
        postStopRunIdRef.current = null;
        postStopTimerRef.current = null;
      }, 75_000);
    } else {
      stopHeartRatePolling();
      btUnsubRef.current?.();
      btUnsubRef.current = null;
    }

    setState((p) => ({ ...p, status: "paused" })); // freeze stats while user reviews
    return run;
  }, [haptic]);

  const commitRun = useCallback((run: Run) => {
    // Compute TRIMP using personal HR config when available.
    try {
      const cfg = loadHrZones();
      const trimp = computeTrimp(run, cfg ? { restingHr: cfg.restingHr, maxHr: cfg.maxHr } : null);
      run = { ...run, trimp };
    } catch {
      /* TRIMP is non-critical */
    }
    saveRun(run);
    // Reset 2-day inactivity reminder when a run is logged.
    if (loadProfile().trainingReminderEnabled) {
      void import("@/lib/notifications").then((m) => m.scheduleInactivityReminder());
    }
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
    recorderRef.current?.cancel();
    clearFlightSnapshot();
    setState({ ...initial, status: "finished" });
  }, []);

  const discardRun = useCallback(() => {
    recorderRef.current?.cancel();
    clearFlightSnapshot();
    setState({ ...initial });
  }, []);

  const reset = useCallback(() => setState({ ...initial }), []);

  // ---- Auto-pause + auto-resume reactor ---------------------------------
  // Watches state (which is updated by handlePosition) and applies the
  // movement-window heuristic. Decoupled from setState's prev-callback so we
  // can read the freshest cumulative state and trigger actions safely.
  useEffect(() => {
    if (!autoPauseEnabledRef.current) return;
    const now = Date.now();
    if (state.status === "running") {
      // Update movement window with the latest cumulative distance.
      const win = movementWindowRef.current;
      cumDistanceRef.current = state.distanceM;
      win.push({ t: now, d: state.distanceM });
      // Keep only the last 12s.
      const cutoff = now - 12_000;
      while (win.length > 0 && win[0].t < cutoff) win.shift();
      // Need at least 10s of history before we trust the call.
      const ref = win.find((s) => s.t <= now - 10_000);
      if (ref) {
        const movedM = state.distanceM - ref.d;
        const dt = (now - ref.t) / 1000;
        const speedMs = dt > 0 ? movedM / dt : 0;
        if (movedM < 5 && speedMs < 0.5) {
          // Stopped — auto-pause.
          if (prVoiceEnabledRef.current && now - lastAutoCueAtRef.current > 30_000) {
            lastAutoCueAtRef.current = now;
            speakLocalized(
              langRef.current === "da" ? "Auto-pause." : "Auto-pause.",
              langRef.current,
            );
          }
          doPause(true);
        }
      }
    } else if (state.status === "paused" && autoPausedRef.current) {
      // Use the most recent rolling pace as a proxy for current speed.
      const speedMs =
        state.currentPaceSecPerKm > 0 ? 1000 / state.currentPaceSecPerKm : 0;
      if (speedMs >= 1.2) {
        if (autoResumeMovingSinceRef.current == null) {
          autoResumeMovingSinceRef.current = now;
        } else if (now - autoResumeMovingSinceRef.current >= 3_000) {
          if (prVoiceEnabledRef.current && now - lastAutoCueAtRef.current > 30_000) {
            lastAutoCueAtRef.current = now;
            speakLocalized(
              langRef.current === "da" ? "Genoptaget." : "Resumed.",
              langRef.current,
            );
          }
          doResume();
        }
      } else {
        autoResumeMovingSinceRef.current = null;
      }
    }
  }, [state.status, state.distanceM, state.currentPaceSecPerKm, state.elapsedMs, doPause, doResume]);

  // ---- Flight recorder snapshot writer ----------------------------------
  // Mirrors the live run state into localStorage on every meaningful change.
  // The recorder itself debounces to ~1 write/sec.
  useEffect(() => {
    if (!flightRecorderEnabledRef.current) return;
    if (state.status !== "running" && state.status !== "paused") return;
    const id = runIdRef.current;
    const startedAt = state.startedAt;
    if (!id || !startedAt) return;
    const snap: FlightSnapshot = {
      runId: id,
      startedAt,
      lastSavedAt: Date.now(),
      durationMs: state.elapsedMs,
      distanceM: state.distanceM,
      elevationGainM: state.elevationGainM,
      avgPaceSecPerKm: state.avgPaceSecPerKm,
      avgCadenceSpm: state.cadenceSpm,
      points: state.points,
      splits: state.splits,
      hrSeries: hrSeriesRef.current.length > 0 ? hrSeriesRef.current : undefined,
      avgHrBpm: state.avgHrBpm ?? undefined,
      maxHrBpm: state.maxHrBpm ?? undefined,
      weather: weatherRef.current ?? undefined,
    };
    getRecorder().queue(snap);
  }, [
    state.status,
    state.startedAt,
    state.elapsedMs,
    state.distanceM,
    state.elevationGainM,
    state.avgPaceSecPerKm,
    state.cadenceSpm,
    state.points,
    state.splits,
    state.avgHrBpm,
    state.maxHrBpm,
    getRecorder,
  ]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (nativeWatchIdRef.current != null) void nativeClearWatch(nativeWatchIdRef.current);
      workerRef.current?.terminate();
      workerRef.current = null;
      stopSilentLoop();
      indoorStopRef.current?.();
      indoorStopRef.current = null;
      stopHeartRatePolling();
      btUnsubRef.current?.();
      btUnsubRef.current = null;
      if (postStopTimerRef.current != null) {
        window.clearTimeout(postStopTimerRef.current);
        postStopTimerRef.current = null;
      }
      postStopSeriesRef.current = null;
      postStopRunIdRef.current = null;
    };
  }, []);

  return { ...state, start, pause, resume, stop, commitRun, discardRun, reset, armGps, warmGps };
}
