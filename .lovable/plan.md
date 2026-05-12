## Plan

1. **Add the native Capacitor pieces**
   - Add `@capacitor/preferences` to dependencies for reliable iOS key/value storage.
   - Enable Capacitor's bundled native HTTP bridge in `capacitor.config.ts` so iOS can route HTTP outside WKWebView CORS/sandbox behavior.

2. **Create a small native-safe utility layer**
   - Add a `src/lib/capacitor-runtime.ts` helper that centralizes native detection.
   - Add a `src/lib/native-http.ts` wrapper around `CapacitorHttp.request()` with a web fallback to `fetch()` and a Response-like return shape, so existing Spotify/weather parsing stays simple.
   - Add a `src/lib/native-storage.ts` wrapper around `@capacitor/preferences` with web fallbacks to `localStorage`/`sessionStorage`.

3. **Refactor Spotify OAuth for iOS**
   - Store the PKCE verifier, Spotify token, and active workout playlist through the native storage wrapper instead of direct `localStorage`/`sessionStorage`.
   - Convert Spotify token exchange, refresh, and Web API calls to the native HTTP wrapper.
   - Keep `appUrlOpen` + `getLaunchUrl()` for `jonas-orbit-run://callback`, but parse the callback URL without relying only on `new URL()` so iOS custom-scheme query parameters are preserved.
   - Dispatch the existing `orbit:spotify-authed` / error events after native storage has written successfully.

4. **Update dependent UI/hooks for async storage**
   - Update Spotify UI and run-control call sites to await `isAuthed()`, `getActiveWorkoutPlaylist()`, `setActiveWorkoutPlaylist()`, and `logout()` where needed.
   - Keep the web callback route working, but ensure it uses the same native-safe exchange path.

5. **Route other direct API calls through native HTTP**
   - Change Open-Meteo weather/environment calls from `fetch()` to the native HTTP wrapper.
   - Leave backend SDK internals alone, since generated integration files must not be edited.

6. **Document the updated iOS flow**
   - Update `docs/IOS_SETUP.md` with the new dependency/sync requirement and the expected Xcode log path for native HTTP/storage callback completion.

## Technical details

- Capacitor 8 includes `CapacitorHttp` from `@capacitor/core`; no community HTTP plugin is needed.
- `@capacitor/preferences` is needed because the current Spotify verifier/token storage is synchronous browser storage, which can be fragile during Safari/Browser-to-app OAuth transitions on iOS.
- After implementation, you will need to run locally: `npm install`, `npm run build`, `npx cap sync ios`, then reinstall/relaunch the app in Xcode.