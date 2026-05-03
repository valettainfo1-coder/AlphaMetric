"use client";
// ═══════════════════════════════════════════════════════════════════
// PortfolioMetrio.tsx
// Goldman Sachs Chief Quant AI that receives the FULL portfolio state
// (cash, positions, P&L, weights) as a JSON-injected system prompt.
// Not a generic chatbot — every reply is specific to THIS portfolio.
// ═══════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, RefreshCw, TrendingUp, AlertTriangle, BarChart2, Brain, Sparkles } from "lucide-react";
import { formatMetrio } from "@/utils/formatMetrio";
import type { Position } from "@/app/portfolio/page";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
interface ChatMessage {
  role:      "user" | "ai";
  content:   string;
  timestamp: number;
}

interface Props {
  positions:    Position[];
  cashBalance:  number;
  initialCash:  number;
}

// ─────────────────────────────────────────────────────────────────
// METRIO GLASS ICON — clean liquid-glass avatar
// ─────────────────────────────────────────────────────────────────
function MetrioIcon({ size = 40 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: size * 0.28,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(16,185,129,0.16))",
      border: "1px solid rgba(255,255,255,0.18)",
      backdropFilter: "blur(14px) saturate(160%)",
      WebkitBackdropFilter: "blur(14px) saturate(160%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 14px -6px rgba(16,185,129,0.35)",
      flexShrink: 0,
    }}>
      <Brain size={size * 0.5} color="var(--am-accent, #10b981)" strokeWidth={2} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PORTFOLIO ANALYTICS — computed before sending to LLM
// ─────────────────────────────────────────────────────────────────
interface PortfolioAnalytics {
  totalValue:        number;
  totalPnL:          number;
  totalPnLPct:       number;
  cashWeight:        number;
  equityWeight:      number;
  byExchange:        Record<string, { value: number; weight: number; count: number }>;
  bySector:          Record<string, { value: number; weight: number }>;
  byCurrency:        Record<string, { value: number; weight: number }>;
  topHolding:        { symbol: string; weight: number } | null;
  avgBeta:           number | null;
  totalDivYield:     number;
  concentrationRisk: "LOW" | "MEDIUM" | "HIGH";
  usTechExposure:    number;
}

function computeAnalytics(positions: Position[], cash: number): PortfolioAnalytics {
  const equityValue = positions.reduce((s, p) => s + p.currentValue, 0);
  const totalValue  = equityValue + cash;
  const totalPnL    = positions.reduce((s, p) => s + p.pnlAbs, 0);
  const totalPnLPct = equityValue > 0 ? (totalPnL / (equityValue - totalPnL)) * 100 : 0;

  const byExchange:  Record<string, { value: number; weight: number; count: number }> = {};
  const bySector:    Record<string, { value: number; weight: number }> = {};
  const byCurrency:  Record<string, { value: number; weight: number }> = {};

  let betaSum = 0; let betaCount = 0;
  let divSum  = 0;
  let usTech  = 0;

  for (const p of positions) {
    const w = totalValue > 0 ? (p.currentValue / totalValue) * 100 : 0;
    // Exchange
    const ex = p.exchange;
    if (!byExchange[ex]) byExchange[ex] = { value: 0, weight: 0, count: 0 };
    byExchange[ex].value  += p.currentValue;
    byExchange[ex].weight += w;
    byExchange[ex].count  += 1;
    // Sector
    const sec = p.sector ?? "Unknown";
    if (!bySector[sec]) bySector[sec] = { value: 0, weight: 0 };
    bySector[sec].value  += p.currentValue;
    bySector[sec].weight += w;
    // Currency
    if (!byCurrency[p.currency]) byCurrency[p.currency] = { value: 0, weight: 0 };
    byCurrency[p.currency].value  += p.currentValue;
    byCurrency[p.currency].weight += w;
    // Beta
    if (p.beta) { betaSum += p.beta * (p.currentValue / equityValue || 0); betaCount++; }
    // Dividend
    if (p.dividendYield) divSum += p.dividendYield * w / 100;
    // US Tech
    if ((p.exchange === "NASDAQ" || p.exchange === "NYSE") && p.sector === "Technology") {
      usTech += w;
    }
  }

  const topHolding = positions.length > 0
    ? positions.reduce((a, b) => a.currentValue > b.currentValue ? a : b, positions[0])
    : null;
  const topWeight = topHolding && totalValue > 0
    ? (topHolding.currentValue / totalValue) * 100 : 0;

  const concentrationRisk: "LOW" | "MEDIUM" | "HIGH"
    = topWeight > 40 ? "HIGH" : topWeight > 25 ? "MEDIUM" : "LOW";

  return {
    totalValue, totalPnL, totalPnLPct,
    cashWeight: totalValue > 0 ? (cash / totalValue) * 100 : 100,
    equityWeight: totalValue > 0 ? (equityValue / totalValue) * 100 : 0,
    byExchange, bySector, byCurrency,
    topHolding: topHolding ? { symbol: topHolding.symbol, weight: topWeight } : null,
    avgBeta:        betaCount > 0 ? betaSum : null,
    totalDivYield:  divSum,
    concentrationRisk,
    usTechExposure: usTech,
  };
}

// ─────────────────────────────────────────────────────────────────
// GOLDMAN SACHS SYSTEM PROMPT — portfolio state injected as JSON
// ─────────────────────────────────────────────────────────────────
function buildSystemPrompt(positions: Position[], cash: number, analytics: PortfolioAnalytics): string {
  const positionData = positions.map(p => ({
    symbol:       p.symbol,
    name:         p.name,
    exchange:     p.exchange,
    sector:       p.sector,
    currency:     p.currency,
    shares:       p.shares,
    avgBuyPrice:  p.avgBuyPrice,
    currentPrice: p.currentPrice,
    currentValue: Math.round(p.currentValue * 100) / 100,
    pnlAbs:       Math.round(p.pnlAbs * 100) / 100,
    pnlPct:       Math.round(p.pnlPct * 100) / 100,
    weightInPortfolio: Math.round((analytics.totalValue > 0 ? (p.currentValue / analytics.totalValue) * 100 : 0) * 10) / 10,
    beta:         p.beta ?? null,
    dividendYield: p.dividendYield ?? null,
  }));

  const portfolioState = {
    summary: {
      totalPortfolioValue:  Math.round(analytics.totalValue * 100) / 100,
      cashBalance:          Math.round(cash * 100) / 100,
      cashWeight_pct:       Math.round(analytics.cashWeight * 10) / 10,
      equityValue:          Math.round((analytics.totalValue - cash) * 100) / 100,
      equityWeight_pct:     Math.round(analytics.equityWeight * 10) / 10,
      totalPnL:             Math.round(analytics.totalPnL * 100) / 100,
      totalPnL_pct:         Math.round(analytics.totalPnLPct * 10) / 10,
      numberOfPositions:    positions.length,
    },
    riskMetrics: {
      portfolioBeta:           analytics.avgBeta ? Math.round(analytics.avgBeta * 100) / 100 : "N/A",
      concentrationRisk:       analytics.concentrationRisk,
      topHolding:              analytics.topHolding,
      usTechExposure_pct:      Math.round(analytics.usTechExposure * 10) / 10,
    },
    allocation: {
      byExchange:  Object.entries(analytics.byExchange).map(([ex, d]) => ({
        exchange: ex, weight_pct: Math.round(d.weight * 10) / 10, count: d.count,
      })),
      bySector:    Object.entries(analytics.bySector).map(([sec, d]) => ({
        sector: sec, weight_pct: Math.round(d.weight * 10) / 10,
      })),
      byCurrency:  Object.entries(analytics.byCurrency).map(([cur, d]) => ({
        currency: cur, weight_pct: Math.round(d.weight * 10) / 10,
      })),
    },
    incomeProfile: {
      weightedDividendYield_pct: Math.round(analytics.totalDivYield * 100) / 100,
    },
    positions: positionData,
  };

  return `You are Metrio — Chief Quantitative Portfolio Analyst, Goldman Sachs Asset Management.
Background: 15 years GS, ex-CFA, ex-McKinsey. Master's in Financial Mathematics, MIT.
You are the most rigorous, data-driven portfolio analyst alive. No fluff. No platitudes.

STRICT LEGAL DISCLAIMER (MUST appear in every substantive reply):
"⚠️ Keine Anlageberatung. Alle Analysen dienen ausschließlich der Finanzbildung (§ 85 WpHG)."

YOUR CLIENT'S PORTFOLIO STATE (as of now — treat this as live data):
${JSON.stringify(portfolioState, null, 2)}

ANALYSIS FRAMEWORK — when asked for a portfolio review, you MUST cover:
1. ASSET ALLOCATION & CONCENTRATION RISK
   - Comment on the specific weights above. Is the top holding a risk? 
   - Reference the actual percentages, not hypothetical numbers.

2. GEOGRAPHIC & CURRENCY EXPOSURE
   - USD/EUR/GBP split. What FX risk does this create?
   - Is there enough diversification across XETRA, NASDAQ, NYSE etc.?

3. BETA & VOLATILITY PROFILE
   - If portfolio beta is available: interpret it relative to the S&P 500.
   - Comment on cyclical vs defensive balance.

4. DIVIDEND YIELD & CASH DRAG
   - Weighted yield: is it income-generating or pure growth?
   - Cash weight: is ${Math.round(analytics.cashWeight)}% uninvested cash a drag or a strategic reserve?

5. ACTIONABLE REBALANCING RECOMMENDATIONS
   - Specific, institutional-grade suggestions tied to THIS portfolio's actual numbers.
   - e.g. "Your ${Math.round(analytics.usTechExposure)}% US Tech exposure creates high beta cluster risk..."

RULES:
- Respond ONLY in German unless the user writes in English.
- NEVER give generic advice. ALWAYS reference the specific stock names, weights, and numbers from the portfolio state above.
- If the portfolio is empty or has no positions, acknowledge this and suggest how to start building a diversified portfolio.
- Be surgically precise. One wrong number erodes trust completely.
- Keep responses concise but dense — institutional analysts don't ramble.`;
}

// ─────────────────────────────────────────────────────────────────
// IN-MEMORY RESPONSE CACHE
// 5-minute TTL on (portfolioFingerprint + question) → response.
// Cuts Groq token spend dramatically when users re-ask the same
// quick prompts (e.g. "Vollständige Portfolio-Analyse") within a
// session. Cache is per-tab; lost on reload by design.
// ─────────────────────────────────────────────────────────────────
const PORTFOLIO_AI_CACHE = new Map<string, { response: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function fingerprintPortfolio(positions: Position[], cash: number): string {
  // Compact, stable signature: sorted symbols × shares + cash bucket.
  const sig = positions
    .map(p => `${p.symbol}:${p.shares}:${Math.round(p.currentValue)}`)
    .sort()
    .join("|");
  return `${sig}::cash${Math.round(cash)}`;
}

function getCached(key: string): string | null {
  const hit = PORTFOLIO_AI_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    PORTFOLIO_AI_CACHE.delete(key);
    return null;
  }
  return hit.response;
}

function setCached(key: string, response: string) {
  PORTFOLIO_AI_CACHE.set(key, { response, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─────────────────────────────────────────────────────────────────
// QUICK ANALYSIS PROMPTS
// ─────────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "Vollständige Portfolio-Analyse",
  "Konzentrations- & Klumpenrisiko",
  "Währungsexposure & FX-Risiko",
  "Beta-Profil & Volatilitätsanalyse",
  "Dividendenrendite & Cash-Drag",
  "Rebalancing-Empfehlungen",
  "Worst-Case Stresstest",
  "Was soll ich als nächstes kaufen?",
];

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function PortfolioMetrio({ positions, cashBalance, initialCash }: Props) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const autoInitRef = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const analytics = computeAnalytics(positions, cashBalance);

  // ── Auto-generate initial analysis when component mounts with positions
  // useRef guard prevents React StrictMode from firing twice in dev
  useEffect(() => {
    if (autoInitRef.current) return;
    if (positions.length > 0) {
      autoInitRef.current = true;
      sendMessage("Vollständige Portfolio-Analyse — gib mir dein institutionelles Urteil.", true);
    } else if (positions.length === 0) {
      autoInitRef.current = true;
      setMessages([{
        role:      "ai",
        content:   "Gut. Ich bin Metrio, dein Chief Quant Analyst.\n\nDein Portfolio ist leer. Füge Positionen über das Trading-Terminal hinzu — ich analysiere dann sofort Asset Allocation, Klumpenrisiken, Währungsexposure und gebe dir institutionelle Rebalancing-Empfehlungen.\n\n⚠️ Keine Anlageberatung. Nur zur Finanzbildung (§ 85 WpHG).",
        timestamp: Date.now(),
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Scroll chat container to bottom (not the whole page)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // ── Send message to API
  const sendMessage = useCallback(async (text: string, isAuto = false) => {
    const q = text.trim();
    if (!q || loading) return;

    if (!isAuto) {
      setMessages(prev => [...prev, { role: "user", content: q, timestamp: Date.now() }]);
    }
    setInput("");
    setLoading(true);

    const systemPrompt = buildSystemPrompt(positions, cashBalance, analytics);

    // Build conversation history — TRIM to last 4 turns (8 messages max).
    // Saves significant tokens on long-running chats. Earlier history is
    // already encoded into the analytics snapshot in the system prompt.
    const HISTORY_TURNS = 4;
    const trimmed = messages.slice(-HISTORY_TURNS * 2);
    const history = trimmed.map(m => ({
      role:    m.role === "ai" ? "assistant" : "user" as "assistant" | "user",
      content: m.content,
    }));
    history.push({ role: "user", content: q });

    // 0) Cache check — same portfolio + same question within 5 minutes
    //    returns the cached reply instantly (no token spend at all).
    const cacheKey = `${fingerprintPortfolio(positions, cashBalance)}::${q.toLowerCase().trim()}`;
    const cachedReply = getCached(cacheKey);
    if (cachedReply) {
      setMessages(prev => [...prev, { role: "ai", content: cachedReply, timestamp: Date.now() }]);
      setLoading(false);
      return;
    }

    // Try /api/portfolio-ai first, fall back to /api/metrio (direct Groq)
    const tryEndpoint = async (url: string, payload: object): Promise<string | null> => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const reply =
          data.content ?? data.response ?? data.analysis ?? data.text ?? data.message ?? "";
        return typeof reply === "string" && reply.trim().length > 0 ? reply : null;
      } catch {
        return null;
      }
    };

    let reply: string | null = null;

    // 1) Primary endpoint — note: systemPrompt is sent once here. The
    //    server route holds it for the chain; we don't repeat it inside
    //    the user message anymore.
    reply = await tryEndpoint("/api/portfolio-ai", {
      systemPrompt,
      messages: history,
      portfolioState: {
        positions: positions.length,
        totalValue: analytics.totalValue,
        cashBalance,
      },
    });

    // 2) Fallback: direct Groq via /api/metrio
    if (!reply) {
      const lastQ = history[history.length - 1]?.content ?? q;
      reply = await tryEndpoint("/api/metrio", {
        userMessage: `${systemPrompt}\n\nFRAGE: ${lastQ}`,
        contextType: "portfolio_analysis",
      });
    }

    // 3) Final fallback: local heuristic, always returns something useful
    if (!reply) {
      reply = buildFallbackAnalysis(q, positions, cashBalance, analytics);
    }

    // Cache successful API responses (not heuristic fallbacks — those are
    // cheap to re-generate locally anyway).
    if (reply && reply.length > 50) {
      setCached(cacheKey, reply);
    }

    setMessages(prev => [...prev, {
      role: "ai",
      content: reply!,
      timestamp: Date.now(),
    }]);
    setLoading(false);
  }, [loading, messages, positions, cashBalance, analytics]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const f2 = (n: number, d = 2) => n.toFixed(d);
  const pnlColor = analytics.totalPnL >= 0 ? "#10b981" : "#ef4444";

  return (
    <div className="am-glass" style={{
      background:   "var(--am-card)",
      border:       "1px solid var(--am-border)",
      borderRadius: 20,
      overflow:     "hidden",
      boxShadow:    "0 20px 60px -24px rgba(0,0,0,0.18), 0 2px 6px -2px rgba(0,0,0,0.06)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
    }}>
      {/* ── HEADER (liquid glass) ── */}
      <div style={{
        display:    "flex",
        alignItems: "center",
        gap:        14,
        padding:    "16px 20px",
        background: "linear-gradient(180deg, var(--am-card-soft) 0%, var(--am-card) 100%)",
        borderBottom: "1px solid var(--am-border)",
      }}>
        <MetrioIcon size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--am-text)", letterSpacing: "-0.02em" }}>
              Metrio Portfolio AI
            </p>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 9, fontWeight: 700, color: "var(--am-accent, #059669)",
              background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
              padding: "2px 7px", borderRadius: 10, letterSpacing: "0.04em",
            }}>
              <Sparkles size={9} /> INSTITUTIONAL
            </span>
          </div>
          <p style={{ fontSize: 11, color: "var(--am-text-muted)" }}>
            Echtzeit-Analyse · Quant-Risikomodell · § 85 WpHG
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{
            width: 6, height: 6, background: "#10b981", borderRadius: "50%",
            boxShadow: "0 0 0 2px rgba(16,185,129,0.22), 0 0 10px rgba(16,185,129,0.55)",
            animation: "metrioPulse 2s ease-in-out infinite",
          }} />
          <span style={{ fontSize: 10.5, color: "#059669", fontWeight: 700, letterSpacing: "0.03em" }}>LIVE</span>
        </div>
      </div>

      {/* ── PORTFOLIO SNAPSHOT ── */}
      <div style={{
        display:    "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap:        1,
        background: "var(--am-border)",
        borderBottom: "1px solid var(--am-border)",
      }}>
        {[
          { l: "Gesamtwert",    v: `€${f2(analytics.totalValue)}`,    c: "var(--am-text)" },
          { l: "Cash",          v: `€${f2(cashBalance)} (${f2(analytics.cashWeight,1)}%)`, c: analytics.cashWeight > 30 ? "#f59e0b" : "var(--am-text)" },
          { l: "Gesamt P&L",   v: `${analytics.totalPnL >= 0 ? "+" : ""}€${f2(analytics.totalPnL)} (${f2(analytics.totalPnLPct,1)}%)`, c: pnlColor },
          { l: "Positionen",   v: `${positions.length} Titel · Ø Beta ${analytics.avgBeta ? f2(analytics.avgBeta) : "N/A"}`, c: "var(--am-text)" },
        ].map(item => (
          <div key={item.l} style={{
            padding:    "12px 14px",
            background: "var(--am-card)",
          }}>
            <p style={{
              fontSize: 9, color: "var(--am-text-muted)",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4,
            }}>
              {item.l}
            </p>
            <p style={{
              fontSize: 13, fontWeight: 800, color: item.c, letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}>
              {item.v}
            </p>
          </div>
        ))}
      </div>

      {/* ── RISK FLAGS ── */}
      {(analytics.concentrationRisk !== "LOW" || analytics.cashWeight > 40 || analytics.usTechExposure > 50) && (
        <div style={{
          display:      "flex",
          gap:          8,
          padding:      "10px 16px",
          background:   "rgba(245, 158, 11, 0.08)",
          borderBottom: "1px solid rgba(245, 158, 11, 0.25)",
          flexWrap:     "wrap",
        }}>
          {analytics.concentrationRisk === "HIGH" && (
            <Flag icon={<AlertTriangle size={11} color="#d97706" />}
              text={`Klumpenrisiko: ${analytics.topHolding?.symbol} = ${f2(analytics.topHolding?.weight ?? 0, 1)}%`} />
          )}
          {analytics.cashWeight > 40 && (
            <Flag icon={<TrendingUp size={11} color="#d97706" />}
              text={`Cash-Drag: ${f2(analytics.cashWeight, 1)}% uninvestiert`} />
          )}
          {analytics.usTechExposure > 50 && (
            <Flag icon={<BarChart2 size={11} color="#d97706" />}
              text={`US-Tech Klumpen: ${f2(analytics.usTechExposure, 1)}%`} />
          )}
        </div>
      )}

      {/* ── MESSAGES ── */}
      <div ref={chatContainerRef} style={{
        background:   "var(--am-card-soft)",
        minHeight:    220,
        maxHeight:    420,
        overflowY:    "auto",
        padding:      "16px",
        display:      "flex",
        flexDirection: "column",
        gap:          12,
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display:        "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            alignItems:     "flex-end",
            gap:            10,
          }}>
            {m.role === "ai" && <MetrioIcon size={28} />}
            <div style={{
              maxWidth:     "82%",
              padding:      "12px 15px",
              borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background:   m.role === "user"
                ? "linear-gradient(180deg, var(--am-accent, #0f172a) 0%, var(--am-accent-hover, #1e293b) 100%)"
                : "var(--am-card)",
              color:        m.role === "user" ? "var(--am-accent-text, #fff)" : "var(--am-text)",
              fontSize:     13,
              lineHeight:   1.75,
              border:       m.role === "ai" ? "1px solid var(--am-border)" : "none",
              boxShadow:    m.role === "ai"
                ? "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px -14px rgba(0,0,0,0.12)"
                : "0 4px 12px -4px rgba(0,0,0,0.20)",
              backdropFilter: m.role === "ai" ? "blur(14px) saturate(160%)" : undefined,
              WebkitBackdropFilter: m.role === "ai" ? "blur(14px) saturate(160%)" : undefined,
            }}>
              {m.role === "ai"
                ? <span style={{ color: "var(--am-text)" }} dangerouslySetInnerHTML={{ __html: formatMetrio(m.content) }} />
                : m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
            <MetrioIcon size={28} />
            <div style={{
              padding:      "12px 15px",
              background:   "var(--am-card)",
              border:       "1px solid var(--am-border)",
              borderRadius: "14px 14px 14px 4px",
              display:      "flex",
              gap:          5,
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6,
                  background: "var(--am-text-muted)",
                  borderRadius: "50%",
                  animation: `metrioBounce 1.2s ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── QUICK PROMPTS ── */}
      <div style={{
        background:   "var(--am-card-soft)",
        borderTop:    "1px solid var(--am-border)",
        padding:      "10px 16px",
      }}>
        <p style={{
          fontSize: 10, color: "var(--am-text-muted)",
          marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          Schnellanalysen
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => sendMessage(p)}
              disabled={loading}
              style={{
                fontSize:   11,
                color:      "var(--am-text-secondary)",
                background: "var(--am-card)",
                border:     "1px solid var(--am-border)",
                padding:    "5px 11px",
                borderRadius: 20,
                cursor: loading ? "default" : "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--am-text)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--am-card-hover)";
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--am-border)";
                (e.currentTarget as HTMLButtonElement).style.background = "var(--am-card)";
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── INPUT ── */}
      <div style={{
        display:    "flex",
        gap:        8,
        padding:    "14px 16px",
        background: "var(--am-card)",
        borderTop:  "1px solid var(--am-border)",
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          autoFocus={false}
          placeholder="Frag Metrio nach deiner Portfolio-Analyse…"
          style={{
            flex: 1,
            background: "var(--am-card-soft)",
            border: "1px solid var(--am-border)",
            borderRadius: 11, padding: "11px 15px", fontSize: 13,
            outline: "none", fontFamily: "inherit",
            color: "var(--am-text)",
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          style={{
            background: input.trim() && !loading
              ? "linear-gradient(180deg, var(--am-accent, #0a1628) 0%, var(--am-accent-hover, #1e293b) 100%)"
              : "var(--am-card-soft)",
            border:       "1px solid var(--am-border)",
            borderRadius: 11, padding: "11px 18px",
            cursor:       input.trim() && !loading ? "pointer" : "default",
            display:      "flex", alignItems: "center",
            transition:   "background 0.15s",
          }}
        >
          <Send size={14} color={input.trim() && !loading ? "var(--am-accent-text, #fff)" : "var(--am-text-faint)"} />
        </button>
      </div>

      <div style={{
        padding: "8px 16px 12px",
        background: "var(--am-card)",
        borderTop: "1px solid var(--am-border-light, var(--am-border))",
      }}>
        <p style={{ fontSize: 10, color: "var(--am-text-faint)", textAlign: "center" }}>
          Metrio Portfolio AI gibt keine rechtsverbindliche Anlageberatung (§ 85 WpHG). Nur zur Finanzbildung.
        </p>
      </div>

      <style>{`
        @keyframes metrioBounce {
          0%,80%,100% { transform:scale(0); }
          40%          { transform:scale(1); }
        }
        @keyframes metrioPulse {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FALLBACK ANALYSIS — when API is unavailable
// ─────────────────────────────────────────────────────────────────
function buildFallbackAnalysis(
  question: string,
  positions: Position[],
  cash: number,
  a: PortfolioAnalytics,
): string {
  const f2 = (n: number, d = 2) => n.toFixed(d);

  if (positions.length === 0) {
    return "Dein Portfolio ist leer. Füge Positionen über das Trading-Terminal hinzu, damit ich eine vollständige Analyse durchführen kann. ⚠️ Keine Anlageberatung. § 85 WpHG.";
  }

  const q = question.toLowerCase();

  if (q.includes("vollständig") || q.includes("analyse") || q.includes("review")) {
    const topEx = Object.entries(a.byExchange).sort((x,y) => y[1].weight - x[1].weight)[0];
    const topSec = Object.entries(a.bySector).sort((x,y) => y[1].weight - x[1].weight)[0];
    return `Portfolio-Analyse — ${positions.length} Positionen · €${f2(a.totalValue)} Gesamtwert

1. ASSET ALLOCATION
Eigenkapital: ${f2(a.equityWeight,1)}% · Cash: ${f2(a.cashWeight,1)}%
${a.cashWeight > 30 ? `⚠️ Cash-Drag: ${f2(a.cashWeight,1)}% uninvestiert — in Bullenmärkten bedeutet das entgangene Rendite.` : "Cash-Anteil im akzeptablen Bereich."}

2. KONZENTRATION & KLUMPENRISIKO
Top-Börse: ${topEx?.[0]} mit ${f2(topEx?.[1]?.weight ?? 0,1)}% des Portfolios.
Top-Sektor: ${topSec?.[0]} mit ${f2(topSec?.[1]?.weight ?? 0,1)}%.
Konzentrationsrisiko: ${a.concentrationRisk}${a.concentrationRisk === "HIGH" ? " — zu stark konzentriert, Diversifikation empfohlen." : "."}

3. P&L
Gesamt-P&L: ${a.totalPnL >= 0 ? "+" : ""}€${f2(a.totalPnL)} (${f2(a.totalPnLPct,1)}%)

4. REBALANCING
${a.usTechExposure > 40 ? `US Tech-Klumpen (${f2(a.usTechExposure,1)}%) erhöht Korrelationsrisiko — XETRA/LSE Diversifikation erwägen.` : "Geografische Diversifikation angemessen."}
${a.cashWeight > 30 ? "Schrittweiser Abbau der Cash-Position in defensive Qualitätstitel empfohlen." : ""}

⚠️ Keine Anlageberatung. Nur zur Finanzbildung (§ 85 WpHG).`;
  }

  if (q.includes("beta") || q.includes("volatil") || q.includes("risiko")) {
    return `Beta-Analyse:${a.avgBeta ? ` Portfolio-Beta ${f2(a.avgBeta)} — ${a.avgBeta > 1.3 ? "überdurchschnittlich aggressiv, hohe Marktkorrelation" : a.avgBeta < 0.8 ? "defensiver Charakter, weniger volatil als Markt" : "marktähnliche Volatilität"}.` : " Beta-Daten nicht ausreichend für alle Positionen."}
${a.concentrationRisk === "HIGH" ? `⚠️ Klumpenrisiko: ${a.topHolding?.symbol} mit ${f2(a.topHolding?.weight ?? 0,1)}% ist zu dominant.` : ""}
⚠️ Keine Anlageberatung. § 85 WpHG.`;
  }

  if (q.includes("währung") || q.includes("fx") || q.includes("currency")) {
    const currencies = Object.entries(a.byCurrency);
    return `FX-Exposure:\n${currencies.map(([cur, d]) => `${cur}: ${f2(d.weight,1)}%`).join("\n")}
${currencies.length > 1 ? "Währungsdiversifikation vorhanden — FX-Hedging für Positionen >20% in Fremdwährung erwägen." : "Einheitliche Währung — kein FX-Risiko."}
⚠️ Keine Anlageberatung. § 85 WpHG.`;
  }

  return `Ich analysiere dein Portfolio mit ${positions.length} Positionen und Gesamtwert €${f2(a.totalValue)}. Stelle mir eine spezifische Frage zu Konzentration, Beta, FX-Risiko, Dividendenprofil oder Rebalancing. ⚠️ Keine Anlageberatung. § 85 WpHG.`;
}

// ─────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────
function Flag({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{
      display:    "flex",
      alignItems: "center",
      gap:        5,
      background: "var(--am-card)",
      border:     "1px solid rgba(245, 158, 11, 0.40)",
      borderRadius: 6,
      padding:    "4px 9px",
    }}>
      {icon}
      <span style={{ fontSize: 11, color: "#d97706", fontWeight: 700 }}>{text}</span>
    </div>
  );
}
