import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calculator, ShieldCheck, BookOpen, Bell, Clock, Crosshair, GraduationCap, Check } from "lucide-react";
import { Card, Cell, SectionHeader } from "@/components/Prim";
import { fmt, fmtMoney, fmtPct } from "@/lib/format";
import { useAuthSession, useTrades, useAssetLevels, useTodayChecklist, useUpdateChecklist } from "@/lib/cloud";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Market.knight" },
      { name: "description", content: "Your trading command center: session status, recent trades, win rate, plan discipline, active levels and the daily checklist." },
      { property: "og:title", content: "Dashboard — Market.knight" },
      { property: "og:description", content: "Your trading command center: session status, recent trades, win rate, plan discipline, active levels and the daily checklist." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuthSession();
  const { data: trades = [] } = useTrades(user?.id);
  const { data: levels = [] } = useAssetLevels(user?.id);
  const { data: checklist } = useTodayChecklist(user?.id);
  const updateChecklist = useUpdateChecklist(user?.id);

  const name = ((user?.user_metadata as any)?.full_name as string | undefined)?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "trader";

  // Active levels = updated in last 24h
  const activeLevels = levels.filter((l) => Date.now() - new Date(l.updated_at).getTime() < 24 * 60 * 60 * 1000);

  // Stats — last 30d
  const recentTrades = trades.slice(0, 5);
  const t30 = trades.filter((t) => Date.now() - new Date(t.trade_date).getTime() < 30 * 24 * 60 * 60 * 1000);
  const wins = t30.filter((t) => t.outcome === "Win").length;
  const wr = t30.length > 0 ? (wins / t30.length) * 100 : 0;
  const planned = t30.filter((t) => t.followed_plan).length;
  const disc = t30.length > 0 ? (planned / t30.length) * 100 : 0;
  const totalPnl = t30.reduce((a, t) => a + (t.pnl ?? 0), 0);

  // Session status
  const session = useSessionStatus();

  // Auto-tick session when home is loaded (visiting home counts as "checked")
  useEffect(() => {
    if (user?.id && checklist && !checklist.checked_session) {
      updateChecklist.mutate({ checked_session: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, checklist?.checked_session]);

  return (
    <div className="space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Welcome back, {name}.</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
      </div>

      {/* Session */}
      <Card title="Today's Session">
        <div className={`rounded-md p-3 border ${session.tone === "peak" ? "border-warning bg-warning/10" : session.tone === "active" ? "border-success bg-success/10" : "border-border bg-surface-2"}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-xs font-bold uppercase tracking-wider ${session.tone === "peak" ? "text-warning" : session.tone === "active" ? "text-success" : "text-muted-foreground"}`}>{session.title}</div>
              <div className="text-[11px] text-foreground/80 mt-0.5">{session.body}</div>
            </div>
            <Link to="/sessions" className="tag bg-accent/20 text-accent border border-accent/40">Open</Link>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Cell label="Win Rate (30d)" value={t30.length ? fmtPct(wr, 1) : "—"} tone={wr >= 50 ? "success" : wr > 0 ? "danger" : undefined} />
        <Cell label="Plan Discipline" value={t30.length ? fmtPct(disc, 0) : "—"} tone={disc >= 80 ? "success" : disc > 0 ? "warning" : undefined} />
        <Cell label="P&L (30d)" value={t30.length ? fmtMoney(totalPnl) : "—"} tone={totalPnl >= 0 ? "success" : "danger"} />
        <Cell label="Active Levels" value={String(activeLevels.length)} tone={activeLevels.length > 0 ? "success" : undefined} />
      </div>

      {/* Daily checklist */}
      <Card title="Daily Checklist" subtitle="Habits compound. Tick three to start the day right.">
        <ul className="space-y-1.5">
          <ChecklistItem
            label="Marked today's levels"
            done={!!checklist?.marked_levels}
            onToggle={() => updateChecklist.mutate({ marked_levels: !checklist?.marked_levels })}
            href="/levels"
          />
          <ChecklistItem
            label="Checked session clock"
            done={!!checklist?.checked_session}
            onToggle={() => updateChecklist.mutate({ checked_session: !checklist?.checked_session })}
            href="/sessions"
          />
          <ChecklistItem
            label="Calculated my risk"
            done={!!checklist?.risk_calculated}
            onToggle={() => updateChecklist.mutate({ risk_calculated: !checklist?.risk_calculated })}
            href="/risk"
          />
        </ul>
      </Card>

      {/* Recent trades */}
      <Card title="Last 5 Trades" action={<Link to="/journal" className="text-[11px] text-accent">All trades →</Link>}>
        {recentTrades.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">No trades yet. <Link to="/journal" className="text-accent underline">Log your first trade</Link>.</div>
        ) : (
          <ul className="space-y-1.5">
            {recentTrades.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`tag ${t.outcome === "Win" ? "bg-success/20 text-success border border-success/40" : t.outcome === "Loss" ? "bg-danger/20 text-danger border border-danger/40" : "bg-muted text-muted-foreground"}`}>{t.outcome}</span>
                  <span className="text-xs font-bold">{t.asset}</span>
                  <span className={`tag ${t.direction === "Long" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>{t.direction}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{t.trade_date}</span>
                  <span className={`mono text-xs font-bold ${t.pnl > 0 ? "text-success" : t.pnl < 0 ? "text-danger" : "text-muted-foreground"}`}>{fmtMoney(t.pnl)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Active levels list */}
      {activeLevels.length > 0 && (
        <Card title="Active Levels (24h)" action={<Link to="/levels" className="text-[11px] text-accent">Edit →</Link>}>
          <ul className="space-y-1.5">
            {activeLevels.slice(0, 5).map((l) => (
              <li key={l.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-1.5 text-xs">
                <span className="font-bold">{l.asset}</span>
                <div className="flex items-center gap-2 mono text-muted-foreground">
                  {l.levels.pdh != null && <span>PDH <span className="text-foreground">{fmt(l.levels.pdh, 4)}</span></span>}
                  {l.levels.pdl != null && <span>PDL <span className="text-foreground">{fmt(l.levels.pdl, 4)}</span></span>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Quick actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-4 gap-2">
          <Quick to="/levels" Icon={Calculator} label="Levels" />
          <Quick to="/ict" Icon={Crosshair} label="ICT" />
          <Quick to="/risk" Icon={ShieldCheck} label="Risk" />
          <Quick to="/alerts" Icon={Bell} label="Alerts" />
          <Quick to="/sessions" Icon={Clock} label="Sessions" />
          <Quick to="/journal" Icon={BookOpen} label="Journal" />
          <Quick to="/learn" Icon={GraduationCap} label="Learn" />
        </div>
      </Card>
    </div>
  );
}

function ChecklistItem({ label, done, onToggle, href }: { label: string; done: boolean; onToggle: () => void; href: string }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <button onClick={onToggle} className={`flex-1 flex items-center gap-2 text-left rounded-md px-3 py-2 border text-sm ${done ? "border-success/40 bg-success/10 text-success" : "border-border bg-surface-2 text-foreground"}`}>
        <span className={`h-5 w-5 rounded grid place-items-center ${done ? "bg-success" : "border border-muted-foreground"}`}>
          {done && <Check className="h-3.5 w-3.5 text-background" />}
        </span>
        {label}
      </button>
      <Link to={href} className="tag bg-accent/15 text-accent border border-accent/30">Go</Link>
    </li>
  );
}

function Quick({ to, Icon, label }: { to: string; Icon: any; label: string }) {
  return (
    <Link to={to as any} className="flex flex-col items-center gap-1 rounded-md border border-border bg-surface-2 py-2.5">
      <Icon className="h-5 w-5 text-accent" />
      <span className="text-[10px] uppercase tracking-wider font-bold text-foreground/80">{label}</span>
    </Link>
  );
}

function useSessionStatus() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(i); }, []);
  const u = now.getUTCHours() + now.getUTCMinutes() / 60;
  const inLDN = u >= 7 && u < 16;
  const inNY = u >= 13 && u < 22;
  const overlap = u >= 13 && u < 16;
  if (overlap) return { tone: "peak" as const, title: "PEAK — London/NY Overlap", body: "Best liquidity of the day. Trade A+ setups only." };
  if (inNY) return { tone: "active" as const, title: "New York Session Active", body: "Watch the 14:30 UTC cash open ignition." };
  if (inLDN) return { tone: "active" as const, title: "London Session Active", body: "Trend session. Look for London raid → reverse." };
  return { tone: "idle" as const, title: "Quiet Window", body: "Low liquidity. Avoid new entries; manage existing trades." };
}
