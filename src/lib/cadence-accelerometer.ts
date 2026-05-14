// Accelerometer-driven cadence + step counter.
// Uses the Web `DeviceMotionEvent` (works inside iOS WKWebView and most modern
// browsers). Detects foot-strike peaks on the magnitude of
// accelerationIncludingGravity, with a refractory window to avoid double-counts.
//
// Public API:
//   const stop = startCadenceAccelerometer({ onSample, strideM })
//   stop()    // tear down listener
//
// onSample fires roughly once a second with the latest cadence (steps/min) and
// running totals. If the device denies permission or doesn't expose
// DeviceMotionEvent at all, the function resolves immediately and the
// subscriber simply never receives samples — callers should treat that as a
// "no signal" state and fall back to camera mode.

export type CadenceSample = {
  cadenceSpm: number;
  totalSteps: number;
  totalDistanceM: number;
  // Variance of recent acceleration magnitudes — useful to decide whether the
  // phone is being carried (high variance) or sitting in a holder (low).
  motionVariance: number;
};

type Options = {
  onSample: (sample: CadenceSample) => void;
  strideM?: number;
};

type DeviceMotionEventStaticIOS = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const PEAK_THRESHOLD = 1.6; // m/s² above the running mean
const MIN_STEP_INTERVAL_MS = 220; // ~270 spm cap
const SAMPLE_EMIT_MS = 750;

export async function startCadenceAccelerometer(opts: Options): Promise<() => void> {
  if (typeof window === "undefined" || typeof DeviceMotionEvent === "undefined") {
    return () => {};
  }
  // iOS Safari requires an explicit permission grant inside a user gesture.
  // We try anyway — if it rejects, we silently no-op so the caller can fall
  // back to the camera source.
  const Ctor = DeviceMotionEvent as unknown as DeviceMotionEventStaticIOS;
  if (typeof Ctor.requestPermission === "function") {
    try {
      const r = await Ctor.requestPermission();
      if (r !== "granted") return () => {};
    } catch {
      return () => {};
    }
  }

  const stride = opts.strideM && opts.strideM > 0 ? opts.strideM : 0.78;
  let totalSteps = 0;
  let lastStepAt = 0;
  let mean = 9.81;
  const recent: number[] = [];
  const stepTimestamps: number[] = [];
  let lastEmit = performance.now();

  const handler = (ev: DeviceMotionEvent) => {
    const a = ev.accelerationIncludingGravity;
    if (!a) return;
    const ax = a.x ?? 0;
    const ay = a.y ?? 0;
    const az = a.z ?? 0;
    const mag = Math.sqrt(ax * ax + ay * ay + az * az);
    // Slow EMA tracks gravity baseline.
    mean = mean * 0.95 + mag * 0.05;
    recent.push(mag);
    if (recent.length > 50) recent.shift();

    const now = performance.now();
    if (mag - mean > PEAK_THRESHOLD && now - lastStepAt > MIN_STEP_INTERVAL_MS) {
      lastStepAt = now;
      totalSteps += 1;
      stepTimestamps.push(now);
      const cutoff = now - 6000;
      while (stepTimestamps.length > 0 && stepTimestamps[0] < cutoff) {
        stepTimestamps.shift();
      }
    }

    if (now - lastEmit >= SAMPLE_EMIT_MS) {
      lastEmit = now;
      let cadenceSpm = 0;
      if (stepTimestamps.length >= 2) {
        const span = stepTimestamps[stepTimestamps.length - 1] - stepTimestamps[0];
        if (span > 0) cadenceSpm = Math.round((stepTimestamps.length - 1) * 60_000 / span);
      }
      let variance = 0;
      if (recent.length > 4) {
        const m = recent.reduce((s, v) => s + v, 0) / recent.length;
        variance = recent.reduce((s, v) => s + (v - m) ** 2, 0) / recent.length;
      }
      opts.onSample({
        cadenceSpm,
        totalSteps,
        totalDistanceM: totalSteps * stride,
        motionVariance: variance,
      });
    }
  };

  window.addEventListener("devicemotion", handler);
  return () => {
    window.removeEventListener("devicemotion", handler);
  };
}
