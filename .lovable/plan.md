## Goal

On the past-run history card, relocate the "UDFORDR" (Ghost race) button from the bottom-right of the map to the top of the map, positioned immediately to the left of the delete (trash) button.

## File

- `src/routes/history.tsx` — `ExpandableRunCard` map area (lines ~134–173)

## Changes

1. **Remove** the existing absolutely-positioned Udfordr button at `bottom-2 right-2` (lines ~159–172).
2. **Move** it out of the `<Link>` (it must remain a sibling so its click is not swallowed by the link navigation) and absolutely position it at `top-2 right-12` so it sits directly to the left of the delete button (delete is `top-2 right-2`, h-8 w-8 ≈ 32px wide → use `right-12` for an 8px gap).
3. Keep the same compact "no-glow" styling, but match the delete button's circular pill height for visual consistency: use `h-8` height, `px-2.5` horizontal padding, rounded-full, `bg-black/50 backdrop-blur`, subtle `border border-white/10`, `text-[10px] font-bold uppercase tracking-[0.18em]`.
4. Preserve `e.stopPropagation()` and `e.preventDefault()` so tapping it does not navigate to the run detail page.
5. Leave the weather badge (`top-2 left-2`) untouched.

## Result

Top row of the map now reads, right-aligned: `[ Ghost UDFORDR ]  [ Trash ]`, with the weather badge still on the top-left.