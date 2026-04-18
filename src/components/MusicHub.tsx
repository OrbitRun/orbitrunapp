import { useCallback, useEffect, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Music2, LogOut } from "lucide-react";
import {
  beginAuth,
  getNowPlaying,
  isAuthed,
  isConfigured,
  logout,
  next,
  pause as spPause,
  play as spPlay,
  previous,
  transferToFirstDevice,
  type NowPlaying,
} from "@/lib/spotify";

export default function MusicHub() {
  const [authed, setAuthed] = useState(false);
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(isAuthed());
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthed()) return;
    try {
      const np = await getNowPlaying();
      setNow(np);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Spotify error");
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [authed, refresh]);

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      setTimeout(refresh, 300);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Spotify error";
      // Try to recover from "no active device"
      if (/404|NO_ACTIVE_DEVICE|device/i.test(msg)) {
        const ok = await transferToFirstDevice().catch(() => false);
        if (ok) {
          try {
            await fn();
            setTimeout(refresh, 300);
            setError(null);
            return;
          } catch (e2) {
            setError(e2 instanceof Error ? e2.message : msg);
            return;
          }
        }
        setError("No active Spotify device. Open Spotify on a device and try again.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!isConfigured()) {
    return (
      <div className="glass rounded-2xl p-4 text-xs text-muted-foreground">
        <div className="font-semibold text-foreground mb-1 flex items-center gap-2">
          <Music2 className="h-4 w-4 text-neon" /> Spotify not configured
        </div>
        Add your Spotify Client ID in <code className="text-neon">src/lib/spotify.ts</code>, then add{" "}
        <code className="text-neon">{typeof window !== "undefined" ? `${window.location.origin}/spotify/callback` : "/spotify/callback"}</code>{" "}
        to your Spotify app's Redirect URIs.
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] grid place-items-center text-background">
          <Music2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Connect Spotify</div>
          <div className="text-xs text-muted-foreground">Premium required for playback control</div>
        </div>
        <button
          onClick={() => beginAuth().catch((e) => setError(e instanceof Error ? e.message : "Auth error"))}
          className="rounded-full bg-neon text-primary-foreground px-4 py-2 text-xs font-bold active:scale-95 transition"
        >
          Connect
        </button>
      </div>
    );
  }

  const playing = now?.isPlaying ?? false;
  const progress = now && now.durationMs > 0 ? (now.progressMs / now.durationMs) * 100 : 0;
  const title = now?.title || "Nothing playing";
  const artist = now?.artist || (now?.hasActiveDevice ? "Press play to start" : "Open Spotify on a device");

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] flex-shrink-0 overflow-hidden">
          {now?.artworkUrl ? (
            <img src={now.artworkUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-background font-black text-lg">
              ♪
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{title}</div>
          <div className="text-xs text-muted-foreground truncate">{artist}</div>
          <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-neon transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous"
            disabled={busy}
            onClick={() => wrap(previous)}
            className="h-9 w-9 rounded-full grid place-items-center text-foreground/80 hover:text-foreground hover:bg-white/5 transition disabled:opacity-50"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            aria-label={playing ? "Pause" : "Play"}
            disabled={busy}
            onClick={() => wrap(playing ? spPause : spPlay)}
            className="h-10 w-10 rounded-full grid place-items-center bg-neon text-primary-foreground hover:opacity-90 transition active:scale-95 disabled:opacity-50"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <button
            aria-label="Next"
            disabled={busy}
            onClick={() => wrap(next)}
            className="h-9 w-9 rounded-full grid place-items-center text-foreground/80 hover:text-foreground hover:bg-white/5 transition disabled:opacity-50"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-destructive">
          <span className="truncate">{error}</span>
          <button
            onClick={() => {
              logout();
              setAuthed(false);
              setNow(null);
              setError(null);
            }}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3 w-3" /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
