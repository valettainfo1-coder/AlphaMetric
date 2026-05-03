"use client";
// ═══════════════════════════════════════════════════════════════════
// MARKET TICKER — sticky live marquee directly below the header.
// On mount: pulls REAL prices from /api/quote so the ticker matches
// the hero stats (was previously hard-coded; led to BTC reading 67k
// in the ticker but 77k in the hero — credibility-killer). After
// hydration the values "breathe" with small drift around the real
// anchor, keeping the marquee animated without lying.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";

type Tick = {
  symbol: string;
  label: string;
  base: number;
  vola: number;     // amplitude per tick
  prefix?: string;  // "$", "€", ""
  suffix?: string;  // "%", "pts"
  digits: number;
  /** Yahoo / Finnhub fetch symbol for /api/quote. Empty = no live fetch. */
  fetchSymbol?: string;
};

const SEED: Tick[] = [
  { symbol: "DAX",     label: "DAX",         base: 18234.55, vola: 6.4,   digits: 2,                 fetchSymbol: "^GDAXI" },
  { symbol: "SPX",     label: "S&P 500",     base: 5187.40,  vola: 1.8,   digits: 2,                 fetchSymbol: "^GSPC" },
  { symbol: "NDX",     label: "NASDAQ 100",  base: 18742.10, vola: 9.2,   digits: 2,                 fetchSymbol: "^NDX" },
  { symbol: "DJI",     label: "Dow Jones",   base: 39512.20, vola: 12.0,  digits: 2,                 fetchSymbol: "^DJI" },
  { symbol: "FTSE",    label: "FTSE 100",    base: 8120.55,  vola: 3.1,   digits: 2,                 fetchSymbol: "^FTSE" },
  { symbol: "N225",    label: "Nikkei 225",  base: 38760.40, vola: 22.0,  digits: 2,                 fetchSymbol: "^N225" },
  { symbol: "US10Y",   label: "US 10Y",      base: 4.318,    vola: 0.012, digits: 3, suffix: "%",    fetchSymbol: "^TNX" },
  { symbol: "DE10Y",   label: "DE 10Y",      base: 2.412,    vola: 0.010, digits: 3, suffix: "%" },
  { symbol: "GOLD",    label: "Gold",        base: 2348.20,  vola: 1.4,   digits: 2, prefix: "$",    fetchSymbol: "GC=F" },
  { symbol: "BRENT",   label: "Brent",       base: 84.10,    vola: 0.18,  digits: 2, prefix: "$",    fetchSymbol: "BZ=F" },
  { symbol: "EURUSD",  label: "EUR/USD",     base: 1.0834,   vola: 0.0009, digits: 4,                fetchSymbol: "EURUSD=X" },
  { symbol: "BTC",     label: "Bitcoin",     base: 67420.00, vola: 95.0,  digits: 0, prefix: "$",    fetchSymbol: "BTC-USD" },
  { symbol: "ETH",     label: "Ethereum",    base: 3284.50,  vola: 5.6,   digits: 2, prefix: "$",    fetchSymbol: "ETH-USD" },
];

type State = { val: number; prev: number; pct: number; flash: "up" | "down" | null };

function fmtNumber(n: number, digits: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function MarketTicker() {
  // Anchors hold the live "true" price for each instrument; updated once
  // on mount from /api/quote. The displayed value drifts ±vola around
  // the anchor every ~1.1s (animated marquee feel without lying).
  const [anchors, setAnchors] = useState<number[]>(() => SEED.map(s => s.base));
  const [states, setStates] = useState<State[]>(() =>
    SEED.map(s => ({ val: s.base, prev: s.base, pct: 0, flash: null }))
  );
  const intervalRef = useRef<number | null>(null);

  // ── 1) On mount: fetch real anchor prices for every SEED with fetchSymbol
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    (async () => {
      const results = await Promise.all(
        SEED.map(async (s) => {
          if (!s.fetchSymbol) return null;
          try {
            const r = await fetch(`/api/quote?symbol=${encodeURIComponent(s.fetchSymbol)}`, {
              cache: "no-store",
              signal: ctrl.signal,
            });
            if (!r.ok) return null;
            const j = await r.json();
            const price = j?.quote?.c;
            return typeof price === "number" && isFinite(price) && price > 0 ? price : null;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      setAnchors(prev => prev.map((a, i) => results[i] ?? a));
      // Snap displayed values to the new anchors so we don't drift away
      // from real prices visibly.
      setStates(prev =>
        prev.map((s, i) => {
          const next = results[i] ?? s.val;
          return { val: next, prev: s.val, pct: 0, flash: null };
        })
      );
    })();
    return () => { cancelled = true; ctrl.abort(); };
  }, []);

  // ── 2) Drift loop — breathe values around their (possibly-real) anchor
  useEffect(() => {
    const tick = () => {
      setStates(prev =>
        prev.map((s, i) => {
          const seed = SEED[i];
          const anchor = anchors[i] ?? seed.base;
          const drift = (Math.random() - 0.49) * seed.vola;
          // Pull value softly toward the anchor so it doesn't wander off
          const meanRevert = (anchor - s.val) * 0.04;
          const next = Math.max(anchor * 0.6, s.val + drift + meanRevert);
          const pct = ((next - anchor) / anchor) * 100;
          const flash: State["flash"] = next > s.val ? "up" : next < s.val ? "down" : null;
          return { val: next, prev: s.val, pct, flash };
        })
      );
    };
    intervalRef.current = window.setInterval(tick, 1100);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [anchors]);

  // Doubled list for seamless marquee loop
  const items = [...SEED.map((s, i) => ({ s, st: states[i] })), ...SEED.map((s, i) => ({ s, st: states[i] }))];

  return (
    <div className="am-ticker" aria-hidden="true">
      <div className="am-ticker__rail">
        <div className="am-ticker__track">
          {items.map(({ s, st }, idx) => {
            const up = st.pct >= 0;
            const flashClass = st.flash === "up" ? "is-flash-up" : st.flash === "down" ? "is-flash-down" : "";
            return (
              <span key={`${s.symbol}-${idx}`} className={`am-ticker__cell ${flashClass}`}>
                <span className="am-ticker__sym">{s.label}</span>
                <span className="am-ticker__val">
                  {s.prefix}{fmtNumber(st.val, s.digits)}{s.suffix}
                </span>
                <span className={`am-ticker__pct ${up ? "is-up" : "is-down"}`}>
                  {up ? "▲" : "▼"} {Math.abs(st.pct).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
