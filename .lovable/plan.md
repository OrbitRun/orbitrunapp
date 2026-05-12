## Plan

1. **Harden the native HTTP wrapper**
   - Enforce `https://` for all external network requests routed through `nativeRequest`.
   - Add iOS-safe request options for URL-encoded Spotify token calls so the body is sent consistently through Capacitor HTTP.
   - Add targeted console diagnostics (`[native-http]`) when Capacitor HTTP is used or unavailable.

2. **Fix remaining Mapbox paths**
   - Replace `mapbox://styles/...` with an explicit `https://api.mapbox.com/styles/v1/...` style URL so Mapbox does not resolve a custom scheme internally.
   - Add a shared Mapbox `transformRequest` helper that routes Mapbox GL resource requests through Capacitor HTTP on native iOS instead of standard JS fetch/XHR where supported.
   - Apply it to both `RunMap` and `RunReplay`.

3. **Fix Mapbox static image loading**
   - Replace `new Image().src = https://api.mapbox.com/...` in share-card generation with a native HTTP blob/data-URL loader on iOS.
   - Keep the current browser image loading path for web.

4. **Reduce iOS sandbox storage exposure for auth-critical data**
   - Stop mirroring Spotify/native storage values back into `localStorage` on native iOS; use the in-memory cache plus `@capacitor/preferences` only.
   - Leave web behavior unchanged.

5. **Update iOS setup docs**
   - Document that Mapbox, Spotify, and weather requests are HTTPS-only and native-routed on iOS.
   - Add the exact rebuild/sync steps needed after these native changes.