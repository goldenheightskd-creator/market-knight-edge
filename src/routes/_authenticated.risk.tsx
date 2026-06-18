import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, Cell, NumInput, Select, SectionHeader } from "@/components/Prim";
import { ASSETS, GROUPS, assetsByGroup, findAsset, type AssetGroup } from "@/lib/assets";
import { fmt, fmtMoney, fmtPct } from "@/lib/format";
import { useAuthSession, usePrefs, useSavePrefs, useAssetLevels, useUpdateChecklist } from "@/lib/cloud";

export const Route = createFileRoute("/_authenticated/risk")({
  head: () => ({
    meta: [
      { title: "Risk Calculator — Market.knight" },
      { name: "description", content: "Exact dollar risk, position size, R:R and breakeven win rate — synced with your active asset and levels." },
      { property: "og:title", content: "Risk Calculator — Market.knight" },
      { property: "og:description", content: "Exact dollar risk, position size, R:R and breakeven win rate — synced with your active asset and levels." },
    ],
  }),
  component: RiskPage,
});

function RiskPage() {
  const { user } = useAuthSession();
  const { data: prefs } = usePrefs(user?.id);
  const { data: assetLevels = [] } = useAssetLevels(user?.id);
  const savePrefs = useSavePrefs(user?.id);
  const updateChecklist = useUpdateChecklist(user?.id);

  const activeSymbol = prefs?.current_asset ?? "MES";
  const activeAsset = findAsset(activeSymbol);
  const initialGroup = (activeAsset?.group ?? "Futures") as AssetGroup;

  const [group, setGroup] = useState<AssetGroup>(initialGroup);
  const [symbol, setSymbol] = useState<string>(activeSymbol);
  useEffect(() => {
    if (prefs?.current_asset) {
      setSymbol(prefs.current_asset);
      const g = findAsset(prefs.current_asset)?.group;
      if (g) setGroup(g);
    }
  }, [prefs?.current_asset]);

  const list = assetsByGroup(group);
  const asset = findAsset(symbol) ?? ASSETS[0];

  const [account, setAccount] = useState<string>(String(prefs?.account_size ?? "10000"));
  const [riskPct, setRiskPct] = useState<string>(String(prefs?.risk_pct ?? "1"));
  useEffect(() => {
    if (prefs?.account_size != null) setAccount(String(prefs.account_size));
    if (prefs?.risk_pct != null) setRiskPct(String(prefs.risk_pct));
  }, [prefs?.account_size, prefs?.risk_pct]);

  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp1, setTp1] = useState("");
  const [tp2, setTp2] = useState("");
  const [qty, setQty] = useState("1");

  // Auto-suggest entry from saved levels for this asset
  const savedLevel = useMemo(() => assetLevels.find((l) => l.asset === symbol), [assetLevels, symbol]);
  function fillFromLevels() {
    if (!savedLevel) return;
    const { pdh, pdl, price } = savedLevel.levels;
    if (price != null) setEntry(String(price));
    if (pdh != null && price != null && price < pdh) setSl(String(pdh));
    else if (pdl != null) setSl(String(pdl));
    if (pdh != null) setTp1(String(pdh));
    if (pdl != null) setTp2(String(pdl));
  }

  function chooseAsset(sym: string) {
    setSymbol(sym);
    savePrefs.mutate({ current_asset: sym });
  }

  function persistAccount() {
    savePrefs.mutate({ account_size: parseFloat(account) || null, risk_pct: parseFloat(riskPct) || null });
    updateChecklist.mutate({ risk_calculated: true });
  }

  const acct = parseFloat(account) || 0;
  const pct = parseFloat(riskPct) || 0;
  const e = parseFloat(entry), s = parseFloat(sl), t1 = parseFloat(tp1), t2 = parseFloat(tp2), q = parseFloat(qty) || 0;
  const stopDist = Math.abs(e - s);

  const perUnitPerOne = useMemo(() => {
    if (!asset) return 1;
    if (asset.group === "Futures") return asset.pointValue ?? 1;
    if (asset.group === "Forex") {
      const pipSize = asset.pipSize ?? 0.0001;
      const pipVal = asset.pipValuePerLot ?? 10;
      return pipVal / pipSize;
    }
    return 1;
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

  // Auto-tick checklist when valid risk calc done
  useEffect(() => {
    if (acct > 0 && stopDist > 0 && q > 0) updateChecklist.mutate({ risk_calculated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acct > 0 && stopDist > 0 && q > 0]);

  return (
    <div className="space-y-4">
      <SectionHeader title="Risk Calculator" subtitle={`Active asset: ${symbol}${savedLevel ? " · cloud levels available" : ""}`} />

      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Select label="Group" value={group} onChange={(v) => { setGroup(v as AssetGroup); const first = assetsByGroup(v as AssetGroup)[0]; if (first) chooseAsset(first.symbol); }}
            options={GROUPS.map((g) => ({ value: g, label: g }))} />
          <Select label="Asset" value={symbol} onChange={chooseAsset} options={list.map((a) => ({ value: a.symbol, label: a.symbol }))} />
          <NumInput label="Account Size ($)" value={account} onChange={setAccount} dec={0} />
          <NumInput label="Risk %" value={riskPct} onChange={setRiskPct} dec={2} />
          <NumInput label="Entry" value={entry} onChange={setEntry} dec={dec} />
          <NumInput label="Stop Loss" value={sl} onChange={setSl} dec={dec} />
          <NumInput label="Target 1" value={tp1} onChange={setTp1} dec={dec} />
          <NumInput label="Target 2" value={tp2} onChange={setTp2} dec={dec} />
          <NumInput label={qtyLabel} value={qty} onChange={setQty} dec={2} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={persistAccount} className="h-9 rounded-md border border-border bg-surface-2 text-xs font-bold uppercase tracking-wider">Save Account</button>
          <button onClick={fillFromLevels} disabled={!savedLevel} className="h-9 rounded-md bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wider disabled:opacity-40">
            {savedLevel ? "Pre-fill from cloud levels" : "No cloud levels yet"}
          </button>
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
    </div>
  );
}
