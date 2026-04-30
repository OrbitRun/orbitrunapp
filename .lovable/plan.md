## Reorder Profile Page Sections

In `src/routes/profile.tsx`, rearrange the sections after the Orbit Coach into this order:

1. Premium Member Card (unchanged)
2. RecoveryStatus (unchanged)
3. ShoesSection (unchanged)
4. Experience level (unchanged)
5. Orbit Coach (unchanged)
6. **Heart Rate Zones** (`hrz.profileRow` Link)
7. **Sensors** (`<SensorsSection />`)
8. **Apple Health**
9. **General Settings** (audio, haptic, prVoice, windUnit, gps, language)
10. Footer + modals (unchanged)

### Technical details

Single-file edit in `src/routes/profile.tsx`. Pure reordering of existing `<section>` blocks — no logic, props, or imports change. The general settings list (currently right after Experience level / Coach) moves down to sit below Sensors and Apple Health. HR zones, Sensors, and Apple Health stack directly under the Orbit Coach section in the listed order.
