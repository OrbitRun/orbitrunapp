// App settings persisted in localStorage.

export type AppSettings = {
  autoPause: boolean;
};

const STORAGE_KEY = "orbit:settings:v1";

const DEFAULTS: AppSettings = {
  autoPause: true,
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) };
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
