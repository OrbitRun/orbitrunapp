import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Headphones, Languages, MapPin, Volume2 } from "lucide-react";
import { loadRuns } from "@/lib/run-types";
import { formatDistance, formatDuration } from "@/lib/run-utils";
import { useI18n, type Lang } from "@/lib/i18n";
import ShoesSection from "@/components/ShoesSection";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const [stats, setStats] = useState({ count: 0, distance: 0, time: 0 });
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    const runs = loadRuns();
    setStats({
      count: runs.length,
      distance: runs.reduce((a, r) => a + r.distanceM, 0),
      time: runs.reduce((a, r) => a + r.durationMs, 0),
    });
  }, []);

  const langs: { code: Lang; label: string }[] = [
    { code: "en", label: "English" },
    { code: "da", label: "Dansk" },
  ];

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="py-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          {t("profile.eyebrow")}
        </div>
        <h1 className="font-display font-black text-3xl tracking-tight">{t("profile.title")}</h1>
      </header>

      <section className="glass-strong rounded-3xl p-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] grid place-items-center text-2xl font-black text-background">
            R
          </div>
          <div>
            <div className="font-display font-bold text-lg">{t("profile.runner")}</div>
            <div className="text-xs text-muted-foreground">{t("profile.member")}</div>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none">
              {t("profile.runs")}
            </div>
            <div className="mt-0.5 font-display font-black text-2xl text-neon tabular leading-none">
              {stats.count}
            </div>
          </div>
          <div className="text-center border-x border-white/10">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none">
              {t("profile.km")}
            </div>
            <div className="mt-0.5 font-display font-black text-2xl tabular leading-none">
              {formatDistance(stats.distance)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none">
              {t("profile.time")}
            </div>
            <div className="mt-0.5 font-display font-black text-2xl tabular leading-none">
              {formatDuration(stats.time)}
            </div>
          </div>
        </div>
      </section>

      {/* Slim status row */}
      <section className="mt-3 glass rounded-2xl px-3 py-2 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-neon" />
          <span className="font-semibold">{t("profile.gps")}</span>
          <span className="text-muted-foreground">· {t("profile.gps.value")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Headphones className="h-3.5 w-3.5 text-neon" />
          <span className="font-semibold">{t("profile.music")}</span>
          <span className="text-muted-foreground">· {t("profile.music.value")}</span>
        </div>
      </section>

      {/* Language selector */}
      <section className="mt-4 glass rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <Languages className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm font-semibold">{t("profile.language")}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {langs.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`py-2.5 rounded-xl text-sm font-bold uppercase tracking-[0.18em] transition active:scale-95 ${
                lang === l.code
                  ? "bg-neon text-primary-foreground shadow-neon"
                  : "bg-white/5 text-foreground/80 hover:bg-white/10"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <ShoesSection />

      <section className="mt-4 glass rounded-2xl divide-y divide-border">
        {[
          { Icon: Volume2, label: t("profile.audio"), value: t("profile.audio.value") },
          { Icon: Bell, label: t("profile.haptic"), value: t("profile.haptic.value") },
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
