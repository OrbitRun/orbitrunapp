## Mål
Få `npx cap sync ios` → Xcode → build til at gå igennem uden SPM-fejl på `CapApp-SPM`. Færre plugins = færre version-konflikter.

## Hovedårsag
`CapApp-SPM`-fejlen i Xcode betyder at Swift Package Manager ikke kan løse plugin-grafen. Det sker typisk når:
- `node_modules` og `ios/` er bygget med blandede Capacitor-versioner (gammelt lockfile + ny `package.json`).
- Et plugin's `Package.swift` peger på en anden major af `capacitor-swift-pm` end den `@capacitor/ios` du har installeret.
- Du har 4 native plugins i spil (background-geolocation, bluetooth-le, geolocation, local-notifications, browser, app) — hver tilføjer en SPM-dependency der skal matche.

## Strategi: skære plugins og låse versioner

### 1. Drop `@capacitor-community/background-geolocation`
Den er stuck på 1.2.26 og er den oftest skyldige i SPM-konflikter. Ægte baggrunds-GPS kan opnås alene med `@capacitor/geolocation` + `UIBackgroundModes=location` + "Always"-permission — `watchPosition` med `enableHighAccuracy` fortsætter når skærmen låses, så længe Background Mode er sat.
- Slet `src/lib/background-geolocation.ts`.
- Fjern import + brug i `src/hooks/use-run-tracker.ts` (fald tilbage til `nativeWatchPosition`).
- Fjern fra `package.json` og `docs/IOS_SETUP.md §1`.

### 2. Lås ALLE Capacitor-pakker til samme major
Behold Capacitor 8.x (du er der allerede), men gør hver pakke til den nyeste 8.x patch og fjern `^` så lockfilen ikke driver:
```
@capacitor/core         8.3.3
@capacitor/ios          8.3.3
@capacitor/cli          8.3.3   (devDep)
@capacitor/app          8.1.0
@capacitor/browser      8.0.3
@capacitor/geolocation  8.2.0
@capacitor/local-notifications 8.1.0
@capacitor-community/bluetooth-le 8.1.3
```
Disse er allerede i `package.json` — men `package-lock.json` på din Mac er sandsynligvis stadig fra en tidligere version. Planen indeholder en ren-install kommando.

### 3. Gør `ios/`-mappen genskabelig
Tilføj `ios/` til `.gitignore` (hvis den ikke er der) og dokumentér at den ALTID skal slettes og genskabes ved plugin-ændringer. Det fjerner stale SPM-cache som er hovedårsagen til `CapApp-SPM` fejl.

### 4. Tilføj `ios/App/App/Info.plist`-template som fil i repo
I dag findes Info.plist-blokken kun i markdown. Læg en færdig `templates/Info.plist` i repo'et + et lille script `scripts/apply-ios-template.mjs` som efter `npx cap add ios` kopierer template'en ind i `ios/App/App/Info.plist`. Så er GPS/Spotify/Health-permissions garanteret rigtige hver gang.

### 5. Opdatér `docs/IOS_SETUP.md` med den nye, kortere opskrift
Én blok med præcis kommando-rækkefølge:
```
rm -rf node_modules package-lock.json ios
npm install
npm run build
npx cap add ios
node scripts/apply-ios-template.mjs   # injicerer Info.plist
npx cap sync ios
npx cap open ios
```

## Filer der ændres
- `package.json` — fjern `@capacitor-community/background-geolocation`.
- `src/lib/background-geolocation.ts` — slet.
- `src/hooks/use-run-tracker.ts` — fjern import + brug; brug kun `nativeWatchPosition`.
- `capacitor.config.ts` — uændret.
- `docs/IOS_SETUP.md` — opskrift forenklet, plugin-listen forkortet.
- `templates/Info.plist` — ny fil.
- `scripts/apply-ios-template.mjs` — ny fil.
- `.gitignore` — tilføj `ios/` hvis manglende.

## Effekt
- SPM skal kun løse 6 plugins i stedet for 7, alle på Capacitor 8.x.
- Genskabelig `ios/`-mappe + automatisk Info.plist eliminerer de to hyppigste fejlkilder.
- Baggrunds-GPS bevares via `@capacitor/geolocation` + `UIBackgroundModes`.

## Spørgsmål før jeg bygger
Er det OK at fjerne `@capacitor-community/background-geolocation`? Hvis du absolut skal have lock-screen tracking med vedvarende notifikation (ikke bare watchPosition i baggrunden), så beholder vi den og prøver at debugge SPM på en anden måde i stedet.