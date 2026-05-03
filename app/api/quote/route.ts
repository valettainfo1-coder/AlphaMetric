import { NextRequest, NextResponse } from "next/server";
import { resolveWithFallback, type TickerEntry } from "@/utils/tickerResolution";

// ═══════════════════════════════════════════════════════════════════
// FINNHUB
// ═══════════════════════════════════════════════════════════════════
const BASE = "https://finnhub.io/api/v1";

function getKey() {
  const k = process.env.FINNHUB_API_KEY;
  if (!k || k === "your_api_key_here" || k === "dein_finnhub_key_hier" || k.length < 10) throw new Error("FINNHUB_API_KEY nicht gesetzt");
  return k;
}

async function finnhub(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("token", getKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "AlphaMetricPro/2.0" },
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("Ungultiger Finnhub API-Key");
  if (res.status === 429) throw new Error("API-Limit erreicht");
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════
// YAHOO FINANCE — with crumb authentication
// ═══════════════════════════════════════════════════════════════════
let yahooCrumb: string | null = null;
let yahooCookies: string | null = null;
let crumbExpiry = 0;

async function getYahooCrumb(): Promise<{ crumb: string; cookies: string } | null> {
  if (yahooCrumb && yahooCookies && Date.now() < crumbExpiry) {
    return { crumb: yahooCrumb, cookies: yahooCookies };
  }
  try {
    const cookieRes = await fetch("https://fc.yahoo.com", {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const rawCookies = cookieRes.headers.getSetCookie?.() ?? [];
    const cookieStr = rawCookies.map((c: string) => c.split(";")[0]).join("; ");
    if (!cookieStr) return null;

    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Cookie: cookieStr },
    });
    if (!crumbRes.ok) return null;
    const crumb = await crumbRes.text();
    if (!crumb || crumb.length < 5) return null;

    yahooCrumb = crumb;
    yahooCookies = cookieStr;
    crumbExpiry = Date.now() + 3600_000; // 1 hour
    return { crumb, cookies: cookieStr };
  } catch { return null; }
}

async function yahooQuote(yahooSymbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const c = meta.regularMarketPrice ?? closes[closes.length - 1];
    // For 2d range: closes[0] = yesterday's close, closes[1] = today's current
    // Use closes[0] as previous close (most accurate), fall back to chartPreviousClose
    const pc = (closes.length >= 2 ? closes[0] : null) ?? meta.chartPreviousClose ?? c;
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
    const auth = await getYahooCrumb();
    if (!auth) return null;

    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=summaryProfile,defaultKeyStatistics,financialData,summaryDetail&crumb=${encodeURIComponent(auth.crumb)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Cookie: auth.cookies,
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      // Crumb might be expired — invalidate and retry once
      if (res.status === 401) {
        yahooCrumb = null;
        crumbExpiry = 0;
        const auth2 = await getYahooCrumb();
        if (!auth2) return null;
        const res2 = await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=summaryProfile,defaultKeyStatistics,financialData,summaryDetail&crumb=${encodeURIComponent(auth2.crumb)}`, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Cookie: auth2.cookies },
        });
        if (!res2.ok) return null;
        const data2 = await res2.json();
        return data2?.quoteSummary?.result?.[0] ?? null;
      }
      return null;
    }
    const data = await res.json();
    return data?.quoteSummary?.result?.[0] ?? null;
  } catch { return null; }
}


// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════
// ── CLASS-SHARE NORMALIZATION ──────────────────────────────────
// Berkshire (BRK.A/BRK.B), Brown-Forman (BF.A/BF.B), Grainger, etc.
// Finnhub expects "BRK.B" (dot), Yahoo expects "BRK-B" (hyphen),
// TradingView uses "BRK.B". Users arrive with all variations.
const CLASS_SHARE_STEMS = ["BRK", "BF", "GEF", "HEI", "LEN", "MOG", "WSO", "RDS", "BIO", "CWEN"];
function normalizeClassShare(raw: string): { finnhub: string; yahoo: string; display: string; name: string } | null {
  const m = raw.toUpperCase().trim().match(/^([A-Z]{2,4})[.\-]?([AB])$/);
  if (!m) return null;
  const [, base, cls] = m;
  if (!CLASS_SHARE_STEMS.includes(base)) return null;
  const names: Record<string, string> = {
    BRK: "Berkshire Hathaway",
    BF: "Brown-Forman",
    GEF: "Greif",
    HEI: "HEICO",
    LEN: "Lennar",
    MOG: "Moog",
    WSO: "Watsco",
    RDS: "Royal Dutch Shell",
    BIO: "Bio-Rad Laboratories",
    CWEN: "Clearway Energy",
  };
  return {
    finnhub: `${base}.${cls}`,
    yahoo: `${base}-${cls}`,
    display: `${base}.${cls}`,
    name: `${names[base] || base} Class ${cls}`,
  };
}

export async function GET(req: NextRequest) {
  const rawSymbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!rawSymbol) return NextResponse.json({ error: "Symbol fehlt" }, { status: 400 });

  // ── RESOLVE through master ticker map ──────────────────────────
  // This is THE critical fix. Every symbol goes through resolveWithFallback
  // which returns: apiFetch (.DE for German), tradingView (XETR: for German),
  // currency (EUR/USD), and all display metadata.
  let ticker: TickerEntry = resolveWithFallback(rawSymbol);
  const isGerman = ticker.region === "DE";

  // Override if class-share detected (BRK.B, BF-B, etc.)
  const classShare = normalizeClassShare(rawSymbol);
  if (classShare) {
    ticker = {
      display: classShare.display,
      apiFetch: classShare.finnhub,  // Finnhub wants dot; Yahoo call will convert
      tradingView: `NYSE:${classShare.display}`,
      currency: "USD",
      exchange: "NYSE",
      name: classShare.name,
      sector: ticker.sector !== "Unknown" ? ticker.sector : "Financial Services",
      region: "US",
    };
  }

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
          exchange: ticker.exchange !== "UNKNOWN" ? ticker.exchange : (p?.exchange ?? ticker.exchange),
          currency: ticker.currency,
          region: ticker.region,
          sector: ticker.sector,
          dataSource: "finnhub",
        });
      }
    }
  } catch { /* fall through to Yahoo */ }

  // ── Yahoo Finance fallback ─────────────────────────────────────
  // Yahoo uses hyphen for class shares (BRK-B), Finnhub uses dot (BRK.B)
  const yahooSymbol = classShare ? classShare.yahoo : ticker.apiFetch;
  const [yQuote, ySummary] = await Promise.all([
    yahooQuote(yahooSymbol),
    yahooSummary(yahooSymbol),
  ]);

  if (yQuote && yQuote.c > 0) {
    const fd = ySummary?.financialData ?? {};
    const ks = ySummary?.defaultKeyStatistics ?? {};
    const sp = ySummary?.summaryProfile ?? {};
    const sd = ySummary?.summaryDetail ?? {};

    // Build metrics from v10 quoteSummary
    const metrics: Record<string, number | undefined> = {
      peBasicExclExtraTTM:          sd.trailingPE?.raw ?? ks.trailingPE?.raw,
      peForward:                     sd.forwardPE?.raw ?? ks.forwardPE?.raw,
      pbAnnual:                      ks.priceToBook?.raw ?? sd.priceToBook?.raw,
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
        marketCapitalization:   (metrics.marketCapitalization ?? (ks.marketCap?.raw ?? 0)) / 1_000_000,
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
      exchange: ticker.exchange !== "UNKNOWN" ? ticker.exchange : (sp.exchange ?? sp.fullExchangeName ?? ticker.exchange),
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
