import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, History, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function BottomNav() {
  const { location } = useRouterState();
  const { t } = useI18n();
  if (location.pathname.startsWith("/onboarding") || location.pathname.startsWith("/auth")) {
    return null;
  }
  const items = [
    { to: "/", label: t("nav.run"), Icon: Activity },
    { to: "/history", label: t("nav.history"), Icon: History },
    { to: "/profile", label: t("nav.profile"), Icon: User },
  ] as const;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-4 pb-3">
        <div className="glass-strong rounded-2xl px-2 py-2 flex items-center justify-around shadow-card">
          {items.map(({ to, label, Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition ${active ? "text-neon" : "text-muted-foreground"}`}
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
