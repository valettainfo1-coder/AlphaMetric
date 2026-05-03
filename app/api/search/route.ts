import { NextRequest, NextResponse } from "next/server";
import { searchRegistry, type StockEntry } from "@/lib/exchange-registry";

// ═══════════════════════════════════════════════════════════════════
// SEARCH ENDPOINT — Multi-Exchange Autocomplete
//
// 1. Local registry (instant, ~100 stocks)
// 2. Finnhub symbol search (if key available)
// 3. Yahoo Finance search (free, covers ALL stocks worldwide)
// ═══════════════════════════════════════════════════════════════════

function yahooExchangeToDisplay(exchange?: string): string {
  if (!exchange) return "NASDAQ";
  const e = exchange.toUpperCase();
  if (e.includes("GER") || e.includes("FRA") || e.includes("XETRA")) return "XETRA";
  if (e.includes("NAS") || e.includes("NGM") || e.includes("NMS")) return "NASDAQ";
  if (e.includes("NYS") || e.includes("NYQ")) return "NYSE";
  if (e.includes("LON") || e.includes("LSE")) return "LSE";
  if (e.includes("PAR") || e.includes("EPA")) return "EURONEXT";
  if (e.includes("SWX") || e.includes("SIX") || e.includes("VTX")) return "SIX";
  if (e.includes("TOR") || e.includes("TSX") || e.includes("TSE")) return "TSX";
  if (e.includes("HKG") || e.includes("HKE")) return "HKEX";
  if (e.includes("TYO") || e.includes("JPX") || e.includes("TOKYO")) return "TSE";
  if (e.includes("OTC") || e.includes("PINK")) return "OTC";
  if (e.includes("MEX")) return "BMV";
  if (e.includes("KOS")) return "KOSDAQ";
  if (e.includes("HAM")) return "Hamburg";
  if (e.includes("DUS") || e.includes("DÜS")) return "Düsseldorf";
  if (e.includes("STU")) return "Stuttgart";
  if (e.includes("MUN") || e.includes("MÜN")) return "München";
  return exchange;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  // 1. Local registry search — instant results
  const localResults: { symbol: string; name: string; exchange: string }[] =
    searchRegistry(query, 8).map((e: StockEntry) => ({
      symbol:   e.symbol,
      name:     e.name,
      exchange: e.exchange,
    }));

  // 2. Finnhub (if API key available)
  let finnhubResults: { symbol: string; name: string; exchange?: string }[] = [];
  try {
    const key = process.env.FINNHUB_API_KEY;
    if (key && key !== "your_api_key_here" && key !== "dein_finnhub_key_hier" && key.length >= 10) {
      const res = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${key}`,
        { next: { revalidate: 300 } }
      );
      if (res.ok) {
        const data = await res.json();
        finnhubResults = (data.result ?? [])
          .filter((r: { type?: string }) => r.type === "Common Stock" || !r.type)
          .slice(0, 10)
          .map((r: { symbol: string; description: string; displaySymbol?: string; exchange?: string }) => ({
            symbol:   r.displaySymbol ?? r.symbol,
            name:     r.description,
            exchange: r.exchange,
          }));
      }
    }
  } catch { /* ignore */ }

  // 3. Yahoo Finance search (free, covers everything worldwide)
  let yahooResults: { symbol: string; name: string; exchange: string }[] = [];
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0&listsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;
    const res = await fetch(yahooUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      yahooResults = (data.quotes ?? [])
        .filter((r: { quoteType?: string }) => r.quoteType === "EQUITY")
        .slice(0, 10)
        .map((r: { symbol: string; shortname?: string; longname?: string; exchDisp?: string; exchange?: string }) => {
          // Strip suffixes for display symbol (e.g. "HIMS" from "HIMS")
          let sym = r.symbol;
          const exchDisplay = yahooExchangeToDisplay(r.exchDisp ?? r.exchange);
          // Keep suffix in symbol for non-US exchanges so resolution works
          if (sym.includes(".")) {
            // Keep as-is for exchange resolution
          }
          return {
            symbol: sym,
            name: r.longname ?? r.shortname ?? sym,
            exchange: exchDisplay,
          };
        });
    }
  } catch { /* ignore */ }

  // Merge: local first, then Finnhub, then Yahoo (no duplicates)
  const seen = new Set(localResults.map(r => `${r.symbol}:${r.exchange}`));
  const merged = [...localResults];

  for (const r of finnhubResults) {
    const key = `${r.symbol}:${r.exchange ?? ""}`;
    if (!seen.has(key)) { merged.push({ symbol: r.symbol, name: r.name, exchange: r.exchange ?? "NASDAQ" }); seen.add(key); }
  }
  for (const r of yahooResults) {
    const key = `${r.symbol}:${r.exchange}`;
    // Also check bare symbol match
    const bareMatch = [...seen].some(s => s.startsWith(r.symbol + ":"));
    if (!seen.has(key) && !bareMatch) { merged.push(r); seen.add(key); }
  }

  return NextResponse.json({ results: merged.slice(0, 15) });
}
