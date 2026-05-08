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

const POLL_MS = 5000;

/**
 * Compact, discreet Spotify player for the run screen.
 * Shows song title, artist and play/pause/skip only.
 * All configuration (login, playlist selection) lives under
 * Profile → Music integration.
 */
export default function MusicHubMini() {
  const { t } = useI18n();
  const configured = isConfigured();
  const [authed, setAuthed] = useState(false);
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [busy, setBusy] = useState(false);
  const errored = useRef(false);

  useEffect(() => {
    setAuthed(isAuthed());
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthed()) return;
    try {
      const np = await getNowPlaying();
      setNow(np);
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

  const ctrl = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      setTimeout(() => void refresh(), 300);
    } catch {
      if (!errored.current) errored.current = true;
    } finally {
      setBusy(false);
    }
  };

  if (!configured) return null;

  if (!authed) {
    return (
      <Link
        to="/profile"
        className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[11px] text-muted-foreground hover:bg-white/10 transition"
      >
        <Music2 className="h-3.5 w-3.5 text-[#1DB954]" />
        <span className="truncate">{t("music.connectSpotifyInProfile")}</span>
      </Link>
    );
  }

  const title = now?.title || t("music.nothingPlaying");
  const artist = now?.artist || "";
  const playing = !!now?.isPlaying;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5">
      <div className="h-8 w-8 rounded-md overflow-hidden bg-white/5 grid place-items-center text-muted-foreground flex-shrink-0">
        {now?.artworkUrl ? (
          <img src={now.artworkUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Music2 className="h-3.5 w-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Marquee text={title} className="text-[11px] font-semibold leading-tight" />
        <div className="text-[10px] text-muted-foreground truncate leading-tight">{artist}</div>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          aria-label="Previous"
          onClick={() => ctrl(spPrevious)}
          disabled={busy}
          className="h-7 w-7 rounded-full grid place-items-center text-foreground/80 hover:bg-white/5 transition disabled:opacity-50"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => ctrl(playing ? spPause : spPlay)}
          disabled={busy}
          className="h-8 w-8 rounded-full grid place-items-center bg-[#1DB954] text-black hover:opacity-90 transition active:scale-95 disabled:opacity-50"
        >
          {busy ? (
            <OrbitSpinner size={14} />
          ) : playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5 ml-0.5" />
          )}
        </button>
        <button
          aria-label="Next"
          onClick={() => ctrl(spNext)}
          disabled={busy}
          className="h-7 w-7 rounded-full grid place-items-center text-foreground/80 hover:bg-white/5 transition disabled:opacity-50"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
