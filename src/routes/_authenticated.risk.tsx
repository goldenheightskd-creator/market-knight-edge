import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, Cell, NumInput, Select, SectionHeader } from "./index";
import { ASSETS, GROUPS, assetsByGroup, findAsset, type AssetGroup } from "@/lib/assets";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { fmt, fmtMoney, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/risk")({
  head: () => ({
    meta: [
      { title: "Risk Calculator — Market.knight" },
      { name: "description", content: "Exact dollar risk, position size, R:R and breakeven win rate for futures, forex, crypto and stocks." },
      { property: "og:title", content: "Risk Calculator — Market.knight" },
      { property: "og:description", content: "Exact dollar risk, position size, R:R and breakeven win rate for futures, forex, crypto and stocks." },
      { property: "og:url", content: "https://market-knight-edge.lovable.app/risk" },
    ],
    links: [{ rel: "canonical", href: "https://market-knight-edge.lovable.app/risk" }],
  }),
  component: RiskPage,
});

function RiskPage() {
  const [group, setGroup] = useLocalStorage<AssetGroup>("risk.group", "Futures");
  const list = assetsByGroup(group);
  const [symbol, setSymbol] = useLocalStorage<string>("risk.sym", list[0]?.symbol ?? "MES");
  const asset = findAsset(symbol) ?? ASSETS[0];

  const [account, setAccount] = useLocalStorage<string>("risk.acct", "10000");
  const [riskPct, setRiskPct] = useLocalStorage<string>("risk.pct", "1");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp1, setTp1] = useState("");
  const [tp2, setTp2] = useState("");
  const [qty, setQty] = useState("1");

  const acct = parseFloat(account) || 0;
  const pct = parseFloat(riskPct) || 0;
  const e = parseFloat(entry), s = parseFloat(sl), t1 = parseFloat(tp1), t2 = parseFloat(tp2), q = parseFloat(qty) || 0;
  const stopDist = Math.abs(e - s);

  // dollar per unit per 1 contract/lot/share
  const perUnitPerOne = useMemo(() => {
    if (!asset) return 1;
    if (asset.group === "Futures") return asset.pointValue ?? 1;
    if (asset.group === "Forex") {
      const pipSize = asset.pipSize ?? 0.0001;
      const pipVal = asset.pipValuePerLot ?? 10;
      return pipVal / pipSize; // $ per 1.0 price unit per standard lot
    }
    return 1; // crypto / stocks / indices: 1 unit = $1 per price unit per "share/coin"
  }, [asset]);

  const dollarRiskPerOne = stopDist * perUnitPerOne;
  const targetRisk = acct * (pct / 100);
  const recommended = dollarRiskPerOne > 0 ? targetRisk / dollarRiskPerOne : 0;
  const dollarRisk = dollarRiskPerOne * q;
  const actualPct = acct > 0 ? (dollarRisk / acct) * 100 : 0;

  const rr1 = stopDist > 0 ? Math.abs(t1 - e) / stopDist : 0;
  const rr2 = stopDist > 0 ? Math.abs(t2 - e) / stopDist : 0;
  const reward1 = Math.abs(t1 - e) * perUnitPerOne * q;
  const reward2 = Math.abs(t2 - e) * perUnitPerOne * q;
  const breakeven1 = rr1 > 0 ? 100 / (1 + rr1) : 0;

  const overRisk = actualPct > 2 && acct > 0 && isFinite(actualPct);
  const dec = asset?.decimals ?? 2;

  const qtyLabel = asset?.group === "Futures" ? "Contracts" : asset?.group === "Forex" ? "Lots" : "Units";

  return (
    <div className="space-y-4">
      <SectionHeader title="Risk Calculator" subtitle="Size with intent. Survive long enough to compound." />

      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Select label="Group" value={group} onChange={(v) => { setGroup(v as AssetGroup); const first = assetsByGroup(v as AssetGroup)[0]; if (first) setSymbol(first.symbol); }}
            options={GROUPS.map((g) => ({ value: g, label: g }))} />
          <Select label="Asset" value={symbol} onChange={setSymbol}
            options={list.map((a) => ({ value: a.symbol, label: a.symbol }))} />
          <NumInput label="Account Size ($)" value={account} onChange={setAccount} dec={0} />
          <NumInput label="Risk %" value={riskPct} onChange={setRiskPct} dec={2} />
          <NumInput label="Entry" value={entry} onChange={setEntry} dec={dec} />
          <NumInput label="Stop Loss" value={sl} onChange={setSl} dec={dec} />
          <NumInput label="Target 1" value={tp1} onChange={setTp1} dec={dec} />
          <NumInput label="Target 2" value={tp2} onChange={setTp2} dec={dec} />
          <NumInput label={qtyLabel} value={qty} onChange={setQty} dec={2} />
        </div>
      </Card>

      <Card title="Position Sizing">
        <div className="grid grid-cols-2 gap-2">
          <Cell label="Stop Distance" value={stopDist > 0 ? fmt(stopDist, dec) : "—"} />
          <Cell label="$ Risk / 1" value={dollarRiskPerOne > 0 ? fmtMoney(dollarRiskPerOne) : "—"} />
          <Cell label="Target Risk" value={fmtMoney(targetRisk)} />
          <Cell label={`Recommended ${qtyLabel}`} value={recommended > 0 ? fmt(recommended, 2) : "—"} tone="warning" />
          <Cell label="Your $ Risk" value={dollarRisk > 0 ? fmtMoney(dollarRisk) : "—"} tone={overRisk ? "danger" : "success"} />
          <Cell label="Your Risk %" value={acct > 0 ? fmtPct(actualPct) : "—"} tone={overRisk ? "danger" : "success"} />
        </div>
        {overRisk && (
          <div className="mt-2 rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
            ⚠ Risk above 2% — reduce position size.
          </div>
        )}
      </Card>

      <Card title="Reward & Probability">
        <div className="grid grid-cols-2 gap-2">
          <Cell label="R:R T1" value={fmt(rr1, 2)} tone={rr1 >= 2 ? "success" : rr1 > 0 ? "warning" : undefined} />
          <Cell label="R:R T2" value={fmt(rr2, 2)} tone={rr2 >= 3 ? "success" : rr2 > 0 ? "warning" : undefined} />
          <Cell label="Reward @ T1" value={reward1 > 0 ? fmtMoney(reward1) : "—"} tone="success" />
          <Cell label="Reward @ T2" value={reward2 > 0 ? fmtMoney(reward2) : "—"} tone="success" />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground uppercase tracking-wider">R:R Visual (T1)</span>
            <span className="mono text-muted-foreground">Breakeven WR: <span className="text-warning">{breakeven1 ? fmtPct(breakeven1, 1) : "—"}</span></span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-surface-2">
            <div className="bg-danger" style={{ width: `${rr1 > 0 ? Math.max(8, 100 / (1 + rr1)) : 50}%` }} />
            <div className="bg-success" style={{ width: `${rr1 > 0 ? 100 - 100 / (1 + rr1) : 50}%` }} />
          </div>
        </div>
      </Card>

      <Card title="Pre-Trade Checklist">
        <Checklist />
      </Card>
    </div>
  );
}

function Checklist() {
  const items = [
    "Setup matches my plan (no chasing)",
    "Risk is ≤ 2% of account",
    "Stop is at structure, not arbitrary $",
    "R:R minimum 2:1 to first target",
  ];
  const [done, setDone] = useLocalStorage<boolean[]>("risk.checklist", [false, false, false, false]);
  return (
    <ul className="space-y-1.5">
      {items.map((txt, i) => (
        <li key={i}>
          <button
            onClick={() => { const next = [...done]; next[i] = !next[i]; setDone(next); }}
            className={`flex items-center gap-2 w-full text-left text-sm rounded-md px-2 py-2 border ${done[i] ? "border-success/40 bg-success/10 text-success" : "border-border bg-surface-2 text-foreground"}`}
          >
            <span className={`h-4 w-4 rounded grid place-items-center text-[10px] font-bold ${done[i] ? "bg-success text-background" : "border border-muted-foreground"}`}>{done[i] ? "✓" : ""}</span>
            {txt}
          </button>
        </li>
      ))}
    </ul>
  );
}
