import { NextRequest, NextResponse } from "next/server";
import { resolveWithFallback, type TickerEntry } from "@/utils/tickerResolution";

// ═══════════════════════════════════════════════════════════════════
// FINNHUB
// ═══════════════════════════════════════════════════════════════════
const BASE = "https://finnhub.io/api/v1";

function getKey() {
  const k = process.env.FINNHUB_API_KEY;
  if (!k || k === "your_api_key_here") throw new Error("FINNHUB_API_KEY nicht gesetzt");
  return k;
}

async function finnhub(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("token", getKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "AlphaMetricPro/2.0" },
    next: { revalidate: 60 },
  });
  if (res.status === 401) throw new Error("Ungultiger Finnhub API-Key");
  if (res.status === 429) throw new Error("API-Limit erreicht");
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════
// YAHOO FINANCE FALLBACK
// ═══════════════════════════════════════════════════════════════════
async function yahooQuote(yahooSymbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`;
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
      c: parseFloat(c?.toFixed(2) ?? "0"),
      d: parseFloat(d?.toFixed(2) ?? "0"),
      dp: parseFloat(dp?.toFixed(2) ?? "0"),
      h: parseFloat((meta.regularMarketDayHigh ?? c)?.toFixed(2) ?? "0"),
      l: parseFloat((meta.regularMarketDayLow ?? c)?.toFixed(2) ?? "0"),
      o: parseFloat((meta.regularMarketOpen ?? c)?.toFixed(2) ?? "0"),
      pc: parseFloat(pc?.toFixed(2) ?? "0"),
    };
  } catch { return null; }
}

async function yahooSummary(yahooSymbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=summaryProfile,defaultKeyStatistics,financialData,summaryDetail`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.quoteSummary?.result?.[0] ?? null;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const rawSymbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!rawSymbol) return NextResponse.json({ error: "Symbol fehlt" }, { status: 400 });

  // ── RESOLVE through master ticker map ──────────────────────────
  // This is THE critical fix. Every symbol goes through resolveWithFallback
  // which returns: apiFetch (.DE for German), tradingView (XETR: for German),
  // currency (EUR/USD), and all display metadata.
  const ticker: TickerEntry = resolveWithFallback(rawSymbol);
  const isGerman = ticker.region === "DE";

  // ── Finnhub first ──────────────────────────────────────────────
  try {
    const key = process.env.FINNHUB_API_KEY;
    if (key && key !== "your_api_key_here") {
      // Use apiFetch symbol: "ALV.DE" for German, "AAPL" for US
      const finnhubSymbol = ticker.apiFetch;
      const [quote, profile, metricsRaw, recs, target] = await Promise.allSettled([
        finnhub("/quote", { symbol: finnhubSymbol }),
        finnhub("/stock/profile2", { symbol: finnhubSymbol }),
        finnhub("/stock/metric", { symbol: finnhubSymbol, metric: "all" }),
        finnhub("/stock/recommendation", { symbol: finnhubSymbol }),
        finnhub("/stock/price-target", { symbol: finnhubSymbol }),
      ]);

      const q = quote.status === "fulfilled" ? quote.value : null;
      const p = profile.status === "fulfilled" ? profile.value : null;
      const m = metricsRaw.status === "fulfilled" ? metricsRaw.value?.metric ?? {} : {};
      const r = recs.status === "fulfilled" ? recs.value?.[0] ?? null : null;
      const t = target.status === "fulfilled" ? target.value : null;

      if (q && q.c && q.c !== 0) {
        return NextResponse.json({
          quote: q,
          profile: {
            ...(p ?? {}),
            currency: ticker.currency,
            name: ticker.name !== ticker.display ? ticker.name : (p?.name ?? ticker.display),
            exchange: ticker.exchange !== "UNKNOWN" ? ticker.exchange : (p?.exchange ?? ""),
          },
          metrics: m,
          rec: r,
          target: t,
          tvSymbol: ticker.tradingView,
          displaySymbol: ticker.display,
          exchange: ticker.exchange,
          currency: ticker.currency,
          region: ticker.region,
          sector: ticker.sector,
          dataSource: "finnhub",
        });
      }
    }
  } catch { /* fall through to Yahoo */ }

  // ── Yahoo Finance fallback ─────────────────────────────────────
  const [yQuote, ySummary] = await Promise.all([
    yahooQuote(ticker.apiFetch),
    yahooSummary(ticker.apiFetch),
  ]);

  if (yQuote && yQuote.c > 0) {
    const fd = ySummary?.financialData ?? {};
    const ks = ySummary?.defaultKeyStatistics ?? {};
    const sp = ySummary?.summaryProfile ?? {};
    const sd = ySummary?.summaryDetail ?? {};

    const metrics: Record<string, number | undefined> = {
      peBasicExclExtraTTM:          ks.trailingPE?.raw,
      pbAnnual:                      ks.priceToBook?.raw,
      evEbitdaTTM:                   ks.enterpriseToEbitda?.raw,
      roeTTM:                        fd.returnOnEquity?.raw,
      netProfitMarginTTM:            fd.profitMargins?.raw,
      grossMarginTTM:                fd.grossMargins?.raw,
      dividendYieldIndicatedAnnual:  sd.dividendYield?.raw ? sd.dividendYield.raw * 100 : undefined,
      payoutRatioTTM:                ks.payoutRatio?.raw,
      beta:                          ks.beta?.raw ?? sd.beta?.raw,
      revenueGrowth3Y:               fd.revenueGrowth?.raw,
      epsGrowth3Y:                   fd.earningsGrowth?.raw,
      epsGrowth1Y:                   fd.earningsGrowth?.raw,
      totalDebt_totalEquityAnnual:   ks.debtToEquity?.raw,
      currentRatioAnnual:            fd.currentRatio?.raw,
      quickRatioAnnual:              fd.quickRatio?.raw,
      "52WeekHigh":                  sd.fiftyTwoWeekHigh?.raw,
      "52WeekLow":                   sd.fiftyTwoWeekLow?.raw,
      marketCapitalization:          ks.marketCap?.raw,
      revenuePerShareTTM:            fd.revenuePerShare?.raw,
      totalRevenueTTM:               fd.totalRevenue?.raw,
    };

    return NextResponse.json({
      quote: yQuote,
      profile: {
        name:                   ticker.name !== ticker.display ? ticker.name : (sp.longName ?? ticker.display),
        currency:               ticker.currency,
        exchange:               ticker.exchange,
        marketCapitalization:   (ks.marketCap?.raw ?? 0) / 1_000_000,
        finnhubIndustry:        sp.industry ?? sp.sector ?? ticker.sector,
        logo:                   `https://logo.clearbit.com/${(sp.website ?? "").replace(/https?:\/\/(www\.)?/, "")}`,
        country:                sp.country ?? (isGerman ? "DE" : "US"),
        website:                sp.website ?? "",
      },
      metrics,
      rec: null,
      target: null,
      tvSymbol: ticker.tradingView,
      displaySymbol: ticker.display,
      exchange: ticker.exchange,
      currency: ticker.currency,
      region: ticker.region,
      sector: ticker.sector,
      dataSource: "yahoo",
    });
  }

  // ── .DE retry for unknown tickers ──────────────────────────────
  if (!ticker.apiFetch.includes(".DE")) {
    const deQuote = await yahooQuote(ticker.apiFetch + ".DE");
    if (deQuote && deQuote.c > 0) {
      return NextResponse.json({
        quote: deQuote,
        profile: { name: ticker.display, currency: "EUR", exchange: "XETRA" },
        metrics: {},
        rec: null,
        target: null,
        tvSymbol: `XETR:${ticker.display}`,
        displaySymbol: ticker.display,
        exchange: "XETRA",
        currency: "EUR",
        region: "DE",
        sector: "Unknown",
        dataSource: "yahoo-de-fallback",
      });
    }
  }

  return NextResponse.json(
    { error: `Ticker "${ticker.display}" nicht gefunden. Versuche: BMW, SAP, ALV, AAPL, NVDA, MSFT` },
    { status: 404 }
  );
}
