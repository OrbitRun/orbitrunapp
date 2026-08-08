import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, History, Sparkles, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useUserProfile } from "@/hooks/use-user-profile";

export default function BottomNav() {
  const { location } = useRouterState();
  const { t } = useI18n();
  const profile = useUserProfile();
  const [focusMode, setFocusMode] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const check = () => setFocusMode(document.body.classList.contains("focus-mode"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  if (focusMode) return null;
  const coachEnabled = profile.coachEnabled !== false;
  const items = [
    { to: "/", label: t("nav.run"), Icon: Activity },
    ...(coachEnabled ? [{ to: "/coach", label: t("nav.coach"), Icon: Sparkles }] : []),
    { to: "/history", label: t("nav.history"), Icon: History },
    { to: "/profile", label: t("nav.profile"), Icon: User },
  ] as const;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[calc(env(safe-area-inset-bottom)+8px)] pointer-events-none">
      <div className="mx-auto max-w-md px-4">
        <div className="glass-strong rounded-2xl px-2 py-2 flex items-center justify-around shadow-card pointer-events-auto">
          {items.map(({ to, label, Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition ${active ? "text-neon" : "text-muted-foreground"}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold tracking-wide uppercase">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
