# Disable global CapacitorHttp patch (fix black Mapbox map on iOS)

## Change (single file)

`capacitor.config.ts`:

```diff
   plugins: {
-    CapacitorHttp: { enabled: true },
+    CapacitorHttp: { enabled: false },
   },
```

The comment block above the plugin entry is updated to state that the global
fetch/XHR patch is intentionally disabled because it breaks Mapbox GL binary
vector-tile decoding inside its Web Worker (black map on iOS).

`ios.contentInset: "never"` stays unchanged. Nothing else in the file changes.

## Not touched

Viewport/safe-area CSS, app shell, BottomNav, GPS, Spotify logic, Bluetooth,
Apple Health, Mapbox component code, native iOS files.

## Verified: Spotify / Open-Meteo do not depend on the global patch

`src/lib/native-http.ts` calls `getCapacitorHttp()` (dynamic import of
`CapacitorHttp` from `@capacitor/core`) and invokes `Http.request({...})`
explicitly, with a `fetch()` fallback only when the plugin is unavailable.
`enabled: false` only disables the global `window.fetch`/`XMLHttpRequest`
monkey-patch; the explicit `CapacitorHttp.request` API keeps working.

Consumers confirmed on that path:
- `src/lib/spotify.ts` (auth token exchange + Web API calls)
- `src/lib/weather.ts` and `src/hooks/use-current-env.ts` (Open-Meteo)
- `src/lib/share-card-v2.ts` (Mapbox static image via `nativeFetchDataUrl`)

Mapbox GL tile/style requests go back to normal WKWebView networking, which is
what its worker-based decoder needs.

## After approval

Output `git diff --name-only` and the exact `capacitor.config.ts` diff before
publishing. Then run `npx cap sync ios` locally before the next Xcode build.
