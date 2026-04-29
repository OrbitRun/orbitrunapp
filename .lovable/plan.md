## Status

The "Plug & Play" Sensor Guide is already fully built and live:

- 3-step modal (Strap → Bluetooth → Choose) with progress dots
- Animated radar rings around a heart icon while scanning
- Device name + battery % displayed once paired
- 10-second troubleshooting tip with Strava/Garmin guidance
- "Connected: [name]" row with green dot, live BPM, and a "Test puls" view

Files: `src/components/SensorsSection.tsx`, `src/lib/heart-rate-bt.ts`, `src/styles.css`.

## Optional polish I can add next

Pick any/all and I'll implement:

1. **Signal-strength meter** — show a small RSSI/quality bar on the connected card so the user can see contact quality before running.
2. **Auto-reconnect on app focus** — if the strap was paired and disconnects (e.g. went out of range), retry silently when the user returns to the app.
3. **Remember last device** — persist the device name in localStorage and show "Genforbind til Polar H10" as a one-tap shortcut on next visit (Web Bluetooth permits silent reconnect via `getDevices()` where supported).
4. **Strap-contact warning** — if BPM stays at 0 or jumps wildly for >5s, show "Dårlig kontakt — fugt sensoren" inline.
5. **Haptic confirmation** — short `navigator.vibrate` pulse the moment a device successfully pairs and on the first valid BPM reading.

If you'd rather change something inside the existing guide (copy tweaks, different illustrations per step, larger BPM in test view, etc.), tell me which step and I'll adjust it directly.

No code changes will be made until you approve a specific item.