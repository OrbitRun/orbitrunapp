## Automated shoe tracking + history integration

Tag each saved run with the active primary shoe and let users see/change the shoe in the run history. Mileage on shoes stays in sync when a run is reassigned or deleted.

### 1. Data model (`src/lib/run-types.ts`)
- Add optional `shoeId?: string` to the `Run` type. Existing runs without a `shoeId` keep working (treated as "unknown shoe").

### 2. Auto-tagging on save (`src/components/RunSummary.tsx`)
- Look up the active primary shoe via `loadShoes()` at save time.
- Pass `shoeId` to the parent so the saved `Run` includes it. (Do this by changing `onSave` to `onSave(shoeId?: string)` and having the run-tracker hook write `shoeId` onto the run before `saveRun`.)
- Keep the existing `addDistanceToPrimary(run.distanceM)` call — unchanged behavior for the common case.

### 3. Shoe helpers (`src/lib/shoes.ts`)
- Add `getPrimaryShoe(): Shoe | null`.
- Add `getShoeById(id: string): Shoe | null`.
- Add `addDistanceToShoe(id: string, distanceM: number)` and `subtractDistanceFromShoe(id: string, distanceM: number)` (clamped to 0). Used when reassigning a run between shoes.
- Add `reassignRunDistance(fromId: string | undefined, toId: string, distanceM: number)` convenience helper that subtracts from the old shoe and adds to the new one.

### 4. Run tracker hook (`src/hooks/use-run-tracker.ts`)
- Update the save flow so the run object persisted via `saveRun` includes `shoeId` (passed in from `RunSummary` or read directly from `getPrimaryShoe()` here — preferred: read here so summary stays presentational).

### 5. History detail view (`src/routes/run.$id.tsx`)
- Below the weather edit row, render a small shoe row:
  - Minimalist shoe icon (`Footprints` from lucide-react — already in the lucide set).
  - Shoe brand + model (or "No shoe" placeholder when none).
  - Tappable: opens a bottom sheet / dialog listing all `active` shoes from `loadShoes()`. Selecting one calls `reassignRunDistance(oldShoeId, newShoeId, run.distanceM)` then `updateRun(run.id, { shoeId: newId })`, dispatches `orbit:shoes-updated`, and closes the sheet.
  - Include an "Unassign" option that subtracts from the previous shoe and clears `shoeId`.

### 6. New component `src/components/ShoePicker.tsx`
- Reusable Radix `Dialog` (or existing `Sheet` from shadcn) that lists active shoes with brand/model and a check for the currently selected one.
- Props: `currentShoeId?: string`, `onSelect(shoeId: string | null): void`, `open`, `onOpenChange`.

### 7. History list (`src/routes/history.tsx`)
- In the per-run row, add a tiny `Footprints` icon + shoe model name when `run.shoeId` resolves to a known shoe. Non-tappable here — editing happens in the detail view to keep the list clean.

### 8. i18n (`src/lib/i18n.tsx`)
- Add keys (en + da):
  - `run.shoe.label` ("Shoe" / "Sko")
  - `run.shoe.none` ("No shoe" / "Ingen sko")
  - `run.shoe.change` ("Change shoe" / "Skift sko")
  - `run.shoe.unassign` ("Unassign" / "Fjern tilknytning")
  - `run.shoe.pickerTitle` ("Select shoe" / "Vælg sko")

### Edge cases handled
- No primary shoe at save time → `shoeId` left undefined, no mileage change.
- Reassigning a run whose original shoe was deleted → only adds distance to the new shoe.
- Switching to the same shoe → no-op.
- Distance values clamped at 0 to avoid negative mileage on corrupt data.

### Files
- Edit: `src/lib/run-types.ts`, `src/lib/shoes.ts`, `src/lib/i18n.tsx`, `src/hooks/use-run-tracker.ts`, `src/routes/run.$id.tsx`, `src/routes/history.tsx`
- New: `src/components/ShoePicker.tsx`
- `src/components/RunSummary.tsx` left as-is (mileage call already there); shoeId is attached in the run-tracker hook so summary stays presentational.