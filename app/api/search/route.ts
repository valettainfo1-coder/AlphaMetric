import { NextRequest, NextResponse } from "next/server";
import { searchTickers } from "@/utils/tickerResolution";

// ═══════════════════════════════════════════════════════════════════
// SEARCH ENDPOINT — Autocomplete/Typeahead for stocks
// Now uses the shared tickerResolution module (single source of truth)
// ═══════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  // Use the shared search from tickerResolution (includes all German + US stocks)
  const localResults = searchTickers(query).map(t => ({
    symbol: t.display, name: t.name, exchange: t.exchange,
  }));

  // Try Finnhub symbol search for broader results
  let finnhubResults: { symbol: string; name: string; exchange?: string }[] = [];
  try {
    const key = process.env.FINNHUB_API_KEY;
    if (key && key !== "your_api_key_here") {
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
            symbol: r.displaySymbol ?? r.symbol,
            name: r.description,
            exchange: r.exchange,
          }));
      }
    }
  } catch { /* ignore */ }

  // Merge: local first, then Finnhub (no duplicates)
  const seen = new Set(localResults.map(r => r.symbol));
  const merged = [
    ...localResults,
    ...finnhubResults.filter(r => !seen.has(r.symbol)),
  ].slice(0, 12);

  return NextResponse.json({ results: merged });
}
