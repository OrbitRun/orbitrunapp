import { useEffect, useState } from "react";
import { ListMusic, LogOut, Music2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import SpotifyPlaylistPicker from "@/components/SpotifyPlaylistPicker";
import { useI18n } from "@/lib/i18n";
import {
  beginAuth,
  fullReset,
  getActiveWorkoutPlaylist,
  isAuthed,
  isConfigured,
  logout,
  setActiveWorkoutPlaylist,
  type ActiveWorkoutPlaylist,
} from "@/lib/spotify";

const SPOTIFY_GREEN = "#1DB954";

export default function MusicIntegrationSection() {
  const { t } = useI18n();
  const configured = isConfigured();
  const [authed, setAuthed] = useState(false);
  const [playlist, setPlaylist] = useState<ActiveWorkoutPlaylist | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(isAuthed());
    setPlaylist(getActiveWorkoutPlaylist());
  }, []);

  // React to the native deep-link OAuth round-trip so the "Forbinder…" state
  // clears as soon as the token has been exchanged (or we got an error).
  useEffect(() => {
    const onAuthed = () => {
      setAuthed(isAuthed());
      setPlaylist(getActiveWorkoutPlaylist());
      setBusy(false);
    };
    const onError = (e: Event) => {
      setBusy(false);
      const detail = (e as CustomEvent).detail;
      toast.error(typeof detail === "string" ? detail : "Spotify connect failed");
    };
    window.addEventListener("orbit:spotify-authed", onAuthed);
    window.addEventListener("orbit:spotify-auth-error", onError);
    return () => {
      window.removeEventListener("orbit:spotify-authed", onAuthed);
      window.removeEventListener("orbit:spotify-auth-error", onError);
    };
  }, []);

  const handleConnect = async () => {
    let safety: ReturnType<typeof setTimeout> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let onFocus: (() => void) | null = null;
    const clearTimers = () => {
      if (safety) clearTimeout(safety);
      if (poll) clearInterval(poll);
      if (onFocus) {
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onFocus);
      }
    };
    try {
      setBusy(true);
      await beginAuth();
      // Poll isAuthed() every 2s in case the appUrlOpen event fired but
      // we missed it (e.g. listener torn down during the Safari handoff).
      poll = setInterval(() => {
        if (isAuthed()) {
          clearTimers();
          setAuthed(true);
          setPlaylist(getActiveWorkoutPlaylist());
          setBusy(false);
        }
      }, 2_000);
      // When the app returns to the foreground (user came back from Safari),
      // re-check auth state immediately instead of waiting up to 2s for poll.
      onFocus = () => {
        if (isAuthed()) {
          clearTimers();
          setAuthed(true);
          setPlaylist(getActiveWorkoutPlaylist());
          setBusy(false);
        }
      };
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onFocus);
      // Safety net: 3 minutes — enough time for first-time Spotify login +
      // "Open in Orbit Run?" prompt. The poll above clears the spinner
      // instantly on success, so this only fires if the user truly cancelled.
      safety = setTimeout(() => {
        clearTimers();
        setAuthed(isAuthed());
        setBusy(false);
      }, 180_000);
    } catch (err) {
      clearTimers();
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Connect failed");
    }
  };

  const handleDisconnect = () => {
    logout();
    setActiveWorkoutPlaylist(null);
    setAuthed(false);
    setPlaylist(null);
  };

  const handleClearPlaylist = () => {
    setActiveWorkoutPlaylist(null);
    setPlaylist(null);
  };

  return (
    <section
      className="mt-4 rounded-2xl p-4 border bg-white/[0.02]"
      style={{ borderColor: `${SPOTIFY_GREEN}33` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="h-9 w-9 rounded-xl grid place-items-center text-black"
          style={{ backgroundColor: SPOTIFY_GREEN }}
        >
          <Music2 className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{t("profile.musicIntegration")}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {t("profile.musicIntegrationHint")}
          </div>
        </div>
      </div>

      {!configured ? (
        <div className="text-xs text-muted-foreground">{t("music.notConfigured")}</div>
      ) : !authed ? (
        <div className="space-y-2">
          <button
            onClick={handleConnect}
            disabled={busy}
            className="w-full h-10 rounded-xl text-sm font-bold text-black hover:opacity-90 transition active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: SPOTIFY_GREEN }}
          >
            {busy ? t("music.connecting") : t("music.connect")}
          </button>
          {busy && (
            <button
              onClick={() => {
                void fullReset();
                setBusy(false);
                setAuthed(false);
                setPlaylist(null);
                toast.success("Spotify-login nulstillet");
              }}
              className="w-full h-9 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-muted-foreground transition"
            >
              <RotateCcw className="h-3 w-3" />
              Annullér / nulstil login
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Account row */}
          <div className="flex items-center gap-2">
            <div
              className="text-[10px] uppercase tracking-[0.2em] font-bold px-2 py-1 rounded-md"
              style={{ backgroundColor: `${SPOTIFY_GREEN}1F`, color: SPOTIFY_GREEN }}
            >
              Spotify · Connected
            </div>
            <div className="flex-1" />
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-white/5 transition"
            >
              <LogOut className="h-3 w-3" />
              {t("music.disconnect")}
            </button>
          </div>

          {/* Default playlist */}
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <ListMusic className="h-3.5 w-3.5" style={{ color: SPOTIFY_GREEN }} />
              <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
                {t("music.defaultPlaylist")}
              </div>
            </div>

            {playlist ? (
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-white/5 overflow-hidden grid place-items-center text-muted-foreground flex-shrink-0">
                  {playlist.imageUrl ? (
                    <img src={playlist.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Music2 className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{playlist.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t("music.willAutoPlay")}
                  </div>
                </div>
                <button
                  aria-label={t("music.clearSelection")}
                  onClick={handleClearPlaylist}
                  className="h-7 w-7 rounded-full grid place-items-center text-muted-foreground hover:bg-white/10 hover:text-foreground transition flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mb-2">
                {t("music.noPlaylistSelected")}
              </div>
            )}

            <button
              onClick={() => setPickerOpen(true)}
              className="mt-3 w-full h-9 rounded-lg text-xs font-bold text-black hover:opacity-90 transition active:scale-[0.98]"
              style={{ backgroundColor: SPOTIFY_GREEN }}
            >
              {playlist ? t("music.changePlaylist") : t("music.choosePlaylist")}
            </button>
          </div>
        </div>
      )}

      <SpotifyPlaylistPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onChange={() => setPlaylist(getActiveWorkoutPlaylist())}
      />
    </section>
  );
}
