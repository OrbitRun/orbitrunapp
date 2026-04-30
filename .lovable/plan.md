## Collapse Flight Recorder info box behind a chevron, auto-reveal on toggle

Today the explanatory text under the **Flight Recorder** row in Profile → general settings is always visible, which makes the section feel heavy. We'll tuck it behind a small chevron and only auto-expand it briefly (5 seconds) right after the user flips the switch, so they get instant feedback on what just changed without permanent clutter.

### What you'll see

- The **Flight Recorder** row gets a small chevron on the right (▾ when closed, ▴ when open), tappable independently of the toggle.
- The info box (with `ON / OFF` label + explanation copy) is hidden by default.
- Tap the chevron → info box smoothly expands/collapses and stays in that state.
- Toggle the Flight Recorder switch → info box auto-expands for **5 seconds**, showing the new state's copy ("Dit løb gemmes automatisk…" or "Dit aktive løb gemmes ikke…"), then auto-collapses (unless the user manually opened it, in which case it stays open).
- Toggling again resets the 5s timer and updates the copy live.

### Files to edit

- **`src/routes/profile.tsx`**
  - Add local state `flightInfoOpen` (manual) and `flightInfoAutoOpen` (timed).
  - Split the row: the main button still flips `flightRecorderEnabled`; a small chevron button on the right toggles `flightInfoOpen`.
  - When the toggle is flipped, set `flightInfoAutoOpen=true` and start a 5s `setTimeout` to clear it; clear any existing timer first so rapid toggles reset the countdown.
  - Wrap the info box in a `<div>` rendered only when `flightInfoOpen || flightInfoAutoOpen`, with a simple `transition-all` max-height/opacity animation for a clean reveal.
  - Cleanup the timeout on unmount.
  - Import `ChevronDown` from `lucide-react`.

No other files change. No new translation keys, no logic changes to the recorder itself.

### Technical details

- Auto-reveal uses a single `useRef<number | null>` for the timeout id so re-toggles cancel the previous timer cleanly.
- Manual-open state is independent of auto-open: closing the box manually during the 5s window cancels the timer; opening manually keeps it open past 5s.
- Animation: `grid-rows-[0fr]` → `grid-rows-[1fr]` trick (or `max-h-0` → `max-h-40`) with `overflow-hidden` so the surrounding settings list doesn't jump.
- Chevron button uses the same hit-area pattern as other inline icon buttons in this file; rotates 180° via `className` when open.
