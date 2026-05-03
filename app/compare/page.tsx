"use client";

import { useState, useCallback } from "react";
import SearchWithExchange, { SelectedStock } from "@/components/SearchWithExchange";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Loader2, Brain, Sparkles } from "lucide-react";
import { formatMetrio } from "@/utils/formatMetrio";
import Footer from "@/components/Footer";

type QuoteData = any;

async function fetchQuote(symbol: string): Promise<QuoteData | null> {
  try {
    const r = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function fmt(v: number | undefined | null, opts: { pct?: boolean; money?: boolean; decimals?: number; currency?: string } = {}) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  const { pct, money, decimals = 2, currency = "" } = opts;
  if (pct) return `${(v * (Math.abs(v) < 1 ? 100 : 1)).toFixed(decimals)}%`;
  if (money) {
    const abs = Math.abs(v);
    if (abs >= 1e12) return `${(v / 1e12).toFixed(2)} T${currency ? " " + currency : ""}`;
    if (abs >= 1e9)  return `${(v / 1e9).toFixed(2)} Mrd${currency ? " " + currency : ""}`;
    if (abs >= 1e6)  return `${(v / 1e6).toFixed(2)} Mio${currency ? " " + currency : ""}`;
    return `${v.toFixed(decimals)}${currency ? " " + currency : ""}`;
  }
  return v.toFixed(decimals);
}

type Row = {
  label: string;
  get: (d: QuoteData) => number | undefined;
  fmt?: (v: number | undefined, d: QuoteData) => string;
  higherBetter?: boolean | null; // null = neutral
  group: string;
};

const ROWS: Row[] = [
  { group: "Preis", label: "Aktueller Kurs", get: d => d?.quote?.c, fmt: (v, d) => fmt(v, { money: true, currency: d?.currency }), higherBetter: null },
  { group: "Preis", label: "Tagesveränderung %", get: d => d?.quote?.dp, fmt: v => v === undefined ? "—" : `${v.toFixed(2)}%`, higherBetter: true },
  { group: "Preis", label: "52W Hoch", get: d => d?.metrics?.["52WeekHigh"], fmt: (v, d) => fmt(v, { money: true, currency: d?.currency }), higherBetter: null },
  { group: "Preis", label: "52W Tief", get: d => d?.metrics?.["52WeekLow"], fmt: (v, d) => fmt(v, { money: true, currency: d?.currency }), higherBetter: null },
  { group: "Größe", label: "Marktkapitalisierung", get: d => (d?.metrics?.marketCapitalization ?? d?.profile?.marketCapitalization) * (d?.dataSource === "yahoo" ? 1 : 1_000_000), fmt: (v, d) => fmt(v, { money: true, currency: d?.currency }), higherBetter: null },
  { group: "Bewertung", label: "KGV (TTM)", get: d => d?.metrics?.peBasicExclExtraTTM, higherBetter: false },
  { group: "Bewertung", label: "KGV Forward", get: d => d?.metrics?.peForward, higherBetter: false },
  { group: "Bewertung", label: "KBV", get: d => d?.metrics?.pbAnnual, higherBetter: false },
  { group: "Bewertung", label: "EV/EBITDA", get: d => d?.metrics?.evEbitdaTTM, higherBetter: false },
  { group: "Profitabilität", label: "Eigenkapitalrendite (ROE)", get: d => d?.metrics?.roeTTM, fmt: v => v === undefined ? "—" : `${(v * (Math.abs(v) < 1 ? 100 : 1)).toFixed(2)}%`, higherBetter: true },
  { group: "Profitabilität", label: "Nettomarge", get: d => d?.metrics?.netProfitMarginTTM, fmt: v => v === undefined ? "—" : `${(v * (Math.abs(v) < 1 ? 100 : 1)).toFixed(2)}%`, higherBetter: true },
  { group: "Profitabilität", label: "Bruttomarge", get: d => d?.metrics?.grossMarginTTM, fmt: v => v === undefined ? "—" : `${(v * (Math.abs(v) < 1 ? 100 : 1)).toFixed(2)}%`, higherBetter: true },
  { group: "Wachstum", label: "Umsatzwachstum", get: d => d?.metrics?.revenueGrowth3Y, fmt: v => v === undefined ? "—" : `${(v * (Math.abs(v) < 1 ? 100 : 1)).toFixed(2)}%`, higherBetter: true },
  { group: "Wachstum", label: "EPS-Wachstum", get: d => d?.metrics?.epsGrowth1Y, fmt: v => v === undefined ? "—" : `${(v * (Math.abs(v) < 1 ? 100 : 1)).toFixed(2)}%`, higherBetter: true },
  { group: "Dividende", label: "Dividendenrendite", get: d => d?.metrics?.dividendYieldIndicatedAnnual, fmt: v => v === undefined ? "—" : `${v.toFixed(2)}%`, higherBetter: true },
  { group: "Dividende", label: "Ausschüttungsquote", get: d => d?.metrics?.payoutRatioTTM, fmt: v => v === undefined ? "—" : `${(v * (Math.abs(v) < 1 ? 100 : 1)).toFixed(1)}%`, higherBetter: null },
  { group: "Risiko", label: "Beta", get: d => d?.metrics?.beta, higherBetter: false },
  { group: "Risiko", label: "Debt/Equity", get: d => d?.metrics?.totalDebt_totalEquityAnnual, higherBetter: false },
  { group: "Risiko", label: "Current Ratio", get: d => d?.metrics?.currentRatioAnnual, higherBetter: true },
];

function StockCol({
  side,
  data,
  loading,
  onSelect,
}: {
  side: "A" | "B";
  data: QuoteData | null;
  loading: boolean;
  onSelect: (s: SelectedStock) => void;
}) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: 24,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
        {side === "A" ? "Aktie A" : "Aktie B"}
      </div>
      <SearchWithExchange onSelect={onSelect} placeholder="Ticker wählen…" />
      <div style={{ marginTop: 20, minHeight: 80 }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280", fontSize: 14 }}>
            <Loader2 size={16} className="spin" /> Lade Daten…
          </div>
        )}
        {!loading && data && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
              {data?.profile?.name || data?.displaySymbol}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {data?.displaySymbol} · {data?.exchange} · {data?.currency}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "var(--am-text)", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>
                {data?.quote?.c?.toFixed(2)}
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: (data?.quote?.dp ?? 0) >= 0 ? "#047857" : "#dc2626",
              }}>
                {(data?.quote?.dp ?? 0) >= 0 ? "+" : ""}{data?.quote?.dp?.toFixed(2)}%
              </div>
            </div>
          </div>
        )}
        {!loading && !data && (
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Wähle oben eine Aktie zum Vergleichen.</div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [a, setA] = useState<QuoteData | null>(null);
  const [b, setB] = useState<QuoteData | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const selectA = useCallback(async (s: SelectedStock) => {
    setLoadingA(true); setA(null);
    const d = await fetchQuote(s.symbol);
    setA(d); setLoadingA(false);
  }, []);
  const selectB = useCallback(async (s: SelectedStock) => {
    setLoadingB(true); setB(null);
    const d = await fetchQuote(s.symbol);
    setB(d); setLoadingB(false);
  }, []);

  const groups = Array.from(new Set(ROWS.map(r => r.group)));

  function compare(va: number | undefined, vb: number | undefined, higherBetter: boolean | null | undefined): "a" | "b" | "eq" | null {
    if (higherBetter === null || higherBetter === undefined) return null;
    if (va === undefined || vb === undefined) return null;
    if (Math.abs(va - vb) < 1e-9) return "eq";
    const aWins = higherBetter ? va > vb : va < vb;
    return aWins ? "a" : "b";
  }

  // ── METRIO AI verdict state ──
  const [verdict, setVerdict] = useState<string | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [verdictError, setVerdictError] = useState<string | null>(null);

  const askMetrio = useCallback(async () => {
    if (!a || !b) return;
    setVerdictLoading(true); setVerdict(null); setVerdictError(null);
    try {
      const prompt = `Vergleiche diese zwei Aktien direkt für einen institutionellen Investor und gib ein klares Urteil:

**${a.profile?.name} (${a.displaySymbol})**
- Kurs: ${a.quote?.c} ${a.currency}
- KGV: ${a.metrics?.peBasicExclExtraTTM ?? "—"}, KBV: ${a.metrics?.pbAnnual ?? "—"}, ROE: ${a.metrics?.roeTTM ?? "—"}
- Branche: ${a.profile?.finnhubIndustry ?? "—"}

**${b.profile?.name} (${b.displaySymbol})**
- Kurs: ${b.quote?.c} ${b.currency}
- KGV: ${b.metrics?.peBasicExclExtraTTM ?? "—"}, KBV: ${b.metrics?.pbAnnual ?? "—"}, ROE: ${b.metrics?.roeTTM ?? "—"}
- Branche: ${b.profile?.finnhubIndustry ?? "—"}

Gib eine strukturierte Analyse (max 250 Wörter):
### Bewertung
### Profitabilität & Wachstum
### Risiko
### Urteil
Welche Aktie ist aktuell die bessere Wahl — und für welchen Anlegertyp?`;
      const res = await fetch("/api/metrio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: prompt, contextType: "general_chat" }),
      });
      const j = await res.json();
      if (j.response) setVerdict(j.response);
      else setVerdictError(j.error || "Metrio konnte nicht antworten.");
    } catch (e: any) {
      setVerdictError(e?.message || "Verbindungsfehler");
    }
    setVerdictLoading(false);
  }, [a, b]);

  return (
    <div style={{ background: "var(--am-bg)", minHeight: "100vh", fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <TrendingUp size={28} color="var(--am-text)" />
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, color: "var(--am-text)", letterSpacing: -0.5 }}>
            Vergleichstool
          </h1>
        </div>
        <p style={{ color: "var(--am-text-muted)", fontSize: 15, marginTop: 0, marginBottom: 32, maxWidth: 720 }}>
          Zwei Aktien Seite-an-Seite — Bewertung, Profitabilität, Wachstum und Risiko auf einen Blick.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
          <StockCol side="A" data={a} loading={loadingA} onSelect={selectA} />
          <StockCol side="B" data={b} loading={loadingB} onSelect={selectB} />
        </div>

        {/* ── METRIO AI VERDICT BOX ── */}
        {a && b && (
          <div style={{
            marginBottom: 24,
            background: "var(--am-card)",
            border: "1px solid var(--am-border)",
            borderLeft: "3px solid var(--am-accent)",
            borderRadius: 16,
            padding: 24,
            boxShadow: "var(--am-shadow)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: verdict || verdictLoading ? 16 : 0, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "linear-gradient(135deg, var(--am-accent), var(--am-accent-hover))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 8px 24px -8px var(--am-accent-glow)",
                }}>
                  <Brain size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--am-text)" }}>Metrio AI Verdict</div>
                  <div style={{ fontSize: 11, color: "var(--am-text-muted)" }}>
                    {a.displaySymbol} vs {b.displaySymbol} · KI-Analyse mit Live-Kontext
                  </div>
                </div>
              </div>
              <button onClick={askMetrio} disabled={verdictLoading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 18px", borderRadius: 10, border: "none",
                  background: verdictLoading ? "var(--am-card-hover)" : "linear-gradient(180deg, var(--am-accent) 0%, #3b7dff 100%)",
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: verdictLoading ? "wait" : "pointer",
                  fontFamily: "inherit",
                  boxShadow: verdictLoading ? "none" : "0 8px 24px -8px var(--am-accent-glow)",
                }}>
                {verdictLoading ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                {verdictLoading ? "Analysiere…" : verdict ? "Neu analysieren" : "Metrio fragen"}
              </button>
            </div>
            {verdictError && (
              <div style={{ fontSize: 13, color: "var(--am-red-text)" }}>{verdictError}</div>
            )}
            {verdict && (
              <div
                style={{ fontSize: 14, color: "var(--am-text-secondary)", lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: formatMetrio(verdict) }}
              />
            )}
          </div>
        )}

        {(a || b) && (
          <div style={{
            background: "var(--am-card)",
            border: "1px solid var(--am-border)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "var(--am-shadow)",
          }}>
            <div style={{
              padding: "16px 24px",
              borderBottom: "1px solid var(--am-border)",
              fontSize: 14, fontWeight: 700, color: "var(--am-text)",
              letterSpacing: 0.2,
            }}>
              Kennzahlen-Vergleich
            </div>
            {groups.map(g => (
              <div key={g}>
                <div style={{
                  padding: "12px 24px",
                  background: "var(--am-card-soft)",
                  borderBottom: "1px solid var(--am-border-light)",
                  fontSize: 11, fontWeight: 700, color: "var(--am-text-muted)",
                  textTransform: "uppercase", letterSpacing: 1,
                }}>
                  {g}
                </div>
                {ROWS.filter(r => r.group === g).map(row => {
                  const va = a ? row.get(a) : undefined;
                  const vb = b ? row.get(b) : undefined;
                  const winner = compare(va, vb, row.higherBetter);
                  const txtA = row.fmt ? row.fmt(va, a) : fmt(va);
                  const txtB = row.fmt ? row.fmt(vb, b) : fmt(vb);
                  return (
                    <div key={row.label} style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1.2fr 1fr",
                      alignItems: "center",
                      padding: "14px 24px",
                      borderBottom: "1px solid var(--am-border-light)",
                      fontSize: 14,
                    }}>
                      <div style={{
                        textAlign: "right", fontWeight: winner === "a" ? 800 : 500,
                        color: winner === "a" ? "var(--am-green-text)" : "var(--am-text)",
                        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6,
                      }}>
                        {winner === "a" && <ArrowUpRight size={14} color="var(--am-green-text)" />}
                        {txtA}
                      </div>
                      <div style={{ textAlign: "center", color: "var(--am-text-muted)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {row.label}
                      </div>
                      <div style={{
                        textAlign: "left", fontWeight: winner === "b" ? 800 : 500,
                        color: winner === "b" ? "var(--am-green-text)" : "var(--am-text)",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        {winner === "b" && <ArrowUpRight size={14} color="var(--am-green-text)" />}
                        {winner === "eq" && <Minus size={14} color="var(--am-text-faint)" />}
                        {txtB}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
