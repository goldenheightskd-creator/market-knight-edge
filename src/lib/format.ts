export function fmt(n: number, d = 2) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function fmtMoney(n: number, d = 2) {
  if (!isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}
export function fmtPct(n: number, d = 2) {
  if (!isFinite(n)) return "—";
  return `${n.toFixed(d)}%`;
}
