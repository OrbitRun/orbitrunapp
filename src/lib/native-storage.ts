// Native-safe key/value storage with synchronous read accessors.
//
// Strategy:
//  - On native iOS, persist to @capacitor/preferences (survives sandbox
//    extension drops between Safari OAuth and the host app).
//  - Mirror every value into an in-memory cache so legacy synchronous
//    getters (getStoredToken, getActiveWorkoutPlaylist, isAuthed) still
//    work without an `await` at every call site.
//  - On web, mirror to localStorage/sessionStorage as before.
//
// Call `primeNativeStorage([...keys])` once at app boot to hydrate the
// cache from the native store before sync getters run.

import { isCapacitorNative, loadCapacitorPlugin } from "./capacitor-runtime";

const cache = new Map<string, string | null>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let preferencesPromise: Promise<any | null> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPreferences(): Promise<any | null> {
  if (!isCapacitorNative()) return Promise.resolve(null);
  if (!preferencesPromise) {
    preferencesPromise = loadCapacitorPlugin("@capacitor/preferences", "Preferences");
  }
  return preferencesPromise;
}

export function getCached(key: string): string | null {
  if (cache.has(key)) return cache.get(key) ?? null;
  // On native iOS, do NOT touch localStorage — sandbox extension drops can
  // make WKWebView storage transiently unavailable, which we've seen surface
  // as `unable to make sandbox extension: Operation not permitted` in Xcode.
  if (isCapacitorNative()) return null;
  if (typeof window !== "undefined") {
    try {
      const v = window.localStorage.getItem(key);
      cache.set(key, v);
      return v;
    } catch {
      return null;
    }
  }
  return null;
}

export async function getValue(key: string): Promise<string | null> {
  const Prefs = await getPreferences();
  if (Prefs) {
    try {
      const r = await Prefs.get({ key });
      const v: string | null = r?.value ?? null;
      cache.set(key, v);
      return v;
    } catch {
      /* fall through */
    }
  }
  return getCached(key);
}

export async function setValue(key: string, value: string | null): Promise<void> {
  cache.set(key, value);
  const native = isCapacitorNative();
  if (!native && typeof window !== "undefined") {
    try {
      if (value == null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch { /* noop */ }
  }
  const Prefs = await getPreferences();
  if (Prefs) {
    try {
      if (value == null) await Prefs.remove({ key });
      else await Prefs.set({ key, value });
    } catch { /* noop */ }
  }
}

export async function primeNativeStorage(keys: string[]): Promise<void> {
  const Prefs = await getPreferences();
  if (!Prefs) {
    // Web: prime cache from localStorage so getCached is a true no-IO read.
    if (typeof window === "undefined") return;
    for (const k of keys) {
      try { cache.set(k, window.localStorage.getItem(k)); } catch { /* noop */ }
    }
    return;
  }
  await Promise.all(
    keys.map(async (k) => {
      try {
        const r = await Prefs.get({ key: k });
        const v: string | null = r?.value ?? null;
        cache.set(k, v);
      } catch { /* noop */ }
    }),
  );
}
