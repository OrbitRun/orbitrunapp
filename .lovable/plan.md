## Mål
Hurtigere og mere præcist GPS-fix når brugeren åbner appen og trykker Start, uden at vente på første satellitlås.

## Kontekst
- GPS bruger browser Geolocation API (`navigator.geolocation`) — Capacitor Geolocation-pluginet er ikke installeret.
  - `kCLLocationAccuracyBestForNavigation` / `PRIORITY_HIGH_ACCURACY` findes ikke som direkte web-API; det tilsvarende er `enableHighAccuracy: true` (allerede sat).
  - Baggrunds-permission kræver Capacitor-plugin og iOS-konfiguration; web kan kun varme GPS når app er åben.
- Eksisterende: `armGps()` startes ved tryk på Start (under nedtælling), og der findes allerede et accuracy-gate (>20 m afvises) og et 3 m bevægelses-floor.

## Ændringer

### 1. `src/hooks/use-run-tracker.ts` — varm GPS + signal-status
- Tilføj `gpsAccuracyM: number | null` og `gpsReady: boolean` til `State`/`initial`.
- I `handlePosition`: opdatér altid `gpsAccuracyM = pos.coords.accuracy`, sæt `gpsReady = acc <= 20` (selv før run starter — så indikatoren forsvinder af sig selv).
- I `armGps`:
  - Behold `enableHighAccuracy: true`, `maximumAge: 0`, `timeout: 5000`.
  - Tilføj et `getCurrentPosition`-kald lige før `watchPosition` for at trigge et straks-fix (giver hurtigere første callback på iOS Safari).
- Eksportér ny funktion `warmGps()` (alias til `armGps` men idempotent og uden side-effekter på state).
- Bevarer 3 m noise-floor men hæver standardværdien til `Math.max(5, acc * 0.4)` så vi følger ønsket om 5–10 m distance-filter uden at miste præcision i dårlige forhold.

### 2. App-bootstrap — varm GPS når appen åbnes
- I `src/routes/index.tsx` (eller `__root.tsx` hvis vi vil have det globalt):
  - Tilføj `useEffect` der kalder `t.warmGps()` ved mount, så watchPosition kører i baggrunden mens brugeren browser. Kun hvis permission allerede er givet (brug `navigator.permissions.query({name:"geolocation"})` for at undgå at trigge en prompt før brugeren forventer det). Hvis state er `"prompt"`: spring over (vi vil ikke spørge utilsigtet).
  - Cleanup i `armGps`/`reset`-flow eksisterer allerede; ingen ny cleanup nødvendig — watch fortsætter til run-stop.

### 3. "Finder signal…" UI
- Ny lille komponent `src/components/GpsSignalChip.tsx` (eller inline i `FocusRunView`/index): viser pulserende prik + tekst når `gpsReady === false` og status er `running` eller `counting`.
  - Tekst: i18n nøgle `gps.searching` ("Finder signal…" / "Finding signal…").
  - Når `gpsReady` bliver true: chip fader ud automatisk; valgfri kort haptisk bekræftelse (genbrug `haptic(15)`).
- Brugeren skal stadig kunne starte med det samme — ingen ændring til Start-knappens enabled-state. Chippen er rent informativ.
- Vises ovenpå kort/stat-tiles i `src/routes/index.tsx` mens `counting || (status === "running" && !gpsReady)`.

### 4. i18n — `src/lib/i18n.tsx`
Tilføj DA + EN:
- `gps.searching` — "Finder signal…" / "Finding signal…"
- `gps.locked` — "GPS klar" / "GPS ready" (kort toast/aria)

## Tekniske noter
- Ingen native plugin-installation. Hvis brugeren senere ønsker rigtig baggrunds-tracking + iOS `kCLLocationAccuracyBestForNavigation`, kræver det `@capacitor/geolocation` + iOS Info.plist-ændringer (`NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes: location`) — det er en separat opgave og bør være sit eget plan.
- Permissions API er ikke i Safari iOS før 16; fall back: hvis `navigator.permissions` mangler, springer vi pre-warm over (samme adfærd som i dag).
- `gpsAccuracyM` opdateres på hver fix og kan også genbruges til at vise nøjagtighed i meter i UI senere.

## Filer
- redigér: `src/hooks/use-run-tracker.ts`, `src/routes/index.tsx`, `src/lib/i18n.tsx`
- ny: `src/components/GpsSignalChip.tsx`
