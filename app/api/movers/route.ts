import { NextResponse } from "next/server";

// Major stocks to track for daily movers
const TRACKED_SYMBOLS = [
  // US Mega Cap
  "AAPL","MSFT","NVDA","AMZN","GOOGL","META","TSLA","BRK-B","JPM","V",
  "UNH","XOM","JNJ","PG","MA","HD","COST","ABBV","MRK","PEP",
  "KO","NFLX","CRM","AMD","PLTR","INTC","DIS","BA","GS","MS",
  "WMT","PYPL","UBER","SQ","COIN","SNAP","RIVN","NIO","SOFI","HOOD",
  // Volatile/popular
  "GME","AMC","HIMS","SMCI","ARM","MARA","RIOT","MU","ENPH","FSLR",
  // EU via US ADR / ETF
  "SAP","ASML","NVO","TM","SONY","BABA","PDD","SE","GRAB","JD",
];

// Sector mapping for context-aware explanations
const SECTOR_MAP: Record<string, string> = {
  AAPL: "Tech", MSFT: "Tech", NVDA: "Halbleiter", AMZN: "E-Commerce", GOOGL: "Tech",
  META: "Social Media", TSLA: "EV/Auto", "BRK-B": "Finanzen", JPM: "Banken", V: "Zahlungen",
  UNH: "Gesundheit", XOM: "Energie", JNJ: "Pharma", PG: "Konsum", MA: "Zahlungen",
  HD: "Einzelhandel", COST: "Einzelhandel", ABBV: "Pharma", MRK: "Pharma", PEP: "Konsum",
  KO: "Konsum", NFLX: "Streaming", CRM: "Cloud/SaaS", AMD: "Halbleiter", PLTR: "KI/Daten",
  INTC: "Halbleiter", DIS: "Medien", BA: "Luftfahrt", GS: "Banken", MS: "Banken",
  WMT: "Einzelhandel", PYPL: "FinTech", UBER: "Mobilität", SQ: "FinTech", COIN: "Krypto",
  SNAP: "Social Media", RIVN: "EV/Auto", NIO: "EV/Auto", SOFI: "FinTech", HOOD: "FinTech",
  GME: "Gaming/Retail", AMC: "Entertainment", HIMS: "Gesundheit", SMCI: "KI/Server",
  ARM: "Halbleiter", MARA: "Krypto/Mining", RIOT: "Krypto/Mining", MU: "Halbleiter",
  ENPH: "Solar", FSLR: "Solar", SAP: "Enterprise SW", ASML: "Halbleiter", NVO: "Pharma",
  TM: "Auto", SONY: "Elektronik", BABA: "E-Commerce", PDD: "E-Commerce", SE: "E-Commerce",
  GRAB: "Mobilität", JD: "E-Commerce",
};

async function fetchQuote(symbol: string): Promise<{
  symbol: string; name: string; price: number; change: number;
  changePct: number; volume: number; sector: string;
} | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2d&interval=1d&includePrePost=false`;
    // Hard 4-second per-request timeout — Yahoo can hang indefinitely otherwise
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
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const price = meta.regularMarketPrice ?? 0;
    // Use previous close from closes array (more reliable for 2d range)
    // closes[0] = yesterday's close, closes[1] = today's close (or current)
    const prevClose = meta.previousClose ?? (closes.length >= 2 ? closes[0] : null) ?? meta.chartPreviousClose ?? price;
    if (!prevClose || !price) return null;
    const change = price - prevClose;
    const changePct = (change / prevClose) * 100;

    // Volume from indicators
    const volumes = result.indicators?.quote?.[0]?.volume ?? [];
    const lastVolume = volumes[volumes.length - 1] ?? 0;

    return {
      symbol: meta.symbol ?? symbol,
      name: meta.shortName ?? meta.longName ?? symbol,
      price,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      volume: lastVolume,
      sector: SECTOR_MAP[symbol] ?? "",
    };
  } catch {
    return null;
  }
}

export const maxDuration = 20;
export const dynamic = "force-dynamic";

export async function GET() {
  // Fire ALL 60 requests at once — each has its own 4s timeout so no single one can stall the response.
  const all = await Promise.all(TRACKED_SYMBOLS.map(fetchQuote));
  const results: NonNullable<Awaited<ReturnType<typeof fetchQuote>>>[] = [];
  for (const r of all) if (r) results.push(r);

  // Sort by absolute change percentage
  const sorted = results.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  // Top gainers (positive change, sorted by highest)
  const gainers = results
    .filter(r => r.changePct > 0)
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 10);

  // Top losers (negative change, sorted by most negative)
  const losers = results
    .filter(r => r.changePct < 0)
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 10);

  // Most active (highest absolute change)
  const trending = sorted.slice(0, 12);

  return NextResponse.json({
    gainers,
    losers,
    trending,
    updatedAt: new Date().toISOString(),
  });
}
