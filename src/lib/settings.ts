// App settings persisted in localStorage.

export type CueInterval = 0.5 | 1;

export type AppSettings = {
  autoPause: boolean;
  cueIntervalKm: CueInterval;
  haptic: boolean;
  /**
   * When true, the heatmap ignores the device's reported GPS speed if it looks
   * unrealistic (e.g. sudden spikes), and falls back to a smoothed rolling
   * window over recent points instead.
   */
  ignoreGpsSpeedSpikes: boolean;
};

const STORAGE_KEY = "orbit:settings:v1";

const DEFAULTS: AppSettings = {
  autoPause: true,
  cueIntervalKm: 1,
  haptic: true,
  ignoreGpsSpeedSpikes: true,
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const merged: AppSettings = { ...DEFAULTS, ...parsed };
    // sanitize cue interval
    if (merged.cueIntervalKm !== 0.5 && merged.cueIntervalKm !== 1) {
      merged.cueIntervalKm = 1;
    }
    return merged;
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: AppSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent("orbit:settings-change"));
  } catch {
    /* noop */
  }
}

export function updateSettings(patch: Partial<AppSettings>) {
  saveSettings({ ...loadSettings(), ...patch });
}
