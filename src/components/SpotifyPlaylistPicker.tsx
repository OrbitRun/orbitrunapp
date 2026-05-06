import { useEffect, useState } from "react";
import { Check, X, Music2 } from "lucide-react";
import OrbitSpinner from "@/components/OrbitSpinner";
import { useI18n } from "@/lib/i18n";
import {
  beginAuth,
  getActiveWorkoutPlaylist,
  getMyPlaylists,
  hasPlaylistScope,
  setActiveWorkoutPlaylist,
  type SpotifyPlaylist,
} from "@/lib/spotify";

type Props = {
  open: boolean;
  onClose: () => void;
  onChange?: () => void;
};

export default function SpotifyPlaylistPicker({ open, onClose, onChange }: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [activeUri, setActiveUri] = useState<string | null>(
    getActiveWorkoutPlaylist()?.uri ?? null,
  );

  useEffect(() => {
    if (!open) return;
    setActiveUri(getActiveWorkoutPlaylist()?.uri ?? null);
    if (!hasPlaylistScope()) {
      setNeedsReauth(true);
      return;
    }
    setNeedsReauth(false);
    setLoading(true);
    setError(null);
    getMyPlaylists()
      .then((p) => setPlaylists(p))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("401") || msg.includes("403")) setNeedsReauth(true);
        else setError(t("music.playlistLoadError"));
      })
      .finally(() => setLoading(false));
  }, [open, t]);

  const handleSelect = (p: SpotifyPlaylist) => {
    setActiveWorkoutPlaylist({ uri: p.uri, name: p.name, imageUrl: p.imageUrl });
    setActiveUri(p.uri);
    onChange?.();
    onClose();
  };

  const handleClear = () => {
    setActiveWorkoutPlaylist(null);
    setActiveUri(null);
    onChange?.();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-strong w-full sm:max-w-md max-h-[80vh] rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="font-display font-black">{t("music.choosePlaylist")}</div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {needsReauth ? (
            <div className="p-6 text-center">
              <div className="text-sm text-muted-foreground mb-3">{t("music.playlistLoadError")}</div>
              <button
                onClick={() => void beginAuth()}
                className="px-4 h-9 rounded-full text-xs font-bold bg-neon text-primary-foreground"
              >
                {t("music.reconnectForPlaylists")}
              </button>
            </div>
          ) : loading ? (
            <div className="p-8 grid place-items-center text-muted-foreground text-sm gap-2">
              <OrbitSpinner size={24} />
              <span>{t("music.loadingPlaylists")}</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-destructive">{error}</div>
          ) : playlists.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("music.noPlaylists")}</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {activeUri && (
                <li>
                  <button
                    onClick={handleClear}
                    className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-left"
                  >
                    <div className="h-10 w-10 rounded-md bg-white/5 grid place-items-center text-muted-foreground">
                      <X className="h-4 w-4" />
                    </div>
                    <span className="text-sm">{t("music.clearSelection")}</span>
                  </button>
                </li>
              )}
              {playlists.map((p) => {
                const selected = p.uri === activeUri;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => handleSelect(p)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-left"
                    >
                      <div className="h-10 w-10 rounded-md bg-white/5 overflow-hidden flex-shrink-0 grid place-items-center text-muted-foreground">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Music2 className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.ownerName} · {p.trackCount}
                        </div>
                      </div>
                      {selected && <Check className="h-4 w-4 text-neon flex-shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
