import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, Cell, NumInput, Select, SectionHeader } from "@/components/Prim";
import { fmt, fmtMoney, fmtPct } from "@/lib/format";
import { ASSETS } from "@/lib/assets";
import { useAuthSession, useTrades, useSaveTrade, useDeleteTrade, type Trade } from "@/lib/cloud";

export const Route = createFileRoute("/_authenticated/journal")({
  validateSearch: (s: Record<string, unknown>) => ({
    asset: typeof s.asset === "string" ? s.asset : undefined,
    direction: s.direction === "Long" || s.direction === "Short" ? s.direction : undefined,
    level: typeof s.level === "string" ? s.level : undefined,
    new: s.new === "1" || s.new === true ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Trade Journal — Market.knight" },
      { name: "description", content: "Log trades, track win rate, plan discipline and a 30-day challenge — synced to your cloud." },
      { property: "og:title", content: "Trade Journal — Market.knight" },
      { property: "og:description", content: "Log trades, track win rate, plan discipline and a 30-day challenge — synced to your cloud." },
    ],
  }),
  component: JournalPage,
});

const SETUPS = ["PDH Rejection", "PDL Support", "Round Number", "Confluence", "BOS Entry", "CHOCH Entry", "FVG Fill", "Breakout"];
const EMOTIONS = ["Calm", "Confident", "Anxious", "FOMO", "Revenge", "Focused"];
type Outcome = "Win" | "Loss" | "Breakeven";

function JournalPage() {
  const search = useSearch({ from: "/_authenticated/journal" });
  const { user } = useAuthSession();
  const { data: trades = [], isLoading } = useTrades(user?.id);
  const deleteTrade = useDeleteTrade(user?.id);

  const [filter, setFilter] = useState<"All" | Outcome>("All");
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"log" | "stats">("log");

  // Auto-open form when arriving from an alert
  useEffect(() => {
    if (search.new || search.asset) {
      setShowForm(true);
      setTab("log");
    }
  }, [search.new, search.asset]);

  const filtered = filter === "All" ? trades : trades.filter((t) => t.outcome === filter);

  return (
    <div className="space-y-4">
      <SectionHeader title="Trade Journal" subtitle="What gets measured gets managed. Synced to your cloud." />

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setTab("log")} className={`h-10 rounded-md border text-sm font-bold uppercase tracking-wider ${tab === "log" ? "bg-accent text-accent-foreground border-accent" : "bg-surface border-border text-muted-foreground"}`}>Log</button>
        <button onClick={() => setTab("stats")} className={`h-10 rounded-md border text-sm font-bold uppercase tracking-wider ${tab === "stats" ? "bg-accent text-accent-foreground border-accent" : "bg-surface border-border text-muted-foreground"}`}>Stats</button>
      </div>

      {tab === "log" && (
        <>
          <button onClick={() => setShowForm((v) => !v)} className="w-full h-11 rounded-md bg-accent text-accent-foreground text-sm font-bold uppercase tracking-wider glow-accent">
            {showForm ? "Close Form" : "+ New Trade"}
          </button>

          {showForm && (
            <TradeForm
              initialAsset={search.asset}
              initialDirection={search.direction}
              initialEntry={search.level}
              onSaved={() => setShowForm(false)}
            />
          )}

          <Card title="Trades" subtitle={`${filtered.length} entries`} action={
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="h-8 rounded-md bg-background border border-input px-2 text-xs">
              <option value="All">All</option><option value="Win">Wins</option><option value="Loss">Losses</option><option value="Breakeven">Breakeven</option>
            </select>
          }>
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-6">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">No trades yet. Log your first.</div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((t) => (
                  <li key={t.id} className="rounded-md border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`tag ${t.outcome === "Win" ? "bg-success/20 text-success border border-success/40" : t.outcome === "Loss" ? "bg-danger/20 text-danger border border-danger/40" : "bg-muted text-muted-foreground"}`}>{t.outcome}</span>
                        <span className="font-bold text-sm">{t.asset}</span>
                        <span className={`tag ${t.direction === "Long" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>{t.direction}</span>
                      </div>
                      <span className={`mono text-sm font-bold ${t.pnl > 0 ? "text-success" : t.pnl < 0 ? "text-danger" : "text-muted-foreground"}`}>{fmtMoney(t.pnl)}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                      <MiniCell label="Entry" v={fmt(t.entry ?? 0, 4)} />
                      <MiniCell label="Stop"  v={fmt(t.stop ?? 0, 4)} />
                      <MiniCell label="Target" v={fmt(t.target ?? 0, 4)} />
                      <MiniCell label="R:R"  v={fmt(computeRR(t), 2)} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{t.trade_date} · {t.setup} · {t.emotion}</span>
                      <span className={t.followed_plan ? "text-success" : "text-danger"}>{t.followed_plan ? "Plan ✓" : "No plan ✗"}</span>
                    </div>
                    {(t.notes || t.lesson) && (
                      <div className="mt-1.5 space-y-1 text-xs">
                        {t.notes && <div className="text-foreground/80"><span className="text-muted-foreground">Notes:</span> {t.notes}</div>}
                        {t.lesson && <div className="text-warning"><span className="text-muted-foreground">Lesson:</span> {t.lesson}</div>}
                      </div>
                    )}
                    <button onClick={() => deleteTrade.mutate(t.id)} className="mt-2 text-[11px] text-muted-foreground hover:text-danger">Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {tab === "stats" && <Stats trades={trades} />}
    </div>
  );
}

function computeRR(t: Trade) {
  const r = Math.abs((t.entry ?? 0) - (t.stop ?? 0));
  return r > 0 ? Math.abs((t.target ?? 0) - (t.entry ?? 0)) / r : 0;
}

function MiniCell({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded bg-background px-1.5 py-1">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mono text-[11px] font-semibold">{v}</div>
    </div>
  );
}

function TradeForm({ onSaved, initialAsset, initialDirection, initialEntry }: { onSaved: () => void; initialAsset?: string; initialDirection?: "Long" | "Short"; initialEntry?: string }) {
  const { user } = useAuthSession();
  const saveTrade = useSaveTrade(user?.id);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [asset, setAsset] = useState(initialAsset ?? ASSETS[0].symbol);
  const [direction, setDirection] = useState<"Long" | "Short">(initialDirection ?? "Long");
  const [setup, setSetup] = useState(SETUPS[0]);
  const [entry, setEntry] = useState(initialEntry ?? "");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [exit, setExit] = useState("");
  const [pnl, setPnl] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("Win");
  const [emotion, setEmotion] = useState(EMOTIONS[0]);
  const [followedPlan, setFollowedPlan] = useState(true);
  const [notes, setNotes] = useState("");
  const [lesson, setLesson] = useState("");

  const e = parseFloat(entry), s = parseFloat(stop), t = parseFloat(target);
  const rr = s !== e ? Math.abs(t - e) / Math.abs(e - s) : 0;

  return (
    <Card title="New Trade" subtitle={initialAsset ? `Pre-filled from ${initialAsset} alert` : undefined}>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1"><span className="text-[11px] uppercase tracking-wider text-muted-foreground">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mono h-10 rounded-md bg-background border border-input px-2 text-sm" />
        </label>
        <Select label="Asset" value={asset} onChange={setAsset} options={ASSETS.map((a) => ({ value: a.symbol, label: a.symbol }))} />
        <Select label="Direction" value={direction} onChange={(v) => setDirection(v as any)} options={[{ value: "Long", label: "Long" }, { value: "Short", label: "Short" }]} />
        <Select label="Setup" value={setup} onChange={setSetup} options={SETUPS.map((s) => ({ value: s, label: s }))} />
        <NumInput label="Entry" value={entry} onChange={setEntry} dec={4} />
        <NumInput label="Stop" value={stop} onChange={setStop} dec={4} />
        <NumInput label="Target" value={target} onChange={setTarget} dec={4} />
        <NumInput label="Exit" value={exit} onChange={setExit} dec={4} />
        <Select label="Outcome" value={outcome} onChange={(v) => setOutcome(v as Outcome)} options={[{ value: "Win", label: "Win" }, { value: "Loss", label: "Loss" }, { value: "Breakeven", label: "Breakeven" }]} />
        <NumInput label="P&L ($)" value={pnl} onChange={setPnl} dec={2} />
        <Select label="Emotion" value={emotion} onChange={setEmotion} options={EMOTIONS.map((e) => ({ value: e, label: e }))} />
        <label className="flex flex-col gap-1"><span className="text-[11px] uppercase tracking-wider text-muted-foreground">R:R (auto)</span>
          <div className="mono h-10 rounded-md bg-surface-2 border border-border px-2 text-sm flex items-center font-semibold">{rr ? fmt(rr, 2) : "—"}</div>
        </label>
      </div>
      <label className="flex items-center gap-2 mt-2 text-sm">
        <input type="checkbox" checked={followedPlan} onChange={(e) => setFollowedPlan(e.target.checked)} className="h-4 w-4 accent-[#00c8f0]" />
        Followed my plan
      </label>
      <label className="flex flex-col gap-1 mt-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-md bg-background border border-input px-2 py-1.5 text-sm" />
      </label>
      <label className="flex flex-col gap-1 mt-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Key Lesson</span>
        <textarea value={lesson} onChange={(e) => setLesson(e.target.value)} rows={2} className="rounded-md bg-background border border-input px-2 py-1.5 text-sm" />
      </label>
      <button
        disabled={saveTrade.isPending}
        onClick={async () => {
          await saveTrade.mutateAsync({
            trade_date: date, asset, direction, setup,
            entry: parseFloat(entry) || null, stop: parseFloat(stop) || null,
            target: parseFloat(target) || null, exit_price: parseFloat(exit) || null,
            outcome, pnl: parseFloat(pnl) || 0, emotion, followed_plan: followedPlan, notes, lesson,
          });
          onSaved();
        }}
        className="mt-3 w-full h-11 rounded-md bg-success text-background text-sm font-bold uppercase tracking-wider disabled:opacity-50"
      >{saveTrade.isPending ? "Saving…" : "Save Trade"}</button>
    </Card>
  );
}

function Stats({ trades }: { trades: Trade[] }) {
  const stats = useMemo(() => {
    if (trades.length === 0) return null;
    const wins = trades.filter((t) => t.outcome === "Win").length;
    const losses = trades.filter((t) => t.outcome === "Loss").length;
    const wr = (wins / trades.length) * 100;
    const totalPnL = trades.reduce((a, t) => a + (t.pnl ?? 0), 0);
    const planned = trades.filter((t) => t.followed_plan).length;
    const disc = (planned / trades.length) * 100;
    const avgRR = trades.reduce((a, t) => a + computeRR(t), 0) / trades.length;
    return { wins, losses, wr, totalPnL, disc, avgRR };
  }, [trades]);

  const target30 = 30;
  const progress = Math.min(100, (trades.length / target30) * 100);
  const milestones = [5, 10, 20, 30];

  return (
    <div className="space-y-4">
      <Card title="Performance">
        {!stats ? (
          <div className="text-sm text-muted-foreground text-center py-6">Log trades to see stats.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Cell label="Win Rate" value={fmtPct(stats.wr, 1)} tone={stats.wr >= 50 ? "success" : "danger"} />
            <Cell label="Total P&L" value={fmtMoney(stats.totalPnL)} tone={stats.totalPnL >= 0 ? "success" : "danger"} />
            <Cell label="Plan Discipline" value={fmtPct(stats.disc, 0)} tone={stats.disc >= 80 ? "success" : "warning"} />
            <Cell label="Avg R:R" value={fmt(stats.avgRR, 2)} tone={stats.avgRR >= 2 ? "success" : "warning"} />
            <Cell label="Wins / Losses" value={`${stats.wins} / ${stats.losses}`} />
            <Cell label="Total Trades" value={String(trades.length)} />
          </div>
        )}
      </Card>

      <Card title="30-Day Challenge" subtitle={`${trades.length} / ${target30} trades logged`}>
        <div className="h-3 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent to-success transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {milestones.map((m) => {
            const hit = trades.length >= m;
            return (
              <div key={m} className={`rounded-md p-2 text-center border ${hit ? "border-success/40 bg-success/10 text-success" : "border-border bg-surface-2 text-muted-foreground"}`}>
                <div className="mono text-base font-bold">{m}</div>
                <div className="text-[10px] uppercase tracking-wider">{hit ? "Unlocked" : "Locked"}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
