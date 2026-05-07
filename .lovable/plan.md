## Move "My Profile" (weight / height / max HR) section

Currently `<MyProfileSection />` renders at line 163 in `src/routes/profile.tsx`, above the Experience-level card. Move it to render directly between the Experience-level section (ends ~line 222) and the Orbit Coach section (starts ~line 224).

### Change
- `src/routes/profile.tsx`: cut the `<MyProfileSection coach={…} onUpdate={…} />` block and its surrounding spacing from its current position and re-insert it immediately after the Experience-level `</section>` and before the `{/* Orbit Coach */}` comment.
- Keep all props, helpers, and the `MyProfileSection` component definition unchanged.

### Out of scope
- No styling, copy, or behaviour changes.
- No changes to other sections' order.
