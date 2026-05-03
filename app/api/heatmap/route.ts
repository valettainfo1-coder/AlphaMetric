import { NextResponse } from "next/server";

// ── ETF / INDEX definitions per region ──────────────────────────
interface HeatmapItem {
  symbol: string;
  name: string;
  category: string;
}

const REGIONS: Record<string, HeatmapItem[]> = {
  usa: [
    { symbol: "SPY",  name: "S&P 500",           category: "Index" },
    { symbol: "QQQ",  name: "NASDAQ 100",         category: "Index" },
    { symbol: "DIA",  name: "Dow Jones",           category: "Index" },
    { symbol: "IWM",  name: "Russell 2000",        category: "Index" },
    { symbol: "TLT",  name: "US Treasury 20Y+",    category: "Bond" },
    { symbol: "IEF",  name: "US Treasury 7-10Y",   category: "Bond" },
    { symbol: "SHY",  name: "US Treasury 1-3Y",    category: "Bond" },
    { symbol: "HYG",  name: "US High Yield",       category: "Bond" },
    { symbol: "XLK",  name: "Technologie",         category: "Sektor" },
    { symbol: "XLF",  name: "Finanzen",            category: "Sektor" },
    { symbol: "XLE",  name: "Energie",             category: "Sektor" },
    { symbol: "XLV",  name: "Gesundheit",          category: "Sektor" },
    { symbol: "XLI",  name: "Industrie",           category: "Sektor" },
    { symbol: "XLC",  name: "Kommunikation",       category: "Sektor" },
    { symbol: "XLY",  name: "Zyklischer Konsum",   category: "Sektor" },
    { symbol: "XLP",  name: "Basiskonsumgüter",    category: "Sektor" },
    { symbol: "XLRE", name: "Immobilien",          category: "Sektor" },
    { symbol: "XLU",  name: "Versorger",           category: "Sektor" },
    { symbol: "XLB",  name: "Rohstoffe",           category: "Sektor" },
  ],
  europa: [
    { symbol: "VGK",  name: "FTSE Europe",          category: "Index" },
    { symbol: "IBGL.L", name: "EUR Gov Bond 10Y+", category: "Bond" },
    { symbol: "IEAC.L", name: "EUR Corp Bond",     category: "Bond" },
    { symbol: "IBTS.L", name: "EUR Treasury 1-3Y", category: "Bond" },
    { symbol: "IHYG.L", name: "EUR High Yield",    category: "Bond" },
    { symbol: "EWG",  name: "DAX / Deutschland",    category: "Land" },
    { symbol: "EWU",  name: "FTSE 100 / UK",        category: "Land" },
    { symbol: "EWQ",  name: "CAC 40 / Frankreich",  category: "Land" },
    { symbol: "EWP",  name: "IBEX / Spanien",       category: "Land" },
    { symbol: "EWI",  name: "FTSE MIB / Italien",   category: "Land" },
    { symbol: "EWL",  name: "SMI / Schweiz",        category: "Land" },
    { symbol: "EWD",  name: "OMX / Schweden",       category: "Land" },
    { symbol: "EWN",  name: "AEX / Niederlande",    category: "Land" },
    { symbol: "NORW", name: "OBX / Norwegen",       category: "Land" },
  ],
  asien: [
    { symbol: "EWJ",  name: "Nikkei / Japan",       category: "Index" },
    { symbol: "FXI",  name: "CSI / China",           category: "Index" },
    { symbol: "BNDX", name: "Intl. Bonds ex-US",    category: "Bond" },
    { symbol: "IAGG", name: "Intl. Aggregate Bond",  category: "Bond" },
    { symbol: "1306.T", name: "JGB / Japan Bonds",   category: "Bond" },
    { symbol: "EMB",  name: "EM USD Bonds",          category: "Bond" },
    { symbol: "EWY",  name: "KOSPI / Südkorea",     category: "Land" },
    { symbol: "EWT",  name: "TWSE / Taiwan",        category: "Land" },
    { symbol: "INDA", name: "Nifty / Indien",       category: "Land" },
    { symbol: "EWA",  name: "ASX / Australien",     category: "Land" },
    { symbol: "EWH",  name: "HKEX / Hongkong",      category: "Land" },
    { symbol: "EWS",  name: "STI / Singapur",       category: "Land" },
    { symbol: "THD",  name: "SET / Thailand",       category: "Land" },
    { symbol: "VNM",  name: "VN-Index / Vietnam",   category: "Land" },
  ],
  emerging: [
    { symbol: "VWO",  name: "Emerging Markets",      category: "Index" },
    { symbol: "EMB",  name: "EM USD Bonds",          category: "Bond" },
    { symbol: "EMLC", name: "EM Local Bonds",        category: "Bond" },
    { symbol: "PCY",  name: "EM Sovereign Bonds",    category: "Bond" },
    { symbol: "HYEM", name: "EM High Yield",         category: "Bond" },
    { symbol: "EWZ",  name: "Bovespa / Brasilien",   category: "Land" },
    { symbol: "EWW",  name: "IPC / Mexiko",          category: "Land" },
    { symbol: "TUR",  name: "BIST / Türkei",        category: "Land" },
    { symbol: "EZA",  name: "JSE / Südafrika",      category: "Land" },
    { symbol: "ARGT", name: "Merval / Argentinien",  category: "Land" },
    { symbol: "ECH",  name: "IPSA / Chile",          category: "Land" },
    { symbol: "KSA",  name: "Tadawul / Saudi-Arab.", category: "Land" },
    { symbol: "QAT",  name: "QSE / Katar",          category: "Land" },
    { symbol: "UAE",  name: "ADX / VAE",             category: "Land" },
  ],
};

// Fetch daily change from Yahoo v8 chart (no auth needed)
async function fetchChange(symbol: string): Promise<{ price: number; change: number; changePct: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2d&interval=1d`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const price = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    if (!prevClose) return null;
    const change = price - prevClose;
    const changePct = (change / prevClose) * 100;
    return { price, change, changePct: Math.round(changePct * 100) / 100 };
  } catch {
    return null;
  }
}

export const maxDuration = 15;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") ?? "usa";
  const items = REGIONS[region] ?? REGIONS.usa;

  // Fetch all in parallel (batched)
  const results = await Promise.all(
    items.map(async (item) => {
      const data = await fetchChange(item.symbol);
      return {
        symbol: item.symbol,
        name: item.name,
        category: item.category,
        price: data?.price ?? 0,
        change: data?.change ?? 0,
        changePct: data?.changePct ?? 0,
      };
    })
  );

  return NextResponse.json({ region, items: results });
}
