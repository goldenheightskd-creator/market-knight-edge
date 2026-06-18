import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Trash2, Volume2, VolumeX, X, Check, BookOpen } from "lucide-react";
import { Card, NumInput, SectionHeader } from "@/components/Prim";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { ASSETS, findAsset } from "@/lib/assets";
import { fmt } from "@/lib/format";
import { useAuthSession, useAssetLevels, useAlertsLog, useLogAlert, useClearAlerts } from "@/lib/cloud";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Screen Marker Alerts — Market.knight" },
      { name: "description", content: "Multi-asset price level alerts with sound, flash, cloud log and one-tap journal entry." },
      { property: "og:title", content: "Screen Marker Alerts — Market.knight" },
      { property: "og:description", content: "Multi-asset price level alerts with sound, flash, cloud log and one-tap journal entry." },
    ],
  }),
  component: AlertsPage,
});

const WATCH_SYMBOLS = ["MES", "EUR/USD", "BTC/USD", "ETH/USD", "SPY"] as const;
type WatchSymbol = typeof WATCH_SYMBOLS[number];

if (!findAsset("SPY")) {
  ASSETS.push({ symbol: "SPY", name: "S&P 500 ETF", group: "Stocks", decimals: 2, roundStep: 5 });
}

interface AssetWatch { symbol: string; current: string; pdh: string; pdl: string; pwh: string; pwl: string; threshold: string; }

const CHECKLIST_QUESTIONS = [
  "Price at a key level (PDH/PDL/PWH/PWL/round)?",
  "Higher-timeframe bias clear?",
  "Active session (London / NY)?",
  "BOS or CHOCH confirms direction?",
  "Risk:Reward ≥ 2:1?",
  "Risk ≤ 1% of account?",
  "Emotionally calm — no revenge?",
];

function beep(times: number) {
  if (typeof window === "undefined") return;
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      const start = now + i * 0.18; const end = start + 0.12;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.4, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      o.connect(g).connect(ctx.destination);
      o.start(start); o.stop(end + 0.02);
    }
    setTimeout(() => ctx.close(), times * 200 + 400);
  } catch {}
}

function evaluateHits(w: AssetWatch) {
  const cp = parseFloat(w.current); const thr = parseFloat(w.threshold);
  if (!isFinite(cp) || !isFinite(thr) || thr <= 0) return { hits: [] as string[], kind: null as null | "single" | "double" | "triple", price: cp };
  const a = findAsset(w.symbol); const step = a?.roundStep ?? 1; const dec = a?.decimals ?? 2;
  const hits: string[] = []; let hasKey = false; let hasRound = false;
  const check = (label: string, val: number, key: boolean) => {
    if (!isFinite(val)) return;
    if (Math.abs(cp - val) <= thr) { hits.push(`${label} ${fmt(val, dec)}`); if (key) hasKey = true; }
  };
  check("PDH", parseFloat(w.pdh), true);
  check("PDL", parseFloat(w.pdl), true);
  check("PWH", parseFloat(w.pwh), true);
  check("PWL", parseFloat(w.pwl), true);
  const nearestRound = Math.round(cp / step) * step;
  if (Math.abs(cp - nearestRound) <= thr) { hits.push(`Round ${fmt(nearestRound, dec)}`); hasRound = true; }
  if (hits.length === 0) return { hits: [], kind: null, price: cp };
  let kind: "single" | "double" | "triple" = "single";
  if (hits.length >= 2 && hasKey && hasRound) kind = "triple";
  else if (hasKey) kind = "double";
  return { hits, kind, price: cp };
}

const DEFAULT_WATCH: Record<string, AssetWatch> = Object.fromEntries(
  WATCH_SYMBOLS.map((s) => {
    const a = findAsset(s); const step = a?.roundStep ?? 1;
    return [s, { symbol: s, current: "", pdh: "", pdl: "", pwh: "", pwl: "", threshold: String(step * 0.25) }];
  }),
);

function AlertsPage() {
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const { data: cloudLevels = [] } = useAssetLevels(user?.id);
  const { data: log = [] } = useAlertsLog(user?.id);
  const logAlert = useLogAlert(user?.id);
  const clearAlerts = useClearAlerts(user?.id);

  const [watches, setWatches] = useLocalStorage<Record<string, AssetWatch>>("alerts.watches", DEFAULT_WATCH);
  const [muted, setMuted] = useLocalStorage<boolean>("alerts.muted", false);
  const [activeSym, setActiveSym] = useState<string>(WATCH_SYMBOLS[0]);
  const [flash, setFlash] = useState(false);
  const [checklist, setChecklist] = useState<{ open: boolean; alert?: { symbol: string; price: number; hits: string[]; kind: string }; ticks: boolean[] }>({ open: false, ticks: Array(CHECKLIST_QUESTIONS.length).fill(false) });
  const lastFireRef = useRef<Record<string, string>>({});

  // Hydrate from cloud levels when the user picks an asset that has saved levels
  useEffect(() => {
    setWatches((cur) => {
      let changed = false; const next = { ...cur };
      for (const sym of WATCH_SYMBOLS) {
        const cloud = cloudLevels.find((l) => l.asset === sym);
        if (!cloud) continue;
        const w = next[sym] ?? DEFAULT_WATCH[sym];
        const merged = {
          ...w,
          pdh: w.pdh || (cloud.levels.pdh != null ? String(cloud.levels.pdh) : ""),
          pdl: w.pdl || (cloud.levels.pdl != null ? String(cloud.levels.pdl) : ""),
          pwh: w.pwh || (cloud.levels.pwh != null ? String(cloud.levels.pwh) : ""),
          pwl: w.pwl || (cloud.levels.pwl != null ? String(cloud.levels.pwl) : ""),
        };
        if (merged.pdh !== w.pdh || merged.pdl !== w.pdl || merged.pwh !== w.pwh || merged.pwl !== w.pwl) {
          next[sym] = merged; changed = true;
        }
      }
      return changed ? next : cur;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudLevels.length]);

  const w = watches[activeSym] ?? DEFAULT_WATCH[activeSym];
  const asset = findAsset(activeSym);
  const dec = asset?.decimals ?? 2;
  function update(field: keyof AssetWatch, value: string) {
    setWatches({ ...watches, [activeSym]: { ...w, [field]: value } });
  }

  useEffect(() => {
    const { hits, kind, price } = evaluateHits(w);
    const sig = hits.join("|");
    const last = lastFireRef.current[activeSym] ?? "";
    if (kind && sig && sig !== last) {
      lastFireRef.current[activeSym] = sig;
      setFlash(true); setTimeout(() => setFlash(false), 900);
      if (!muted) beep(kind === "triple" ? 3 : kind === "double" ? 2 : 1);
      logAlert.mutate({ asset: activeSym, direction: null, level: price, level_type: kind, note: hits.join(" · ") });
      setChecklist({ open: true, alert: { symbol: activeSym, price, hits, kind }, ticks: Array(CHECKLIST_QUESTIONS.length).fill(false) });
    } else if (!kind) {
      lastFireRef.current[activeSym] = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.current]);

  const { hits, kind } = useMemo(() => evaluateHits(w), [w]);
  const inZone = !!kind;
  const allTicked = checklist.ticks.every(Boolean);

  function logTrade(direction: "Long" | "Short") {
    if (!checklist.alert) return;
    navigate({
      to: "/journal",
      search: { asset: checklist.alert.symbol, direction, level: String(checklist.alert.price), new: true } as any,
    });
  }

  return (
    <div className="space-y-4 relative">
      {flash && <div className="fixed inset-0 z-[60] pointer-events-none animate-pulse" style={{ background: "color-mix(in oklab, #ffc800 35%, transparent)" }} />}

      <SectionHeader title="Screen Marker Alerts" subtitle="Cloud-logged alerts · one-tap journal" />

      <Card>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1">
            {WATCH_SYMBOLS.map((s) => {
              const active = s === activeSym;
              return (
                <button key={s} onClick={() => setActiveSym(s)} className={`px-2.5 h-8 rounded-md text-xs font-bold tracking-wide border ${active ? "bg-accent text-accent-foreground border-accent" : "bg-surface-2 text-foreground/80 border-border"}`}>{s}</button>
              );
            })}
          </div>
          <button onClick={() => setMuted(!muted)} className="h-8 w-8 grid place-items-center rounded-md border border-border bg-surface-2" aria-label="Toggle sound">
            {muted ? <VolumeX className="h-4 w-4 text-danger" /> : <Volume2 className="h-4 w-4 text-success" />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumInput label="Current Price" value={w.current} onChange={(v: string) => update("current", v)} dec={dec} />
          <NumInput label="Threshold (±)" value={w.threshold} onChange={(v: string) => update("threshold", v)} dec={dec} />
          <NumInput label="PDH" value={w.pdh} onChange={(v: string) => update("pdh", v)} dec={dec} />
          <NumInput label="PDL" value={w.pdl} onChange={(v: string) => update("pdl", v)} dec={dec} />
          <NumInput label="PWH" value={w.pwh} onChange={(v: string) => update("pwh", v)} dec={dec} />
          <NumInput label="PWL" value={w.pwl} onChange={(v: string) => update("pwl", v)} dec={dec} />
        </div>

        <div className={`mt-3 rounded-md border p-3 ${inZone ? "border-warning bg-warning/10" : "border-border bg-surface-2"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className={`h-4 w-4 ${inZone ? "text-warning" : "text-muted-foreground"}`} />
              <span className="text-xs font-bold uppercase tracking-wider">{inZone ? `KILL ZONE — ${kind?.toUpperCase()} BEEP` : "No active alert"}</span>
            </div>
            {inZone && <span className="tag bg-warning/20 text-warning border border-warning/40">{hits.length} HIT</span>}
          </div>
          {inZone && (
            <ul className="mt-2 space-y-1">{hits.map((h) => <li key={h} className="mono text-xs text-warning">• {h}</li>)}</ul>
          )}
        </div>
      </Card>

      <Card title="Cloud Alert Log" subtitle={`${log.length} fired (synced)`} action={
        log.length > 0 ? <button onClick={() => clearAlerts.mutate()} className="text-[11px] text-danger inline-flex items-center gap-1"><Trash2 className="h-3 w-3" />Clear</button> : null
      }>
        {log.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">No alerts yet. Update a price to trigger.</div>
        ) : (
          <ul className="divide-y divide-border -mx-3">
            {log.slice(0, 30).map((a) => {
              const aa = findAsset(a.asset);
              const d = new Date(a.triggered_at);
              return (
                <li key={a.id} className="px-3 py-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{a.asset}</span>
                      <span className="mono text-xs text-foreground">{a.level != null ? fmt(a.level, aa?.decimals ?? 2) : "—"}</span>
                      <span className="tag bg-accent/20 text-accent border border-accent/40">{a.level_type ?? "alert"}</span>
                    </div>
                    <div className="mono text-[11px] text-muted-foreground mt-0.5 truncate">{a.note}</div>
                  </div>
                  <div className="mono text-[10px] text-muted-foreground shrink-0">{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {checklist.open && checklist.alert && (
        <div className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm grid place-items-end sm:place-items-center px-2 py-3" role="dialog">
          <div className="w-full max-w-md rounded-lg border border-warning bg-surface p-4 shadow-xl">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-warning">Pre-Trade Checklist</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {checklist.alert.symbol} @ <span className="mono">{fmt(checklist.alert.price, findAsset(checklist.alert.symbol)?.decimals ?? 2)}</span> · {checklist.alert.hits.length} confluence
                </p>
              </div>
              <button onClick={() => setChecklist({ ...checklist, open: false })} className="h-8 w-8 grid place-items-center rounded-md border border-border" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2">
              {CHECKLIST_QUESTIONS.map((q, i) => {
                const ticked = checklist.ticks[i];
                return (
                  <li key={i}>
                    <button onClick={() => { const next = [...checklist.ticks]; next[i] = !next[i]; setChecklist({ ...checklist, ticks: next }); }}
                      className={`w-full flex items-start gap-2 text-left p-2 rounded-md border ${ticked ? "border-success bg-success/10" : "border-border bg-surface-2"}`}>
                      <span className={`h-5 w-5 shrink-0 rounded grid place-items-center border ${ticked ? "bg-success border-success" : "border-muted-foreground"}`}>
                        {ticked && <Check className="h-3.5 w-3.5 text-background" />}
                      </span>
                      <span className="text-xs leading-snug">{q}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => logTrade("Long")} className="h-10 rounded-md bg-success text-background text-xs font-bold uppercase inline-flex items-center justify-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />Log Long</button>
              <button onClick={() => logTrade("Short")} className="h-10 rounded-md bg-danger text-background text-xs font-bold uppercase inline-flex items-center justify-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />Log Short</button>
            </div>
            <button onClick={() => setChecklist({ ...checklist, open: false })} className="mt-2 w-full h-9 rounded-md border border-border text-xs font-semibold uppercase">
              {allTicked ? "Close — checklist complete" : "Skip checklist"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
