"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { TrendingUp, TrendingDown, Trash2, Send, Sparkles, Plus, RefreshCw, AlertTriangle, CheckCircle, X, BarChart2, DollarSign, Target, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { resolveTickerSafe, searchTickers, formatPrice, currencySymbol, type TickerEntry } from "@/utils/tickerMap";

// ─── TYPES ────────────────────────────────────────────────────────
interface Position {
  symbol:       string;
  name:         string;
  currency:     string;
  sector:       string;
  shares:       number;
  avgBuyPrice:  number;   // price paid per share
  currentPrice: number;   // live price
  lastUpdated:  number;   // timestamp
}

interface Trade {
  id:        string;
  symbol:    string;
  type:      "BUY" | "SELL";
  shares:    number;
  price:     number;
  currency:  string;
  total:     number;
  timestamp: number;
}

interface PortfolioState {
  cash:       number;
  positions:  Position[];
  trades:     Trade[];
  createdAt:  number;
}

interface ChatMsg { role: "user" | "ai"; text: string; }

const STARTING_CASH = 25_000;
const STORAGE_KEY   = "am_portfolio_v1";

// ─── HELPERS ──────────────────────────────────────────────────────
function fEur(n: number): string {
  return `€${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", ...style }}>
      {children}
    </div>
  );
}

function Sk({ w = "100%", h = 12 }: { w?: string | number; h?: number }) {
  return <div style={{ width: w, height: h, borderRadius: 6, background: "linear-gradient(90deg,#f3f4f6 25%,#e9ecef 50%,#f3f4f6 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />;
}

// ─── PORTFOLIO STATE MANAGER ──────────────────────────────────────
function loadState(): PortfolioState {
  if (typeof window === "undefined") return { cash: STARTING_CASH, positions: [], trades: [], createdAt: Date.now() };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { cash: STARTING_CASH, positions: [], trades: [], createdAt: Date.now() };
}

function saveState(state: PortfolioState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// ─── BUY/SELL WIDGET ──────────────────────────────────────────────
function TradeWidget({
  portfolio, onTrade, onClose
}: {
  portfolio: PortfolioState;
  onTrade: (state: PortfolioState) => void;
  onClose: () => void;
}) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<TickerEntry[]>([]);
  const [selected, setSelected] = useState<TickerEntry | null>(null);
  const [price,   setPrice]   = useState<number | null>(null);
  const [shares,  setShares]  = useState(1);
  const [mode,    setMode]    = useState<"BUY" | "SELL">("BUY");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Autocomplete
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setResults(searchTickers(query));
  }, [query]);

  // Fetch live price when ticker selected
  const fetchPrice = useCallback(async (entry: TickerEntry) => {
    setLoading(true); setError(null); setPrice(null);
    try {
      const r = await fetch(`/api/quote?symbol=${entry.display}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Kurs nicht verfügbar");
      setPrice(d.quote?.c ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
    setLoading(false);
  }, []);

  const selectTicker = (entry: TickerEntry) => {
    setSelected(entry); setResults([]); setQuery(entry.display);
    fetchPrice(entry);
  };

  const maxSellShares = selected
    ? portfolio.positions.find(p => p.symbol === selected.display)?.shares ?? 0
    : 0;

  const total = price ? shares * price : 0;
  const canBuy  = mode === "BUY"  && price !== null && total <= portfolio.cash && shares > 0;
  const canSell = mode === "SELL" && shares > 0 && shares <= maxSellShares;

  const executeTrade = () => {
    if (!selected || !price) return;
    const sym = selected.display;
    const newTrade: Trade = {
      id: `${Date.now()}`, symbol: sym, type: mode,
      shares, price, currency: selected.currency,
      total: shares * price, timestamp: Date.now(),
    };

    let newCash = portfolio.cash;
    let newPositions = [...portfolio.positions];

    if (mode === "BUY") {
      newCash -= total;
      const existing = newPositions.find(p => p.symbol === sym);
      if (existing) {
        // Average down/up calculation
        const totalShares = existing.shares + shares;
        const avgPrice = (existing.shares * existing.avgBuyPrice + shares * price) / totalShares;
        newPositions = newPositions.map(p => p.symbol === sym
          ? { ...p, shares: totalShares, avgBuyPrice: avgPrice, currentPrice: price, lastUpdated: Date.now() }
          : p
        );
      } else {
        newPositions.push({
          symbol: sym, name: selected.name,
          currency: selected.currency, sector: selected.sector,
          shares, avgBuyPrice: price, currentPrice: price, lastUpdated: Date.now(),
        });
      }
    } else {
      // SELL
      newCash += total;
      newPositions = newPositions
        .map(p => p.symbol === sym ? { ...p, shares: p.shares - shares, lastUpdated: Date.now() } : p)
        .filter(p => p.shares > 0);
    }

    const newState: PortfolioState = {
      ...portfolio, cash: newCash,
      positions: newPositions,
      trades: [newTrade, ...portfolio.trades],
    };
    saveState(newState);
    onTrade(newState);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Order aufgeben</p>
          <button onClick={onClose} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex" }}><X size={14} /></button>
        </div>

        {/* BUY / SELL toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "#f9fafb", borderRadius: 10, padding: 4 }}>
          {(["BUY", "SELL"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, padding: "8px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                background: mode === m ? (m === "BUY" ? "#111827" : "#dc2626") : "transparent",
                color: mode === m ? "#fff" : "#9ca3af" }}>
              {m === "BUY" ? "Kaufen" : "Verkaufen"}
            </button>
          ))}
        </div>

        {/* Ticker search */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Aktie suchen — BMW, AAPL, ALV…"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 9, border: "1px solid #e5e7eb", fontSize: 14, outline: "none", fontFamily: "inherit", color: "#111827" }} />
          {results.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 100, marginTop: 4 }}>
              {results.map(r => (
                <button key={r.display} onClick={() => selectTicker(r)}
                  style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "9px 14px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", borderBottom: "1px solid #f9fafb" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{r.display}</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price display */}
        {selected && (
          <div style={{ padding: "12px 14px", background: "#f9fafb", borderRadius: 10, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{selected.name}</p>
                <p style={{ fontSize: 11, color: "#9ca3af" }}>{selected.exchange} · {selected.currency}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                {loading ? <Sk w={80} h={20} /> : price !== null
                  ? <p style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>{formatPrice(price, selected.currency)}</p>
                  : <p style={{ fontSize: 12, color: "#dc2626" }}>{error || "—"}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Shares input */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, display: "block", marginBottom: 6 }}>
            Anzahl Aktien
            {mode === "SELL" && <span style={{ color: "#9ca3af", fontWeight: 400, marginLeft: 8 }}>Max: {maxSellShares}</span>}
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShares(s => Math.max(1, s - 1))} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <input type="number" min={1} value={shares} onChange={e => setShares(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none", fontFamily: "inherit" }} />
            <button onClick={() => setShares(s => s + 1)} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
        </div>

        {/* Order summary */}
        {price !== null && (
          <div style={{ padding: "12px 14px", background: mode === "BUY" ? "#f0fdf4" : "#fef2f2", borderRadius: 10, border: `1px solid ${mode === "BUY" ? "#bbf7d0" : "#fecaca"}`, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Gesamtbetrag</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>{formatPrice(total, selected?.currency ?? "EUR")}</span>
            </div>
            {mode === "BUY" && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Verbleibend</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: total > portfolio.cash ? "#dc2626" : "#10b981" }}>
                  {fEur(portfolio.cash - total)}
                </span>
              </div>
            )}
            {mode === "BUY" && total > portfolio.cash && (
              <p style={{ fontSize: 11, color: "#dc2626", marginTop: 6 }}>⚠ Nicht genug Kapital. Verfügbar: {fEur(portfolio.cash)}</p>
            )}
            {mode === "SELL" && shares > maxSellShares && (
              <p style={{ fontSize: 11, color: "#dc2626", marginTop: 6 }}>⚠ Nur {maxSellShares} Aktien im Bestand.</p>
            )}
          </div>
        )}

        <button onClick={executeTrade} disabled={mode === "BUY" ? !canBuy : !canSell}
          style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", cursor: canBuy || canSell ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
            background: mode === "BUY" ? "#111827" : "#dc2626",
            color: "#fff", opacity: (canBuy || canSell) ? 1 : 0.4 }}>
          {mode === "BUY" ? `Kaufen — ${shares} × ${selected?.display ?? ""}` : `Verkaufen — ${shares} × ${selected?.display ?? ""}`}
        </button>
        <p style={{ fontSize: 10, color: "#d1d5db", textAlign: "center", marginTop: 10 }}>
          Paper Trading — kein echtes Kapital · Keine Anlageberatung
        </p>
      </div>
    </div>
  );
}

// ─── METRIO PORTFOLIO CHAT ────────────────────────────────────────
function MetrioPortfolioChat({ portfolio }: { portfolio: PortfolioState }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([{
    role: "ai",
    text: `Hi, ich bin Metrio 👋\n\nDein Portfolio: ${fEur(portfolio.cash)} Cash · ${portfolio.positions.length} Positionen. Frag mich: "Was soll ich mit 5.000 € kaufen?", "Ist mein Portfolio zu Tech-lastig?", oder "Wie diversifiziert bin ich?"`
  }]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (msgs.length > 1) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (txt?: string) => {
    const q = txt || input.trim();
    if (!q || loading) return;
    setInput(""); setMsgs(m => [...m, { role: "user", text: q }]); setLoading(true);
    try {
      const totalValue = portfolio.positions.reduce((s, p) => s + p.shares * p.currentPrice, 0);
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          section: "portfolio",
          portfolioContext: {
            cash:        portfolio.cash,
            totalValue:  totalValue + portfolio.cash,
            positions:   portfolio.positions.map(p => ({
              symbol:       p.symbol,
              name:         p.name,
              shares:       p.shares,
              avgBuyPrice:  p.avgBuyPrice,
              currentPrice: p.currentPrice,
              currency:     p.currency,
              sector:       p.sector,
              pnl:          (p.currentPrice - p.avgBuyPrice) * p.shares,
              pnlPct:       ((p.currentPrice - p.avgBuyPrice) / p.avgBuyPrice) * 100,
            })),
          }
        })
      });
      const j = await r.json();
      setMsgs(m => [...m, { role: "ai", text: j.analysis || "Keine Antwort." }]);
    } catch {
      setMsgs(m => [...m, { role: "ai", text: "Verbindungsfehler." }]);
    }
    setLoading(false);
  };

  const quick = [
    "Wie diversifiziert bin ich?",
    `Was soll ich mit ${fEur(Math.round(portfolio.cash / 1000) * 1000)} kaufen?`,
    "Welche Positionen soll ich verkaufen?",
    "Bin ich zu Tech-lastig?",
    "Analysiere mein Risikoprofil",
  ];

  return (
    <Card style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "#111827" }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: 36, height: 36, background: "#fff", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={16} color="#111827" />
          </div>
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, background: "#10b981", borderRadius: "50%", border: "2px solid #111827" }} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Metrio — Portfolio Advisor</p>
          <p style={{ fontSize: 10, color: "#6b7280" }}>Kennt dein Portfolio · Kontextuell · Kein Anlageberatung</p>
        </div>
      </div>

      <div style={{ background: "#f9fafb", minHeight: 160, maxHeight: 260, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 7 }}>
            {m.role === "ai" && <div style={{ width: 24, height: 24, background: "#111827", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Sparkles size={10} color="#fff" /></div>}
            <div style={{ maxWidth: "80%", padding: "9px 13px", borderRadius: m.role === "user" ? "13px 13px 4px 13px" : "13px 13px 13px 4px", background: m.role === "user" ? "#111827" : "#fff", color: m.role === "user" ? "#fff" : "#374151", fontSize: 13, lineHeight: 1.7, border: m.role === "ai" ? "1px solid #e5e7eb" : "none", whiteSpace: "pre-line" }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
            <div style={{ width: 24, height: 24, background: "#111827", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={10} color="#fff" /></div>
            <div style={{ padding: "9px 13px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "13px 13px 13px 4px", display: "flex", gap: 4 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, background: "#d1d5db", borderRadius: "50%", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb", padding: "8px 14px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {quick.map(q => (
            <button key={q} onClick={() => send(q)}
              style={{ fontSize: 11, color: "#374151", background: "#fff", border: "1px solid #e5e7eb", padding: "4px 10px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#111827"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"; }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 7, padding: "12px 14px", background: "#fff", borderTop: "1px solid #f3f4f6" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Frag Metrio über dein Portfolio…"
          style={{ flex: 1, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 9, padding: "10px 13px", fontSize: 13, outline: "none", fontFamily: "inherit", color: "#111827" }} />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          style={{ background: "#111827", border: "none", borderRadius: 9, padding: "10px 15px", cursor: "pointer", opacity: !input.trim() ? 0.4 : 1, display: "flex", alignItems: "center" }}>
          <Send size={13} color="#fff" />
        </button>
      </div>
      <p style={{ fontSize: 10, color: "#d1d5db", textAlign: "center", padding: "6px 14px 10px", background: "#fff", borderTop: "1px solid #f9fafb" }}>
        Metrio gibt keine Anlageberatung. § 85 WpHG.
      </p>
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}} @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </Card>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [portfolio,   setPortfolio]   = useState<PortfolioState | null>(null);
  const [tradeOpen,   setTradeOpen]   = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setPortfolio(loadState());
  }, []);

  // Refresh all position prices
  const refreshPrices = useCallback(async () => {
    if (!portfolio || portfolio.positions.length === 0) return;
    setRefreshing(true);
    const updated = await Promise.all(
      portfolio.positions.map(async pos => {
        try {
          const r = await fetch(`/api/quote?symbol=${pos.symbol}`);
          const d = await r.json();
          return { ...pos, currentPrice: d.quote?.c ?? pos.currentPrice, lastUpdated: Date.now() };
        } catch {
          return pos;
        }
      })
    );
    const newState = { ...portfolio, positions: updated };
    saveState(newState);
    setPortfolio(newState);
    setRefreshing(false);
  }, [portfolio]);

  const reset = () => {
    const fresh: PortfolioState = { cash: STARTING_CASH, positions: [], trades: [], createdAt: Date.now() };
    saveState(fresh);
    setPortfolio(fresh);
    setConfirmReset(false);
  };

  if (!portfolio) {
    return (
      <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 24, height: 24, border: "2px solid #111827", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Calculations
  const positionsValue = portfolio.positions.reduce((s, p) => s + p.shares * p.currentPrice, 0);
  const totalValue     = portfolio.cash + positionsValue;
  const totalPnL       = totalValue - STARTING_CASH;
  const totalPnLPct    = (totalPnL / STARTING_CASH) * 100;
  const cashPct        = (portfolio.cash / totalValue) * 100;

  // Sector breakdown
  const sectors: Record<string, number> = {};
  for (const pos of portfolio.positions) {
    sectors[pos.sector] = (sectors[pos.sector] ?? 0) + pos.shares * pos.currentPrice;
  }

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif", background: "#f9fafb", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} input,button{font-family:inherit}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 4 }}>Paper Trading</p>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: "-0.04em" }}>Mein Portfolio</h1>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Virtuelles Kapital · Kein echtes Geld · Kein Anlageberatung</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={refreshPrices} disabled={refreshing}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, background: "#fff", border: "1px solid #e5e7eb", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#374151" }}>
              <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              Kurse aktualisieren
            </button>
            <button onClick={() => setTradeOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, background: "#111827", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff" }}>
              <Plus size={14} />
              Order aufgeben
            </button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Gesamtwert",       value: fEur(totalValue),      sub: "Portfolio + Cash",    color: "#111827",  icon: BarChart2 },
            { label: "Verfügbares Cash", value: fEur(portfolio.cash),  sub: `${cashPct.toFixed(1)}% des Portfolios`, color: "#374151", icon: DollarSign },
            { label: "Investiert",       value: fEur(positionsValue),  sub: `${portfolio.positions.length} Positionen`, color: "#374151", icon: Target },
            { label: "Gesamt P&L",       value: fEur(totalPnL),        sub: fPct(totalPnLPct),     color: totalPnL >= 0 ? "#10b981" : "#dc2626", icon: totalPnL >= 0 ? TrendingUp : TrendingDown },
          ].map(k => (
            <Card key={k.label} style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>{k.label}</span>
                <k.icon size={14} color="#d1d5db" />
              </div>
              <p style={{ fontSize: 20, fontWeight: 900, color: k.color, letterSpacing: "-0.03em" }}>{k.value}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{k.sub}</p>
            </Card>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, marginBottom: 20 }}>

          {/* POSITIONS TABLE */}
          <Card style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em" }}>Offene Positionen</p>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{portfolio.positions.length} Titel</span>
            </div>
            {portfolio.positions.length === 0 ? (
              <div style={{ padding: "40px 24px", textAlign: "center" }}>
                <BarChart2 size={28} color="#d1d5db" style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 8 }}>Noch keine Positionen</p>
                <button onClick={() => setTradeOpen(true)}
                  style={{ padding: "9px 18px", borderRadius: 9, background: "#111827", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Erste Order aufgeben
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Aktie", "Stück", "Ø Kaufkurs", "Kurs aktuell", "Wert", "P&L", "P&L %", ""].map(h => (
                        <th key={h} style={{ padding: "8px 14px", fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "right", whiteSpace: "nowrap" }}
                          {...(h === "Aktie" ? { style: { padding: "8px 14px", fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "left" } } : {})}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.positions.map((pos, i) => {
                      const pnl    = (pos.currentPrice - pos.avgBuyPrice) * pos.shares;
                      const pnlPct = ((pos.currentPrice - pos.avgBuyPrice) / pos.avgBuyPrice) * 100;
                      const up     = pnl >= 0;
                      return (
                        <tr key={pos.symbol} style={{ borderTop: "1px solid #f9fafb" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td style={{ padding: "11px 14px" }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{pos.symbol}</p>
                            <p style={{ fontSize: 11, color: "#9ca3af" }}>{pos.name.slice(0, 20)}</p>
                          </td>
                          <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#374151" }}>{pos.shares}</td>
                          <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>{formatPrice(pos.avgBuyPrice, pos.currency)}</td>
                          <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#111827", fontVariantNumeric: "tabular-nums" }}>{formatPrice(pos.currentPrice, pos.currency)}</td>
                          <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#111827", fontVariantNumeric: "tabular-nums" }}>{formatPrice(pos.shares * pos.currentPrice, pos.currency)}</td>
                          <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: up ? "#10b981" : "#dc2626", fontVariantNumeric: "tabular-nums" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
                              {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {formatPrice(Math.abs(pnl), pos.currency)}
                            </div>
                          </td>
                          <td style={{ padding: "11px 14px", textAlign: "right", fontSize: 12, fontWeight: 700, color: up ? "#10b981" : "#dc2626" }}>{fPct(pnlPct)}</td>
                          <td style={{ padding: "11px 14px", textAlign: "right" }}>
                            <button onClick={() => {/* TODO: quick sell */}}
                              style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, color: "#9ca3af", fontFamily: "inherit" }}>
                              Verkauf
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* SIDEBAR: Sector + Recent Trades */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Sector breakdown */}
            <Card style={{ padding: "16px 18px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Sektoren</p>
              {Object.keys(sectors).length === 0 ? (
                <p style={{ fontSize: 12, color: "#d1d5db", textAlign: "center", padding: "16px 0" }}>Keine Positionen</p>
              ) : Object.entries(sectors).sort((a, b) => b[1] - a[1]).map(([sec, val]) => {
                const pct = (val / positionsValue) * 100;
                return (
                  <div key={sec} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "#374151" }}>{sec}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 4, background: "#f3f4f6", borderRadius: 4 }}>
                      <div style={{ height: 4, background: "#111827", borderRadius: 4, width: `${pct}%`, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* Recent trades */}
            <Card style={{ padding: "16px 18px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Letzte Trades</p>
              {portfolio.trades.length === 0 ? (
                <p style={{ fontSize: 12, color: "#d1d5db", textAlign: "center", padding: "12px 0" }}>Noch keine Trades</p>
              ) : portfolio.trades.slice(0, 6).map(t => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f9fafb" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: t.type === "BUY" ? "#f0fdf4" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {t.type === "BUY" ? <ArrowUpRight size={11} color="#10b981" /> : <ArrowDownRight size={11} color="#dc2626" />}
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{t.symbol}</p>
                      <p style={{ fontSize: 10, color: "#9ca3af" }}>{t.shares} Stk.</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{formatPrice(t.total, t.currency)}</p>
                    <p style={{ fontSize: 10, color: "#9ca3af" }}>{new Date(t.timestamp).toLocaleDateString("de-DE")}</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>

        {/* METRIO PORTFOLIO CHAT */}
        <MetrioPortfolioChat portfolio={portfolio} />

        {/* RESET */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#d1d5db", fontFamily: "inherit" }}>
              Portfolio zurücksetzen (25.000 € neu starten)
            </button>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <p style={{ fontSize: 12, color: "#dc2626" }}>Wirklich zurücksetzen?</p>
              <button onClick={reset} style={{ padding: "6px 12px", borderRadius: 7, background: "#dc2626", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Ja, zurücksetzen</button>
              <button onClick={() => setConfirmReset(false)} style={{ padding: "6px 12px", borderRadius: 7, background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Abbrechen</button>
            </div>
          )}
        </div>
      </div>

      {tradeOpen && (
        <TradeWidget portfolio={portfolio} onTrade={setPortfolio} onClose={() => setTradeOpen(false)} />
      )}
    </div>
  );
}
