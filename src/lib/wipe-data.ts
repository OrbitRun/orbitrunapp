// Wipe every locally-stored piece of app data: runs, PRs, profile, coach,
// shoes, settings, sensors, etc. All app keys are namespaced under
// `orbit:` or `lux-runner:`.

const PREFIXES = ["orbit:", "lux-runner:"];

const UPDATE_EVENTS = [
  "orbit:profile-update",
  "orbit:shoes-updated",
  "orbit:run-updated",
  "orbit:vitals-update",
  "orbit:hr-zones-update",
  "orbit:zone-pacing-update",
];

export function wipeAllAppData() {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && PREFIXES.some((p) => k.startsWith(p))) toRemove.push(k);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
    UPDATE_EVENTS.forEach((e) => window.dispatchEvent(new CustomEvent(e)));
  } catch {
    /* noop */
  }
}
