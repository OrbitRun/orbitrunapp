# Final pre-publish verification: app shell + per-page padding

## Verification result

**1. `#orbit-shell` (src/styles.css, lines 149-156) — current state**

```css
#orbit-shell {
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  padding-top: env(safe-area-inset-top);
}
```

`box-sizing: border-box` is not declared on this rule. Tailwind's preflight applies `box-sizing: border-box` to `*, ::before, ::after`, so the shell already computes border-box in practice — the safe-area padding is inside the `100dvh` box and does not add scroll height today. Making it explicit on the rule removes any dependency on preflight ordering.

**2. Per-page files — all use plain `pt-4`, no safe-area expression remains**

| File | Line | Class |
| --- | --- | --- |
| src/routes/index.tsx | 175 | `mx-auto max-w-md px-4 pt-4` |
| src/routes/profile.tsx | 130 | `mx-auto max-w-md px-4 pt-4 pb-8` |
| src/routes/coach.tsx | 32 | `mx-auto max-w-md px-4 pt-4 pb-24` |
| src/routes/history.tsx | 77 | `mx-auto max-w-md px-4 pt-4` |
| src/routes/run.$id.tsx | 101 | `mx-auto max-w-md px-4 pt-4` |
| src/routes/profile_.heart-rate.tsx | 86 | `mx-auto max-w-md px-4 pt-4 pb-32` |
| src/components/RunSummary.tsx | 55 | `mx-auto max-w-md px-4 pt-4 pb-8` |

Only the top-padding token changed on each; widths, max-widths, bottom padding, overflow, positioning and component logic are untouched. Note: the file is `src/routes/profile_.heart-rate.tsx` (underscore before the dot), not `profile._heart-rate.tsx`.

**3. BottomNav** — unchanged: `fixed bottom-0 inset-x-0 z-40 pb-[max(env(safe-area-inset-bottom),12px)]`. Being `position: fixed`, it is anchored to the viewport and unaffected by shell scrolling; the shell keeps `pb-24` so content clears it.

**4. No workarounds present** — no `position: fixed` shell hack, no JS scroll reset, no touch/scroll event handlers, no Capacitor or native config changes in this work. Document-level bounce is handled purely by `html, body { height: 100%; overflow: hidden }` plus `overscroll-behavior`.

## The one change to make

`src/styles.css`, inside the `#orbit-shell` rule, add a single line:

```diff
 #orbit-shell {
+  box-sizing: border-box;
   height: 100dvh;
   overflow-y: auto;
   overflow-x: hidden;
   overscroll-behavior-y: contain;
   -webkit-overflow-scrolling: touch;
   padding-top: env(safe-area-inset-top);
 }
```

Nothing else is modified.
