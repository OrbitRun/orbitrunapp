## Goal

Make Orbit Coach feel like the Målfremgang (GoalProgress) card: same neon visual language, with a tap-to-expand detail panel that explains today's session. Add a toggle in the profile so the coach can be disabled entirely.

## Changes

### 1. `src/components/CoachCard.tsx` — full redesign

Rewrite to mirror the GoalProgress visual structure (`glass rounded-2xl p-4`, neon icon tile, eyebrow + title row, neon CTA button, expandable detail block).

Layout:
- Header row: 9×9 neon icon tile (`Sparkles`), title `t("coach.cardTitle")`, eyebrow `t("coach.next")` (or "Setup needed" when unconfigured).
- Right side: small chip showing the level (e.g. `5–10 km`) styled like the `%` in GoalProgress but smaller.
- Big line: `nextCoachTask(profile, lang)` in `font-display font-black text-base tabular`.
- Hint row: `TargetIcon` + short context line (frequency + goal labels).
- Primary action button: `Sparkles` + `t("coach.detail.cta")` ("Show session" / "Vis pas") using the same neon style as GoalProgress' suggestion CTA. Toggles open/close.
- Expanded panel (when open): same `rounded-2xl border border-white/10 bg-white/5 p-4` block as GoalProgress' suggestion panel, containing:
  - Workout type badge (easy/long/tempo/intervals/walkRun) + on-track/intro chip.
  - Big line with the session (distance/intervals).
  - Description paragraph: a 2–3 sentence explanation of *why* this session and *how to run it* (warm-up, target effort, cool-down).
  - "Start session" button styled like GoalProgress' `Link to="/"`. Since CoachCard is already on `/`, this just closes the panel and scrolls to the start button (or simply closes — final behavior: close panel).

Unconfigured state: show the same card layout but the body says `t("coach.cta.unset")` and the action button label becomes `t("coach.setup")`. Tapping it opens `CoachOnboarding` (current behavior preserved only for unconfigured users).

Disabled state: when `profile.coachEnabled === false`, render nothing.

### 2. `src/lib/user-profile.ts` — extend coach data + helpers

- Add `coachEnabled?: boolean` to `UserProfile` (default `true` if a `coach` exists).
- Add `nextCoachSession(profile, lang)` returning a structured object:
  ```ts
  { type: "easy"|"long"|"tempo"|"intervals"|"walkRun"|"setup",
    title: string,        // e.g. "5 km roligt løb"
    summary: string,      // 1 short line
    description: string,  // 2–3 sentences explaining purpose + execution
    paceHint?: string }   // optional pace/effort guidance
  ```
  The existing `nextCoachTask` keeps working (compose it from the new helper's `title`).
- Localized descriptions for each workout type in both `en` and `da`, derived from level + goal so the text adapts (e.g. tempo run gets a different description than intervals).

### 3. `src/lib/i18n.tsx` — new strings

Add for `en` and `da`:
- `coach.detail.cta` ("Show session" / "Vis dagens pas")
- `coach.detail.hide` ("Hide" / "Skjul")
- `coach.setup` ("Set up coach" / "Konfigurer coach")
- `coach.enable` ("Orbit Coach" / "Orbit Coach") — row label
- `coach.enable.on` / `coach.enable.off` ("On" / "Off", "Til" / "Fra")
- `coach.session.purpose` headers and per-type descriptions:
  - `coach.desc.easy`, `coach.desc.long`, `coach.desc.tempo`, `coach.desc.intervals`, `coach.desc.walkRun`
- `coach.howTo.warmup`, `coach.howTo.cooldown` snippets used in descriptions.

### 4. `src/routes/profile.tsx` — add enable toggle

Just above the existing "Konfigurer Coach" row, add a new row in the same `divide-y` settings section:
- Icon: `Sparkles` (matching the configure row's style — outlined tile, not neon).
- Label: `t("coach.enable")`.
- Right: `t(profile.coachEnabled === false ? "coach.enable.off" : "coach.enable.on")`.
- onClick toggles `coachEnabled` via `update({ coachEnabled: !(profile.coachEnabled !== false) })`.

When the coach is disabled, the existing "Configure coach" row stays visible but is rendered with reduced opacity and is non-interactive (so users discover the toggle is what re-enables it).

### 5. `src/routes/index.tsx` — respect the toggle

Change the render guard so the card hides when disabled:
```tsx
{(t.status === "idle" || t.status === "finished") && profile.coachEnabled !== false && (
  <CoachCard profile={profile} />
)}
```

## Visual reference

The card will share these tokens with GoalProgress: `glass rounded-2xl p-4`, neon icon (`text-neon` on `bg-white/5`), `font-display font-black` headings, neon CTA (`bg-neon/10 border-neon/30 text-neon`), expanded detail block (`border border-white/10 bg-white/5`), workout-type chip in `bg-neon/15 text-neon`.

## Files touched

- `src/components/CoachCard.tsx` (rewrite)
- `src/lib/user-profile.ts` (add `coachEnabled`, add `nextCoachSession`)
- `src/lib/i18n.tsx` (new strings, en + da)
- `src/routes/profile.tsx` (new toggle row)
- `src/routes/index.tsx` (respect toggle)

No data migration needed — `coachEnabled` defaults to enabled when absent.