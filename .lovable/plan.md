## Goal

Fix the History card layout so the "Udfordr" button no longer crowds the stats row (km / time / pace) on narrow viewports (~339px wide). Make the button compact, minimal, and consistent with the no-glow style.

## Approach

Move the "Udfordr" button out of the header row entirely and absolute-position it in the **bottom-right corner of the map area**. This frees up the full width of the header for the stats line, ensuring KM, Tid, and Tempo always render on a single line.

## Changes — `src/routes/history.tsx`

**1. Remove the button from the header row (around lines 215–232)**

Replace the right-side cluster so it only contains the chevron:

```tsx
<ChevronDown
  className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
/>
```

**2. Add the button as an absolute overlay inside the map area (around line 158, just before `</Link>`'s closing `</div>`)**

The button needs to sit outside the `<Link>` to remain independently tappable. Move it to be a sibling of the `<Link>` wrapping the map, positioned absolutely against the relative map container. Restructure so the map wrapper is `relative` and contains both the Link and the overlay button:

```tsx
<div className="h-32 relative">
  <Link to="/run/$id" params={{ id: run.id }} className="block h-full active:scale-[0.99] transition">
    <RunMap ... />
    <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent pointer-events-none" />
    {/* delete button + weather badge stay inside Link as today */}
  </Link>

  {/* Ghost race button — bottom-right of map */}
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      selectGhost(run, formatDate(run.startedAt));
      navigate({ to: "/" });
    }}
    className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-1 bg-black/60 backdrop-blur border border-white/10 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/90"
    aria-label={t("ghost.race")}
  >
    <Ghost className="h-3 w-3" />
    {t("ghost.race")}
  </button>
</div>
```

**3. Stats row stays as-is** (lines 180–194) — but now has the full card width available, so KM / Tid / Tempo render on one line at 339px viewport without wrapping.

## Style spec for the button

- Background: `bg-black/60 backdrop-blur` (subtle, integrated)
- Border: `border border-white/10` (1px subtle gray)
- Text: `text-[10px] font-bold uppercase tracking-[0.18em]`
- Icon: `Ghost` 12px (`h-3 w-3`)
- Rounded full pill, compact padding `px-2 py-1`
- No glow, no neon color

## Result

- Stats row (KM, Tid, Tempo) renders on a single line, perfectly aligned.
- "Udfordr" button is visually anchored to the run's map preview (semantically tied to that run's GPS data).
- Compact, minimal, no-glow style consistent with the rest of the app.
- Delete button (top-right) and weather badge (top-left) remain undisturbed.
