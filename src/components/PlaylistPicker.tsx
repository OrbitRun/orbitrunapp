import { useEffect, useState } from "react";
import { Flame, Wind, Waves, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  beginAuth,
  isAuthed,
  isConfigured,
  playContext,
  transferToFirstDevice,
} from "@/lib/spotify";

type PlaylistDef = {
  key: "tempo" | "easy" | "long";
  uri: string;
  Icon: LucideIcon;
};

// Curated Spotify editorial playlists — work for any Spotify user.
const PLAYLISTS: PlaylistDef[] = [
  { key: "tempo", uri: "spotify:playlist:37i9dQZF1DX35oM5SPECmN", Icon: Flame },
  { key: "easy", uri: "spotify:playlist:37i9dQZF1DWSJHnPb1f0X3", Icon: Wind },
  { key: "long", uri: "spotify:playlist:37i9dQZF1DWZZbwlv3Vmtr", Icon: Waves },
];

export default function PlaylistPicker() {
  const { t } = useI18n();
  const configured = isConfigured();
  const [authed, setAuthed] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    setAuthed(isAuthed());
  }, []);

  const startPlaylist = async (p: PlaylistDef) => {
    if (!configured) return;
    if (!isAuthed()) {
      try {
        setBusyKey(p.key);
        await beginAuth();
      } catch (err) {
        setBusyKey(null);
        toast.error(err instanceof Error ? err.message : "Connect failed");
      }
      return;
    }

    setBusyKey(p.key);
    try {
      await playContext(p.uri);
      setActiveKey(p.key);
      toast.success(t("music.started"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404")) {
        // No active device — try to transfer & retry once.
        try {
          const ok = await transferToFirstDevice();
          if (ok) {
            await new Promise((r) => setTimeout(r, 350));
            await playContext(p.uri);
            setActiveKey(p.key);
            toast.success(t("music.started"));
          } else {
            toast.error(t("music.noDevice"));
          }
        } catch {
          toast.error(t("music.noDevice"));
        }
      } else if (msg.includes("403")) {
        toast.error(t("music.premiumRequired"));
      } else if (msg.includes("401")) {
        setAuthed(false);
        toast.error(t("music.connect"));
      } else {
        toast.error(msg);
      }
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section aria-label={t("music.pickTitle")}>
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
          {t("music.pickTitle")}
        </div>
        <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
          {configured && !authed ? t("music.connectHint") : t("music.pickHint")}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PLAYLISTS.map((p) => {
          const isActive = activeKey === p.key;
          const isBusy = busyKey === p.key;
          const label = t(`music.playlist.${p.key}`);
          const hint = t(`music.playlist.${p.key}Hint`);
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => startPlaylist(p)}
              disabled={isBusy || !configured}
              aria-pressed={isActive}
              className={`relative overflow-hidden text-left rounded-2xl border bg-white/5 hover:bg-white/[0.07] active:scale-[0.98] transition px-3 py-3 disabled:opacity-50 ${
                isActive ? "border-white/15" : "border-white/10"
              }`}
            >
              {/* Spotify-green left edge accent only when active */}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                  style={{ background: "var(--spotify)" }}
                />
              )}
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-white/5 grid place-items-center text-foreground/80">
                  <p.Icon className="h-3.5 w-3.5" />
                </div>
                {isActive && (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--spotify)" }}
                  />
                )}
              </div>
              <div className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] truncate">
                {label}
              </div>
              <div className="mt-0.5 text-[9px] text-muted-foreground truncate">
                {isBusy ? t("music.starting") : hint}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
