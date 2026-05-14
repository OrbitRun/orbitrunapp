// Camera-driven cadence estimator (holder mode). Best-effort:
// asks for the front camera, samples a small downsampled frame at ~15 fps,
// computes per-frame mean luminance, and detects rhythmic changes that
// correspond to a runner stepping in front of the lens.
//
// If permission is denied or the API is unavailable, returns a no-op stop fn.
// Callers should keep the accelerometer source as a hard fallback.

import type { CadenceSample } from "@/lib/cadence-accelerometer";

type Options = {
  onSample: (sample: CadenceSample) => void;
  strideM?: number;
};

const FRAME_INTERVAL_MS = 66; // ~15 fps
const SAMPLE_EMIT_MS = 1000;

export async function startCadenceCamera(opts: Options): Promise<() => void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return () => {};
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 160, height: 120 },
      audio: false,
    });
  } catch {
    return () => {};
  }
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  try {
    await video.play();
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    return () => {};
  }
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 24;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    stream.getTracks().forEach((t) => t.stop());
    return () => {};
  }

  const stride = opts.strideM && opts.strideM > 0 ? opts.strideM : 0.78;
  const luminance: { t: number; v: number }[] = [];
  const stepTimestamps: number[] = [];
  let totalSteps = 0;
  let lastEmit = performance.now();
  let lastStepAt = 0;
  let timer: number | null = null;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += data[i] + data[i + 1] + data[i + 2];
      }
      const mean = sum / ((data.length / 4) * 3);
      const now = performance.now();
      luminance.push({ t: now, v: mean });
      const cutoff = now - 4000;
      while (luminance.length > 0 && luminance[0].t < cutoff) luminance.shift();

      // Peak detection on detrended luminance.
      if (luminance.length >= 3) {
        const m = luminance.reduce((s, p) => s + p.v, 0) / luminance.length;
        const last = luminance[luminance.length - 1];
        const prev = luminance[luminance.length - 2];
        const before = luminance[luminance.length - 3];
        if (
          prev.v - m > 4 &&
          prev.v > last.v &&
          prev.v > before.v &&
          now - lastStepAt > 220
        ) {
          lastStepAt = now;
          totalSteps += 1;
          stepTimestamps.push(now);
          const c2 = now - 6000;
          while (stepTimestamps.length > 0 && stepTimestamps[0] < c2) stepTimestamps.shift();
        }
      }

      if (now - lastEmit >= SAMPLE_EMIT_MS) {
        lastEmit = now;
        let cadenceSpm = 0;
        if (stepTimestamps.length >= 2) {
          const span = stepTimestamps[stepTimestamps.length - 1] - stepTimestamps[0];
          if (span > 0) cadenceSpm = Math.round((stepTimestamps.length - 1) * 60_000 / span);
        }
        opts.onSample({
          cadenceSpm,
          totalSteps,
          totalDistanceM: totalSteps * stride,
          motionVariance: 0,
        });
      }
    } catch {
      /* frame failure — try again next tick */
    }
  };

  timer = window.setInterval(tick, FRAME_INTERVAL_MS);
  return () => {
    stopped = true;
    if (timer != null) window.clearInterval(timer);
    stream.getTracks().forEach((t) => t.stop());
    try {
      video.pause();
    } catch {
      /* noop */
    }
  };
}
