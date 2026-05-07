# Mere præcis Orbit Coach: vægt, højde, max-puls & RHR-sync

## 1. Datamodel (`src/lib/user-profile.ts`)

Udvid `CoachConfig` med tre valgfri felter:

- `weightKg?: number` (30–250)
- `heightCm?: number` (100–230)
- `maxHrKnown?: number` (120–230) — valgfri "kendt max-puls"

Behold `age` så fallback `220 - age` stadig virker når `maxHrKnown` mangler. Tilføj hjælper:

```ts
export function effectiveMaxHr(c?: CoachConfig): number | undefined {
  if (c?.maxHrKnown && c.maxHrKnown > 0) return c.maxHrKnown;
  if (c?.age && c.age > 0) return 220 - c.age;
  return undefined;
}
export function effectiveWeightKg(c?: CoachConfig): number | undefined {
  return c?.weightKg && c.weightKg > 0 ? c.weightKg : undefined;
}
```

## 2. Coach onboarding (`src/components/CoachOnboarding.tsx`)

Udvid det eksisterende **"bio"**-trin (alder/køn) med tre nye inputs i samme skærm — ingen ekstra steps for at holde flowet kort:

- Vægt (kg) — number input, valgfri
- Højde (cm) — number input, valgfri
- "Kender du din max-puls?" — number input, valgfri, med hint "Lader vi feltet stå tomt, bruger vi 220 − alder"

Persistér via samme `persist()` (parse + clamp), tilføj felterne til `ResumeState` og localStorage-resume.

## 3. Profilside (`src/routes/profile.tsx`)

Tilføj en ny **"Min Profil"**-sektion (lige under Premium Member Card eller før Orbit Coach), så brugeren let kan opdatere vægt løbende uden at gå gennem hele coach-onboardingen igen:

- Vægt (kg) — inline editor
- Højde (cm) — inline editor
- Max-puls (bpm) — inline editor + lille undertekst der viser den brugte værdi (kendt eller `220 − alder`)

Skriver direkte til `profile.coach` via `saveProfile`. Genberegn HR-zoner når max-puls eller alder ændres (samme mønster som eksisterende `defaultConfig(age, restingHr)` kald).

## 4. VO2-max & kalorie-beregning

**`src/lib/vo2max.ts`** — `estimateVo2Max` bruger allerede HRmax/RHR (Uth–Sørensen formel der er ml/kg/min uafhængig af vægt). Tilføj en variant der tager `coach`-config:

```ts
export function bestEstimateVo2MaxForUser(run, coach?: CoachConfig, restHr?: number)
```

…som bruger `effectiveMaxHr(coach)` i stedet for default 190 og videresender `restHr` (fra vitals/Health). Erstat eksisterende kald i `RunSummary`, `ReadinessPanel`, `bestVo2MaxFromRuns` med den nye signatur.

**`src/lib/stat-metrics.ts`** — fjern `DEFAULT_WEIGHT_KG = 70` som hardcoded, og lav `estimateCalories` parameteriseret:

```ts
function estimateCalories(s: LiveStats, weightKg = 70, gender?: Gender): number
```

MET-formlen ganges med `weightKg`. Køns-justering: ~5 % lavere for "female" (Harris–Benedict-inspireret korrigering for løb). Hent værdier via `loadProfile().coach` der hvor metric-tabellen instantieres (live-tracker + run summary).

## 5. Resting HR fra Apple Health / Garmin

**`src/lib/health.ts`** har allerede `getLatestRestingHeartRate()` og `syncVitalsFromHealth()`. Tilføj en auto-sync trigger:

- Ved app-start (i `src/routes/__root.tsx` eller en ny `useHealthAutoSync` hook): kald `syncVitalsFromHealth()` hvis `isHealthAvailable()` og permission allerede er granted, og skriv resultatet via `saveVitals({ restingHr, hrvMs })`.
- Kør igen efter et færdigt løb (lyt på `orbit:run-stop`).
- Resultatet føder allerede ind i `readiness-engine.ts` der laver "Dagens Form".

For Garmin: ingen native plugin tilgængelig endnu — vi støtter dem indirekte ved at Garmin-brugere typisk synkroniserer til Apple Health. Tilføj en kort UI-note i `HealthPermissionSheet` om at Garmin-data kommer ind via Apple Health → Connect-app.

## 6. i18n (`src/lib/i18n.tsx`)

Nye nøgler (en + da):

- `coach.q.weight`, `coach.q.height`, `coach.q.maxHr`, `coach.q.maxHr.hint`
- `profile.section.myProfile`, `profile.weight`, `profile.height`, `profile.maxHr`, `profile.maxHr.derived`

## Tekniske noter

- Alle nye felter er valgfri — brugere som springer dem over får uændret default-adfærd (70 kg, 220−alder).
- Vægt gemmes kun i `coach.weightKg` (ikke ny kolonne) for at undgå migrering — `loadProfile` returnerer eksisterende profiler uændret.
- HR-zoner opdateres reaktivt når `effectiveMaxHr` ændres (genbrug `defaultConfig`).
- Ingen DB-ændringer; alt lever i localStorage som resten af profilen.

## Filer der røres

- `src/lib/user-profile.ts` (edit)
- `src/components/CoachOnboarding.tsx` (edit — udvid bio-step)
- `src/routes/profile.tsx` (edit — ny "Min Profil" sektion)
- `src/lib/vo2max.ts` (edit — accepter coach + restHr)
- `src/lib/stat-metrics.ts` (edit — vægt/køn-aware kalorier)
- `src/lib/health.ts` (lille tilføjelse — auto-sync helper)
- `src/routes/__root.tsx` eller ny `src/hooks/use-health-auto-sync.ts` (auto-sync på mount + run-stop)
- `src/components/HealthPermissionSheet.tsx` (Garmin-note)
- `src/lib/i18n.tsx` (nye nøgler)
