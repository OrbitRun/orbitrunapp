# Global bottom layout: shell, BottomNav, Run page fit

Three scoped changes. Top safe-area ownership, onboarding, Capacitor, native, GPS, dialogs and run math stay untouched.

## 1. Global shell + bottom safe area

Current state (`src/routes/__root.tsx`, line 106): the shell is
`<div id="orbit-shell" className="pb-24 mb-[30px]">`.

- `mb-[30px]` adds a 30px empty black strip below the scroll container — this is the visible dead space. Remove it.
- `pb-24` (96px) is a blanket padding that also pushes content up. Replace with a shell-level bottom padding that reserves only the real nav height plus the bottom inset, defined once in CSS as a variable.

In `src/styles.css`, inside the existing `#orbit-shell` rule (keeping `box-sizing`, `100dvh`, top safe-area padding exactly as they are), add:

```text
--orbit-nav-h: 64px;            /* actual nav pill height */
padding-bottom: calc(var(--orbit-nav-h) + env(safe-area-inset-bottom) + 8px);
scrollbar-width: none;          /* hide scrollbar, keep scrolling */
```

plus `#orbit-shell::-webkit-scrollbar { display: none; }`.

Because `box-sizing: border-box` and `height: 100dvh` are already set, this padding lives inside the viewport box and creates no extra scroll on short pages.

## 2. BottomNav positioning

`src/components/BottomNav.tsx` currently stacks three separate bottom spacings:
`pb-[max(env(safe-area-inset-bottom),12px)]` on the fixed `<nav>`, `pb-3` on the inner container, and the shell's own `pb-24`. That is why the bar floats too high.

- Keep `fixed bottom-0 inset-x-0 z-40`.
- Apply the bottom inset exactly once: `padding-bottom: calc(env(safe-area-inset-bottom) + 8px)`.
- Remove the inner `pb-3`.

Result: the pill sits directly above the home indicator with one small intentional gap.

## 3. Run / Home page fit

`src/routes/index.tsx`:

- The page wrapper becomes a flex column that fills the shell's content box (`min-h-full flex flex-col`) instead of a plain block.
- The map section (currently a hard `h-[221px]` on both the map and the indoor placeholder, lines 246 and 258) becomes the flexible element: `flex-1` with a sensible `min-height`, so it shrinks on short screens and grows on tall ones.
- The START LØB section (`mt-5 mb-6`) tightens to a small top margin and no bottom margin — the shell padding already clears the nav, so the button lands just above BottomNav and is always fully visible.

Header, status strip, stat tiles, ghost banner and all logic keep their current sizes; only the map absorbs the leftover space.

## Verification before publishing

Run `git diff --name-only` and report the three groups separately: shell/global CSS, BottomNav, Run page.
