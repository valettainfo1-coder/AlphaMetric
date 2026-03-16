// api/fetchStockData.ts
// ─────────────────────────────────────────────────────────────────
// STOCK DATA FETCHER — uses tickerResolution to ALWAYS send the
// correct symbol to each data source.
//
// CRITICAL FLOW:
//   User input "ALV" or "Allianz" or "ALV.DE"
//     → resolveWithFallback() → { apiFetch: "ALV.DE", tradingView: "XETR:ALV", currency: "EUR" }
//     → Yahoo Finance receives "ALV.DE" → returns Allianz SE priced in EUR ✓
//     → TradingView widget receives "XETR:ALV" → shows Allianz on XETRA ✓
//     → UI displays price as €XXX.XX ✓
//
//   User input "AAPL" or "Apple"
//     → resolveWithFallback() → { apiFetch: "AAPL", tradingView: "NASDAQ:AAPL", currency: "USD" }
//     → Yahoo Finance receives "AAPL" → returns Apple priced in USD ✓
//     → TradingView widget receives "NASDAQ:AAPL" → shows Apple on NASDAQ ✓
//     → UI displays price as $XXX.XX ✓
// ─────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  resolveWithFallback,
  type TickerEntry,
} from "@/utils/tickerResolution";

// ─── YAHOO FINANCE ───────────────────────────────────────────────
// Yahoo uses the .DE suffix for XETRA stocks, bare ticker for US.
// This aligns perfectly with our apiFetch field.

async function yahooQuote(symbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const c = meta.regularMarketPrice ?? closes[closes.length - 1];
    const pc = meta.chartPreviousClose ?? closes[closes.length - 2] ?? c;
    if (!c || c === 0) return null;

    const d = c - pc;
    const dp = pc > 0 ? (d / pc) * 100 : 0;

    return {
      c:  parseFloat(c?.toFixed(2) ?? "0"),
      d:  parseFloat(d?.toFixed(2) ?? "0"),
      dp: parseFloat(dp?.toFixed(2) ?? "0"),
      h:  parseFloat((meta.regularMarketDayHigh ?? c)?.toFixed(2) ?? "0"),
      l:  parseFloat((meta.regularMarketDayLow ?? c)?.toFixed(2) ?? "0"),
      o:  parseFloat((meta.regularMarketOpen ?? c)?.toFixed(2) ?? "0"),
      pc: parseFloat(pc?.toFixed(2) ?? "0"),
    };
  } catch {
    return null;
  }
}

async function yahooSummary(symbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryProfile,defaultKeyStatistics,financialData,summaryDetail`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.quoteSummary?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

// ─── FINNHUB ─────────────────────────────────────────────────────
const FINNHUB_BASE = "https://finnhub.io/api/v1";

async function finnhubFetch(path: string, params: Record<string, string> = {}) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key || key === "your_api_key_here") return null;

  const url = new URL(`${FINNHUB_BASE}${path}`);
  url.searchParams.set("token", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "AlphaMetricPro/2.0" },
    next: { revalidate: 60 },
  });

  if (!res.ok) return null;
  return res.json();
}

// ─── BUILD RESPONSE ──────────────────────────────────────────────

function buildMetrics(ySummary: Record<string, unknown> | null): Record<string, number | undefined> {
  if (!ySummary) return {};
  const fd = (ySummary as Record<string, Record<string, Record<string, number>>>).financialData ?? {};
  const ks = (ySummary as Record<string, Record<string, Record<string, number>>>).defaultKeyStatistics ?? {};
  const sd = (ySummary as Record<string, Record<string, Record<string, number>>>).summaryDetail ?? {};

  return {
    peBasicExclExtraTTM:         ks.trailingPE?.raw,
    pbAnnual:                    ks.priceToBook?.raw,
    evEbitdaTTM:                 ks.enterpriseToEbitda?.raw,
    roeTTM:                      fd.returnOnEquity?.raw,
    netProfitMarginTTM:          fd.profitMargins?.raw,
    grossMarginTTM:              fd.grossMargins?.raw,
    dividendYieldIndicatedAnnual: sd.dividendYield?.raw ? sd.dividendYield.raw * 100 : undefined,
    payoutRatioTTM:              ks.payoutRatio?.raw,
    beta:                        ks.beta?.raw ?? sd.beta?.raw,
    revenueGrowth3Y:             fd.revenueGrowth?.raw,
    epsGrowth3Y:                 fd.earningsGrowth?.raw,
    epsGrowth1Y:                 fd.earningsGrowth?.raw,
    totalDebt_totalEquityAnnual: ks.debtToEquity?.raw,
    currentRatioAnnual:          fd.currentRatio?.raw,
    quickRatioAnnual:            fd.quickRatio?.raw,
    "52WeekHigh":                sd.fiftyTwoWeekHigh?.raw,
    "52WeekLow":                 sd.fiftyTwoWeekLow?.raw,
    marketCapitalization:        ks.marketCap?.raw,
    revenuePerShareTTM:          fd.revenuePerShare?.raw,
    totalRevenueTTM:             fd.totalRevenue?.raw,
  };
}

// ─── MAIN HANDLER ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const rawSymbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!rawSymbol) {
    return NextResponse.json({ error: "Symbol fehlt" }, { status: 400 });
  }

  // ── STEP 1: Resolve the ticker through our master map ──────────
  // This is THE critical fix. Every symbol goes through resolution
  // which returns the correct apiFetch (.DE for German) and
  // tradingView (XETR: for German) symbols.
  const ticker: TickerEntry = resolveWithFallback(rawSymbol);

  // ── STEP 2: Try Finnhub first (works well for US) ──────────────
  // For German stocks: Finnhub needs the .DE suffix in apiFetch
  // to return XETRA data, not US OTC ADR data.
  try {
    const finnhubSymbol = ticker.apiFetch; // "ALV.DE" for German, "AAPL" for US

    const [quote, profile, metricsRaw, recs, target] = await Promise.allSettled([
      finnhubFetch("/quote", { symbol: finnhubSymbol }),
      finnhubFetch("/stock/profile2", { symbol: finnhubSymbol }),
      finnhubFetch("/stock/metric", { symbol: finnhubSymbol, metric: "all" }),
      finnhubFetch("/stock/recommendation", { symbol: finnhubSymbol }),
      finnhubFetch("/stock/price-target", { symbol: finnhubSymbol }),
    ]);

    const q = quote.status === "fulfilled" ? quote.value : null;
    const p = profile.status === "fulfilled" ? profile.value : null;
    const m = metricsRaw.status === "fulfilled" ? metricsRaw.value?.metric ?? {} : {};
    const r = recs.status === "fulfilled" ? recs.value?.[0] ?? null : null;
    const t = target.status === "fulfilled" ? target.value : null;

    // Only use Finnhub data if we got a real non-zero price
    if (q && q.c && q.c !== 0) {
      return NextResponse.json({
        quote: q,
        profile: {
          ...(p ?? {}),
          // ALWAYS use our master map for currency/exchange/name
          // Never trust Finnhub's auto-detection for German stocks
          currency: ticker.currency,
          name:     ticker.name !== ticker.display ? ticker.name : (p?.name ?? ticker.display),
          exchange: ticker.exchange !== "UNKNOWN" ? ticker.exchange : (p?.exchange ?? ""),
        },
        metrics: m,
        rec: r,
        target: t,
        // ── THE SYNC KEYS ──
        // These are what the frontend uses to:
        //   1. Display the price with correct currency (currency)
        //   2. Load the TradingView chart (tvSymbol → XETR:ALV)
        //   3. Show the ticker in the UI (displaySymbol → ALV)
        tvSymbol:      ticker.tradingView,  // "XETR:ALV" — pass this to TradingView widget
        displaySymbol: ticker.display,       // "ALV"      — show this in UI
        exchange:      ticker.exchange,      // "XETRA"    — show this in UI
        currency:      ticker.currency,      // "EUR"      — format prices with this
        region:        ticker.region,        // "DE"       — for conditional logic
        sector:        ticker.sector,        // "Insurance" — for portfolio analysis
        dataSource:    "finnhub",
      });
    }
  } catch {
    // Fall through to Yahoo
  }

  // ── STEP 3: Yahoo Finance fallback ─────────────────────────────
  // Yahoo understands .DE suffix natively (ALV.DE → Allianz on XETRA)
  // This is the primary reliable source for German stocks.
  const [yQuote, ySummary] = await Promise.all([
    yahooQuote(ticker.apiFetch),    // "ALV.DE" for German, "AAPL" for US
    yahooSummary(ticker.apiFetch),
  ]);

  if (yQuote && yQuote.c > 0) {
    const sp = (ySummary as Record<string, Record<string, unknown>>)?.summaryProfile ?? {};
    const ks = (ySummary as Record<string, Record<string, Record<string, number>>>)?.defaultKeyStatistics ?? {};
    const metrics = buildMetrics(ySummary);

    return NextResponse.json({
      quote: yQuote,
      profile: {
        name:                 ticker.name !== ticker.display ? ticker.name : ((sp as Record<string, string>).longName ?? ticker.display),
        currency:             ticker.currency,       // ALWAYS from our map
        exchange:             ticker.exchange,        // ALWAYS from our map
        marketCapitalization: (ks.marketCap?.raw ?? 0) / 1_000_000,
        finnhubIndustry:      (sp as Record<string, string>).industry ?? (sp as Record<string, string>).sector ?? ticker.sector,
        logo:                 `https://logo.clearbit.com/${((sp as Record<string, string>).website ?? "").replace(/https?:\/\/(www\.)?/, "")}`,
        country:              (sp as Record<string, string>).country ?? (ticker.region === "DE" ? "DE" : "US"),
        website:              (sp as Record<string, string>).website ?? "",
      },
      metrics,
      rec: null,
      target: null,
      // ── THE SYNC KEYS (same structure as Finnhub path) ──
      tvSymbol:      ticker.tradingView,  // "XETR:ALV"
      displaySymbol: ticker.display,       // "ALV"
      exchange:      ticker.exchange,      // "XETRA"
      currency:      ticker.currency,      // "EUR"
      region:        ticker.region,        // "DE"
      sector:        ticker.sector,        // "Insurance"
      dataSource:    "yahoo",
    });
  }

  // ── STEP 4: .DE suffix retry for unknown tickers ───────────────
  // If user typed a bare symbol that's not in our map, try with .DE
  // as a last resort before returning 404.
  if (!ticker.apiFetch.includes(".DE")) {
    const deSymbol = ticker.apiFetch + ".DE";
    const [dQuote] = await Promise.all([yahooQuote(deSymbol)]);

    if (dQuote && dQuote.c > 0) {
      return NextResponse.json({
        quote: dQuote,
        profile: {
          name:     ticker.display,
          currency: "EUR",          // .DE → EUR
          exchange: "XETRA",
        },
        metrics: {},
        rec: null,
        target: null,
        tvSymbol:      `XETR:${ticker.display}`,  // Best guess for TradingView
        displaySymbol: ticker.display,
        exchange:      "XETRA",
        currency:      "EUR",
        region:        "DE",
        sector:        "Unknown",
        dataSource:    "yahoo-de-fallback",
      });
    }
  }

  // ── STEP 5: 404 ────────────────────────────────────────────────
  return NextResponse.json(
    {
      error: `Ticker "${ticker.display}" nicht gefunden. Versuche: BMW, SAP, ALV, AAPL, NVDA, MSFT`,
    },
    { status: 404 }
  );
}
