import { useEffect, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

type Track = { title: string; artist: string };

const PLAYLIST: Track[] = [
  { title: "Midnight Sprint", artist: "AURA" },
  { title: "Neon Pulse", artist: "Kavinsky" },
  { title: "Run the Lights", artist: "ODESZA" },
  { title: "Carbon", artist: "RÜFÜS DU SOL" },
  { title: "Velocity", artist: "Bonobo" },
];

export default function MusicHub() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setIdx((i) => (i + 1) % PLAYLIST.length);
          return 0;
        }
        return p + 0.5;
      });
    }, 200);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => setProgress(0), [idx]);

  const track = PLAYLIST[idx];

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3">
      <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] flex-shrink-0 overflow-hidden">
        <div
          className={`absolute inset-0 grid place-items-center text-background font-black text-lg ${playing ? "animate-spin-slow" : ""}`}
          style={{ animation: playing ? "spin 6s linear infinite" : undefined }}
        >
          ♪
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{track.title}</div>
        <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
        <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-neon transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          aria-label="Previous"
          onClick={() => setIdx((i) => (i - 1 + PLAYLIST.length) % PLAYLIST.length)}
          className="h-9 w-9 rounded-full grid place-items-center text-foreground/80 hover:text-foreground hover:bg-white/5 transition"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => setPlaying((p) => !p)}
          className="h-10 w-10 rounded-full grid place-items-center bg-neon text-primary-foreground hover:opacity-90 transition active:scale-95"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
        <button
          aria-label="Next"
          onClick={() => setIdx((i) => (i + 1) % PLAYLIST.length)}
          className="h-9 w-9 rounded-full grid place-items-center text-foreground/80 hover:text-foreground hover:bg-white/5 transition"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
