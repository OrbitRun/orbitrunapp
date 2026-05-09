# Fix GPS & Spotify i Capacitor iOS

## Hvad der er galt nu

**GPS:** Koden i `src/lib/geolocation-native.ts` og `src/hooks/use-gps-warmup.ts` *kalder allerede* `@capacitor/geolocation`-pluginnet via dynamisk import — men pakken er **ikke installeret** (mangler i `package.json`). Den dynamiske import fejler stille, og koden falder tilbage til `navigator.geolocation`, som på iOS WKWebView ikke får vist iOS-tilladelsesdialogen → "Location permission denied".

Derudover mangler `Info.plist` purpose-strings og `UIBackgroundModes: location` (ikke noget vi kan ændre i Lovable — beskrives i `docs/IOS_SETUP.md`).

**Spotify:** På iOS peger `getRedirectUri()` på `window.location.origin/spotify/callback`, som inde i WKWebView bliver `capacitor://localhost/spotify/callback` (eller en anden intern URL). Spotify accepterer ikke det format → "URL fejl". Vi skal bruge en custom URL scheme `com.lovable.orbitrun://callback`, åbne login i in-app browser og fange tilbagekaldet via `appUrlOpen`.

## Ændringer

### 1. Installér Capacitor-plugins
Tilføj til `package.json` (og `bun install`):
- `@capacitor/geolocation` — GPS-bro
- `@capacitor/app` — `appUrlOpen` deep-link event
- `@capacitor/browser` — in-app browser til OAuth

(De er stadig dynamisk importerede i koden, så web-build forbliver upåvirket.)

### 2. GPS — sikre at warmup kører på rigtige tidspunkter
- `useGpsWarmup` (allerede i root) kører ved app-start. Bekræft den er mountet i `src/routes/__root.tsx`. Hvis ikke, mount den.
- Tilføj samme `requestNativeGeolocationPermission()` + warmup-call ved mount af `src/components/RunMap.tsx`, så tilladelsen også spørges når kortet vises (sikkerhedsnet hvis brugeren afviste ved start).
- Ingen ændring til `geolocation-native.ts` — den er allerede korrekt.

### 3. Spotify — native OAuth flow

**`src/lib/spotify.ts`:**
- `getRedirectUri()` → returnér `com.lovable.orbitrun://callback` når `Capacitor.isNativePlatform()`, ellers nuværende web-URL.
- `beginAuth()` → på native: åbn auth-URL via `@capacitor/browser` (`Browser.open({ url, presentationStyle: 'popover' })`). På web: behold `window.location.href = ...`.
- Ny eksport `initSpotifyDeepLinkListener()`:
  - Kun på native. Lytter på `App.addListener('appUrlOpen', ...)`.
  - Når URL starter med `com.lovable.orbitrun://callback`, parse `code`, kald `exchangeCode(code)`, luk `Browser`, og dispatch et `orbit:spotify-authed` event (eller redirect via router til `/profile`).

**`src/routes/__root.tsx`** (eller en ny mount-once hook): kald `initSpotifyDeepLinkListener()` i en `useEffect`.

**`src/routes/spotify.callback.tsx`:** uændret — bruges stadig på web.

### 4. Capacitor-konfiguration (informativ — kræver lokal handling)
- Brugeren skal tilføje i Spotify Developer Dashboard:  
  Redirect URI: `com.lovable.orbitrun://callback`
- `ios/App/App/Info.plist` skal have `CFBundleURLTypes` med scheme `com.lovable.orbitrun`. Opdatér `docs/IOS_SETUP.md` med snippet + instruks.

### 5. Dokumentation
Opdatér `docs/IOS_SETUP.md`:
- Plugin-install (`bun add @capacitor/geolocation @capacitor/app @capacitor/browser`)
- Info.plist purpose-strings (NSLocationWhenInUse..., UIBackgroundModes)
- `CFBundleURLTypes` block til Spotify-callback
- Ny redirect URI i Spotify Dashboard

## Filer der ændres
- `package.json` (deps)
- `src/lib/spotify.ts`
- `src/components/RunMap.tsx` (permission-request på mount)
- `src/routes/__root.tsx` (mount deep-link listener — eller ny hook `use-spotify-deep-link.ts`)
- `docs/IOS_SETUP.md`

## Tekniske noter
- Alle Capacitor-imports forbliver dynamiske/lazy så web/SSR-build ikke bryder.
- Vi rører ikke ved `geolocation-native.ts` — den fejlede kun fordi pluginnet manglede i bundle.
- `vite.config.ios.ts` behøver ingen ændring; SPA-bundlen vil nu inkludere de tre Capacitor-pakker.
