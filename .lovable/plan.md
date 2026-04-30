## Goal
Reposition the chevron in the Flight Recorder row in `src/routes/profile.tsx` so it sits right next to the "Flight Recorder" label (instead of on the far right), while preserving:
- Tapping the row body still toggles the recorder on/off.
- Toggling on/off still auto-reveals the info box for 5 seconds.
- Tapping the chevron still manually opens/closes the info box (and cancels the auto-close timer).

## Changes (single file)

**`src/routes/profile.tsx` — Flight Recorder row only**

Restructure the row so the chevron is inline with the title:

```text
[icon] Flight Recorder ⌄        On
└─ toggles info ──┘   └─ toggles recorder ──┘
```

- Outer container stays a flex row (no longer needs to wrap a button + button).
- Left side: icon + title + small chevron button grouped together. The chevron stays a separate `<button>` so its tap target doesn't toggle the recorder.
- Clicking anywhere else on the row (icon, title text area, status label on the right) calls `handleToggleFlightRecorder` (recorder on/off + 5s auto-reveal).
- Chevron button keeps its current behavior: cancels the auto-close timer and flips `flightInfoOpen`.
- Use `e.stopPropagation()` on the chevron's `onClick` so it doesn't also fire the row's toggle.
- Rotation animation on the chevron (`rotate-180` when open) is preserved.

Everything else in the section (info box markup, animation, translations, state, refs, cleanup effect) stays exactly as it is.

## Out of scope
- No changes to `flight-recorder.ts`, `use-recover-run.ts`, `RecoverRunBanner.tsx`, i18n strings, or the user profile model.
- No visual changes to the info box itself or to neighboring rows (Auto-pause, Haptic, etc.).
