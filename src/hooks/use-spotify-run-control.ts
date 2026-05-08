import { useEffect } from "react";
import {
  getActiveWorkoutPlaylist,
  getDevices,
  getNowPlaying,
  isAuthed,
  pause as spPause,
  play as spPlay,
  playContext,
  transferPlayback,
  waitForActiveDevice,
} from "@/lib/spotify";

/**
 * Global, mount-once hook that:
 *  - Wakes a Spotify device in the background while authed (so the first
 *    Play tap on the run screen is instant on iPhone).
 *  - On `orbit:run-start`, auto-plays the user's saved default workout
 *    playlist (configured under Profile → Music integration).
 *  - On `orbit:run-stop`, auto-pauses playback.
 *
 * Independent of any UI widget being mounted.
 */
export function useSpotifyRunControl() {
  // Background warm-up: keep a device active while authed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthed()) return;
    let cancelled = false;
    (async () => {
      try {
        const np = await getNowPlaying();
        if (cancelled) return;
        if (!np?.hasActiveDevice) {
          const devices = await getDevices();
          const target = devices[0];
          if (target) {
            await transferPlayback(target.id, false);
            await waitForActiveDevice(target.id, 1500);
          }
        }
      } catch {
        /* silent — warm-up only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto play/pause on run lifecycle.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const startActivePlaylist = async () => {
      const playlist = getActiveWorkoutPlaylist();
      const devices = await getDevices();
      let deviceId = devices.find((d) => d.is_active)?.id;
      let needsTransfer = false;
      if (!deviceId && devices[0]) {
        deviceId = devices[0].id;
        needsTransfer = true;
      }
      if (!deviceId) return;
      if (needsTransfer) {
        await transferPlayback(deviceId, false);
        const ready = await waitForActiveDevice(deviceId, 1500);
        if (!ready) return;
      }
      if (playlist) {
        await playContext(playlist.uri, deviceId);
      } else {
        await spPlay();
      }
    };

    const onStart = () => {
      if (!isAuthed()) return;
      void startActivePlaylist().catch(() => {
        /* silent */
      });
    };
    const onStop = () => {
      if (!isAuthed()) return;
      void spPause().catch(() => {
        /* silent */
      });
    };
    window.addEventListener("orbit:run-start", onStart);
    window.addEventListener("orbit:run-stop", onStop);
    return () => {
      window.removeEventListener("orbit:run-start", onStart);
      window.removeEventListener("orbit:run-stop", onStop);
    };
  }, []);
}
