# Onboarding keyboard + global iOS shell positioning

Two isolated UI corrections. No GPS, tracking, Capacitor, native, dialog, or navigation changes.

## 1. Onboarding keyboard

`src/components/Onboarding.tsx` line 66 has `autoFocus` on the name input. That is the only auto-focus in the onboarding flow (no `.focus()` or timer-based focus calls exist there).

- Remove `autoFocus`. Nothing else changes; the keyboard then only opens when the user taps the field.

## 2. Global vertical positioning / overscroll

Today each route applies its own top safe-area padding (`pt-[max(env(safe-area-inset-top),1rem)]` in `index.tsx`, `profile.tsx`, `coach.tsx`, `history.tsx`, `run.$id.tsx`, `profile_.heart-rate.tsx`, `RunSummary.tsx`), and the document itself is the scroller, so the whole page rubber-bands on iOS.

Change to a single app-shell scroller:

- `src/styles.css`: give `html, body` a fixed full height with `overflow: hidden` (document can no longer rubber-band), keeping the existing `overscroll-behavior: none`.
- `src/routes/__root.tsx`: the existing shell wrapper (`<div className="min-h-screen pb-24 mb-[30px]">`) becomes the single scroll container — full viewport height, `overflow-y: auto`, `overscroll-behavior-y: contain`, and `padding-top: env(safe-area-inset-top)` applied exactly once here.
- Remove the per-route `pt-[max(env(safe-area-inset-top),1rem)]` from the 7 files listed above and replace with a plain `pt-4` so spacing stays visually the same without duplicated safe-area insets.

Untouched: `BottomNav` (fixed, own bottom inset), sheets/modals (`LegalSheet`, `HealthPermissionSheet`), and `FocusRunView` — those are fixed overlays outside the scroll flow and keep their own insets.

Result: one fixed top boundary under the status bar, short pages sit still, long pages scroll inside the shell, and the shell cannot be dragged past its bounds.

## Verification

Run `git diff --name-only` and list the changed root/global rules before publishing.
