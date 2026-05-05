## Mål
Udvid Orbit Coach setup-flowet med flere profil-spørgsmål, en personlig afslutningsskærm med "tænker"-animation, og lad svarene faktisk modificere de første 2 ugers træningsplan (deload hvis skader/lavt volumen).

## 1. Datamodel — `src/lib/user-profile.ts`

Tilføj nye typer:
```ts
export type WeeklyVolume = "0" | "0-10" | "10-25" | "25+";
export type Experience = "beginner" | "recreational" | "experienced";
export type InjuryStatus = "none" | "past" | "current";
export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
```

Udvid `CoachConfig`:
```ts
export type CoachConfig = {
  level: CoachLevel;
  frequency: CoachFrequency;
  goal: CoachGoal;
  fasterDistance?: FasterDistance;
  weeklyVolume?: WeeklyVolume;
  experience?: Experience;
  sleepQuality?: 1|2|3|4|5;
  stressLevel?: 1|2|3|4|5;
  injuryStatus?: InjuryStatus;
  preferredDays?: WeekDay[];
  configuredAt: number;
};
```

Tilføj label-helpers (DA/EN) for hver ny enum.

## 2. Onboarding-flow — `src/components/CoachOnboarding.tsx`

Udvid `steps`-arrayet (med dynamisk fasterDistance-indsætning bevaret):
`level → frequency → goal → [fasterDistance] → weeklyVolume → experience → lifestyle (sleep+stress kombineret) → injury → preferredDays → summary`

State for hvert nyt felt + persist i samme `RESUME_KEY`.

Step-UI'er:
- **weeklyVolume**: 4 buttons (0 km, 0–10, 10–25, 25+).
- **experience**: 3 buttons (Nybegynder / Motionist / Erfaren).
- **lifestyle**: To 1–5 segmenterede skalaer (Søvnkvalitet, Stressniveau) på samme step — store tap-targets.
- **injury**: 3 buttons (Ingen / Tidligere / Aktuelle). Hvis "current" vises advarsel om at konsultere læge.
- **preferredDays**: 7 dag-toggles (multi-select), min. 1 valgt for at gå videre.
- **summary** (afslutningsskærm, ikke en spørgsmålsside): se §3.

Gem alt i `coach` på `finish()`. Behold eksisterende reset-baseline-logik (configuredAt nulstilles ved ændringer).

## 3. Afslutningsskærm med "thinking"

Sidste step rendrer en ny komponent (inline eller `CoachThinking.tsx`):
1. **Fase A (3 sek)**: Stort Sparkles/Orbit-ikon med pulsanimation (Tailwind `animate-pulse` + custom skala/glow), tekst "Analyserer din profil…". Brug `setTimeout` 3000ms.
2. **Fase B**: 
   - Tekst: *"Tak! Jeg har nu analyseret din profil, din skadeshistorik og dit nuværende niveau."*
   - Mål-preview-card: *"Jeg er nu klar til at hjælpe dig mod dit mål om {goal}."* — bruger `coachGoalLabel(goal, lang, fasterDistance)`.
   - Stor CTA-knap (neon, fuld bredde): **"GÅ TIL ORBIT COACH"** → `useNavigate()({ to: "/coach" })` + kald `onClose()`.

Afslutningsskærmen erstatter den nuværende "Save"-knap; `finish()` køres ved overgang fra spørgsmål-siden til Fase A.

## 4. Adaptiv plan — `src/lib/coach-plan.ts`

Udvid `getCoachPlan` så de første 2 uger justeres ud fra setup-svar:

```ts
export type WeekAdjustment = {
  weekIndex: number;       // 1 eller 2
  sessionMultiplier: number; // fx 0.5 = halvér distance
  intensityCap: "easy" | "moderate" | "any";
  note: string;            // forklaring til UI
};

export type CoachPlan = {
  totalWeeks: number;
  weeklySessions: number;
  milestones: Milestone[];
  earlyAdjustments: WeekAdjustment[];
};
```

Regler (additive — vælg den strengeste):
- `injuryStatus === "current"` → uge 1+2: multiplier 0.4, intensityCap "easy", note "Skånsom genoptræning".
- `injuryStatus === "past"` → uge 1: 0.6, "easy"; uge 2: 0.8, "moderate".
- `weeklyVolume === "0"` eller `experience === "beginner"` → uge 1: 0.5, "easy"; uge 2: 0.7, "easy".
- `weeklyVolume === "0-10"` → uge 1: 0.7, "easy"; uge 2: 0.85, "moderate".
- `(sleepQuality ≤ 2) || (stressLevel ≥ 4)` → cap intensitet til "moderate" begge uger og multiplier ×0.9.

`nextCoachSession` (i `user-profile.ts`) opdateres til at læse `getPlanProgress` → finde nuværende uge → anvende `WeekAdjustment` på distance/intervaller (km × multiplier afrundet, intervaller→easy hvis cap=="easy").

`CoachCard` viser `note` som lille badge (`mt-2 text-[10px] text-neon`) når der findes en aktiv adjustment i nuværende uge.

## 5. i18n nøgler (DA + EN)

Tilføj i `src/lib/i18n.tsx`:
- `coach.q.weeklyVolume`, `coach.q.experience`, `coach.q.lifestyle.sleep`, `coach.q.lifestyle.stress`, `coach.q.injury`, `coach.q.preferredDays`
- Option-labels for alle nye enums
- `coach.thinking.analyzing`, `coach.thinking.done`, `coach.thinking.goalPreview` (med `{goal}` param), `coach.thinking.cta`
- `coach.adjust.note.*` (deload, easyOnly, mv.)

## 6. Tekniske detaljer

- Onboarding scroll: `min-h-[220px]` område udvides til at håndtere lifestyle-step (to skalaer).
- `preferredDays` valid-check disabler "Næste" hvis 0 dage valgt.
- Navigation til `/coach`: importer `useNavigate` fra `@tanstack/react-router`. Kald før `onClose()` så modal lukker rent.
- Bagudkompatibilitet: alle nye `coach`-felter er optional → eksisterende brugere uden disse svar fortsætter uden adjustments (tomt `earlyAdjustments` array).
- Pulse-animation: brug eksisterende `shadow-neon` + `animate-pulse` på et 80×80 rounded-full element, evt. tilføj `@keyframes orbit-think` i `styles.css` (skala 1→1.15, opacity 0.6→1).

## Filer der ændres
- `src/lib/user-profile.ts` (typer + labels + `nextCoachSession` adjustment)
- `src/lib/coach-plan.ts` (earlyAdjustments)
- `src/components/CoachOnboarding.tsx` (5 nye steps + thinking screen)
- `src/components/CoachCard.tsx` (vis adjustment-note)
- `src/lib/i18n.tsx` (nye strenge DA/EN)
- `src/styles.css` (puls-keyframe — valgfrit)
