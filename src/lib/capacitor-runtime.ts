// Centralized Capacitor native detection + dynamic plugin loaders.
// Importing @capacitor/* statically would pull native shims into the web build;
// instead we lazy-load via dynamic import so web builds stay clean.

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
const dynImport = Function("s", "return import(s)") as (s: string) => Promise<any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadCapacitorPlugin<T = any>(specifier: string, exportName: string): Promise<T | null> {
  try {
    const mod = await dynImport(specifier);
    return (mod?.[exportName] ?? mod?.default?.[exportName] ?? mod?.default) as T;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCapacitorHttp(): Promise<any | null> {
  if (!isCapacitorNative()) return null;
  try {
    const mod = await dynImport("@capacitor/core");
    return mod?.CapacitorHttp ?? mod?.default?.CapacitorHttp ?? null;
  } catch {
    return null;
  }
}
