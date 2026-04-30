## Add expandable info boxes to settings rows

Mirror the Flight Recorder pattern on five additional settings: Audio cues, PR voice, Auto-pause, Haptic feedback, and Wind unit. Each row gets a small chevron next to the label that toggles a slide-down info box, while the rest of the row keeps its current toggle action.

### Behavior (matches Flight Recorder)

- Chevron sits inline next to the setting name (not on the far right).
- Tapping the chevron expands/collapses the info text only — `e.stopPropagation()` so it does not fire the row's toggle.
- Tapping the row itself still toggles the underlying setting.
- When the setting is toggled (via the row), the info box auto-reveals for 5 seconds, then collapses.
- Manual chevron tap cancels the auto-timer (same as Flight Recorder).
- Info box uses the same styling: `bg-white/[0.02]`, neon left border, status chip + body text, animated `grid-rows-[1fr]/[0fr]` transition.

### Files to edit

**`src/lib/i18n.tsx`** — add Danish + English info strings:

- `profile.audio.info` — "Vælg hvor ofte AI-coachen skal give dig lydopdateringer (f.eks. for hver kilometer eller 500 meter) om dit tempo og din puls."
- `profile.prVoice.info` — "Slå til for at få et lydsignal, når du sætter ny personlig rekord eller slår din Ghost Runner."
- `profile.autoPause.info` — "Sætter tiden på pause automatisk, hvis du stopper op (f.eks. ved et lyskryds), så din gennemsnitshastighed forbliver præcis."
- `profile.haptic.info` — "Mærk små, diskrete vibrationer (\"heartbeats\"), når du skifter pulszone, så du kan holde fokus uden at kigge på skærmen."
- `profile.windUnit.info` — "Vælg enheden for vindhastighed (meter pr. sekund m/s eller kilometer i timen km/t) til AI-vejranalysen."

English equivalents added in the `en` dictionary (translated counterparts of the above).

These descriptions are general (not state-dependent), so a single `*.info` key per setting — no `.on` / `.off` split.

### `src/routes/profile.tsx` — refactor

To avoid duplicating the same JSX five times, introduce a small local helper `SettingRowWithInfo` inside the file (or inline render) that takes:

- `icon`, `label`, `valueText`, `infoText`, `onToggle`

It encapsulates:

1. State refs for `open` + `autoOpen` + `timer` (one set per row, kept as small local state objects in the parent or via a tiny child component).
2. The clickable row with chevron-next-to-label and stopPropagation.
3. The animated info panel below.

Replace the existing buttons for Audio cues, PR voice, Auto-pause, Haptic, Wind unit with this component. Auto-pause already has a button — convert it to the same div-based row pattern used by Flight Recorder. Convert the existing Flight Recorder block to also use the new helper for consistency (its current inline implementation can be removed in favor of the shared component).

The "GPS" read-only row and the Language row are NOT changed (no info text requested for them).

### Technical notes

- `SettingRowWithInfo` is defined in the same file as a function component to keep the change localized.
- Each instance owns its own `useState` + `useRef` for timer, so multiple info boxes can be open independently and timers don't leak.
- Cleanup `useEffect` clears its own timeout on unmount.
- Keep accessibility: `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter/Space on the row; `aria-label="Toggle info"` on the chevron button.
- For the haptic row, the existing side-effect (vibrate on enable) stays inside the `onToggle` callback passed to the helper.

### Out of scope

- No changes to the underlying setting logic, storage, or other rows.
- No new dependencies.
