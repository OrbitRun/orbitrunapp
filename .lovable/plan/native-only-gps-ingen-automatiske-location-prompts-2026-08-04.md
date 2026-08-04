# Native-only GPS + ingen automatiske location-prompts

Mål: på iOS/Android bruges udelukkende Capacitor-plugin'et til position, og appen beder først om lokation når brugeren aktivt starter et løb eller trykker på GPS-knappen i kortet. Ingen `localhost would like to use your current location`-dialog i TestFlight.

## 1. Central platformsvagt (`src/lib/geolocation-native.ts`)

- Eksportér `isWebPlatform()` (`Capacitor.getPlatform() === "web"`) så alle andre filer kan gate på den ene sandhed.
- Filen har allerede korrekt native/web-opdeling internt; ingen adfærdsændring her.

## 2. `src/hooks/use-run-tracker.ts`

- Al brug af `navigator.geolocation` (single-shot, `watchPosition`, `clearWatch` i `stop()` og i unmount-cleanup) pakkes ind i `isWebPlatform()`.
- Native-grenen i `armGps` er allerede korrekt og bevares uændret.
- `warmGps()` fjernes som auto-warmup: den beholdes kun som en no-op/eksplicit funktion der intet gør uden brugerhandling, så ingen permission-prompt sker ved mount.
- Løbeberegninger (distance, pace, splits, HR) røres ikke.

## 3. `src/routes/index.tsx`

- Fjern `useEffect(() => t.warmGps(), [])` ved mount.
- `t.armGps()` bliver først kaldt i `beginCountdown()` (brugerens Start-tryk) — uændret.

## 4. `src/routes/__root.tsx` + `src/hooks/use-gps-warmup.ts`

- Fjern `useGpsWarmup()`-kaldet og importen fra root.
- Slet `src/hooks/use-gps-warmup.ts` — der er ingen automatisk permission request ved app-start længere.

## 5. `src/components/RunMap.tsx`

- Kortet henter ikke længere position automatisk ved mount. Ved start vises kort centreret på sidste cachede position (`orbit.lastUserLoc`) eller default.
- Positionshentning flyttes til en eksplicit brugerhandling: en lille "find min position"-knap på kortet (locate-ikon) kører den eksisterende logik.
- Inde i den logik gates web-grenen med `isWebPlatform()`; native bruger `requestNativeGeolocationPermission()` + `nativeGetCurrentPosition()`/`nativeWatchPosition()` — aldrig `navigator`.
- `clearWatch`-cleanup gates ligeledes på web.
- Når et løb er i gang (points > 0) tegner kortet som før fra trackerens punkter.

## 6. `src/hooks/use-current-env.ts`

- Vejr/miljø-fallbacket må aldrig trigge en prompt: `navigator.geolocation`-grenen gates til web-platform.
- På native bruges kun sidste kendte punkt fra gemte løb; findes intet, springes env-hentning over (ingen prompt).

## Teknisk note

Efter ændringen findes `navigator.geolocation` kun bag en `isWebPlatform()`-kontrol i hele `src/`. Det verificeres med en søgning før afslutning.
