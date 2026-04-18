import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, History, User } from "lucide-react";

const items = [
  { to: "/", label: "Run", Icon: Activity },
  { to: "/history", label: "History", Icon: History },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export default function BottomNav() {
  const { location } = useRouterState();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
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
                <span className="text-[10px] font-semibold tracking-wide uppercase">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
