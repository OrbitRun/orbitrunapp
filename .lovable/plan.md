## Remove glow from environment toggle and Shoes "Add" button

Match the flatter look of the Experience-level buttons (which use `bg-neon text-primary-foreground` with no `shadow-neon`).

### Changes

**`src/routes/profile.tsx`** (line 218) — Outdoor/Indoor toggle active state:
- From: `"bg-neon text-primary-foreground shadow-neon"`
- To:   `"bg-neon text-primary-foreground"`

**`src/components/ShoesSection.tsx`** (line 91) — "Tilføj" button in the Shoes section header:
- Drop the trailing `shadow-neon` class so the button is a flat neon pill, like the Experience tiles.

No other styles are touched. The shoe-add confirm button inside the add-shoe form (line 198) is left unchanged since it's not visible from the main Shoes section header.