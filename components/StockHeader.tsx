"use client";
// components/StockHeader.tsx
// ─────────────────────────────────────────────────────────────────
// STOCK HEADER — displays the stock price + TradingView chart
// with PERFECTLY SYNCHRONIZED symbols.
//
// THE FIX:
//   The API response includes both:
//     tvSymbol      = "XETR:ALV"  → passed directly to TradingView widget
//     currency      = "EUR"       → used for price formatting
//     displaySymbol = "ALV"       → shown in the UI header
//
//   The price shown at the top of this component comes from the SAME
//   API call that determined the tvSymbol. Therefore, the static price
//   and the TradingView chart ALWAYS show the same underlying asset
//   on the same exchange in the same currency.
//
//   BEFORE FIX: "DTE" → API returns US company DTE Energy ($125 USD)
//               TradingView guesses XETR:DTE → shows Deutsche Telekom (€28 EUR)
//               MISMATCH: $125 ≠ €28
//
//   AFTER FIX:  "DTE" → resolveWithFallback → apiFetch="DTE.DE" → API returns €28 EUR
//               tvSymbol="XETR:DTE" → TradingView shows Deutsche Telekom €28 EUR
//               MATCH: €28 = €28 ✓
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Star, ExternalLink } from "lucide-react";
import {
  resolveWithFallback,
  formatPrice,
  type TickerEntry,
} from "@/utils/tickerResolution";

// ─── TYPES ───────────────────────────────────────────────────────
interface StockData {
  quote: {
    c: number;   // current price
    d: number;   // change
    dp: number;  // change percent
    h: number;   // day high
    l: number;   // day low
    o: number;   // open
    pc: number;  // previous close
  };
  profile: {
    name: string;
    currency: string;
    exchange: string;
    finnhubIndustry?: string;
    logo?: string;
    country?: string;
  };
  tvSymbol: string;       // XETR:ALV or NASDAQ:AAPL — for TradingView
  displaySymbol: string;  // ALV or AAPL — for UI display
  exchange: string;       // XETRA or NASDAQ
  currency: string;       // EUR or USD
  region?: string;        // DE or US
  dataSource: string;     // "finnhub" or "yahoo"
}

interface StockHeaderProps {
  symbol: string;  // Raw user input: "ALV", "allianz", "ALV.DE", "XETR:ALV" — all work
}

// ─── TRADINGVIEW WIDGET ──────────────────────────────────────────
// Embeds the TradingView Advanced Chart using the EXACT tvSymbol
// from our API response. This ensures the chart shows the same
// asset/exchange as the static price display.
function TradingViewChart({ tvSymbol }: { tvSymbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !tvSymbol) return;

    // Clear any previous widget
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,  // "XETR:ALV" or "NASDAQ:AAPL" — NEVER bare "ALV" or "ALV.DE"
      interval: "D",
      timezone: "Europe/Berlin",
      theme: "light",
      style: "1",
      locale: "de_DE",
      allow_symbol_change: false,  // Lock to our resolved symbol
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tvSymbol]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: 420, width: "100%" }}
    />
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
export default function StockHeader({ symbol }: StockHeaderProps) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve the ticker immediately on the client side
  // so we know what to display while loading
  const ticker: TickerEntry = resolveWithFallback(symbol);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Send the display symbol to our API.
        // The API uses the same resolveWithFallback() to get the correct
        // apiFetch symbol (ALV.DE) for the data source.
        const res = await fetch(`/api/quote?symbol=${encodeURIComponent(ticker.display)}`);
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Kurs nicht verfügbar");
        if (cancelled) return;

        setData(json);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Fehler beim Laden");
      }
      if (!cancelled) setLoading(false);
    }

    fetchData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [ticker.display]);

  // ── LOADING STATE ──────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
        <div style={{ padding: "24px", background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#f3f4f6", animation: "shimmer 1.5s infinite" }} />
            <div>
              <div style={{ width: 120, height: 18, borderRadius: 6, background: "#f3f4f6", marginBottom: 6 }} />
              <div style={{ width: 80, height: 12, borderRadius: 6, background: "#f3f4f6" }} />
            </div>
          </div>
          <div style={{ width: 200, height: 32, borderRadius: 8, background: "#f3f4f6" }} />
        </div>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    );
  }

  // ── ERROR STATE ────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif", padding: "24px", background: "#fef2f2", borderRadius: 14, border: "1px solid #fecaca" }}>
        <p style={{ fontSize: 14, color: "#dc2626", fontWeight: 600 }}>Fehler: {error}</p>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
          Symbol: {ticker.display} → API: {ticker.apiFetch} → TV: {ticker.tradingView}
        </p>
      </div>
    );
  }

  if (!data) return null;

  // ── EXTRACT VALUES ─────────────────────────────────────────────
  const { quote, profile } = data;
  const price    = quote.c;
  const change   = quote.d;
  const changePct = quote.dp;
  const isUp     = change >= 0;

  // CRITICAL: Use the tvSymbol from the API response (which was
  // resolved from the same ticker map). This guarantees the
  // TradingView chart shows the SAME asset as the price display.
  const tvSymbol      = data.tvSymbol;       // "XETR:ALV" or "NASDAQ:AAPL"
  const displaySymbol = data.displaySymbol;  // "ALV" or "AAPL"
  const currency      = data.currency;       // "EUR" or "USD"
  const exchange      = data.exchange;       // "XETRA" or "NASDAQ"

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
      {/* ── PRICE HEADER ───────────────────────────────────────── */}
      <div style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        marginBottom: 16,
        overflow: "hidden",
      }}>
        {/* Top bar: symbol, name, exchange, price */}
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            {/* Left: Symbol + Company info */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {profile.logo && (
                <img
                  src={profile.logo}
                  alt={displaySymbol}
                  style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid #f3f4f6", objectFit: "contain" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111827", letterSpacing: "-0.03em" }}>
                    {displaySymbol}
                  </h2>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#6b7280",
                    background: "#f3f4f6",
                    padding: "2px 7px",
                    borderRadius: 5,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}>
                    {exchange}
                  </span>
                  {/* Currency badge — makes it obvious which currency the price is in */}
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: currency === "EUR" ? "#1d4ed8" : "#047857",
                    background: currency === "EUR" ? "#eff6ff" : "#ecfdf5",
                    padding: "2px 7px",
                    borderRadius: 5,
                  }}>
                    {currency}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                  {profile.name}
                  {profile.finnhubIndustry ? ` · ${profile.finnhubIndustry}` : ""}
                </p>
              </div>
            </div>

            {/* Right: Price + Change */}
            <div style={{ textAlign: "right" }}>
              {/* Main price — formatted with correct currency from our map */}
              <p style={{
                fontSize: 28,
                fontWeight: 900,
                color: "#111827",
                letterSpacing: "-0.04em",
                fontVariantNumeric: "tabular-nums",
              }}>
                {formatPrice(price, currency)}
              </p>

              {/* Change indicator */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                marginTop: 4,
                padding: "3px 10px",
                borderRadius: 7,
                background: isUp ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${isUp ? "#bbf7d0" : "#fecaca"}`,
              }}>
                {isUp ? <TrendingUp size={13} color="#10b981" /> : <TrendingDown size={13} color="#dc2626" />}
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isUp ? "#10b981" : "#dc2626",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {isUp ? "+" : ""}{formatPrice(change, currency)}
                  {" "}
                  ({isUp ? "+" : ""}{changePct.toFixed(2)}%)
                </span>
              </div>

              {/* Data source indicator */}
              <p style={{ fontSize: 10, color: "#d1d5db", marginTop: 6 }}>
                Quelle: {data.dataSource === "yahoo" ? "Yahoo Finance" : "Finnhub"}
                {" · "}TV: {tvSymbol}
              </p>
            </div>
          </div>

          {/* Day stats row */}
          <div style={{
            display: "flex",
            gap: 24,
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid #f3f4f6",
            flexWrap: "wrap",
          }}>
            {[
              { label: "Eröffnung", value: formatPrice(quote.o, currency) },
              { label: "Tageshoch", value: formatPrice(quote.h, currency) },
              { label: "Tagestief", value: formatPrice(quote.l, currency) },
              { label: "Vortag",    value: formatPrice(quote.pc, currency) },
            ].map(stat => (
              <div key={stat.label}>
                <p style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 2 }}>
                  {stat.label}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", fontVariantNumeric: "tabular-nums" }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── TRADINGVIEW CHART ───────────────────────────────── */}
        {/* The tvSymbol is EXACTLY what TradingView needs:
            German stocks: "XETR:ALV" (not "ALV" or "ALV.DE")
            US stocks:     "NASDAQ:AAPL" (not just "AAPL")
            This ensures the chart price matches our static price above. */}
        <div style={{ borderTop: "1px solid #f3f4f6" }}>
          <TradingViewChart tvSymbol={tvSymbol} />
        </div>
      </div>

      {/* Debug info (development only) — proves the sync is correct */}
      {process.env.NODE_ENV === "development" && (
        <div style={{
          padding: "10px 14px",
          background: "#fefce8",
          border: "1px solid #fef08a",
          borderRadius: 8,
          fontSize: 11,
          color: "#854d0e",
          fontFamily: "monospace",
        }}>
          <strong>SYNC DEBUG:</strong>{" "}
          Input: "{symbol}" →
          Display: "{displaySymbol}" →
          API: "{ticker.apiFetch}" →
          TV: "{tvSymbol}" →
          Currency: {currency} →
          Price: {formatPrice(price, currency)}
        </div>
      )}
    </div>
  );
}
