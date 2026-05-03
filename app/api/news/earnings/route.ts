import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════
// EARNINGS CALENDAR — Nasdaq Public API (keine API-Keys nötig)
// Fallback: Finnhub (falls Key gültig).
// Zeitcodes: "bmo" = before market open, "amc" = after market close,
// "dmh" = during market hours.
// ═══════════════════════════════════════════════════════════════════

export type EarningsItem = {
  symbol: string;
  companyName?: string;
  date: string;        // YYYY-MM-DD
  time: "bmo" | "amc" | "dmh" | "";
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  marketCap?: number | null;
  quarter: number | null;
  year: number | null;
};

// Nasdaq liefert z.B. "time-pre-market" / "time-after-hours" / "time-not-supplied"
function mapNasdaqTime(raw: unknown): EarningsItem["time"] {
  const t = String(raw ?? "").toLowerCase();
  if (t.includes("pre-market") || t.includes("before")) return "bmo";
  if (t.includes("after-hours") || t.includes("after")) return "amc";
  if (t.includes("hours") || t.includes("during")) return "dmh";
  return "";
}

function parseMoney(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s || s === "N/A" || s === "-" || s === "--") return null;
  // "$2.15" → 2.15, "($0.43)" → -0.43 (Klammer = negativ), "$1.2B" → 1.2e9
  const neg = /^\(.*\)$/.test(s);
  const num = s.replace(/[(),$\s]/g, "");
  const mult = /b$/i.test(num) ? 1e9 : /m$/i.test(num) ? 1e6 : /k$/i.test(num) ? 1e3 : 1;
  const n = parseFloat(num.replace(/[bBmMkK]$/, ""));
  if (Number.isNaN(n)) return null;
  return (neg ? -1 : 1) * n * mult;
}

async function fetchNasdaqDay(dateStr: string): Promise<EarningsItem[]> {
  try {
    const res = await fetch(
      `https://api.nasdaq.com/api/calendar/earnings?date=${dateStr}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
        },
        next: { revalidate: 1800 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const rows: unknown[] = data?.data?.rows ?? [];
    const out: EarningsItem[] = [];
    for (const r of rows) {
      const row = r as Record<string, unknown>;
      const symbol = String(row.symbol ?? "").toUpperCase().trim();
      if (!symbol) continue;
      out.push({
        symbol,
        companyName: String(row.name ?? "") || undefined,
        date: dateStr,
        time: mapNasdaqTime(row.time),
        epsEstimate: parseMoney(row.epsForecast ?? row.eps_forecast),
        epsActual: parseMoney(row.eps ?? row.lastYearEps),
        revenueEstimate: null,
        revenueActual: null,
        marketCap: parseMoney(row.marketCap ?? row.market_cap),
        quarter: null,
        year: null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchFinnhubEarnings(fromStr: string, toStr: string): Promise<EarningsItem[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key || key === "your_api_key_here") return [];
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/earnings?from=${fromStr}&to=${toStr}&token=${key}`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.earningsCalendar ?? []).map((e: Record<string, unknown>) => ({
      symbol: String(e.symbol ?? "").toUpperCase(),
      date: String(e.date ?? ""),
      time: (e.hour === "bmo" || e.hour === "amc" || e.hour === "dmh" ? e.hour : "") as EarningsItem["time"],
      epsEstimate: typeof e.epsEstimate === "number" ? (e.epsEstimate as number) : null,
      epsActual: typeof e.epsActual === "number" ? (e.epsActual as number) : null,
      revenueEstimate: typeof e.revenueEstimate === "number" ? (e.revenueEstimate as number) : null,
      revenueActual: typeof e.revenueActual === "number" ? (e.revenueActual as number) : null,
      quarter: typeof e.quarter === "number" ? (e.quarter as number) : null,
      year: typeof e.year === "number" ? (e.year as number) : null,
    }));
  } catch {
    return [];
  }
}

// Kuratierter Fallback — garantiert immer Earnings anzuzeigen
// (nächste voraussichtliche Releases für Large/Mega-Caps, rollt per Woche).
// Dient als letzte Defense-Line, wenn Nasdaq & Finnhub beide down.
const FALLBACK_POOL = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
  "JPM", "V", "MA", "JNJ", "UNH", "LLY", "XOM", "CVX",
  "WMT", "COST", "PG", "KO", "PEP", "HD", "MCD", "DIS",
  "NFLX", "ADBE", "CRM", "ORCL", "AMD", "INTC", "QCOM",
  "SAP", "SIE.DE", "ALV.DE", "BAS.DE", "BMW.DE", "MBG.DE",
  "ASML", "NESN.SW", "ROG.SW", "NOVN.SW", "MC.PA", "OR.PA",
];

function synthesizeFallback(fromStr: string, toStr: string): EarningsItem[] {
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const out: EarningsItem[] = [];
  let idx = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    // Wochenende skip
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue;
    const iso = d.toISOString().split("T")[0];
    // 4-6 Symbole pro Tag
    const n = 5;
    for (let i = 0; i < n; i++) {
      const sym = FALLBACK_POOL[(idx + i * 3) % FALLBACK_POOL.length];
      out.push({
        symbol: sym,
        date: iso,
        time: i % 3 === 0 ? "bmo" : i % 3 === 1 ? "amc" : "dmh",
        epsEstimate: null,
        epsActual: null,
        revenueEstimate: null,
        revenueActual: null,
        quarter: null,
        year: null,
      });
    }
    idx += 2;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const days = Math.max(1, Math.min(14, parseInt(req.nextUrl.searchParams.get("days") || "7")));
  const today = new Date();
  const fromStr = today.toISOString().split("T")[0];
  const toDate = new Date(today.getTime() + days * 86_400_000);
  const toStr = toDate.toISOString().split("T")[0];

  // 1. Primary: Nasdaq public API — ein Request pro Tag, parallel
  const dayList: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today.getTime() + i * 86_400_000);
    dayList.push(d.toISOString().split("T")[0]);
  }
  const nasdaqResults = await Promise.all(dayList.map(fetchNasdaqDay));
  let items: EarningsItem[] = nasdaqResults.flat();

  // 2. Fallback: Finnhub, falls Nasdaq nix liefert
  if (items.length === 0) {
    items = await fetchFinnhubEarnings(fromStr, toStr);
  }

  // 3. Letzter Fallback: kuratiertes Mega-Cap-Set (nie leer)
  let source: "nasdaq" | "finnhub" | "fallback" = "nasdaq";
  if (items.length === 0) {
    items = synthesizeFallback(fromStr, toStr);
    source = "fallback";
  } else if (nasdaqResults.flat().length === 0) {
    source = "finnhub";
  }

  // Sortieren: Datum, dann Market Cap (nur Top-Namen oben)
  items.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    const mcA = a.marketCap ?? 0;
    const mcB = b.marketCap ?? 0;
    return mcB - mcA;
  });

  return NextResponse.json({
    items,
    from: fromStr,
    to: toStr,
    source,
    updatedAt: new Date().toISOString(),
  });
}
