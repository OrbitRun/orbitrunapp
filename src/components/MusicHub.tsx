import { useEffect, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Music2 } from "lucide-react";
import Marquee from "@/components/Marquee";
import { useI18n } from "@/lib/i18n";
import {
  getNowPlaying,
  isAuthed,
  next as spotifyNext,
  pause as spotifyPause,
  play as spotifyPlay,
  previous as spotifyPrev,
  transferToFirstDevice,
  type NowPlaying,
} from "@/lib/spotify";

const MOCK_TRACKS = [
  { title: "Midnight Pulse", artist: "Neon Drift" },
  { title: "Orbit Run", artist: "Synth Capsule" },
  { title: "Lime Horizon", artist: "After Hours" },
];

export default function MusicHub() {
  const { t } = useI18n();
  const [authed, setAuthed] = useState(false);
  const [now, setNow] = useState<NowPlaying | null>(null);
  // Mock fallback state (used when not connected to Spotify)
  const [idx, setIdx] = useState(0);
  const [mockPlaying, setMockPlaying] = useState(false);

  useEffect(() => {
    setAuthed(isAuthed());
  }, []);

  // Poll Spotify when authed
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const n = await getNowPlaying();
        if (!cancelled) setNow(n);
      } catch {
        // Token may have lapsed — silently fail; user can reconnect from profile.
      }
    };
    void tick();
    const id = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [authed]);

  useEffect(() => {
    const onStart = () => setMockPlaying(true);
    const onStop = () => setMockPlaying(false);
    window.addEventListener("orbit:run-start", onStart);
    window.addEventListener("orbit:run-stop", onStop);
    return () => {
      window.removeEventListener("orbit:run-start", onStart);
      window.removeEventListener("orbit:run-stop", onStop);
    };
  }, []);

  // ---- Render: Spotify mode ----
  if (authed && now) {
    const playing = now.isPlaying;
    const progress = now.durationMs > 0 ? Math.min(100, (now.progressMs / now.durationMs) * 100) : 0;
    const handlePlayPause = async () => {
      try {
        if (!now.hasActiveDevice) {
          await transferToFirstDevice();
        }
        if (playing) await spotifyPause();
        else await spotifyPlay();
        // optimistic update
        setNow({ ...now, isPlaying: !playing });
      } catch {
        /* ignore */
      }
    };

    return (
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] flex-shrink-0 grid place-items-center text-background overflow-hidden">
            {now.artworkUrl ? (
              <img src={now.artworkUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <Music2 className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Marquee text={now.title || "—"} className="text-sm font-semibold flex-1 min-w-0" />
              <span className="text-[9px] uppercase tracking-wider text-neon/80 font-bold flex-shrink-0">
                Spotify
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate">{now.artist || "—"}</div>
            <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-neon transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous"
              onClick={() => void spotifyPrev().catch(() => {})}
              className="h-9 w-9 rounded-full grid place-items-center text-foreground/80 hover:text-foreground hover:bg-white/5 transition"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              aria-label={playing ? "Pause" : "Play"}
              onClick={handlePlayPause}
              className="h-10 w-10 rounded-full grid place-items-center bg-neon text-primary-foreground hover:opacity-90 transition active:scale-95"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <button
              aria-label="Next"
              onClick={() => void spotifyNext().catch(() => {})}
              className="h-9 w-9 rounded-full grid place-items-center text-foreground/80 hover:text-foreground hover:bg-white/5 transition"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Render: Mock fallback ----
  const track = MOCK_TRACKS[idx];
  const skip = (dir: 1 | -1) => setIdx((i) => (i + dir + MOCK_TRACKS.length) % MOCK_TRACKS.length);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] flex-shrink-0 grid place-items-center text-background">
          <Music2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Marquee text={track.title} className="text-sm font-semibold flex-1 min-w-0" />
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-bold flex-shrink-0">
              {t("music.demo")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
          <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-neon transition-all" style={{ width: `34%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous"
            onClick={() => skip(-1)}
            className="h-9 w-9 rounded-full grid place-items-center text-foreground/80 hover:text-foreground hover:bg-white/5 transition"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            aria-label={mockPlaying ? "Pause" : "Play"}
            onClick={() => setMockPlaying((p) => !p)}
            className="h-10 w-10 rounded-full grid place-items-center bg-neon text-primary-foreground hover:opacity-90 transition active:scale-95"
          >
            {mockPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <button
            aria-label="Next"
            onClick={() => skip(1)}
            className="h-9 w-9 rounded-full grid place-items-center text-foreground/80 hover:text-foreground hover:bg-white/5 transition"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground/70 text-center">
        {t("music.spotifySoon")}
      </div>
    </div>
  );
}
