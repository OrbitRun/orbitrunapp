# Native iOS baggrunds-GPS — revideret plan

Kun baggrunds-GPS ændres. Ingen UI-, keyboard-, CSS-, navigations- eller dialogfiler berøres.

## Filer der må ændres

- `templates/ios/OrbitGeo.swift`
- `src/lib/orbit-geo.ts`
- `src/hooks/use-run-tracker.ts` (kun integration)
- `scripts/apply-ios-template.mjs`
- `templates/Info.plist` (kun verifikation af `UIBackgroundModes` = `location`)

## Sådan virker det

Et lille native lag på iOS holder GPS i gang, også når skærmen er slukket eller appen er i baggrunden. Punkterne gemmes løbende på disk, så de kan spilles tilbage til appen, når den vågner igen. Bufferen er crash-resistent efter bedste evne — men absolut tabsfrihed kan ikke garanteres ved OS-terminering, hardware- eller GPS-udfald.

## Rækkefølger (obligatoriske)

**Første start på et løb**
1. Registrér alle JS-listeners (position, error, appStateChange).
2. `flush()` → replay af eventuelle efterladte punkter fra den aktuelle session.
3. `acknowledge({ throughSequence })`.
4. `start({ sessionId })`.

Der kaldes aldrig `start()` før første `flush()`.

**Resume (app bliver aktiv igen)**
1. Sæt live-levering i kø-tilstand: indkomne live-events bufferes i JS, ikke leveret direkte.
2. `flush()` henter de persisterede baggrundspunkter.
3. Replay-punkter + kø slås sammen, sorteres på `sequence` og dedupliceres på `sequence`.
4. Samlet sæt leveres til run-trackeren.
5. `acknowledge({ throughSequence })`, hvorefter direkte live-levering genoptages.

**Stop**
1. `flush()`
2. replay af resterende punkter
3. `acknowledge({ throughSequence })`
4. `stop()` + idempotent fjernelse af app-listener og alle plugin-listeners, så et nyt løb aldrig får dobbelte callbacks.

## Punktformat og buffer

Hvert punkt bærer:
- `sessionId` (sat ved `start`)
- `sequence` — persisteret, monotont stigende tæller (overlever app-genstart)
- `timestamp`, `latitude`, `longitude`, `accuracy`, `altitude`, `speed`, `heading`

Regler:
- `flush()` returnerer **kun** punkter fra det aktuelle løbs `sessionId`; punkter fra ældre sessioner kasseres.
- `acknowledge({ throughSequence })` sletter kun punkter til og med det angivne sequence-nummer. Ingen automatisk rydning ved `didBecomeActive`.
- Deduplikering sker på `sequence` (ikke timestamp), sortering på `sequence`.
- Ringbuffer på disk (JSON, ~20.000 punkter) skrives batchvist for at begrænse I/O.

## Tilladelser

- `requestPermissions()` afventer `locationManagerDidChangeAuthorization`-callbacket, før det resolver — ingen gætværk på status.
- Tracking starter ved både `authorizedWhenInUse` og `authorizedAlways`.
- Opgradering til Always håndteres som et separat, valgfrit trin og blokerer ikke start.

## Teknisk

- Swift-plugin skrevet mod projektets Capacitor-version: `CAPPlugin` + `CAPBridgedPlugin` med `identifier`, `jsName = "OrbitGeo"` og `pluginMethods` (`start`, `stop`, `flush`, `acknowledge`, `checkPermissions`, `requestPermissions`).
- `CLLocationManager` med `kCLLocationAccuracyBestForNavigation`, `allowsBackgroundLocationUpdates = true`, `pausesLocationUpdatesAutomatically = false`.
- JS-gate: `Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("OrbitGeo")`; ellers eksisterende `@capacitor/geolocation`-sti uændret.
- `scripts/apply-ios-template.mjs` registrerer `OrbitGeo.swift` idempotent i `project.pbxproj` og verificerer, at den genererede iOS `Info.plist` indeholder `UIBackgroundModes` med `location`. Ingen omtale eller kontrol af background-modes-entitlement.
- Løbeberegninger (distance, pace, splits) ændres ikke.

## Leverance

Vis `git diff --name-only` og fuld diff før publicering. Ét commit: `Add native iOS background GPS only`.
