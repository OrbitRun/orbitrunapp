import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Music2, LogOut, ListMusic } from "lucide-react";
import OrbitSpinner from "@/components/OrbitSpinner";
import { toast } from "sonner";
import Marquee from "@/components/Marquee";
import SpotifyPlaylistPicker from "@/components/SpotifyPlaylistPicker";
import { useI18n } from "@/lib/i18n";
import {
  beginAuth,
  getActiveWorkoutPlaylist,
  getDevices,
  getNowPlaying,
  isAuthed,
  isConfigured,
  logout,
  next as spNext,
  pause as spPause,
  play as spPlay,
  playContext,
  previous as spPrevious,
  transferPlayback,
  transferToFirstDevice,
  type ActiveWorkoutPlaylist,
  type NowPlaying,
} from "@/lib/spotify";

const POLL_MS = 5000;

export default function MusicHub() {
  const { t } = useI18n();
  const configured = isConfigured();
  const [authed, setAuthed] = useState(false);
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [busy, setBusy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState<ActiveWorkoutPlaylist | null>(null);
  const premiumWarned = useRef(false);

  // Hydrate auth state on mount (avoids SSR localStorage access).
  useEffect(() => {
    setAuthed(isAuthed());
    setActivePlaylist(getActiveWorkoutPlaylist());
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthed()) return;
    try {
      const np = await getNowPlaying();
      setNow(np);
    } catch {
      // Token likely invalid — drop auth state so user can reconnect.
      setAuthed(isAuthed());
    }
  }, []);

  // Poll while visible + connected.
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      void refresh();
      timer = setInterval(() => {
        if (!cancelled) void refresh();
      }, POLL_MS);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    const onFocus = () => void refresh();

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [authed, refresh]);

  // Start the user's chosen workout playlist (or plain resume if none).
  const startActivePlaylist = useCallback(async () => {
    const playlist = getActiveWorkoutPlaylist();
    if (!playlist) {
      await spPlay();
      return;
    }
    const devices = await getDevices();
    let deviceId = devices.find((d) => d.is_active)?.id;
    if (!deviceId && devices[0]) {
      deviceId = devices[0].id;
      await transferPlayback(deviceId, false);
    }
    if (!deviceId) {
      toast.error(t("music.noDevice"));
      return;
    }
    await playContext(playlist.uri, deviceId);
  }, [t]);

  // Auto play/pause with run lifecycle.
  useEffect(() => {
    const onStart = () => {
      if (!isAuthed()) return;
      void runControl(startActivePlaylist);
    };
    const onStop = () => {
      if (isAuthed()) void runControl(spPause);
    };
    window.addEventListener("orbit:run-start", onStart);
    window.addEventListener("orbit:run-stop", onStop);
    return () => {
      window.removeEventListener("orbit:run-start", onStart);
      window.removeEventListener("orbit:run-stop", onStop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startActivePlaylist]);

  const handleSpotifyError = useCallback(
    (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("403")) {
        if (!premiumWarned.current) {
          premiumWarned.current = true;
          toast.error(t("music.premiumRequired"));
        }
      } else if (msg.includes("404")) {
        toast.error(t("music.noDevice"));
      } else if (msg.includes("401")) {
        setAuthed(false);
      }
    },
    [t],
  );

  const runControl = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      // Brief delay so Spotify state catches up.
      setTimeout(() => void refresh(), 350);
    } catch (err) {
      handleSpotifyError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleConnect = async () => {
    try {
      setBusy(true);
      await beginAuth();
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Connect failed");
    }
  };

  const handleDisconnect = () => {
    logout();
    setAuthed(false);
    setNow(null);
    setShowMenu(false);
  };

  const handleTransfer = async () => {
    setBusy(true);
    try {
      const ok = await transferToFirstDevice();
      if (!ok) toast.error(t("music.noDevice"));
      setTimeout(() => void refresh(), 400);
    } catch (err) {
      handleSpotifyError(err);
    } finally {
      setBusy(false);
    }
  };

  // ─── Render: not configured ─────────────────────────────────────────────
  if (!configured) {
    return (
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white/5 grid place-items-center text-muted-foreground flex-shrink-0">
            <Music2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{t("music.notConfigured")}</div>
            <div className="text-xs text-muted-foreground truncate">
              {t("music.notConfiguredHint")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: not connected ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] grid place-items-center text-background flex-shrink-0">
            <Music2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Spotify</div>
            <div className="text-xs text-muted-foreground truncate">
              {t("music.spotifySoon").replace("coming soon", "").replace("kommer snart", "").trim() || "Spotify"}
            </div>
          </div>
          <button
            onClick={handleConnect}
            disabled={busy}
            className="px-3 h-9 rounded-full text-xs font-bold bg-neon text-primary-foreground hover:opacity-90 transition active:scale-95 disabled:opacity-50"
          >
            {busy ? t("music.connecting") : t("music.connect")}
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: connected ──────────────────────────────────────────────────
  const title = now?.title || t("music.nothingPlaying");
  const artist = now?.artist || "";
  const progress =
    now && now.durationMs > 0 ? Math.min(100, (now.progressMs / now.durationMs) * 100) : 0;
  const playing = !!now?.isPlaying;
  const noDevice = now ? !now.hasActiveDevice : false;

  return (
    <div className="glass rounded-2xl p-4 relative">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowMenu((s) => !s)}
          className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] flex-shrink-0 grid place-items-center text-background overflow-hidden"
          aria-label="Spotify menu"
        >
          {now?.artworkUrl ? (
            <img
              src={now.artworkUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Music2 className="h-5 w-5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Marquee text={title} className="text-sm font-semibold flex-1 min-w-0" />
            <span className="text-[9px] uppercase tracking-wider text-neon font-bold flex-shrink-0">
              {t("music.live")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate">{artist}</div>
          <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-neon transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous"
            onClick={() => runControl(spPrevious)}
            disabled={busy}
            className="h-9 w-9 rounded-full grid place-items-center text-foreground/80 hover:text-foreground hover:bg-white/5 transition disabled:opacity-50"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => runControl(playing ? spPause : spPlay)}
            disabled={busy}
            className="h-10 w-10 rounded-full grid place-items-center bg-neon text-primary-foreground hover:opacity-90 transition active:scale-95 disabled:opacity-50"
          >
            {busy ? (
              <OrbitSpinner size={16} />
            ) : playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </button>
          <button
            aria-label="Next"
            onClick={() => runControl(spNext)}
            disabled={busy}
            className="h-9 w-9 rounded-full grid place-items-center text-foreground/80 hover:text-foreground hover:bg-white/5 transition disabled:opacity-50"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>

      {noDevice && (
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-muted-foreground truncate">{t("music.noDevice")}</span>
          <button
            onClick={handleTransfer}
            disabled={busy}
            className="px-2 h-7 rounded-full bg-white/10 hover:bg-white/15 font-semibold transition disabled:opacity-50"
          >
            {t("music.useThisDevice")}
          </button>
        </div>
      )}

      {/* Active workout playlist row */}
      <button
        onClick={() => setPickerOpen(true)}
        className="mt-2 w-full flex items-center gap-2 text-[11px] px-2 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition text-left"
      >
        <ListMusic className="h-3.5 w-3.5 text-neon flex-shrink-0" />
        {activePlaylist ? (
          <>
            <span className="text-muted-foreground flex-shrink-0">{t("music.willPlay")}:</span>
            <span className="font-semibold truncate">{activePlaylist.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{t("music.choosePlaylist")}</span>
        )}
      </button>

      {showMenu && (
        <div className="absolute left-3 top-16 z-20 glass-strong rounded-xl p-1 shadow-lg">
          <button
            onClick={() => {
              setShowMenu(false);
              setPickerOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-white/5 transition w-full"
          >
            <ListMusic className="h-3.5 w-3.5" />
            {t("music.changePlaylist")}
          </button>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-white/5 transition w-full"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("music.disconnect")}
          </button>
        </div>
      )}

      <SpotifyPlaylistPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onChange={() => setActivePlaylist(getActiveWorkoutPlaylist())}
      />
    </div>
  );
}
