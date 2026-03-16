import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────
// METRIO PERSONA — shared base for all contexts
// ─────────────────────────────────────────────────────────────────
const METRIO_BASE = `You are Metrio — an institutional-grade financial analyst.

BACKGROUND: Ex-Goldman Sachs MD (Equity Research), Ex-McKinsey Senior Partner, Harvard MBA, CFA.

PERSONA: Direct, precise, occasionally sardonic. Never generic. Every insight references specific numbers from the data you receive. If you don't have data, say so — don't invent.

LEGAL: Every substantive response MUST end with: "Keine Anlageberatung. Finanzbildung gemäß § 85 WpHG."

LANGUAGE: Respond in German unless the user writes in English.

FORMATTING: 2–4 paragraphs max. Be dense and precise, not verbose.`;

// ─────────────────────────────────────────────────────────────────
// CONTEXT BUILDERS
// These inject live data into the system prompt so Metrio is never
// giving generic answers — it always speaks about THIS stock or
// THIS user's portfolio.
// ─────────────────────────────────────────────────────────────────

interface StockMetrics { [key: string]: number | undefined; }
interface StockQuote   { c?: number; dp?: number; d?: number; pc?: number; h?: number; l?: number; }
interface StockProfile { name?: string; currency?: string; exchange?: string; finnhubIndustry?: string; marketCapitalization?: number; country?: string; }
interface StockRec     { strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number; }
interface StockTarget  { targetMean?: number; targetHigh?: number; targetLow?: number; }

interface PortfolioPosition {
  symbol:      string;
  name:        string;
  shares:      number;
  avgBuyPrice: number;
  currentPrice:number;
  currency:    string;
  sector:      string;
  pnl:         number;
  pnlPct:      number;
}

interface PortfolioContext {
  cash:        number;
  totalValue:  number;
  positions:   PortfolioPosition[];
}

function buildStockContext(
  symbol:  string,
  metrics: StockMetrics,
  quote:   StockQuote,
  profile: StockProfile,
  rec:     StockRec | null,
  target:  StockTarget | null
): string {
  const f = (n: number | undefined, d = 2) => (typeof n === "number" && !isNaN(n)) ? n.toFixed(d) : "—";
  const cur = profile.currency ?? "USD";
  const name = profile.name ?? symbol;

  const recTotal = (rec?.strongBuy ?? 0) + (rec?.buy ?? 0) + (rec?.hold ?? 0) + (rec?.sell ?? 0) + (rec?.strongSell ?? 0) || 1;
  const bullPct  = (((rec?.strongBuy ?? 0) + (rec?.buy ?? 0)) / recTotal * 100).toFixed(0);

  return `
═══ AKTIVER STOCK-KONTEXT: ${symbol} ═══
Unternehmen:   ${name}
Börse:         ${profile.exchange ?? "—"} | Sektor: ${profile.finnhubIndustry ?? "—"} | Land: ${profile.country ?? "—"}
Kurs aktuell:  ${f(quote.c)} ${cur}  (${quote.dp !== undefined ? (quote.dp >= 0 ? "+" : "") + f(quote.dp) + "%" : "—"})
Vortag:        ${f(quote.pc)} ${cur}  | Tief/Hoch: ${f(quote.l)}–${f(quote.h)}
MarketCap:     ${profile.marketCapitalization ? (profile.marketCapitalization / 1000).toFixed(1) + "B " + cur : "—"}

BEWERTUNG:
  KGV (TTM):   ${f(metrics.peBasicExclExtraTTM)}  | EV/EBITDA: ${f(metrics.evEbitdaTTM)}
  KBV:         ${f(metrics.pbAnnual)}

QUALITÄT & PROFITABILITÄT:
  ROE:         ${metrics.roeTTM   ? f(metrics.roeTTM   * 100) + "%" : "—"}
  ROA:         ${metrics.roaTTM   ? f(metrics.roaTTM   * 100) + "%" : "—"}
  Nettomarge:  ${metrics.netProfitMarginTTM   ? f(metrics.netProfitMarginTTM   * 100) + "%" : "—"}
  Bruttomarge: ${metrics.grossMarginTTM       ? f(metrics.grossMarginTTM       * 100) + "%" : "—"}

WACHSTUM:
  Umsatz CAGR 3J: ${metrics.revenueGrowth3Y ? f(metrics.revenueGrowth3Y * 100) + "%" : "—"}
  EPS CAGR 3J:    ${metrics.epsGrowth3Y     ? f(metrics.epsGrowth3Y     * 100) + "%" : "—"}
  EPS CAGR 1J:    ${metrics.epsGrowth1Y     ? f(metrics.epsGrowth1Y     * 100) + "%" : "—"}

BILANZ & RISIKO:
  Beta:           ${f(metrics.beta)}
  D/E Ratio:      ${metrics.totalDebt_totalEquityAnnual ? f(metrics.totalDebt_totalEquityAnnual / 100, 2) : "—"}
  Current Ratio:  ${f(metrics.currentRatioAnnual)}
  Quick Ratio:    ${f(metrics.quickRatioAnnual)}

DIVIDENDE:
  Rendite:      ${metrics.dividendYieldIndicatedAnnual ? f(metrics.dividendYieldIndicatedAnnual) + "%" : "Keine"}
  Payout Ratio: ${metrics.payoutRatioTTM ? f(metrics.payoutRatioTTM * 100) + "%" : "—"}

52W RANGE:
  Hoch: ${f(metrics["52WeekHigh"])} ${cur} | Tief: ${f(metrics["52WeekLow"])} ${cur}

ANALYSTEN (${recTotal} Ratings):
  Bullisch: ${bullPct}% (${rec?.strongBuy ?? 0} StrongBuy + ${rec?.buy ?? 0} Buy, ${rec?.hold ?? 0} Hold, ${(rec?.sell ?? 0) + (rec?.strongSell ?? 0)} Sell)
  Kursziel Ø: ${f(target?.targetMean)} ${cur} | Spanne: ${f(target?.targetLow)}–${f(target?.targetHigh)}
  ${target?.targetMean && quote.c ? "Kurspotenzial: " + (((target.targetMean / quote.c) - 1) * 100).toFixed(1) + "%" : ""}
═══════════════════════════════════════
WICHTIG: Beziehe dich in deiner Antwort auf diese spezifischen Zahlen.
Nenne konkrete Werte — z.B. "ROE von ${metrics.roeTTM ? f(metrics.roeTTM * 100) + "%" : "—"}".
NIEMALS generische Aussagen ohne Datenbezug.`;
}

function buildPortfolioContext(ctx: PortfolioContext): string {
  const STARTING = 25_000;
  const totalPnL    = ctx.totalValue - STARTING;
  const totalPnLPct = (totalPnL / STARTING * 100).toFixed(2);
  const cashPct     = (ctx.cash / ctx.totalValue * 100).toFixed(1);

  // Sector concentration
  const sectors: Record<string, number> = {};
  for (const p of ctx.positions) {
    sectors[p.sector] = (sectors[p.sector] ?? 0) + p.shares * p.currentPrice;
  }
  const sectorLines = Object.entries(sectors)
    .sort((a, b) => b[1] - a[1])
    .map(([s, v]) => `  ${s}: ${(v / (ctx.totalValue - ctx.cash) * 100).toFixed(1)}%`)
    .join("\n");

  // Positions detail
  const posLines = ctx.positions.map(p =>
    `  ${p.symbol} (${p.name.slice(0, 20)}): ${p.shares} Stk. @ Ø ${p.avgBuyPrice.toFixed(2)} → aktuell ${p.currentPrice.toFixed(2)} | P&L: ${p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)} (${p.pnlPct >= 0 ? "+" : ""}${p.pnlPct.toFixed(2)}%) | Sektor: ${p.sector}`
  ).join("\n");

  return `
═══ PORTFOLIO-KONTEXT DES NUTZERS ═══
Startkapital:  €25.000,00
Gesamtwert:    €${ctx.totalValue.toFixed(2)}
Gesamt P&L:    ${totalPnL >= 0 ? "+" : ""}€${totalPnL.toFixed(2)} (${totalPnL >= 0 ? "+" : ""}${totalPnLPct}%)
Verfügbarer Cash: €${ctx.cash.toFixed(2)} (${cashPct}% des Portfolios)

POSITIONEN (${ctx.positions.length}):
${posLines || "  Keine offenen Positionen"}

SEKTORVERTEILUNG:
${sectorLines || "  Keine Positionen"}
═══════════════════════════════════════
WICHTIG: Der Nutzer fragt dich über SEIN spezifisches Portfolio.
Beziehe dich auf seine tatsächlichen Positionen, seinen Cash-Stand
und seine Sektorkonzentration. Gib konkrete, handlungsorientierte
Empfehlungen basierend auf diesen exakten Zahlen.
Kein generisches Finanzwissen ohne Portfoliobezug.`;
}

// ─────────────────────────────────────────────────────────────────
// LOCAL FALLBACK — rule-based when no Anthropic key is available
// ─────────────────────────────────────────────────────────────────
function localFallback(
  question:         string,
  symbol?:          string,
  metrics?:         StockMetrics,
  quote?:           StockQuote,
  portfolioContext?: PortfolioContext
): string {
  const f = (n: number | undefined, d = 2) =>
    typeof n === "number" && !isNaN(n) ? n.toFixed(d) : "—";
  const q = question.toLowerCase();
  const m = metrics ?? {};

  // Portfolio mode
  if (portfolioContext) {
    const totalPnL = portfolioContext.totalValue - 25_000;
    if (q.includes("diversif") || q.includes("sektor")) {
      const sectors: Record<string, number> = {};
      for (const p of portfolioContext.positions) sectors[p.sector] = (sectors[p.sector] ?? 0) + 1;
      const topSector = Object.entries(sectors).sort((a, b) => b[1] - a[1])[0];
      return `Dein Portfolio hat ${portfolioContext.positions.length} Positionen. ${topSector ? `Größte Sektorkonzentration: ${topSector[0]} mit ${topSector[1]} Titel${topSector[1] > 1 ? "n" : ""}.` : ""} ${portfolioContext.positions.length < 8 ? "Für ausreichende Diversifikation empfehlen institutionelle Standards mindestens 8–12 Positionen aus verschiedenen Sektoren." : "Die Anzahl der Positionen ist für Diversifikation ausreichend."}\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
    }
    if (q.includes("kaufen") || q.includes("investier")) {
      return `Du hast €${portfolioContext.cash.toFixed(2)} verfügbares Cash (${(portfolioContext.cash / portfolioContext.totalValue * 100).toFixed(1)}% des Portfolios). ${portfolioContext.cash > 5000 ? "Ein Cash-Anteil über 20% deutet auf Underinvestment hin — institutionelle Anleger halten selten mehr als 10% Cash." : "Dein Cash-Anteil ist konservativ."} Für eine spezifische Empfehlung: Aktiviere den Anthropic-API-Key für volle Metrio-Intelligenz.\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
    }
    return `Portfolio-Status: €${portfolioContext.totalValue.toFixed(2)} Gesamtwert, ${totalPnL >= 0 ? "+" : ""}€${totalPnL.toFixed(2)} P&L (${((totalPnL / 25000) * 100).toFixed(2)}%), ${portfolioContext.positions.length} Positionen, €${portfolioContext.cash.toFixed(2)} Cash. Für kontextuelle KI-Analyse: Anthropic-API-Key in .env.local setzen.\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
  }

  // Stock mode
  if (q.includes("kgv") || q.includes("bewert")) {
    const pe = m.peBasicExclExtraTTM;
    if (pe && pe > 0) {
      const verdict = pe < 15 ? "deutlich unter Marktdurchschnitt (~18x)" : pe < 25 ? "im fairen Bereich" : pe < 40 ? "Wachstumsprämie" : "ambitioniert — hohes Enttäuschungsrisiko";
      return `Das KGV von ${symbol} beträgt ${f(pe)}x — ${verdict}. ${pe > 30 ? `Bei ${f(pe)}x muss das Unternehmen zweistelliges Gewinnwachstum liefern, sonst droht eine Multiple-Kontraktion.` : "Die Bewertung lässt Spielraum für positive Überraschungen."}\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
    }
  }
  if (q.includes("divid")) {
    const div = m.dividendYieldIndicatedAnnual;
    if (div && div > 0) return `${symbol} zahlt ${f(div)}% Dividendenrendite. Ausschüttungsquote: ${m.payoutRatioTTM ? f(m.payoutRatioTTM * 100) + "%" : "—"}. ${div > 5 ? "Bei >5% Rendite immer zuerst prüfen ob der Kurs gefallen ist, nicht die Dividende gestiegen." : "Rendite im nachhaltigen Bereich."}\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
    return `${symbol} zahlt keine Dividende. Kapital wird reinvestiert.\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
  }
  if (q.includes("risik") || q.includes("beta")) {
    return `${symbol} Beta: ${f(m.beta)} — ${(m.beta ?? 1) < 0.8 ? "defensiv, dämpft Portfoliovolatilität" : (m.beta ?? 1) <= 1.2 ? "marktähnlich" : "erhöhte Volatilität, verstärkt Marktbewegungen"}. D/E Ratio: ${m.totalDebt_totalEquityAnnual ? f(m.totalDebt_totalEquityAnnual / 100, 2) : "—"}.\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
  }
  return `${symbol ?? "Aktie"}: KGV ${f(m.peBasicExclExtraTTM)}x · ROE ${m.roeTTM ? f(m.roeTTM * 100) + "%" : "—"} · Beta ${f(m.beta)} · Kurs ${f(quote?.c)} ${quote ? "(+" + f(quote.dp) + "%)" : ""}. Für detaillierte KI-Analyse: Anthropic-API-Key in .env.local setzen.\n\nKeine Anlageberatung. Finanzbildung gemäß § 85 WpHG.`;
}

// ─────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      question,
      symbol,
      section,
      metrics,
      quote,
      profile,
      rec,
      target,
      portfolioContext,
    } = body;

    if (!question?.trim()) {
      return NextResponse.json({ analysis: "Keine Frage erhalten." });
    }

    // ── Build the system prompt with injected context ─────────────
    let systemPrompt = METRIO_BASE;

    if (portfolioContext && section === "portfolio") {
      // Portfolio mode: Metrio knows the user's holdings, cash, P&L
      systemPrompt += buildPortfolioContext(portfolioContext);
    } else if (symbol && metrics) {
      // Stock mode: Metrio knows this specific stock's live data
      systemPrompt += buildStockContext(symbol, metrics ?? {}, quote ?? {}, profile ?? {}, rec ?? null, target ?? null);
    }

    // ── Try Anthropic API ──────────────────────────────────────────
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && anthropicKey.length > 20) {
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
    }

    // ── Local fallback (no API key or API error) ───────────────────
    const fallback = localFallback(question, symbol, metrics, quote, portfolioContext);
    return NextResponse.json({ analysis: fallback });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ analysis: `Fehler: ${msg}` }, { status: 500 });
  }
}
