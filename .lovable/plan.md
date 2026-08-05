# Hærdning af OrbitGeo baggrunds-GPS

Alle fire fejl rettes i `templates/ios/OrbitGeo.swift`, med tilsvarende opdatering af TypeScript-wrapperen `src/lib/orbit-geo.ts` og løbe-trackeren, så JavaScript kender forskel på "Ved brug" og "Altid".

## 1. Præcis permission-status

`authString()` returnerer fremover `always`, `whenInUse`, `denied` eller `prompt` i stedet for at slå de to godkendte tilstande sammen til `granted`.

TypeScript-typen bliver:

```ts
type OrbitGeoAuth = "always" | "whenInUse" | "denied" | "prompt";
```

`requestOrbitGeoPermission()` returnerer den samme værdi videre, så kaldere kan skelne. Kald der i dag tjekker `=== "granted"` opdateres til at acceptere `always`/`whenInUse` efter behov.

## 2. requestPermissions venter på svaret

`requestPermissions` gemmer nu kaldet (`permissionCall` + `keepAlive(true)`) i to tilfælde: ved `.notDetermined` (WhenInUse-prompt) og ved `.authorizedWhenInUse` når `always` er ønsket (Always-prompt). Kun `locationManagerDidChangeAuthorization` afslutter kaldet, og først når status ikke længere er `.notDetermined` eller en afventende Always-opgradering. Der sendes fortsat et `orbitAuthChange`-event.

Der tilføjes en sikkerheds-timeout (ca. 20 sek.), så promiset aldrig hænger hvis iOS ikke viser prompten.

## 3. getCurrentPosition venter på et rigtigt fix

Ny `currentPositionCall`. Cachet position bruges kun hvis `horizontalAccuracy >= 0` og den er under 15 sekunder gammel. Ellers gemmes kaldet, `requestLocation()` kaldes, og kaldet afsluttes i `didUpdateLocations` med det mest præcise fix — eller afvises i `didFailWithError`. Der tilføjes også en timeout (ca. 15 sek.) med `reject`, så kortet ikke venter i det uendelige.

## 4. Ingen dobbelte punkter

`retainUntilConsumed: true` fjernes fra `notifyListeners("orbitLocation", ...)`. Bufferen er dermed den eneste autoritative kilde til punkter, JavaScript gik glip af. I `use-run-tracker.ts` tilføjes desuden en dedupe-vagt: et punkt hvis timestamp ikke er nyere end sidste behandlede fix ignoreres, uanset om det kom fra listener eller drain.

## 5. Bedre buffer

- Persistér hvert 25. punkt i stedet for hvert 5.
- `stop()` kalder altid `persistBuffer()` før den svarer, så de sidste fixes ikke går tabt.
- Nyt `acknowledge({ through: timestamp })` som fjerner alle punkter til og med det timestamp og persisterer med det samme. `drain()` accepterer valgfrit `acknowledgeThrough` og gør det samme i ét kald.
- `use-run-tracker.ts` kvitterer efter hver vellykket drain, så bufferen ikke vokser med allerede behandlede punkter.
- Ringbuffer-loftet på 20.000 bevares som sidste værn.

## 6. Filtrering og rækkefølge af fixes

I `didUpdateLocations` sorteres batchen efter timestamp, og punkter frasorteres hvis `horizontalAccuracy < 0`, `> 100 m`, eller fixet er ældre end 30 sekunder. Fixes mellem 50 og 100 m markeres med `lowQuality: true` i punktet, så UI'et kan vise GPS-status uden at bruge dem til distanceberegning; trackeren springer `lowQuality`-punkter over i distancesummen, men opdaterer signal-indikatoren.

## 7. start() kræver korrekt tilladelse

`start()` afviser ikke længere stumt, men returnerer en struktureret status:

```swift
call.resolve(["started": false, "requiresAlwaysPermission": true])
```

når status ikke er `.authorizedAlways`. Ved `.denied`/`.restricted` returneres `["started": false, "denied": true]`. Kun ved `.authorizedAlways` sættes `allowsBackgroundLocationUpdates` og `startUpdatingLocation()` køres.

`startBackgroundTracking()` i wrapperen returnerer objektet videre. Trackeren starter stadig løbet ved `whenInUse` (forgrunds-tracking virker), men sætter en tilstand som UI'et bruger til at vise en kort besked om at Lokalitet skal sættes til "Altid" i Indstillinger, med en knap der åbner appens indstillinger via `App.openUrl("app-settings:")`.

## Berørte filer

- `templates/ios/OrbitGeo.swift` — alle native ændringer
- `src/lib/orbit-geo.ts` — typer, `acknowledge`, ny `start`-returtype
- `src/hooks/use-run-tracker.ts` — dedupe, acknowledge efter drain, always-permission-tilstand
- Løbe-UI (GPS-status/knap) — besked om "Altid"-tilladelse
- `docs/IOS_SETUP.md` — kort note om det nye permission-krav
