// Asset definitions with tick/point/pip metadata
export type AssetGroup = "Futures" | "Forex" | "Crypto" | "Indices" | "Stocks";

export interface Asset {
  symbol: string;
  name: string;
  group: AssetGroup;
  decimals: number;
  // Round-number step used by the level calculator
  roundStep: number;
  // For risk calc:
  // futures: dollar per point per contract
  pointValue?: number;
  // forex: pip size (e.g. 0.0001) and pip value per standard lot (USD)
  pipSize?: number;
  pipValuePerLot?: number;
}

export const ASSETS: Asset[] = [
  // Futures
  { symbol: "MES", name: "Micro E-mini S&P 500", group: "Futures", decimals: 2, roundStep: 25, pointValue: 5 },
  { symbol: "ES",  name: "E-mini S&P 500",      group: "Futures", decimals: 2, roundStep: 25, pointValue: 50 },
  { symbol: "MNQ", name: "Micro E-mini Nasdaq",  group: "Futures", decimals: 2, roundStep: 50, pointValue: 2 },
  { symbol: "NQ",  name: "E-mini Nasdaq",        group: "Futures", decimals: 2, roundStep: 50, pointValue: 20 },
  { symbol: "MYM", name: "Micro Dow",            group: "Futures", decimals: 0, roundStep: 100, pointValue: 0.5 },
  { symbol: "CL",  name: "Crude Oil",            group: "Futures", decimals: 2, roundStep: 1, pointValue: 1000 },
  { symbol: "GC",  name: "Gold",                 group: "Futures", decimals: 1, roundStep: 10, pointValue: 100 },
  // Forex
  { symbol: "EUR/USD", name: "Euro / US Dollar",  group: "Forex", decimals: 5, roundStep: 0.005, pipSize: 0.0001, pipValuePerLot: 10 },
  { symbol: "GBP/USD", name: "Pound / Dollar",    group: "Forex", decimals: 5, roundStep: 0.005, pipSize: 0.0001, pipValuePerLot: 10 },
  { symbol: "USD/JPY", name: "Dollar / Yen",      group: "Forex", decimals: 3, roundStep: 0.5,   pipSize: 0.01,    pipValuePerLot: 6.7 },
  { symbol: "AUD/USD", name: "Aussie / Dollar",   group: "Forex", decimals: 5, roundStep: 0.005, pipSize: 0.0001, pipValuePerLot: 10 },
  { symbol: "USD/CAD", name: "Dollar / Loonie",   group: "Forex", decimals: 5, roundStep: 0.005, pipSize: 0.0001, pipValuePerLot: 7.3 },
  { symbol: "XAU/USD", name: "Gold Spot",         group: "Forex", decimals: 2, roundStep: 10,    pipSize: 0.1,    pipValuePerLot: 10 },
  // Crypto
  { symbol: "BTC/USD", name: "Bitcoin",   group: "Crypto", decimals: 2, roundStep: 1000 },
  { symbol: "ETH/USD", name: "Ethereum",  group: "Crypto", decimals: 2, roundStep: 100 },
  { symbol: "SOL/USD", name: "Solana",    group: "Crypto", decimals: 2, roundStep: 10 },
  { symbol: "XRP/USD", name: "Ripple",    group: "Crypto", decimals: 4, roundStep: 0.1 },
  // Indices
  { symbol: "SPX",  name: "S&P 500 Index",   group: "Indices", decimals: 2, roundStep: 25 },
  { symbol: "NDX",  name: "Nasdaq 100",      group: "Indices", decimals: 2, roundStep: 50 },
  { symbol: "DJI",  name: "Dow Jones",       group: "Indices", decimals: 0, roundStep: 100 },
  { symbol: "DAX",  name: "DAX 40",          group: "Indices", decimals: 2, roundStep: 50 },
  { symbol: "FTSE", name: "FTSE 100",        group: "Indices", decimals: 2, roundStep: 25 },
  // Stocks
  { symbol: "AAPL", name: "Apple",     group: "Stocks", decimals: 2, roundStep: 5 },
  { symbol: "MSFT", name: "Microsoft", group: "Stocks", decimals: 2, roundStep: 10 },
  { symbol: "NVDA", name: "Nvidia",    group: "Stocks", decimals: 2, roundStep: 10 },
  { symbol: "TSLA", name: "Tesla",     group: "Stocks", decimals: 2, roundStep: 10 },
  { symbol: "AMZN", name: "Amazon",    group: "Stocks", decimals: 2, roundStep: 10 },
];

export const GROUPS: AssetGroup[] = ["Futures", "Forex", "Crypto", "Indices", "Stocks"];

export function assetsByGroup(g: AssetGroup) {
  return ASSETS.filter((a) => a.group === g);
}
export function findAsset(sym: string) {
  return ASSETS.find((a) => a.symbol === sym);
}
