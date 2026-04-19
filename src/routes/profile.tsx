import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Headphones, MapPin, Volume2 } from "lucide-react";
import { loadRuns } from "@/lib/run-types";
import { formatDistance, formatDuration } from "@/lib/run-utils";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const [stats, setStats] = useState({ count: 0, distance: 0, time: 0 });

  useEffect(() => {
    const runs = loadRuns();
    setStats({
      count: runs.length,
      distance: runs.reduce((a, r) => a + r.distanceM, 0),
      time: runs.reduce((a, r) => a + r.durationMs, 0),
    });
  }, []);

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="py-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          Athlete
        </div>
        <h1 className="font-display font-black text-3xl tracking-tight">Profile</h1>
      </header>

      <section className="glass-strong rounded-3xl p-5 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] grid place-items-center text-2xl font-black text-background">
          R
        </div>
        <div>
          <div className="font-display font-bold text-lg">Runner</div>
          <div className="text-xs text-muted-foreground">Member · since today</div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Runs
          </div>
          <div className="font-display font-black text-2xl text-neon tabular">
            {stats.count}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            KM
          </div>
          <div className="font-display font-black text-2xl tabular">
            {formatDistance(stats.distance)}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Time
          </div>
          <div className="font-display font-black text-2xl tabular">
            {formatDuration(stats.time)}
          </div>
        </div>
      </section>

      <section className="mt-4 glass rounded-2xl divide-y divide-border">
        {[
          { Icon: MapPin, label: "GPS accuracy", value: "High" },
          { Icon: Volume2, label: "Audio cues", value: "Every 1 km" },
          { Icon: Headphones, label: "Music source", value: "Spotify (soon)" },
          { Icon: Bell, label: "Haptic feedback", value: "On" },
        ].map(({ Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3">
            <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 text-sm font-semibold">{label}</div>
            <div className="text-xs text-muted-foreground">{value}</div>
          </div>
        ))}
      </section>

      <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Orbit Lab · v1.0
      </p>
    </main>
  );
}
