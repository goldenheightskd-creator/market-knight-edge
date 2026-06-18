import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Calculator, ShieldCheck, Clock, BookOpen, GraduationCap, Bell, Crosshair } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/levels", label: "Levels", Icon: Calculator },
  { to: "/ict", label: "ICT", Icon: Crosshair },
  { to: "/risk", label: "Risk", Icon: ShieldCheck },
  { to: "/alerts", label: "Alerts", Icon: Bell },
  { to: "/sessions", label: "Sess", Icon: Clock },
  { to: "/journal", label: "Journal", Icon: BookOpen },
  { to: "/learn", label: "Learn", Icon: GraduationCap },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto max-w-2xl grid grid-cols-8 px-1 pt-1 pb-[max(env(safe-area-inset-bottom),8px)]">
        {tabs.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link key={to} to={to} className="group flex flex-col items-center justify-center gap-0.5 py-1.5 text-[9px] font-semibold tracking-wide uppercase">
              <div className={`h-6 w-7 grid place-items-center rounded-md transition-colors ${active ? "bg-accent/15 text-accent" : "text-muted-foreground"}`}>
                <Icon className="h-[14px] w-[14px]" />
              </div>
              <span className={active ? "text-accent" : "text-muted-foreground"}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
