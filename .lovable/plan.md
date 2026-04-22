

## UI Glitch Fix — Glow Cutoff & Inline Editing

Three small CSS-level fixes across two files. No new components, no logic changes.

### 1. Onboarding glow cutoff (`src/routes/onboarding.tsx`)

**Problem:** The option list lives inside `<section className="mt-5 flex-1 min-h-0 overflow-y-auto">`. The `overflow-y-auto` clips the neon `shadow-neon` of the selected card on the sides and bottom (and the `flex-1` container's bottom edge cuts the last card's glow against the footer).

**Fix:**
- Replace the scrolling section with a non-scrolling, glow-friendly container: drop `overflow-y-auto`, keep `flex-1`, and add horizontal/bottom padding so the glow can breathe (`px-1 pb-2`).
- Also add a small bottom margin to the cards' parent grid so the last card's glow is not clipped by the footer.
- Tighten `mt-5` → `mt-4` and reduce header `mt-4` → `mt-3` to keep all content above the fold (also addresses point 3 — NÆSTE button visibility on small viewports like the current 390×567).
- The footer remains anchored via `shrink-0` with `pt-3 pb-2`, sitting ~20–30px above the safe-area bottom as required.

No `overflow: visible` on a parent with a scroll context is needed because we're removing the scroll context entirely — the onboarding step content already fits the viewport once spacing is tightened.

### 2. Profile inline name editing (`src/routes/profile.tsx`, lines 133–149)

**Problem:** The input has `border-b-2 border-neon` plus a focus `shadow-[0_4px_20px_...]` glow, which reads as a chunky box around the text.

**Fix — make the input visually identical to the static text, with only the underline turning neon green:**
- Remove the focus box-shadow entirely.
- Keep `bg-transparent`, no border on top/left/right, no padding beyond what aligns it with the static text height (`py-0` instead of `py-0.5`).
- Match the static span's typography exactly: `font-display font-black text-2xl tracking-tight` (already present) + ensure no default browser styling: add `appearance-none` and `rounded-none`.
- Underline: a single `border-b-2 border-neon` (always neon while editing — that IS the only visible edit affordance, per the spec).
- Remove `outline-none`'s sibling shadow; keep `outline-none` itself.

Final input className:
```
w-full bg-transparent appearance-none rounded-none border-0 border-b-2 border-neon
outline-none py-0 font-display font-black text-2xl tracking-tight
```

### 3. NÆSTE button viewport visibility

Covered by the spacing tightening in step 1 (header `mt-3`, content section `mt-4`, no scroll container). On the user's current 390×567 viewport, all three onboarding steps' content + footer will fit without scroll.

### Files touched
- `src/routes/onboarding.tsx` — remove `overflow-y-auto` from content section, add padding for glow, tighten top margins.
- `src/routes/profile.tsx` — restyle the inline name `<input>` (lines 133–149) to be borderless/transparent with only a neon underline.

