## Problem

Den native app spørger om GPS-tilladelse, men kortet viser stadig "Location permission denied" og der kommer ingen GPS-data.

Root cause er en **race-condition i tilladelsesflowet**:

På app-mount kalder tre forskellige steder næsten samtidig `requestNativeGeolocationPermission()`:
1. `useGpsWarmup()` i `src/routes/__root.tsx` (app-start warm-up).
2. `t.warmGps()` i `src/routes/index.tsx` (run-side warm-up → kalder `armGps()`).
3. `RunMap` mount-effect i `src/components/RunMap.tsx` (kort-marker).

På iOS viser `@capacitor/geolocation`'s `requestPermissions()` system-dialogen kun for det første kald. De konkurrerende kald resolver med `state: "prompt"` (eller `"prompt-with-rationale"`) før brugeren har svaret, fordi iOS-tilladelsesstatus stadig er pending. Vores helper mapper alt der ikke er `"granted"` til `"denied"`:

```ts
const state = res?.location ?? res?.coarseLocation ?? "denied";
return state === "granted" ? "granted" : "denied";
```

Det får `armGps()` (linje 578-580 i `use-run-tracker.ts`) til at sætte `permissionError = "Location permission denied."` selvom brugeren faktisk trykker Allow — fordi vores race-kald returnerede "prompt" → "denied", før det første kald havde set brugerens svar.

Resultatet: rød "Location permission denied" overlay på kortet og ingen GPS-watcher startes.

Ekstra problem: `requestPermissions({ permissions: ["location", "coarseLocation"] })` med argument er unødvendigt på iOS (plugin'et ignorerer arrayet og kalder altid `requestWhenInUseAuthorization`). På Android giver det heller ingen ekstra værdi her.

## Fix

### `src/lib/geolocation-native.ts`

1. **Deduplikér tilladelsesforespørgsler** med en modul-scopet in-flight promise, så samtidige kald deler ét resultat:
   ```ts
   let inflight: Promise<"granted" | "denied" | "prompt" | "unavailable"> | null;
   ```
2. **Brug `checkPermissions()` først**; hvis allerede `"granted"`, returnér med det samme uden at trigge en ny dialog.
3. **Kald `requestPermissions()` uden argument** (iOS plugin'et ignorerer det alligevel, og det fjerner usikkerhed omkring alias-håndteringen).
4. **Skel mellem "denied" og "prompt"** i returtypen. Tilføj en ny status `"prompt"` så callers kan vælge mellem "vis fejl" og "vent stille".
5. **`nativeGetCurrentPosition` / `nativeWatchPosition`**: hvis tilladelsen er `"prompt"`, prøv alligevel — selve fix-kaldet vil enten lykkes (brugeren har givet lov) eller fejle med en konkret error som callers kan håndtere.

### `src/hooks/use-gps-warmup.ts`

- Ignorér alt der ikke er `"granted"` stille (det er kun warm-up — vis aldrig fejl her).

### `src/hooks/use-run-tracker.ts` (`armGps`)

- Sæt KUN `permissionError = "Location permission denied."` når `requestNativeGeolocationPermission()` returnerer `"denied"` (eksplicit afslag).
- For `"prompt"` eller `"unavailable"`: fortsæt og forsøg `nativeGetCurrentPosition` + `nativeWatchPosition` alligevel; lad evt. error-callback fra plugin'et sætte den rigtige meddelelse.
- Ryd `permissionError` ved en succesfuld fix.

### `src/components/RunMap.tsx`

- Samme håndtering: behandl `"prompt"` som "prøv alligevel"; vis ikke fejl ved warm-up.

## Teknisk note

- Ingen ændringer i `Info.plist`, `capacitor.config.ts` eller native shell.
- Dedup-promisen ryddes når den resolver, så efterfølgende (faktiske) re-prompts efter brugeren har skiftet noget i Settings stadig virker.

## Filer

- `src/lib/geolocation-native.ts`
- `src/hooks/use-gps-warmup.ts`
- `src/hooks/use-run-tracker.ts`
- `src/components/RunMap.tsx`
