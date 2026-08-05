# Baggrunds-GPS med native CLLocationManager-plugin (iOS)

Målet: løbet fortsætter med at registrere position når skærmen er låst eller appen er i baggrunden. `@capacitor/geolocation` erstattes på iOS af et eget Swift-plugin bygget på `CLLocationManager`, som buffrer fixes native, så intet mistes mens WebView'en er suspenderet. Ingen silent audio. Web bruger fortsat browser-GPS.

## 1. Native Swift-plugin

Nye filer i `templates/ios/` (kopieres ind i Xcode-projektet af build-scriptet):

- `templates/ios/OrbitGeo.swift` — `CAPPlugin`-subklasse `OrbitGeo` med en intern `CLLocationManagerDelegate`:
  - `start()`: sætter `desiredAccuracy = kCLLocationAccuracyBestForNavigation`, `distanceFilter = 3`, `activityType = .fitness`, `allowsBackgroundLocationUpdates = true`, `pausesLocationUpdatesAutomatically = false`, `showsBackgroundLocationIndicator = true`, derefter `startUpdatingLocation()`.
  - `stop()`: `stopUpdatingLocation()` + `allowsBackgroundLocationUpdates = false`.
  - `requestPermissions()` / `checkPermissions()`: `requestWhenInUseAuthorization()` → `requestAlwaysAuthorization()` når et løb er aktivt.
  - `didUpdateLocations`: hvert `CLLocation` konverteres til `{lat, lng, accuracy, altitude, speed, heading, timestamp}`, gemmes i en native ringbuffer (maks. ~20.000 punkter, også skrevet til disk via `UserDefaults`/fil så et WebView-kill ikke taber turen) og sendes til JS med `notifyListeners("orbitLocation", ...)`.
  - `drain()`: returnerer alle bufferede punkter med `timestamp` nyere end en `since`-værdi, så React kan hente det, den gik glip af.
  - `clearBuffer()`: kaldes når løbet gemmes/kasseres.
- `templates/ios/OrbitGeo.m` — `CAP_PLUGIN`-makro der registrerer pluginet og metoderne `start`, `stop`, `drain`, `clearBuffer`, `checkPermissions`, `requestPermissions` i ObjC-runtime, så Capacitor finder det automatisk i app-targettet.

## 2. Xcode-integration

- `scripts/apply-ios-template.mjs` udvides: kopierer `templates/ios/OrbitGeo.swift` og `OrbitGeo.m` til `ios/App/App/`, og patcher `ios/App/App.xcodeproj/project.pbxproj` så begge filer indgår i app-targettets sources/build phase. Findes en bridging header ikke, oprettes `App-Bridging-Header.h` og sættes i build settings.
- Scriptet verificerer bagefter at `Info.plist` indeholder `UIBackgroundModes` → `location` og alle tre location usage descriptions (de findes allerede i `templates/Info.plist`) og fejler højlydt hvis ikke.
- Xcode: Background Modes → Location updates kommer fra `UIBackgroundModes` i Info.plist; scriptet tilføjer også capability-entry'en i pbxproj hvis den mangler.

## 3. React-wrapper

- Ny fil `src/lib/orbit-geo.ts`: tynd typed wrapper omkring `registerPlugin<OrbitGeoPlugin>("OrbitGeo")` med `startBackgroundTracking()`, `stopBackgroundTracking()`, `addLocationListener(cb)`, `drainSince(ts)`, `clearBuffer()`, samt `isOrbitGeoAvailable()` (kun iOS-native og kun når pluginet faktisk er registreret).
- `src/lib/geolocation-native.ts`: uændret rolle som permission/one-shot-lag; web-grenen røres ikke. Der tilføjes kun en re-export af platformsvagten så wrapperen bruger samme sandhed.

## 4. Tracker-integration (`src/hooks/use-run-tracker.ts`)

- Ved `start()`/`armGps()` på iOS-native: brug `OrbitGeo` i stedet for `@capacitor/geolocation`-watcheren. Android og web beholder deres nuværende grene uændret.
- Hvert event fra pluginet føres ind i den eksisterende `handlePosition` — ingen ændring af distance-, pace-, split- eller HR-beregninger.
- Ved app-resume (`App` `appStateChange` → active) kaldes `drainSince(sidste kendte punkt-timestamp)` og de manglende punkter afspilles i rækkefølge gennem `handlePosition`, så ruten er komplet efter skærmlås.
- Ved `stop()`/`commitRun()`/`discardRun()`: `stopBackgroundTracking()` + `clearBuffer()`.

## 5. Dokumentation

- `docs/IOS_SETUP.md` opdateres med den nye kommando-rækkefølge og en liste over de native filer.

## Teknisk note

Pluginet lever i app-targettet (ikke som separat npm-pakke), fordi `ios/` genereres lokalt med `npx cap add ios` og ikke er checket ind. Derfor er `scripts/apply-ios-template.mjs` det eneste sted der skal køres efter `cap add ios`:

```text
npm install
npm run build:capacitor
npx cap add ios          # kun første gang
node scripts/apply-ios-template.mjs
npx cap sync ios
npx cap open ios
```

Alle ændringer ligger i repoet (Swift, ObjC-registrering, script, React-wrapper) og pushes med den normale Lovable → GitHub-sync.
