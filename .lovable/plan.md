1. Replace `src/hooks/use-gps-warmup.ts` with the exact simplified version provided by the user. It removes any debug overlay and only performs the native geolocation warmup (permission request + single `getCurrentPosition` call), falling back to web `navigator.geolocation` on non-native builds.

2. In `src/routes/__root.tsx`, add the import `import { useGpsWarmup } from "@/hooks/use-gps-warmup";` and invoke `useGpsWarmup();` inside `RootComponent` alongside the other existing hooks (`useHealthAutoSync`, `useSpotifyRunControl`, etc.).

No other files or logic are changed.