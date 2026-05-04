## Add a welcome splash screen with pulsing logo

When the app first opens, show a full-screen loading splash featuring the round ORBIT RUN logo (the same one in the home screen's top-left corner) pulsing softly. It fades out after a brief moment, revealing the app.

### Design
- Full-viewport overlay using the app's existing dark background (`bg-background` + `--gradient-dark`) so it matches the rest of the app.
- Centered round logo (`src/assets/08a0cc02-81da-4cc6-89d2-2c567d41b102.png`), ~112px, with the same neon drop-shadow glow used in the header.
- Soft neon pulse ring behind the logo (reuse the existing `pulse-ring` keyframe from `src/styles.css`) plus a gentle scale/opacity pulse on the logo itself.
- Tiny `ORBIT RUN` wordmark in neon uppercase tracking below the logo, matching the brand label style already used in the header (`text-neon`, `uppercase`, `tracking-[0.3em]`).
- No spinner text — clean, premium, on-brand.

### Behavior
- Mounts once on app load inside `src/routes/__root.tsx` (so it covers any route a user lands on, including deep links).
- Visible for ~1.2s, then fades out (300ms) and unmounts. Uses the existing `animate-fade-in` / fade-out utilities.
- Session-scoped: shows on a fresh page load / app launch only (uses `sessionStorage` flag so client-side route changes within the session don't re-trigger it).
- SSR-safe: renders nothing on the server / first hydration tick to avoid hydration mismatch (fixes the existing React #418 hydration warnings rather than adding to them).

### Files
- New: `src/components/SplashScreen.tsx` — the overlay component (logo + pulse + fade-out timer).
- Edit: `src/routes/__root.tsx` — render `<SplashScreen />` inside `RootComponent` above `<Outlet />`.