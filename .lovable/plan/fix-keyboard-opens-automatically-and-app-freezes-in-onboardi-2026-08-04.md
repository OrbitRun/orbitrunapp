# Fix: keyboard opens automatically and app freezes in onboarding (TestFlight)

## What I found

- `src/components/Onboarding.tsx` line 66: the name input has `autoFocus`. On iOS this makes WKWebView open the keyboard as soon as onboarding mounts.
- `src/components/SplashScreen.tsx` renders a `fixed inset-0 z-[9999]` overlay with `pointerEvents: "auto"` for ~3 seconds, on top of onboarding (`z-[100]`). During that window every tap on the input/back/next lands on the splash, not on onboarding. This matches "the text field doesn't work" and taps doing nothing.
- Onboarding itself has no focus trap, no Radix Dialog, no FocusScope and no pointer/touch `preventDefault` — so the lock is coming from the overlay + keyboard layout, not from a trap.
- No `@capacitor/keyboard` plugin is installed, so when iOS closes the keyboard the WKWebView viewport/scroll offset can stay shifted, leaving the UI visually present but effectively unreachable.

## Plan

1. Remove `autoFocus` from the onboarding input. The keyboard opens only when the user taps the field.
2. Make the splash overlay non-blocking: `aria-hidden` overlay gets `pointer-events: none` for its whole lifetime, and it is skipped entirely (not just faded) when onboarding needs to be shown. It also gets a lower stacking context than onboarding.
3. Harden onboarding as a plain overlay, not a modal: keep `fixed inset-0` for the backdrop, ensure the card itself is the only interactive layer, no `preventDefault` on touch/pointer, and `touch-action: manipulation` on the buttons so taps register immediately on iOS.
4. Add iOS keyboard resilience: install and configure `@capacitor/keyboard` with `resize: "native"` and, on keyboard hide, reset `window.scrollTo(0,0)` plus blur the active element so no stale focus/scroll offset leaves the page unresponsive.
5. Audit remaining full-screen overlays (`CoachOnboarding`, `RpePrompt`, `CountdownOverlay`, `HealthPermissionSheet`) for the same auto-focus / blocking-overlay pattern and apply the same rules.
6. Verify in web preview with Playwright that no field is focused on mount and that all onboarding controls respond, then note that a fresh `npm run build:capacitor` + `npx cap sync ios` is required for a TestFlight build.

## Technical notes

- Files touched: `src/components/Onboarding.tsx`, `src/components/SplashScreen.tsx`, `src/routes/__root.tsx` (keyboard listener setup), `capacitor.config.ts` (Keyboard plugin), `package.json`.
- The Keyboard plugin listener is registered only when `Capacitor.isNativePlatform()` is true, so web behaviour is unchanged.
- Changes sync to GitHub automatically after the edit.
