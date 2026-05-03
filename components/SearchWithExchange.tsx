"use client";
// ═══════════════════════════════════════════════════════════════════
// SearchWithExchange.tsx
// The core search component that disambiguates stocks by exchange.
// When "DTE" is typed → shows both [Deutsche Telekom · XETRA] and
// [DTE Energy · NYSE] in the dropdown. User picks; state stores both.
// ═══════════════════════════════════════════════════════════════════

import {
  useState, useEffect, useRef, useCallback, KeyboardEvent,
} from "react";
import { Search, Loader, ChevronRight, Globe } from "lucide-react";
import {
  searchRegistry, resolveEntry, EXCHANGES, StockEntry, MIC,
} from "@/lib/exchange-registry";

// ─────────────────────────────────────────────────────────────────
// SELECTED STOCK TYPE — what gets emitted to the parent
// ─────────────────────────────────────────────────────────────────
export interface SelectedStock {
  symbol:      string;   // bare ticker, e.g. "DTE"
  exchange:    MIC;      // "XETRA"
  fetchSymbol: string;   // "DTE.DE" → Yahoo / Finnhub
  tvSymbol:    string;   // "XETR:DTE" → TradingView
  name:        string;
  currency:    string;
  sector:      string;
}

export function stockEntryToSelected(e: StockEntry): SelectedStock {
  return {
    symbol:      e.symbol,
    exchange:    e.exchange,
    fetchSymbol: e.fetchSymbol,
    tvSymbol:    e.tvSymbol,
    name:        e.name,
    currency:    EXCHANGES[e.exchange].currency,
    sector:      e.sector,
  };
}

// ─────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────
interface Props {
  /** Called when user selects a stock with an exchange */
  onSelect: (stock: SelectedStock) => void;
  /** If true, render the large hero variant */
  large?: boolean;
  /** Optional placeholder override */
  placeholder?: string;
  /** If set, shows a small badge next to the input */
  currentStock?: SelectedStock | null;
}

// ─────────────────────────────────────────────────────────────────
// EXCHANGE BADGE
// ─────────────────────────────────────────────────────────────────
function ExchangeBadge({ mic, size = "sm" }: { mic: MIC; size?: "sm" | "xs" }) {
  const ex = EXCHANGES[mic];
  const fs = size === "sm" ? 10 : 9;
  return (
    <span style={{
      display:        "inline-flex",
      alignItems:     "center",
      gap:            3,
      fontSize:       fs,
      fontWeight:     700,
      color:          mic === "XETRA" ? "#2563eb"
                    : mic === "NASDAQ" ? "#7c3aed"
                    : mic === "NYSE"   ? "#059669"
                    : mic === "LSE"    ? "#dc2626"
                    : mic === "SIX"    ? "#d97706"
                    : "#6b7280",
      background:     mic === "XETRA" ? "rgba(37,99,235,0.08)"
                    : mic === "NASDAQ" ? "rgba(124,58,237,0.08)"
                    : mic === "NYSE"   ? "rgba(5,150,105,0.08)"
                    : mic === "LSE"    ? "rgba(220,38,38,0.08)"
                    : mic === "SIX"    ? "rgba(217,119,6,0.08)"
                    : "rgba(107,114,128,0.08)",
      border:         `1px solid currentColor`,
      borderRadius:   5,
      padding:        size === "sm" ? "2px 6px" : "1px 5px",
      letterSpacing:  "0.04em",
      whiteSpace:     "nowrap" as const,
    }}>
      {ex.country} · {mic}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function SearchWithExchange({
  onSelect, large = false, placeholder, currentStock,
}: Props) {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<StockEntry[]>([]);
  const [open,        setOpen]        = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [apiLoading,  setApiLoading]  = useState(false);
  const [showInspiration, setShowInspiration] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  // ── Inspiration / trending stocks shown on focus before typing
  const INSPIRATION: StockEntry[] = [
    resolveEntry("AAPL", "NASDAQ"),
    resolveEntry("MSFT", "NASDAQ"),
    resolveEntry("ALV", "XETRA"),
    resolveEntry("SAP", "XETRA"),
    resolveEntry("TSLA", "NASDAQ"),
    resolveEntry("SIE", "XETRA"),
    resolveEntry("AMZN", "NASDAQ"),
    resolveEntry("BMW", "XETRA"),
  ];

  // ── Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowInspiration(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Search: instant local + debounced Finnhub API
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setOpen(false); return; }
    setShowInspiration(false);

    // 1. Instant local results from registry (shows immediately, no network)
    const local = searchRegistry(q, 8);
    setResults(local);
    setOpen(local.length > 0);
    setActiveIdx(0);

    // 2. Augment with API search (Finnhub + Yahoo) for unknowns
    const timer = setTimeout(async () => {
      if (q.length < 2) return;
      setApiLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = await res.json();
        const apiResults: StockEntry[] = (data.results ?? [])
          .filter((r: { symbol: string; name: string; exchange?: string }) =>
            !local.find(l => l.symbol === r.symbol && l.exchange === (r.exchange ?? "NASDAQ"))
          )
          .slice(0, 8)
          .map((r: { symbol: string; name: string; exchange?: string }) => {
            const mic: MIC = finnhubExchangeToMIC(r.exchange ?? "");
            const resolved = resolveEntry(r.symbol, mic);
            // Preserve the actual name from the API instead of bare ticker
            if (r.name && r.name !== r.symbol) {
              resolved.name = r.name;
            }
            return resolved;
          });
        if (apiResults.length > 0) {
          setResults(prev => {
            const seen = new Set(prev.map(e => `${e.symbol}:${e.exchange}`));
            const merged = [...prev];
            for (const r of apiResults) {
              if (!seen.has(`${r.symbol}:${r.exchange}`)) merged.push(r);
            }
            return merged.slice(0, 12);
          });
          setOpen(true);
        }
      } catch { /* ignore */ }
      setApiLoading(false);
    }, 320);

    return () => clearTimeout(timer);
  }, [query]);

  // ── Select a result
  const handleSelect = useCallback((entry: StockEntry) => {
    setQuery("");
    setOpen(false);
    setResults([]);
    onSelect(stockEntryToSelected(entry));
  }, [onSelect]);

  // ── Keyboard navigation
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === "Enter" && query.trim()) {
        // Try to resolve as-is
        const first = results[0];
        if (first) handleSelect(first);
        else {
          const fallback = resolveEntry(query.trim());
          handleSelect(fallback);
        }
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // ── Sizes
  const h       = large ? 56 : 42;
  const fs      = large ? 15 : 13;
  const iconSz  = large ? 18 : 15;
  const btnPad  = large ? "0 22px" : "0 14px";
  const ph      = placeholder ?? (large
    ? "Aktie suchen — BMW, Apple, Tesla… Exchange wird automatisch erkannt"
    : "Aktie suchen…");

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width:    "100%",
        maxWidth: large ? 640 : 480,
      }}
    >
      {/* ── INPUT ROW ── */}
      <div style={{
        display:    "flex",
        alignItems: "center",
        height:     h,
        background: "var(--am-input-bg)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        border:     `1px solid var(--am-border)`,
        borderRadius: large ? 14 : 10,
        boxShadow:  large ? "var(--am-shadow-lg)" : "var(--am-shadow)",
        overflow:   "hidden",
      }}>
        {/* Search icon / spinner */}
        <div style={{ padding: large ? "0 16px" : "0 12px", flexShrink: 0, display: "flex", alignItems: "center", color: "var(--am-text-muted)" }}>
          {apiLoading
            ? <Loader size={iconSz} style={{ animation: "spin 1s linear infinite", display: "block" }} />
            : <Search size={iconSz} />}
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
            else setShowInspiration(true);
          }}
          onClick={() => {
            if (!query.trim()) setShowInspiration(true);
          }}
          placeholder={ph}
          // EPIC 6: NO autoFocus — prevents page jump
          autoFocus={false}
          autoComplete="off"
          spellCheck={false}
          style={{
            flex:       1,
            height:     "100%",
            background: "transparent",
            border:     "none",
            outline:    "none",
            fontSize:   fs,
            color:      "var(--am-text)",
            fontFamily: "inherit",
            padding:    "0 4px",
          }}
        />

        {/* Current stock badge (optional) */}
        {currentStock && !query && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "0 10px", flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
              {currentStock.symbol}
            </span>
            <ExchangeBadge mic={currentStock.exchange} size="xs" />
          </div>
        )}

        {/* Analyse button — glass, centered text */}
        <button
          onClick={() => {
            const top = results[0];
            if (top) handleSelect(top);
            else if (query.trim()) handleSelect(resolveEntry(query.trim()));
          }}
          style={{
            display:    "flex",
            alignItems: "center",
            justifyContent: "center",
            height:     "100%",
            padding:    btnPad,
            background: "var(--am-accent)",
            color:      "var(--am-accent-text)",
            border:     "none",
            borderLeft: "1px solid var(--am-border)",
            fontSize:   large ? 14 : 13,
            fontWeight: 700,
            cursor:     "pointer",
            fontFamily: "inherit",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            flexShrink: 0,
            lineHeight: 1,
            transition: "background 0.2s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--am-accent-hover)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--am-accent)"; }}
        >
          Analysieren
        </button>
      </div>

      {/* ── INSPIRATION DROPDOWN (shown on focus, before typing) ── */}
      {showInspiration && !open && !query.trim() && (
        <div style={{
          position:   "absolute",
          top:        "calc(100% + 6px)",
          left:       0,
          right:      0,
          background: "var(--am-card)",
          backdropFilter: "blur(32px) saturate(160%)",
          WebkitBackdropFilter: "blur(32px) saturate(160%)",
          border:     "1px solid var(--am-border)",
          borderRadius: 12,
          boxShadow:  "var(--am-shadow-lg)",
          zIndex:     9999,
          overflow:   "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 14px", borderBottom: "1px solid var(--am-border-light)",
            background: "var(--am-card-soft)",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--am-text-muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Beliebte Aktien</span>
          </div>
          {INSPIRATION.map((r, i) => (
            <button
              key={`${r.symbol}:${r.exchange}`}
              onClick={() => { setShowInspiration(false); handleSelect(r); }}
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                width:          "100%",
                padding:        "10px 16px",
                background:     "transparent",
                border:         "none",
                borderBottom:   i < INSPIRATION.length - 1 ? "1px solid var(--am-border-light)" : "none",
                cursor:         "pointer",
                fontFamily:     "inherit",
                gap:            12,
                textAlign:      "left" as const,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--am-card-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--am-text)" }}>{r.name}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--am-text-secondary)" }}>{r.symbol}</span>
                <ExchangeBadge mic={r.exchange} size="xs" />
                <ChevronRight size={13} color="var(--am-text-ghost)" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── DROPDOWN ── */}
      {open && results.length > 0 && (
        <div style={{
          position:   "absolute",
          top:        "calc(100% + 6px)",
          left:       0,
          right:      0,
          background: "var(--am-card)",
          backdropFilter: "blur(32px) saturate(160%)",
          WebkitBackdropFilter: "blur(32px) saturate(160%)",
          border:     "1px solid var(--am-border)",
          borderRadius: 12,
          boxShadow:  "var(--am-shadow-lg)",
          zIndex:     9999,
          overflow:   "hidden",
        }}>
          {/* Exchange disambiguation notice when multiple exchanges for same symbol */}
          {hasAmbiguity(results) && (
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        8,
              padding:    "8px 14px",
              background: "var(--am-amber-bg)",
              borderBottom: "1px solid var(--am-border)",
            }}>
              <Globe size={12} color="var(--am-amber-text)" />
              <span style={{ fontSize: 11, color: "var(--am-amber-text)", fontWeight: 600 }}>
                Mehrere Börsen gefunden — bitte Exchange wählen
              </span>
            </div>
          )}

          {results.map((r, i) => (
            <button
              key={`${r.symbol}:${r.exchange}`}
              onClick={() => handleSelect(r)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                width:          "100%",
                padding:        "11px 16px",
                background:     i === activeIdx ? "var(--am-card-hover)" : "transparent",
                border:         "none",
                borderBottom:   i < results.length - 1 ? "1px solid var(--am-border-light)" : "none",
                cursor:         "pointer",
                fontFamily:     "inherit",
                gap:            12,
                textAlign:      "left" as const,
              }}
            >
              {/* Left: symbol + name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--am-text)" }}>
                    {r.symbol}
                  </span>
                  <ExchangeBadge mic={r.exchange} />
                </div>
                <span style={{
                  fontSize:     11,
                  color:        "var(--am-text-muted)",
                  display:      "block",
                  overflow:     "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace:   "nowrap",
                }}>
                  {r.name}
                </span>
              </div>

              {/* Right: sector + currency + arrow */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{
                  fontSize: 10, color: "var(--am-text-faint)",
                  background: "var(--am-card-hover)", padding: "2px 7px",
                  borderRadius: 5,
                }}>
                  {r.sector}
                </span>
                <span style={{
                  fontSize: 10, color: "var(--am-text-muted)",
                  background: "var(--am-card-soft)", padding: "2px 6px",
                  borderRadius: 5, fontWeight: 700,
                }}>
                  {EXCHANGES[r.exchange].currency}
                </span>
                <ChevronRight size={13} color="var(--am-text-ghost)" />
              </div>
            </button>
          ))}

          {/* Footer hint */}
          <div style={{
            padding:    "7px 14px",
            background: "var(--am-card-soft)",
            borderTop:  "1px solid var(--am-border-light)",
          }}>
            <span style={{ fontSize: 10, color: "var(--am-text-faint)" }}>
              ↑↓ navigieren · Enter bestätigen · Esc schließen
            </span>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function hasAmbiguity(results: StockEntry[]): boolean {
  const syms = results.map(r => r.symbol);
  return syms.length !== new Set(syms).size;
}

function finnhubExchangeToMIC(finnhubExchange: string): MIC {
  const e = finnhubExchange.toUpperCase();
  if (e.includes("XETRA") || e.includes("XETR") || e.includes("GER") || e.includes("FRA")) return "XETRA";
  if (e.includes("NASDAQ") || e.includes("NAS") || e.includes("NGM") || e.includes("NMS")) return "NASDAQ";
  if (e.includes("NYSE") || e.includes("NYQ") || e.includes("NYS")) return "NYSE";
  if (e.includes("LSE") || e.includes("LON")) return "LSE";
  if (e.includes("EURONEXT") || e.includes("PAR") || e.includes("EPA") || e.includes("AMS")) return "EURONEXT";
  if (e.includes("SIX") || e.includes("ZUR") || e.includes("SWX") || e.includes("VTX")) return "SIX";
  if (e.includes("TSX") || e.includes("TOR") || e.includes("TSE")) return "TSX";
  if (e.includes("HKEX") || e.includes("HKG")) return "OTHER";
  return "NASDAQ"; // safe default for US stocks
}

// ─────────────────────────────────────────────────────────────────
// RE-EXPORT for convenience
// ─────────────────────────────────────────────────────────────────
export { ExchangeBadge };
