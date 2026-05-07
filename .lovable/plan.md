## Wrap "My Shoes" in the same boxed style as Experience Level

Right now `ShoesSection` renders as a bare section with just a small header row, while the Experience Level block uses the `glass rounded-2xl p-4` card with an icon tile + label header. This makes the two sections look inconsistent.

### Changes

**`src/components/ShoesSection.tsx`**
- Change the outer `<section className="mt-4">` to `<section className="mt-4 glass rounded-2xl p-4">` to match the Experience card.
- Replace the current header row with the same pattern used by Experience:
  - A row with an icon tile (`h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon`) holding the `Footprints` icon
  - A flex-1 label (`text-sm font-semibold`) showing `t("shoes.title")`
  - Keep the "+ Add" button on the right of that row
- Drop the small uppercase tracking-heavy title (`font-display ... uppercase tracking-[0.2em]`) so it visually matches Experience.
- Keep all internal content (empty state, shoe cards, dialogs) unchanged. The shoe cards stay as their own nested `glass-strong` cards inside the outer box — same nesting pattern other boxed sections already use.

### Out of scope
- No changes to shoe data model, add/edit/delete behavior, or `ShoeCard` styling.
- No changes to other sections on the profile page.
