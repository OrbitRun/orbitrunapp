## Move section headers inside the box for Integrations & My Profile

Match the Sensors layout, where the "SENSORS" label sits inside the same `glass rounded-2xl` card (top row, `px-4 pt-3 pb-2`, small uppercase muted label) instead of floating above it.

### Changes

**`src/components/IntegrationsSection.tsx`**
- Remove the outer `<div className="mb-2 px-1 ...">{t("integrations.title")}</div>` that lives above the card.
- Inside the existing `<div className="glass rounded-2xl divide-y divide-border">`, prepend a header row matching Sensors:
  ```
  <div className="px-4 pt-3 pb-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
    {t("integrations.title")}
  </div>
  ```
- Keep all integration rows untouched. The `divide-y` will draw a separator between the new header and the first row, identical to Sensors.

**`src/routes/profile.tsx` (`MyProfileSection`)**
- Remove the floating `<div className="mt-6 mb-2 px-1 ...">{t("profile.section.myProfile")}</div>` above the card.
- Add `mt-6` (to preserve top spacing) to the `<section className="glass rounded-2xl divide-y divide-border">`.
- Prepend the same in-card header row used by Sensors/Integrations with `t("profile.section.myProfile")`.

### Out of scope
- No changes to row content, fields, or behavior.
- No copy/translation changes.
- Sensors section itself is unchanged (it's the reference).
