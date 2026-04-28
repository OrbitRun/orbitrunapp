// Apple HealthKit bridge — web-safe, native-ready.
//
// In the browser / SSR (Cloudflare Worker) every export is a no-op:
// `isHealthAvailable()` returns false, polling does nothing, requests
// return "unavailable". Inside a Capacitor iOS shell with the
// `@capacitor-community/health` plugin installed, the dynamic imports
// resolve and the real HealthKit APIs are used.
//
// See docs/IOS_SETUP.md for the wrapping recipe.

export type HealthPermissionStatus = "granted" | "denied" | "unavailable";

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Capacitor?: CapacitorGlobal };
  return w.Capacitor ?? null;
}

export function isHealthAvailable(): boolean {
  const cap = getCapacitor();
  if (!cap?.isNativePlatform?.()) return false;
  return cap.getPlatform?.() === "ios";
}

// Lazily resolve the plugin so the web bundle never fails to build/run.
async function loadPlugin(): Promise<unknown | null> {
  if (!isHealthAvailable()) return null;
  try {
    // Hide the specifier from the TS resolver and Vite's static analysis —
    // the package is only installed inside the native Capacitor shell.
    const specifier = "@capacitor-community/health";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await (Function(
      "s",
      "return import(s)",
    ) as (s: string) => Promise<unknown>)(specifier);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mod as any;
    return m?.Health ?? m?.default ?? null;
  } catch {
    return null;
  }
}

export async function requestHeartRatePermission(): Promise<HealthPermissionStatus> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any = await loadPlugin();
  if (!plugin) return "unavailable";
  try {
    await plugin.requestAuth?.({
      read: ["HKQuantityTypeIdentifierHeartRate"],
      write: [],
    });
    return "granted";
  } catch {
    return "denied";
  }
}

export async function getLatestHeartRate(): Promise<number | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any = await loadPlugin();
  if (!plugin) return null;
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 30_000);
    const res = await plugin.queryHKitSampleType?.({
      sampleName: "HKQuantityTypeIdentifierHeartRate",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 1,
    });
    // Plugin returns an array of samples ordered oldest-first; pick last.
    const samples: Array<{ value?: number }> = res?.resultData ?? res ?? [];
    if (!samples?.length) return null;
    const last = samples[samples.length - 1];
    return typeof last?.value === "number" ? Math.round(last.value) : null;
  } catch {
    return null;
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startHeartRatePolling(
  cb: (bpm: number, t: number) => void,
  intervalMs = 5000,
): void {
  if (!isHealthAvailable()) return;
  stopHeartRatePolling();
  const tick = async () => {
    const bpm = await getLatestHeartRate();
    if (bpm != null) cb(bpm, Date.now());
  };
  void tick();
  pollTimer = setInterval(tick, intervalMs);
}

export function stopHeartRatePolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
