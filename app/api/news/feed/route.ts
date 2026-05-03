import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════
// MARKTPULS — LIVE NEWS FEED (Tier-1 RSS Aggregation)
// Keine API-Keys nötig. Quellen:
//   • Reuters Business (Yahoo RSS Proxy)
//   • CNBC Top News & Markets
//   • MarketWatch Top Stories
//   • Yahoo Finance Headlines
//   • Handelsblatt (DE)
//   • Manager Magazin (DE)
//   • Spiegel Wirtschaft (DE)
//   • FT (Yahoo Proxy, falls verfügbar)
//   • Google News: Business (US + DE)
// Optional: Finnhub (falls gültiger Key vorhanden)
// Metrio-Verifikation via Groq bleibt aktiv.
// ═══════════════════════════════════════════════════════════════════

type VerificationStatus = "verified" | "review" | "hold";

export type NewsItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  publishedAt: string;
  category: string;
  impact: "HIGH" | "MED" | "LOW";
  tickers: string[];
  verification: { status: VerificationStatus; score: number; note: string };
  relevanceScore?: number;
};

// ── RSS Quellen ────────────────────────────────────────────────────
type Feed = { name: string; url: string; source: string; tier1?: boolean; lang?: "de" | "en" };

const FEEDS: Feed[] = [
  // US / EN Tier-1
  { name: "CNBC Top News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", source: "CNBC", tier1: true, lang: "en" },
  { name: "CNBC Markets", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839135", source: "CNBC", tier1: true, lang: "en" },
  { name: "MarketWatch Top", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", source: "MarketWatch", tier1: true, lang: "en" },
  { name: "MarketWatch Realtime", url: "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines", source: "MarketWatch", tier1: true, lang: "en" },
  { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", source: "Yahoo Finance", lang: "en" },
  { name: "Investing.com", url: "https://www.investing.com/rss/news_25.rss", source: "Investing.com", lang: "en" },
  // DE Tier-1
  { name: "Handelsblatt Top", url: "https://www.handelsblatt.com/contentexport/feed/top-themen", source: "Handelsblatt", tier1: true, lang: "de" },
  { name: "Handelsblatt Finanzen", url: "https://www.handelsblatt.com/contentexport/feed/finanzen", source: "Handelsblatt", tier1: true, lang: "de" },
  { name: "Manager Magazin", url: "https://www.manager-magazin.de/index.rss", source: "Manager Magazin", tier1: true, lang: "de" },
  { name: "Spiegel Wirtschaft", url: "https://www.spiegel.de/wirtschaft/index.rss", source: "Spiegel", tier1: true, lang: "de" },
  { name: "FAZ Wirtschaft", url: "https://www.faz.net/rss/aktuell/wirtschaft/", source: "FAZ", tier1: true, lang: "de" },
  // Google News — hohe Trefferquote für Geopolitik / Makro
  { name: "Google Biz US", url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en", source: "Google News", lang: "en" },
  { name: "Google Biz DE", url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=de&gl=DE&ceid=DE:de", source: "Google News", lang: "de" },
];

// ── Kategorie / Impact-Logik (bilingual) ───────────────────────────
const HIGH_IMPACT = /\b(fed|fomc|ezb|ecb|bce|boj|zins|rate.?(cut|hike|senkung|erh(ö|oe)hung)|cpi|ppi|inflation|nfp|payroll|krieg|war|iran|israel|ukraine|putin|trump|zoll|tariff|sanction|sanktion|crash|einbruch|record|rekord|all.?time.?high|allzeithoch|emergency|default|pleite)\b/i;
const MED_IMPACT  = /\b(earnings|quartals|umsatz|revenue|prognose|guidance|beat|miss|(ü|ue)bernahme|acquisition|merger|fusion|ipo|entlassung|layoff|oil|(ö|oe)l|brent|wti|gold|bitcoin|ethereum|dax|mdax|s&p|nasdaq|dow)\b/i;

function categorize(text: string): string {
  const t = text.toLowerCase();
  if (/\b(iran|israel|ukraine|russ(ia|land)|putin|china|taiwan|trump|krieg|war|sanction|sanktion|nato|tariff|zoll|geopolit|middle.?east|hamas|houthi|erdogan|north.?korea|nordkorea)\b/.test(t)) return "GEOPOLITIK";
  if (/\b(fed|fomc|ezb|ecb|bce|boj|cpi|ppi|inflation|gdp|bip|arbeitslos|unemploy|jobs|payroll|rate|zins|yield|bond|anleihe|treasury|powell|lagarde|ifo|sentix|zew)\b/.test(t)) return "MAKRO";
  if (/\b(earnings|quartals|umsatz|revenue|guidance|quarterly|q[1-4]|beat|miss|profit|gewinn|dividende|dividend)\b/.test(t)) return "EARNINGS";
  if (/\b(oil|(ö|oe)l|brent|wti|gold|silber|silver|kupfer|copper|commodity|commodities|opec|gas|natural.?gas|weizen|wheat)\b/.test(t)) return "ROHSTOFFE";
  if (/\b(bitcoin|btc|ethereum|eth|krypto|crypto|solana|defi|stablecoin|tether)\b/.test(t)) return "KRYPTO";
  if (/\b(dax|mdax|s&p|nasdaq|dow|ftse|nikkei|stoxx|msci|index|indizes|indices|rally|sell.?off|b(ä|ae)r|bear|bull)\b/.test(t)) return "MÄRKTE";
  return "UNTERNEHMEN";
}

function impactLevel(text: string): "HIGH" | "MED" | "LOW" {
  if (HIGH_IMPACT.test(text)) return "HIGH";
  if (MED_IMPACT.test(text)) return "MED";
  return "LOW";
}

// ── Mini RSS/Atom Parser ───────────────────────────────────────────
function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}
function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function pick(block: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]).trim() : "";
}
function pickAttr(block: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["']`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]).trim() : "";
}
function parseDate(s: string): string {
  if (!s) return new Date().toISOString();
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function fetchFeed(f: Feed): Promise<NewsItem[]> {
  try {
    const res = await fetch(f.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AlphaMetricBot/1.0; +https://alphametric.app)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml; q=0.9, */*; q=0.8",
      },
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // RSS 2.0: <item>...</item>. Atom: <entry>...</entry>.
    const itemBlocks = [
      ...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi),
      ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi),
    ].map((m) => m[0]);

    const items: NewsItem[] = [];
    for (const b of itemBlocks) {
      const titleRaw = pick(b, "title");
      if (!titleRaw) continue;
      const headline = stripTags(titleRaw).slice(0, 240);
      // Google News packt die Quelle in <source>; sonst feed default.
      const gSource = stripTags(pick(b, "source"));
      const source = gSource || f.source;

      // Link kann <link>URL</link> oder <link href="URL"/> sein
      let url = stripTags(pick(b, "link"));
      if (!url) url = pickAttr(b, "link", "href");
      if (!url) continue;

      const descRaw = pick(b, "description") || pick(b, "summary") || pick(b, "content") || pick(b, "content:encoded");
      const summary = stripTags(descRaw).slice(0, 260);

      const pub = pick(b, "pubDate") || pick(b, "published") || pick(b, "updated") || pick(b, "dc:date");

      const image =
        pickAttr(b, "media:content", "url") ||
        pickAttr(b, "media:thumbnail", "url") ||
        pickAttr(b, "enclosure", "url") ||
        "";

      const text = `${headline} ${summary}`;
      items.push({
        id: `${source}-${url.slice(-40)}-${headline.slice(0, 20)}`,
        headline,
        summary,
        source,
        url,
        image,
        publishedAt: parseDate(pub),
        category: categorize(text),
        impact: impactLevel(text),
        tickers: [],
        verification: { status: "review", score: 50, note: "" },
      });
    }
    return items;
  } catch {
    return [];
  }
}

// ── Finnhub Fallback (falls Key gültig) ────────────────────────────
async function fetchFinnhub(): Promise<NewsItem[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key || key === "your_api_key_here") return [];
  try {
    const categories = ["general", "forex", "crypto", "merger"];
    const responses = await Promise.all(
      categories.map((cat) =>
        fetch(`https://finnhub.io/api/v1/news?category=${cat}&token=${key}`, { next: { revalidate: 120 } })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => [])
      )
    );
    const raw = responses.flat();
    return raw
      .filter((n: Record<string, unknown>) => n.headline && n.url)
      .map((n: Record<string, unknown>) => {
        const text = `${n.headline ?? ""} ${n.summary ?? ""}`;
        const src = String(n.source ?? "Finnhub");
        return {
          id: String(n.id ?? `${n.datetime}-${String(n.headline ?? "").slice(0, 20)}`),
          headline: String(n.headline ?? ""),
          summary: String(n.summary ?? "").slice(0, 260),
          source: src,
          url: String(n.url ?? ""),
          image: String(n.image ?? ""),
          publishedAt: n.datetime ? new Date((n.datetime as number) * 1000).toISOString() : new Date().toISOString(),
          category: categorize(text),
          impact: impactLevel(text),
          tickers: String(n.related ?? "")
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter((s) => s && /^[A-Z.\-]{1,8}$/.test(s))
            .slice(0, 5),
          verification: { status: "review" as VerificationStatus, score: 50, note: "" },
        };
      });
  } catch {
    return [];
  }
}

// ── Tier-1 Auto-Verifikation ───────────────────────────────────────
const TIER1 = new Set([
  "Reuters", "Bloomberg", "WSJ", "Financial Times", "CNBC", "Barron's",
  "MarketWatch", "Handelsblatt", "Manager Magazin", "Spiegel", "FAZ",
]);

function normalizeSource(src: string): string {
  const s = (src || "").toLowerCase();
  if (s.includes("reuters")) return "Reuters";
  if (s.includes("bloomberg")) return "Bloomberg";
  if (s.includes("wall street journal") || s === "wsj") return "WSJ";
  if (s.includes("financial times")) return "Financial Times";
  if (s.includes("cnbc")) return "CNBC";
  if (s.includes("marketwatch")) return "MarketWatch";
  if (s.includes("handelsblatt")) return "Handelsblatt";
  if (s.includes("manager magazin") || s.includes("manager-magazin")) return "Manager Magazin";
  if (s.includes("spiegel")) return "Spiegel";
  if (s.includes("faz")) return "FAZ";
  if (s.includes("yahoo")) return "Yahoo Finance";
  if (s.includes("seeking alpha")) return "Seeking Alpha";
  if (s.includes("barron")) return "Barron's";
  if (s.includes("investing")) return "Investing.com";
  return src || "Unknown";
}

// ── Relevance scoring ─────────────────────────────────────────────
// Weighted: recency (40%) + impact (30%) + source tier (20%) + verification (10%)
function scoreRelevance(it: NewsItem): number {
  const ageHours = Math.max(0, (Date.now() - +new Date(it.publishedAt)) / 3_600_000);
  // Exponential decay: 1.0 at 0h, ~0.5 at 12h, ~0.1 at 48h
  const recency = Math.max(0, Math.exp(-ageHours / 14));

  const impactW = it.impact === "HIGH" ? 1.0 : it.impact === "MED" ? 0.55 : 0.2;
  const tierW = TIER1.has(it.source) ? 1.0 : 0.55;
  const verW = Math.max(0, Math.min(1, (it.verification?.score ?? 55) / 100));

  // Category boost — macro/geopolitics usually move markets
  const catBoost =
    it.category === "MAKRO" || it.category === "GEOPOLITIK" ? 0.15 :
    it.category === "MÄRKTE" ? 0.10 :
    it.category === "EARNINGS" ? 0.08 : 0;

  const score = recency * 0.40 + impactW * 0.30 + tierW * 0.20 + verW * 0.10 + catBoost;
  return Math.round(score * 1000) / 10; // 0-100ish
}

function dedupe(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const it of items) {
    const sig = it.headline.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 70);
    if (!sig || seen.has(sig)) continue;
    seen.add(sig);
    out.push(it);
  }
  return out;
}

async function verifyWithMetrio(items: NewsItem[]): Promise<NewsItem[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return items.map((it) => ({
      ...it,
      verification: TIER1.has(it.source)
        ? { status: "verified", score: 95, note: "Tier-1 Quelle" }
        : { status: "review", score: 65, note: "AI-Check deaktiviert" },
    }));
  }

  const autoVerified: NewsItem[] = items
    .filter((it) => TIER1.has(it.source))
    .map((it) => ({ ...it, verification: { status: "verified", score: 95, note: "Tier-1 Quelle" } }));

  const toCheck = items.filter((it) => !TIER1.has(it.source));
  if (toCheck.length === 0) return autoVerified;

  // Batche auf max. 25 Items, damit JSON-Output nicht overflowt
  const BATCH = 25;
  const checked: NewsItem[] = [];
  for (let i = 0; i < toCheck.length; i += BATCH) {
    const batch = toCheck.slice(i, i + BATCH);
    const payload = batch.map((it, idx) => ({ idx, src: it.source, h: it.headline.slice(0, 160) }));
    const prompt = `Du bist Metrio, ein institutioneller Finanz-News-Prüfer. Bewerte jede Schlagzeile auf Glaubwürdigkeit (0-100).

KRITERIEN:
- Quellenreputation (40%): etablierte Finanzredaktion vs. obskur
- Sprachneutralität (30%): sachlich vs. reißerisch/Clickbait
- Faktenspezifität (30%): konkrete Zahlen/Namen vs. vage Spekulation

OUTPUT STRIKT als JSON: {"items":[{"idx":0,"score":85,"note":"kurz"},...]}
Kein Markdown, keine Erklärung außerhalb.

ITEMS:
${JSON.stringify(payload)}`;
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 2200,
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      const arr: Array<{ idx: number; score: number; note?: string }> =
        Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];
      const scores = new Map<number, { score: number; note: string }>();
      for (const e of arr) {
        if (typeof e?.idx === "number") {
          scores.set(e.idx, {
            score: Math.max(0, Math.min(100, Number(e.score) || 55)),
            note: String(e.note || "").slice(0, 80),
          });
        }
      }
      for (let j = 0; j < batch.length; j++) {
        const sc = scores.get(j);
        const score = sc?.score ?? 65; // default: publizieren
        const status: VerificationStatus = score >= 70 ? "verified" : score >= 45 ? "review" : "hold";
        checked.push({ ...batch[j], verification: { status, score, note: sc?.note || "" } });
      }
    } catch {
      // AI down → nicht stumm bleiben. Als "review" (publiziert) markieren.
      for (const it of batch) {
        checked.push({ ...it, verification: { status: "review", score: 65, note: "AI-Check fehlgeschlagen" } });
      }
    }
  }
  return [...autoVerified, ...checked];
}

// ── Handler ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const categoryParam = (req.nextUrl.searchParams.get("category") || "all").toLowerCase();
  const verify = req.nextUrl.searchParams.get("verify") !== "0";
  const limit = Math.max(5, Math.min(200, parseInt(req.nextUrl.searchParams.get("limit") || "120")));
  const debug = req.nextUrl.searchParams.get("debug") === "1";

  // Parallel fetch aller Feeds + Finnhub (falls Key ok)
  const feedResults = await Promise.all(FEEDS.map(async (f) => {
    const items = await fetchFeed(f);
    return { feed: f.source, count: items.length, items };
  }));
  const finnhubItems = await fetchFinnhub();
  const all: NewsItem[] = [
    ...feedResults.flatMap((r) => r.items),
    ...finnhubItems,
  ].map((it) => ({ ...it, source: normalizeSource(it.source) }));

  // Sortieren, deduplizieren — OHNE category-filter vor dem Slice,
  // damit jede Kategorie später was anzuzeigen hat.
  const sortedDedup = dedupe(all)
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

  // Kategorie-balancierte Auswahl: min-Quoten pro Kategorie
  const CATS = ["MAKRO", "GEOPOLITIK", "MÄRKTE", "EARNINGS", "ROHSTOFFE", "KRYPTO", "UNTERNEHMEN"];
  const perCatMax = Math.max(8, Math.floor(limit / 4));
  const byCat = new Map<string, NewsItem[]>();
  for (const c of CATS) byCat.set(c, []);
  for (const it of sortedDedup) {
    const arr = byCat.get(it.category);
    if (arr && arr.length < perCatMax) arr.push(it);
  }
  // Zusammenführen: alle Kategorien plus Top-Rest bis Limit
  const seen = new Set<string>();
  const balanced: NewsItem[] = [];
  for (const c of CATS) for (const it of byCat.get(c) ?? []) {
    if (!seen.has(it.id)) { seen.add(it.id); balanced.push(it); }
  }
  for (const it of sortedDedup) {
    if (balanced.length >= limit) break;
    if (!seen.has(it.id)) { seen.add(it.id); balanced.push(it); }
  }
  const workingSet = balanced.slice(0, limit);

  // Kategorie-Filter jetzt NACH der balancierten Auswahl
  const filtered = categoryParam === "all"
    ? workingSet
    : workingSet.filter((it) => it.category === categoryParam.toUpperCase());

  const verified = verify ? await verifyWithMetrio(filtered) : filtered.map((it) => ({
    ...it,
    verification: TIER1.has(it.source)
      ? { status: "verified" as const, score: 95, note: "Tier-1" }
      : { status: "review" as const, score: 65, note: "" },
  }));

  // ── Relevance ranking — sortiere nach kombiniertem Score ──
  const scored = verified.map((it) => ({ ...it, relevanceScore: scoreRelevance(it) }));
  const sortMode = (req.nextUrl.searchParams.get("sort") || "relevance").toLowerCase();
  if (sortMode === "relevance") {
    scored.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
  } else if (sortMode === "date") {
    scored.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  }

  const published = scored.filter((it) => it.verification.status !== "hold");
  const pending = scored.filter((it) => it.verification.status === "hold");

  return NextResponse.json({
    items: published,
    pendingCount: pending.length,
    totalRaw: all.length,
    updatedAt: new Date().toISOString(),
    sources: FEEDS.length + (finnhubItems.length > 0 ? 1 : 0),
    ...(debug ? {
      debug: {
        perFeed: feedResults.map((r) => ({ feed: r.feed, count: r.count })),
        finnhub: finnhubItems.length,
        totalAfterDedupe: sortedDedup.length,
        perCategoryInBalanced: Object.fromEntries(CATS.map((c) => [c, balanced.filter((it) => it.category === c).length])),
      },
    } : {}),
  });
}
