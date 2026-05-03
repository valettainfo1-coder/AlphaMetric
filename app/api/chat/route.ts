import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════
// METRIO AI CHAT — REAL CONTEXTUAL LLM (Epic 5)
//
// NOT a mock. The frontend sends:
//   1. The user's question
//   2. Full stock context (symbol, exchange, price, metrics, etc.)
//   3. OR full portfolio context (positions, cash, P&L)
//
// The backend injects this into a system prompt and forwards to
// Groq/Llama (primary via Flask) or Anthropic/OpenAI (fallback).
// When no API is available, a rule-based local fallback generates
// contextual responses using the actual data.
// ═══════════════════════════════════════════════════════════════════

// ─── METRIO PERSONA ──────────────────────────────────────────────
const METRIO_BASE = `You are **Metrio** — a once-in-a-generation capital markets intellect.

PEDIGREE:
• Ex-Goldman Sachs Managing Director — 12 years Global Equity Research, top-ranked Institutional Investor.
• Ex-McKinsey Senior Partner (Financial Institutions Group), led M&A diligence on $40B+ transactions.
• Harvard MBA (Baker Scholar) — later tenured Professor of Capital Markets & Risk (HBS Finance Unit).
• Former Portfolio Manager of a $14B long/short hedge fund — track record: 23% CAGR over 9 years, two billion-dollar trades.
• CFA Charterholder, CAIA, FRM. Authored two peer-reviewed books on factor investing and tail-risk hedging.

PERSONA: Olympian confidence. Terse, surgical, sometimes drily witty. Thinks in probabilities, base rates, and risk-adjusted returns. Never vague. Never hedge-y filler. Treats the user as a serious apprentice — respects their time, but will not dumb things down. Occasionally drops a sharp aphorism ("Hope is not a thesis.", "The market pays you to be early, not right.").

PRIORITIES, IN ORDER:
1. **Risk** before reward — always quantify downside first.
2. **Probabilistic thinking** — "base case", "bear case", "tail risk", with numbers.
3. **Specificity** — every claim anchored to a real number in the data provided.
4. **Second-order thinking** — what does the market not see yet?
5. **Intellectual honesty** — if data is weak, say so; do not invent.

LEGAL: Every substantive response MUST end with: "Keine Anlageberatung. Finanzbildung gemäß § 85 WpHG."

LANGUAGE: Respond in German unless the user writes in English.

FORMATTING: 2–4 tight paragraphs. Use **bold** for every key number. Structure: **Thesis** → **Data & Mechanism** → **Risks** → **Verdict** (one sharp line).`;

// ─── CONTEXT BUILDERS ────────────────────────────────────────────

interface StockMetrics { [key: string]: number | undefined; }
interface StockQuote   { c?: number; dp?: number; d?: number; pc?: number; h?: number; l?: number; }
interface StockProfile { name?: string; currency?: string; exchange?: string; finnhubIndustry?: string; marketCapitalization?: number; country?: string; }
interface StockRec     { strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number; }
interface StockTarget  { targetMean?: number; targetHigh?: number; targetLow?: number; }

interface PortfolioPosition {
  symbol: string; name: string; shares: number; avgBuyPrice: number;
  currentPrice: number; currency: string; sector: string; pnl: number; pnlPct: number;
}

interface PortfolioContext {
  cash: number; totalValue: number; positions: PortfolioPosition[];
}

function buildStockContext(
  symbol: string, metrics: StockMetrics, quote: StockQuote,
  profile: StockProfile, rec: StockRec | null, target: StockTarget | null
): string {
  const f = (n: number | undefined, d = 2) => (typeof n === "number" && !isNaN(n)) ? n.toFixed(d) : "—";
  const cur = profile.currency ?? "USD";
  const name = profile.name ?? symbol;
  const recTotal = (rec?.strongBuy ?? 0) + (rec?.buy ?? 0) + (rec?.hold ?? 0) + (rec?.sell ?? 0) + (rec?.strongSell ?? 0) || 1;
  const bullPct = (((rec?.strongBuy ?? 0) + (rec?.buy ?? 0)) / recTotal * 100).toFixed(0);

  return `
═══ AKTIVER STOCK-KONTEXT: ${symbol} ═══
Unternehmen: ${name}
Börse: ${profile.exchange ?? "—"} | Sektor: ${profile.finnhubIndustry ?? "—"} | Land: ${profile.country ?? "—"}
Kurs aktuell: ${f(quote.c)} ${cur} (${quote.dp !== undefined ? (quote.dp >= 0 ? "+" : "") + f(quote.dp) + "%" : "—"})
Vortag: ${f(quote.pc)} ${cur} | Tief/Hoch: ${f(quote.l)}–${f(quote.h)}
MarketCap: ${profile.marketCapitalization ? (profile.marketCapitalization / 1000).toFixed(1) + "B " + cur : "—"}

BEWERTUNG: KGV ${f(metrics.peBasicExclExtraTTM)} | EV/EBITDA ${f(metrics.evEbitdaTTM)} | KBV ${f(metrics.pbAnnual)}
QUALITÄT: ROE ${metrics.roeTTM ? f(metrics.roeTTM * 100) + "%" : "—"} | Nettomarge ${metrics.netProfitMarginTTM ? f(metrics.netProfitMarginTTM * 100) + "%" : "—"} | Bruttomarge ${metrics.grossMarginTTM ? f(metrics.grossMarginTTM * 100) + "%" : "—"}
WACHSTUM: Umsatz CAGR 3J ${metrics.revenueGrowth3Y ? f(metrics.revenueGrowth3Y * 100) + "%" : "—"} | EPS 3J ${metrics.epsGrowth3Y ? f(metrics.epsGrowth3Y * 100) + "%" : "—"}
RISIKO: Beta ${f(metrics.beta)} | D/E ${metrics.totalDebt_totalEquityAnnual ? f(metrics.totalDebt_totalEquityAnnual / 100, 2) : "—"} | Current Ratio ${f(metrics.currentRatioAnnual)}
DIVIDENDE: ${metrics.dividendYieldIndicatedAnnual ? f(metrics.dividendYieldIndicatedAnnual) + "%" : "Keine"} | Payout ${metrics.payoutRatioTTM ? f(metrics.payoutRatioTTM * 100) + "%" : "—"}
52W: ${f(metrics["52WeekHigh"])}–${f(metrics["52WeekLow"])} ${cur}
ANALYSTEN (${recTotal}): ${bullPct}% bullisch | Kursziel Ø ${f(target?.targetMean)} (${f(target?.targetLow)}–${f(target?.targetHigh)})
${target?.targetMean && quote.c ? "Potenzial: " + (((target.targetMean / quote.c) - 1) * 100).toFixed(1) + "%" : ""}
═══════════════════════════════════════
WICHTIG: Beziehe dich auf DIESE spezifischen Zahlen. Nenne konkrete Werte.`;
}

function buildPortfolioContext(ctx: PortfolioContext): string {
  const totalPnL = ctx.totalValue - 25_000;
  const cashPct = (ctx.cash / ctx.totalValue * 100).toFixed(1);
  const posLines = ctx.positions.map(p =>
    `  ${p.symbol}: ${p.shares} Stk. @ Ø ${p.avgBuyPrice.toFixed(2)} → ${p.currentPrice.toFixed(2)} | P&L: ${p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)} (${p.pnlPct >= 0 ? "+" : ""}${p.pnlPct.toFixed(2)}%) | ${p.sector}`
  ).join("\n");

  return `
═══ PORTFOLIO-KONTEXT ═══
Gesamtwert: €${ctx.totalValue.toFixed(2)} | Cash: €${ctx.cash.toFixed(2)} (${cashPct}%)
Gesamt P&L: ${totalPnL >= 0 ? "+" : ""}€${totalPnL.toFixed(2)}
POSITIONEN (${ctx.positions.length}):
${posLines || "  Keine"}
═══════════════════════════════════════
Beziehe dich auf die tatsächlichen Positionen und Zahlen.`;
}

// ─── LOCAL FALLBACK ──────────────────────────────────────────────
function localFallback(
  question: string, symbol?: string, metrics?: StockMetrics,
  quote?: StockQuote, portfolioContext?: PortfolioContext
): string {
  const f = (n: number | undefined, d = 2) => typeof n === "number" && !isNaN(n) ? n.toFixed(d) : "—";
  const q = question.toLowerCase();
  const m = metrics ?? {};

  if (portfolioContext) {
    const totalPnL = portfolioContext.totalValue - 25_000;
    if (q.includes("diversif") || q.includes("sektor")) {
      const sectors: Record<string, number> = {};
      for (const p of portfolioContext.positions) sectors[p.sector] = (sectors[p.sector] ?? 0) + 1;
      const topSector = Object.entries(sectors).sort((a, b) => b[1] - a[1])[0];
      return `Dein Portfolio hat ${portfolioContext.positions.length} Positionen. ${topSector ? `Größte Sektorkonzentration: ${topSector[0]} mit ${topSector[1]} Titel${topSector[1] > 1 ? "n" : ""}.` : ""} ${portfolioContext.positions.length < 8 ? "Institutionelle Standards empfehlen 8–12 Positionen." : "Diversifikation ausreichend."}\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
    }
    return `Portfolio: €${portfolioContext.totalValue.toFixed(2)}, ${totalPnL >= 0 ? "+" : ""}€${totalPnL.toFixed(2)} P&L, ${portfolioContext.positions.length} Positionen, €${portfolioContext.cash.toFixed(2)} Cash. Für volle KI-Analyse: ANTHROPIC_API_KEY in .env.local setzen.\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
  }

  if (q.includes("kgv") || q.includes("bewert")) {
    const pe = m.peBasicExclExtraTTM;
    if (pe && pe > 0) {
      const verdict = pe < 15 ? "unter Marktdurchschnitt (~18x)" : pe < 25 ? "im fairen Bereich" : pe < 40 ? "Wachstumsprämie" : "ambitioniert";
      return `**${symbol}** KGV: **${f(pe)}x** — ${verdict}. ${pe > 30 ? `Bei ${f(pe)}x muss zweistelliges Gewinnwachstum geliefert werden.` : ""}\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
    }
  }
  if (q.includes("divid")) {
    const div = m.dividendYieldIndicatedAnnual;
    if (div && div > 0) return `**${symbol}** Dividende: **${f(div)}%**. Payout: ${m.payoutRatioTTM ? f(m.payoutRatioTTM * 100) + "%" : "—"}. ${div > 5 ? "Bei >5% immer Kursverfall prüfen." : "Im nachhaltigen Bereich."}\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
    return `${symbol} zahlt keine Dividende.\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
  }
  if (q.includes("risik") || q.includes("beta")) {
    return `**${symbol}** Beta: **${f(m.beta)}** — ${(m.beta ?? 1) < 0.8 ? "defensiv" : (m.beta ?? 1) <= 1.2 ? "marktähnlich" : "erhöhte Volatilität"}. D/E: ${m.totalDebt_totalEquityAnnual ? f(m.totalDebt_totalEquityAnnual / 100, 2) : "—"}.\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
  }

  return `**${symbol ?? "Aktie"}**: Kurs ${f(quote?.c)} | KGV ${f(m.peBasicExclExtraTTM)}x | ROE ${m.roeTTM ? f(m.roeTTM * 100) + "%" : "—"} | Beta ${f(m.beta)}. Für detaillierte KI-Analyse: ANTHROPIC_API_KEY in .env.local setzen.\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
}

// ─── MAIN HANDLER ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      question, symbol, section,
      metrics, quote, profile, rec, target,
      portfolioContext,
      // New fields from PortfolioMetrio
      systemPrompt: externalSystemPrompt,
      messages: externalMessages,
    } = body;

    // ── Route 1: Direct system prompt (from PortfolioMetrio) ─────
    if (externalSystemPrompt && externalMessages) {
      return handleWithSystemPrompt(externalSystemPrompt, externalMessages);
    }

    // ── Route 2: Stock/Portfolio chat (from stock page) ──────────
    if (!question?.trim()) {
      return NextResponse.json({ analysis: "Keine Frage erhalten." });
    }

    let systemPrompt = METRIO_BASE;
    if (portfolioContext && section === "portfolio") {
      systemPrompt += buildPortfolioContext(portfolioContext);
    } else if (symbol && metrics) {
      systemPrompt += buildStockContext(symbol, metrics ?? {}, quote ?? {}, profile ?? {}, rec ?? null, target ?? null);
    }

    // ── Try Groq direct (primary, no Flask required) ─────────────
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && groqKey.length > 20) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: question },
            ],
            temperature: 0.6,
            max_tokens: 1200,
          }),
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return NextResponse.json({ analysis: text, source: "groq-direct" });
        }
      } catch { /* fall through */ }
    }

    // ── Optional Flask backend (only if explicitly configured) ────
    const flaskUrl = process.env.FLASK_BACKEND_URL;
    if (flaskUrl) {
      try {
        const res = await fetch(`${flaskUrl}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: question,
            contextType: "general_chat",
            stockData: symbol ? { symbol, quote, profile, metrics, rec, target } : undefined,
          }),
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.response) return NextResponse.json({ analysis: data.response });
        }
      } catch { /* fall through */ }
    }

    // ── Try Anthropic API ────────────────────────────────────────
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && anthropicKey.length > 20) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method:  "POST",
          headers: {
            "Content-Type":      "application/json",
            "x-api-key":         anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model:      "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system:     systemPrompt,
            messages:   [{ role: "user", content: question }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.content
            ?.map((block: { type: string; text?: string }) => block.type === "text" ? block.text : "")
            .filter(Boolean)
            .join("\n") ?? "";
          if (text) return NextResponse.json({ analysis: text });
        }
      } catch { /* fall through */ }
    }

    // ── Try OpenAI-compatible ────────────────────────────────────
    const openaiKey = process.env.OPENAI_API_KEY;
    const apiBase = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
    if (openaiKey && openaiKey.length > 10) {
      try {
        const res = await fetch(`${apiBase}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model:      process.env.AI_MODEL || "gpt-4o-mini",
            messages:   [
              { role: "system", content: systemPrompt },
              { role: "user", content: question },
            ],
            temperature: 0.8,
            max_tokens:  1200,
          }),
        });
        if (res.ok) {
          const result = await res.json();
          const text = result.choices?.[0]?.message?.content;
          if (text) return NextResponse.json({ analysis: text });
        }
      } catch { /* fall through */ }
    }

    // ── Local fallback ───────────────────────────────────────────
    const fallback = localFallback(question, symbol, metrics, quote, portfolioContext);
    return NextResponse.json({ analysis: fallback });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ analysis: `Fehler: ${msg}` }, { status: 500 });
  }
}

// ── Helper for PortfolioMetrio direct system prompt mode ─────────
async function handleWithSystemPrompt(
  systemPrompt: string,
  messages: { role: string; content: string }[]
) {
  // Try Groq direct first (no Flask required)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey.length > 20) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m: { role: string; content: string }) => ({
              role: m.role === "assistant" || m.role === "ai" ? "assistant" : "user",
              content: m.content,
            })),
          ],
          temperature: 0.6,
          max_tokens: 1500,
        }),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return NextResponse.json({ analysis: text, source: "groq-direct" });
      }
    } catch { /* fall through */ }
  }

  // Optional Flask backend (only if explicitly configured)
  const flaskUrl = process.env.FLASK_BACKEND_URL;
  if (flaskUrl) {
    try {
      const lastUserMsg = messages.filter((m: { role: string }) => m.role === "user").pop()?.content ?? "";
      const res = await fetch(`${flaskUrl}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: `${systemPrompt}\n\n---\n\nKonversation:\n${messages.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n")}\n\nBeantworte: ${lastUserMsg}`,
          contextType: "general_chat",
        }),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.response) return NextResponse.json({ analysis: data.response, source: "groq" });
      }
    } catch { /* fall through */ }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey.length > 20) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model:      "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system:     systemPrompt,
          messages:   messages.map(m => ({
            role:    m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content
          ?.map((block: { type: string; text?: string }) => block.type === "text" ? block.text : "")
          .filter(Boolean)
          .join("\n") ?? "";
        if (text) return NextResponse.json({ content: text, analysis: text });
      }
    } catch { /* fall through */ }
  }

  return NextResponse.json({
    content: "API-Key nicht verfügbar. Setze ANTHROPIC_API_KEY in .env.local für volle Metrio-Intelligenz.\n\n⚠️ Keine Anlageberatung. § 85 WpHG.",
    analysis: "API-Key nicht verfügbar.",
  });
}
