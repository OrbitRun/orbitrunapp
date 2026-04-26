import { useState } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { nextCoachTask, type UserProfile } from "@/lib/user-profile";
import CoachOnboarding from "@/components/CoachOnboarding";

type Props = { profile: UserProfile };

export default function CoachCard({ profile }: Props) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const configured = !!profile.coach;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full mb-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-3 text-left active:scale-[0.99] transition"
      >
        <div className="h-10 w-10 rounded-xl bg-white/5 grid place-items-center text-foreground/80 border border-white/10 flex-shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold leading-none">
            {t("coach.cardTitle")}
          </div>
          <div className="mt-1 text-sm font-bold text-foreground truncate">
            {configured
              ? `${t("coach.next")}: ${nextCoachTask(profile, lang)}`
              : t("coach.cta.unset")}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>
      {open && <CoachOnboarding onClose={() => setOpen(false)} />}
    </>
  );
}
