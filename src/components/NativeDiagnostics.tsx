import { useState } from "react";
import { Stethoscope } from "lucide-react";

type Result = {
  isNative: boolean;
  platform: string;
  pluginsRegistered: Record<string, boolean>;
  jsImports: Record<string, string>;
  geoPermission: string;
  geoFix: string;
};

export default function NativeDiagnostics() {
  const [res, setRes] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const out: Result = {
      isNative: false,
      platform: "web",
      pluginsRegistered: {},
      jsImports: {},
      geoPermission: "?",
      geoFix: "?",
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cap: any = (window as unknown as { Capacitor?: unknown }).Capacitor;
      out.isNative = !!cap?.isNativePlatform?.();
      out.platform = cap?.getPlatform?.() ?? "web";
      const names = [
        "Geolocation",
        "Browser",
        "App",
        "Preferences",
        "LocalNotifications",
        "CapacitorHttp",
      ];
      for (const n of names) {
        out.pluginsRegistered[n] = !!cap?.isPluginAvailable?.(n);
      }
      const specs = [
        "@capacitor/geolocation",
        "@capacitor/browser",
        "@capacitor/app",
        "@capacitor/preferences",
      ];
      for (const s of specs) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mod: any = await (async () => {
            switch (s) {
              case "@capacitor/geolocation":
                return await import("@capacitor/geolocation");
              case "@capacitor/browser":
                return await import("@capacitor/browser");
              case "@capacitor/app":
                return await import("@capacitor/app");
              case "@capacitor/preferences":
                return await import("@capacitor/preferences");
            }
          })();
          out.jsImports[s] = mod ? "ok" : "empty";
        } catch (e) {
          out.jsImports[s] = (e as Error)?.message ?? "fail";
        }
      }
      try {
        const Geo = await import("@capacitor/geolocation");
        const cur = await Geo.Geolocation.checkPermissions();
        out.geoPermission = cur?.location ?? "?";
        if (out.geoPermission !== "granted") {
          const r = await Geo.Geolocation.requestPermissions();
          out.geoPermission = `req→${r?.location ?? "?"}`;
        }
        if (out.geoPermission.includes("granted")) {
          const p = await Geo.Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
          });
          out.geoFix = `${p.coords.latitude.toFixed(4)},${p.coords.longitude.toFixed(4)} ±${Math.round(p.coords.accuracy)}m`;
        } else {
          out.geoFix = "skipped";
        }
      } catch (e) {
        out.geoFix = `err: ${(e as Error)?.message ?? "fail"}`;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[diag] failed", e);
    }
    setRes(out);
    setRunning(false);
  };

  return (
    <section className="mt-4 rounded-2xl p-4 border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-xl grid place-items-center bg-white/5">
          <Stethoscope className="h-4 w-4 text-neon" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Native diagnostics</div>
          <div className="text-[11px] text-muted-foreground">
            Tjekker hvilke plugins der reelt er installeret i iOS-bygget.
          </div>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="h-9 px-3 rounded-lg text-xs font-bold bg-neon text-black disabled:opacity-50"
        >
          {running ? "Kører…" : "Kør test"}
        </button>
      </div>
      {res && (
        <pre className="text-[10px] leading-relaxed bg-black/40 text-foreground rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
{`isNative: ${res.isNative}
platform: ${res.platform}

Capacitor.isPluginAvailable():
${Object.entries(res.pluginsRegistered).map(([k, v]) => `  ${v ? "✅" : "❌"} ${k}`).join("\n")}

JS import():
${Object.entries(res.jsImports).map(([k, v]) => `  ${v === "ok" ? "✅" : "❌"} ${k} → ${v}`).join("\n")}

Geo permission: ${res.geoPermission}
Geo fix: ${res.geoFix}`}
        </pre>
      )}
    </section>
  );
}
