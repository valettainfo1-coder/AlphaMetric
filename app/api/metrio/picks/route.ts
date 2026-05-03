import { NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════
// METRIO EMPFEHLUNGEN — Daily curated picks
// Day-seeded selection aus einem kuratierten Pool hochwertiger Aktien.
// KEINE Anlageberatung — nur Horizonterweiterung ("lohnt sich reinzuschauen").
// Cache: 12 Stunden pro Tages-Seed.
// ═══════════════════════════════════════════════════════════════════

type Pick = {
  symbol: string;
  name: string;
  sector: string;
  country: "US" | "DE" | "EU" | "GB" | "CH";
  priceNow?: number | null;
  changePct?: number | null;
  currency?: string;
  thesis: string; // "Warum reinschauen?" 1-2 Sätze
  metrioScore: number; // 0-100, deterministisch
};

// Kuratierter Pool — Blue Chips über Sektoren & Regionen
const POOL: Array<{
  symbol: string; name: string; sector: string; country: Pick["country"]; score: number;
}> = [
  // Tech (US)
  { symbol: "AAPL",  name: "Apple Inc.",                sector: "Technology",   country: "US", score: 86 },
  { symbol: "MSFT",  name: "Microsoft Corp.",           sector: "Technology",   country: "US", score: 88 },
  { symbol: "GOOGL", name: "Alphabet Inc.",             sector: "Technology",   country: "US", score: 84 },
  { symbol: "NVDA",  name: "NVIDIA Corp.",              sector: "Semiconductor",country: "US", score: 82 },
  { symbol: "AMZN",  name: "Amazon.com Inc.",           sector: "Consumer",     country: "US", score: 80 },
  { symbol: "META",  name: "Meta Platforms",            sector: "Technology",   country: "US", score: 79 },
  { symbol: "ASML",  name: "ASML Holding",              sector: "Semiconductor",country: "EU", score: 85 },
  // Healthcare
  { symbol: "JNJ",   name: "Johnson & Johnson",         sector: "Healthcare",   country: "US", score: 78 },
  { symbol: "LLY",   name: "Eli Lilly",                 sector: "Healthcare",   country: "US", score: 83 },
  { symbol: "NVO",   name: "Novo Nordisk",              sector: "Healthcare",   country: "EU", score: 82 },
  { symbol: "UNH",   name: "UnitedHealth Group",        sector: "Healthcare",   country: "US", score: 76 },
  // Consumer / Retail
  { symbol: "KO",    name: "Coca-Cola",                 sector: "Consumer",     country: "US", score: 74 },
  { symbol: "PG",    name: "Procter & Gamble",          sector: "Consumer",     country: "US", score: 76 },
  { symbol: "COST",  name: "Costco Wholesale",          sector: "Retail",       country: "US", score: 81 },
  { symbol: "MC.PA", name: "LVMH",                      sector: "Luxury",       country: "EU", score: 80 },
  // Financials
  { symbol: "V",     name: "Visa Inc.",                 sector: "Financial",    country: "US", score: 84 },
  { symbol: "MA",    name: "Mastercard Inc.",           sector: "Financial",    country: "US", score: 82 },
  { symbol: "BRK.B", name: "Berkshire Hathaway",        sector: "Financial",    country: "US", score: 85 },
  // Industrials / Energy
  { symbol: "CAT",   name: "Caterpillar Inc.",          sector: "Industrials",  country: "US", score: 72 },
  { symbol: "SIE.DE",name: "Siemens AG",                sector: "Industrials",  country: "DE", score: 78 },
  { symbol: "SAP",   name: "SAP SE",                    sector: "Technology",   country: "DE", score: 77 },
  { symbol: "ALV.DE",name: "Allianz SE",                sector: "Insurance",    country: "DE", score: 75 },
  { symbol: "MUV2.DE",name:"Münchener Rück",            sector: "Insurance",    country: "DE", score: 74 },
  { symbol: "NESN.SW",name:"Nestlé SA",                 sector: "Consumer",     country: "CH", score: 74 },
  { symbol: "ROG.SW", name:"Roche Holding",             sector: "Healthcare",   country: "CH", score: 75 },
];

// Deterministischer Day-Seed → 4 Picks aus Pool
function dayPicks(pool: typeof POOL, n = 4): typeof POOL {
  const today = new Date();
  const seedStr = `${today.getUTCFullYear()}-${today.getUTCMonth() + 1}-${today.getUTCDate()}`;
  // Simple deterministic hash
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = ((seed << 5) - seed + seedStr.charCodeAt(i)) | 0;
  // Score-gewichtete, diversifizierte Auswahl
  const indexed = pool.map((p, i) => ({
    p, i,
    rank: ((Math.abs(seed + i * 2654435761) >>> 0) % 1000) + p.score * 3,
  }));
  indexed.sort((a, b) => b.rank - a.rank);
  const picked: typeof POOL = [];
  const sectorsUsed = new Set<string>();
  for (const { p } of indexed) {
    if (picked.length >= n) break;
    if (sectorsUsed.has(p.sector)) continue; // max 1 pro Sektor → Diversifikation
    picked.push(p);
    sectorsUsed.add(p.sector);
  }
  // Auffüllen, falls Sektoren zu knapp
  if (picked.length < n) {
    for (const { p } of indexed) {
      if (picked.length >= n) break;
      if (!picked.includes(p)) picked.push(p);
    }
  }
  return picked;
}

async function fetchQuote(symbol: string): Promise<{ c: number; dp: number } | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key || key === "your_api_key_here") return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const q = await res.json();
    if (typeof q?.c !== "number" || q.c === 0) return null;
    return { c: q.c, dp: typeof q.dp === "number" ? q.dp : 0 };
  } catch {
    return null;
  }
}

// Kurze "warum reinschauen?"-Thesen — Groq-generiert, mit Fallbacks
async function generateTheses(picks: typeof POOL): Promise<Record<string, string>> {
  const fallback: Record<string, string> = {};
  for (const p of picks) {
    fallback[p.symbol] = `${p.sector}-Schwergewicht aus ${p.country} mit stabilem Fundamental-Profil — Metrio-Score ${p.score}/100.`;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return fallback;

  const prompt = `Du bist Metrio. Für jede dieser Aktien schreibe EINEN prägnanten Satz (max. 22 Wörter) auf Deutsch, der beschreibt, warum ein Langfrist-Investor "mal reinschauen" sollte.

WICHTIG:
- KEIN "kaufen/verkaufen", KEINE Kursprognose, KEINE Kauf-Empfehlung.
- Sachlich, neutral, fokus auf Geschäftsmodell, Marktposition oder strukturelle Stärke.
- Kein Filler, keine Floskeln.

AKTIEN (symbol, name, sector):
${picks.map((p) => `- ${p.symbol} · ${p.name} · ${p.sector}`).join("\n")}

OUTPUT STRIKT als JSON: {"items":[{"symbol":"AAPL","thesis":"..."},...]}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 900,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const arr: Array<{ symbol: string; thesis: string }> =
      Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];
    const out: Record<string, string> = { ...fallback };
    for (const e of arr) {
      if (e?.symbol && e?.thesis) out[e.symbol] = String(e.thesis).slice(0, 180);
    }
    return out;
  } catch {
    return fallback;
  }
}

export async function GET() {
  const selected = dayPicks(POOL, 4);

  // Parallel: Quotes + Groq-Thesen
  const [quotes, theses] = await Promise.all([
    Promise.all(selected.map((p) => fetchQuote(p.symbol))),
    generateTheses(selected),
  ]);

  const picks: Pick[] = selected.map((p, i) => ({
    symbol: p.symbol,
    name: p.name,
    sector: p.sector,
    country: p.country,
    priceNow: quotes[i]?.c ?? null,
    changePct: quotes[i]?.dp ?? null,
    currency: p.country === "US" ? "USD" : p.country === "GB" ? "GBP" : p.country === "CH" ? "CHF" : "EUR",
    thesis: theses[p.symbol] || `${p.sector} · ${p.country} — interessantes Profil.`,
    metrioScore: p.score,
  }));

  return NextResponse.json({
    picks,
    generatedAt: new Date().toISOString(),
    disclaimer: "Keine Anlageberatung i.S.d. § 85 WpHG. Nur Finanzbildung.",
  });
}
