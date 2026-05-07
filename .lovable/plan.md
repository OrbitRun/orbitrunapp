# Færdiggør iOS-broen til fysisk Xcode-test

Målet er at gøre Orbit Run klar til at køre på en rigtig iPhone via Capacitor + Xcode, så Apple Health er den primære datakilde, Spotify starter automatisk på iPhonen, og Settings viser hvilke andre kilder der kommer.

---

## 1. Apple HealthKit "warm-up" (udvidede rettigheder)

I dag spørger `requestHeartRatePermission()` kun om HR, hvile-puls og HRV. Vi udvider den til også at dække skridt og løbe-aktiviteter, og prompter brugeren med det samme i onboarding (ikke først efter første kørsel).

**`src/lib/health.ts`**
- Omdøb internt til `requestHealthPermissions()` (behold `requestHeartRatePermission` som alias for bagudkompatibilitet) og udvid `read`-listen:
  - `HKQuantityTypeIdentifierHeartRate`
  - `HKQuantityTypeIdentifierRestingHeartRate`
  - `HKQuantityTypeIdentifierHeartRateVariabilitySDNN`
  - `HKQuantityTypeIdentifierStepCount`
  - `HKQuantityTypeIdentifierDistanceWalkingRunning`
  - `HKQuantityTypeIdentifierActiveEnergyBurned`
  - `HKWorkoutTypeIdentifier` (løbe-/gå-workouts)
- Tilføj små helpers `getTodaySteps()` og `getRecentRunningWorkouts(days)` (læser via `queryHKitSampleType`) — bruges senere, men eksporteres allerede nu så datakilden er klar.

**`src/components/CoachOnboarding.tsx`**
- I sidste onboarding-step: hvis `isHealthAvailable()` er sand, vis HealthKit-prompten automatisk (genbrug `HealthPermissionSheet` eller kald `requestHealthPermissions()` direkte ved "Færdig").
- Efter `granted`: kald `syncVitalsFromHealth()` straks så Dagens Form har data fra første sekund.

**`src/components/HealthPermissionSheet.tsx`**
- Opdater teksten så den nævner: puls, hvile-puls, HRV, skridt og løbe-aktiviteter.

---

## 2. Spotify "Active Device" verifikation

`MusicHub` har allerede en auto-wake (linje 46-65) og `startActivePlaylist` (linje 117-140) der finder første device hvis intet er aktivt. Vi forstærker den så START-knappen 100% pålideligt vækker iPhonen:

**`src/components/MusicHub.tsx`**
- I `startActivePlaylist`: efter `transferPlayback(deviceId, false)` poll `getDevices()` op til 3× med 200 ms mellemrum indtil `is_active === true` før vi kalder `playContext`. Forhindrer race condition hvor Spotify endnu ikke har registreret transferren.
- Hvis intet device dukker op efter retry, vis toast med en handling: "Åbn Spotify én gang for at vække enheden".

**`src/lib/spotify.ts`** (kun hvis nødvendigt)
- Tilføj `waitForActiveDevice(timeoutMs = 800)` helper som indkapsler poll-logikken, så `MusicHub` forbliver læseligt.

**`orbit:run-start` event**
- Verificér at `useRunTracker` dispatcher `orbit:run-start` *før* GPS-kaldet (så musikken starter samtidig). Hvis rækkefølgen er omvendt i dag, byttes den om.

---

## 3. "Kommer snart"-integrationer i Settings

Tilføj en ny sektion på `/profile` som viser at appen vokser, men endnu kun har Apple Health + Spotify aktive.

**Ny komponent `src/components/IntegrationsSection.tsx`**
- Kort med titel "Integrationer".
- Liste med 4 rækker:
  1. **Apple Health** — aktiv, grønt check-ikon, undertekst "Tilsluttet" / "Tryk for at give adgang".
  2. **Garmin Connect** — disabled, gråtonet, badge "Kommer snart".
  3. **Strava** — disabled, gråtonet, badge "Kommer snart".
  4. **Fitbit** — disabled, gråtonet, badge "Kommer snart".
- Brug eksisterende design tokens (`bg-white/5`, `text-muted-foreground`, neon-accent for aktiv).

**`src/routes/profile.tsx`**
- Mount `<IntegrationsSection />` lige under "Min Profil"-blokken.

**`src/lib/i18n.tsx`**
- Nye nøgler: `integrations.title`, `integrations.comingSoon`, `integrations.connected`, `integrations.appleHealth`, `integrations.garmin`, `integrations.strava`, `integrations.fitbit` (DA + EN).

---

## 4. Xcode / Capacitor eksport-klargøring

Der er endnu ingen `ios/`-mappe i projektet (forventet — Capacitor-platforme genereres lokalt af brugeren, ikke i Cloudflare-bundlet). Vi opdaterer derfor *opskriften* så `npx cap add ios` + `npx cap sync ios` producerer en korrekt Info.plist første gang, og brugeren slipper for manuelle Xcode-rettelser.

**`docs/IOS_SETUP.md`** (opdater)
- Udvid Info.plist-snippet med alle nye Purpose Strings:
  - `NSHealthShareUsageDescription` (udvid: nævner puls, hvile-puls, HRV, skridt, løb)
  - `NSHealthUpdateUsageDescription` (tom-ish — kun hvis vi senere skriver workouts tilbage)
  - `NSMotionUsageDescription` ("Orbit bruger bevægelsessensorer til at forbedre skridttælling og kadence.")
  - Eksisterende GPS- og Bluetooth-keys uændrede.
- Tilføj kort sektion "Endelig eksport-tjekliste" med præcis sekvens:
  ```text
  bun install
  bun run build         # producerer dist/client (matcher webDir)
  npx cap add ios       # første gang
  npx cap sync ios      # hver gang web ændres
  npx cap open ios      # åbn i Xcode → Archive → TestFlight
  ```

**`capacitor.config.ts`**
- Tilføj kommentar-blok øverst med samme tjekliste, så fremtidige agents ikke gætter.
- Tilføj `server: { iosScheme: "https" }` (forbedrer cookie/CORS-adfærd for Spotify OAuth callback inde i Capacitor WebView). Kun hvis det ikke bryder eksisterende setup — verificér først med Spotify redirect URI.

> Note: Selve `npm run build` køres automatisk af Lovable build-pipelinen, så jeg behøver ikke køre den manuelt — men jeg verificérer at build-output stadig er i `dist/client` (matcher `webDir`).

---

## Filer der røres

- `src/lib/health.ts` (udvidede rettigheder + helpers)
- `src/components/HealthPermissionSheet.tsx` (tekst)
- `src/components/CoachOnboarding.tsx` (auto-prompt sidste step)
- `src/components/MusicHub.tsx` (poll for active device)
- `src/lib/spotify.ts` (`waitForActiveDevice` helper)
- `src/components/IntegrationsSection.tsx` *(ny)*
- `src/routes/profile.tsx` (mount sektion)
- `src/lib/i18n.tsx` (nye nøgler DA/EN)
- `docs/IOS_SETUP.md` (Purpose Strings + tjekliste)
- `capacitor.config.ts` (kommentar + evt. iosScheme)

## Ud af scope

- Faktisk Garmin/Strava/Fitbit OAuth-implementering (kun placeholder).
- Skrivning af workouts tilbage til HealthKit (kun læseadgang nu).
- Generering af `ios/`-mappen (sker lokalt hos dig via `npx cap add ios`).
