import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Music2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import OrbitSpinner from "@/components/OrbitSpinner";
import Marquee from "@/components/Marquee";
import { useI18n } from "@/lib/i18n";
import {
  getNowPlaying,
  isAuthed,
  isConfigured,
  next as spNext,
  pause as spPause,
  play as spPlay,
  previous as spPrevious,
  type NowPlaying,
} from "@/lib/spotify";

const POLL_MS = 4000;
const SPOTIFY_GREEN = "#1DB954";

/**
 * Full Spotify player for the in-run focus screen.
 * Larger artwork, track title + artist, progress bar, prev/play/next.
 * No login or playlist selector — those live under Profile → Music.
 */
export default function MusicHubFull() {
  const { t } = useI18n();
  const configured = isConfigured();
  const [authed, setAuthed] = useState(false);
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [busy, setBusy] = useState(false);
  // Local progress ticker so the bar moves smoothly between polls.
  const [tickProgress, setTickProgress] = useState(0);
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    setAuthed(isAuthed());
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthed()) return;
    try {
      const np = await getNowPlaying();
      setNow(np);
      setTickProgress(np?.progressMs ?? 0);
      lastSyncRef.current = Date.now();
    } catch {
      setAuthed(isAuthed());
    }
  }, []);

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
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [authed, refresh]);

  // Smooth local progress ticker between polls.
  useEffect(() => {
    if (!now?.isPlaying) return;
    const id = setInterval(() => {
      const delta = Date.now() - lastSyncRef.current;
      setTickProgress(Math.min((now.progressMs ?? 0) + delta, now.durationMs || Number.MAX_SAFE_INTEGER));
    }, 500);
    return () => clearInterval(id);
  }, [now?.isPlaying, now?.progressMs, now?.durationMs]);

  const ctrl = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      setTimeout(() => void refresh(), 300);
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  };

  if (!configured) return null;

  if (!authed) {
    return (
      <Link
        to="/profile"
        className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-[11px] text-muted-foreground hover:bg-white/10 transition"
      >
        <Music2 className="h-3.5 w-3.5" style={{ color: SPOTIFY_GREEN }} />
        <span className="truncate">{t("music.connectSpotifyInProfile")}</span>
      </Link>
    );
  }

  const title = now?.title || t("music.nothingPlaying");
  const artist = now?.artist || "";
  const playing = !!now?.isPlaying;
  const dur = now?.durationMs ?? 0;
  const prog = Math.max(0, Math.min(tickProgress, dur));
  const pct = dur > 0 ? (prog / dur) * 100 : 0;
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = (s % 60).toString().padStart(2, "0");
    return `${m}:${r}`;
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-lg overflow-hidden bg-white/5 grid place-items-center text-muted-foreground flex-shrink-0">
          {now?.artworkUrl ? (
            <img src={now.artworkUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Music2 className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Marquee text={title} className="text-[13px] font-bold leading-tight" />
          <div className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{artist}</div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            aria-label="Previous"
            onClick={() => ctrl(spPrevious)}
            disabled={busy}
            className="h-8 w-8 rounded-full grid place-items-center text-foreground/80 hover:bg-white/5 transition disabled:opacity-50"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => ctrl(playing ? spPause : spPlay)}
            disabled={busy}
            className="h-10 w-10 rounded-full grid place-items-center text-black hover:opacity-90 transition active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: SPOTIFY_GREEN }}
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
            onClick={() => ctrl(spNext)}
            disabled={busy}
            className="h-8 w-8 rounded-full grid place-items-center text-foreground/80 hover:bg-white/5 transition disabled:opacity-50"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>
      {dur > 0 && (
        <div className="mt-2">
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-linear"
              style={{ width: `${pct}%`, backgroundColor: SPOTIFY_GREEN }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-muted-foreground font-semibold">
            <span>{fmt(prog)}</span>
            <span>{fmt(dur)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
