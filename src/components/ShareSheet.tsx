import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, MapIcon, Share2, Upload } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { useFreezeTrace, useOverlayTrace } from "@/hooks/use-freeze-trace";
import type { Run } from "@/lib/run-types";
import {
  generateShareCard,
  shareBlob,
  type ShareMode,
} from "@/lib/share-card-v2";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: Run;
};

export default function ShareSheet({ open, onOpenChange, run }: Props) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<ShareMode>("map");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useFreezeTrace("ShareSheet");
  useOverlayTrace("ShareSheet", open);

  // Regenerate preview whenever mode/photo changes while the sheet is open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setGenerating(true);
    setNote(null);
    generateShareCard(run, { mode, photoDataUrl: photoUrl ?? undefined }, lang)
      .then((blob) => {
        if (cancelled) return;
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch(() => {
        /* swallow — user will see no preview, can retry */
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, photoUrl, run, lang]);

  // Cleanup preview URL on close.
  useEffect(() => {
    if (open) return;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setNote(null);
  }, [open]);

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
      setMode("photo");
    };
    reader.readAsDataURL(file);
  };

  const handleShare = async () => {
    if (!blobRef.current || sharing) return;
    setSharing(true);
    try {
      const result = await shareBlob(blobRef.current, run.id, lang);
      if (result === "downloaded") {
        setNote(t("share.downloaded"));
        setTimeout(() => setNote(null), 2400);
      }
    } catch {
      /* user cancelled or share unavailable — no-op */
    } finally {
      setSharing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-background border-t border-border rounded-t-3xl max-h-[92vh] overflow-y-auto p-5"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-display font-black text-xl tracking-tight">
            {t("share.title")}
          </SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/5">
          <button
            onClick={() => setMode("map")}
            className={`h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] transition ${
              mode === "map"
                ? "bg-foreground text-background"
                : "text-muted-foreground"
            }`}
          >
            <MapIcon className="h-4 w-4" />
            {t("share.tabMap")}
          </button>
          <button
            onClick={() => {
              if (photoUrl) setMode("photo");
              else fileRef.current?.click();
            }}
            className={`h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] transition ${
              mode === "photo"
                ? "bg-foreground text-background"
                : "text-muted-foreground"
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            {t("share.tabPhoto")}
          </button>
        </div>

        {/* Preview */}
        <div className="mt-4 aspect-square w-full rounded-2xl overflow-hidden bg-white/5 border border-white/10 relative">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="share preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">
              {t("share.generating")}
            </div>
          )}
          {generating && previewUrl && (
            <div className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full bg-black/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Photo picker action (always visible in photo mode) */}
        {mode === "photo" && (
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-3 w-full h-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-foreground active:scale-95 transition"
          >
            <Upload className="h-4 w-4" />
            {t("share.pickPhoto")}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoPick}
        />

        {/* Share button */}
        <button
          data-diag-target="share-button"
          onClick={handleShare}
          disabled={sharing || generating || !previewUrl}
          className="mt-4 w-full h-14 rounded-2xl bg-neon text-primary-foreground flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.18em] active:scale-95 transition disabled:opacity-60"
        >
          {sharing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          {sharing ? t("share.generating") : t("share.share")}
        </button>
        {note && (
          <div className="mt-2 text-center text-xs text-muted-foreground font-semibold">
            {note}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
