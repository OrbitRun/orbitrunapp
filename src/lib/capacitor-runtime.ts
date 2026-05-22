// Centralized Capacitor native detection + plugin loaders.
//
// CRITICAL: All Capacitor plugin imports MUST be written as literal
// `import("@capacitor/xyz")` strings so Vite can statically analyze them
// and emit them as lazy chunks in the production bundle. Previously we used
// `Function("s", "return import(s)")(specifier)` to hide the imports from
// the web bundle, but that prevented the plugins from being bundled at all
// — which is why the native iOS build kept reporting "plugin unavailable".

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
      platform?: string;
    };
  };
  const cap = w.Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) return true;
  const p = (typeof cap.getPlatform === "function" ? cap.getPlatform() : cap.platform) ?? "";
  return p === "ios" || p === "android";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importPlugin(specifier: string): Promise<any | null> {
  try {
    switch (specifier) {
      case "@capacitor/geolocation":
        return await import("@capacitor/geolocation");
      case "@capacitor/app":
        return await import("@capacitor/app");
      case "@capacitor/browser":
        return await import("@capacitor/browser");
      case "@capacitor/preferences":
        return await import("@capacitor/preferences");
      case "@capacitor/local-notifications":
        return await import("@capacitor/local-notifications");
      case "@capacitor-community/bluetooth-le":
        return await import("@capacitor-community/bluetooth-le");
      case "@capacitor/core":
        return await import("@capacitor/core");
      default:
        // eslint-disable-next-line no-console
        console.warn("[capacitor-runtime] unknown plugin specifier", specifier);
        return null;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[capacitor-runtime] failed to import", specifier, (e as Error)?.message ?? e);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadCapacitorPlugin<T = any>(specifier: string, exportName: string): Promise<T | null> {
  const mod = await importPlugin(specifier);
  if (!mod) return null;
  return (mod?.[exportName] ?? mod?.default?.[exportName] ?? mod?.default) as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCapacitorHttp(): Promise<any | null> {
  if (!isCapacitorNative()) return null;
  const mod = await importPlugin("@capacitor/core");
  return mod?.CapacitorHttp ?? mod?.default?.CapacitorHttp ?? null;
}
