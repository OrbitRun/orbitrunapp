I’ll fix the native iOS GPS issue with a focused change set:

1. Update `src/lib/geolocation-native.ts`
   - Keep Capacitor plugin permission handling for native builds.
   - Route actual location reads/watches through `navigator.geolocation` on iOS native as a fallback/bypass, because Capacitor Geolocation can hang/drop callbacks on some iOS/Xcode combinations while WKWebView geolocation still works.
   - Keep the Capacitor plugin path available for Android/native compatibility.
   - Use longer iOS-friendly timeouts and normalize watch IDs so `nativeClearWatch()` can clear either native plugin watches or web geolocation watches.

2. Update `src/hooks/use-gps-warmup.ts`
   - Keep the simple warmup hook, but make it use the updated native helper so it warms the same GPS path the tracker uses.

3. Update `src/hooks/use-run-tracker.ts`
   - Leave the tracker architecture intact, but make the native watch path benefit from the new iOS fallback.
   - Avoid showing a hard permission error for transient iOS cold-fix timeouts while the watch is still trying.

4. Update `src/components/RunMap.tsx`
   - Remove the extra pre-run native GPS polling loop or switch it to one lightweight single fix only, so the map warmup doesn’t compete with the run tracker’s GPS watch.

5. Update `src/components/NativeDiagnostics.tsx` and `docs/IOS_SETUP.md`
   - Diagnostics should test the same effective GPS path used by the app, not only direct `@capacitor/geolocation` calls.
   - Docs should say to rebuild/sync iOS and verify native console logs after reinstalling from Xcode/TestFlight.

After implementation, you’ll need to run locally:

```bash
npm run build
npx cap sync ios
```

Then reinstall the app from Xcode/TestFlight. If iOS permission was previously denied or stuck, delete the app first so the permission prompt resets.