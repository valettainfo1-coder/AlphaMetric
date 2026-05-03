// utils/exchangeMapper.ts
// ─────────────────────────────────────────────────────────────────
// TICKER TRANSLATION LAYER (Epic 1)
//
// Given a bare ticker + exchange, produces:
//   1. fetchSymbol  — for Yahoo/Finnhub (e.g. "ALV.DE")
//   2. tvSymbol     — for TradingView   (e.g. "XETR:ALV")
//   3. currency     — for price display  (e.g. "EUR")
//
// This is the bridge between the exchange-registry (which stores
// precomputed symbols) and the legacy tickerResolution (which
// does fuzzy name matching). New code should use exchange-registry
// directly; this file provides backward-compatible helpers.
// ─────────────────────────────────────────────────────────────────

import {
  resolveEntry,
  searchRegistry,
  EXCHANGES,
  type StockEntry,
  type MIC,
} from "@/lib/exchange-registry";

export interface ResolvedTicker {
  symbol:      string;   // bare ticker: "ALV"
  fetchSymbol: string;   // Yahoo/Finnhub: "ALV.DE"
  tvSymbol:    string;   // TradingView: "XETR:ALV"
  currency:    string;   // "EUR"
  exchange:    MIC;      // "XETRA"
  name:        string;   // "Allianz SE"
  sector:      string;   // "Finance"
}

/**
 * Resolve a ticker with an explicit exchange.
 * This is the PRIMARY function for multi-exchange disambiguation.
 *
 * Example:
 *   resolveTickerWithExchange("ALV", "XETRA")
 *     → { fetchSymbol: "ALV.DE", tvSymbol: "XETR:ALV", currency: "EUR" }
 *
 *   resolveTickerWithExchange("DTE", "NYSE")
 *     → { fetchSymbol: "DTE", tvSymbol: "NYSE:DTE", currency: "USD" }
 *
 *   resolveTickerWithExchange("DTE", "XETRA")
 *     → { fetchSymbol: "DTE.DE", tvSymbol: "XETR:DTE", currency: "EUR" }
 */
export function resolveTickerWithExchange(symbol: string, exchange: MIC): ResolvedTicker {
  const entry = resolveEntry(symbol, exchange);
  return entryToResolved(entry);
}

/**
 * Resolve a bare ticker without explicit exchange.
 * Uses the exchange-registry's best-guess logic.
 * For ambiguous tickers (DTE, MRK), defaults to the first match in the registry.
 */
export function resolveTickerBare(symbol: string): ResolvedTicker {
  const entry = resolveEntry(symbol);
  return entryToResolved(entry);
}

/**
 * Search for tickers across all exchanges.
 * Returns all matching entries, disambiguated by exchange.
 */
export function searchTickersMultiExchange(query: string, limit = 8): ResolvedTicker[] {
  return searchRegistry(query, limit).map(entryToResolved);
}

function entryToResolved(e: StockEntry): ResolvedTicker {
  return {
    symbol:      e.symbol,
    fetchSymbol: e.fetchSymbol,
    tvSymbol:    e.tvSymbol,
    currency:    EXCHANGES[e.exchange].currency,
    exchange:    e.exchange,
    name:        e.name,
    sector:      e.sector,
  };
}

/**
 * Homepage pill routing map.
 * Each pill routes to the correct exchange.
 * `country` is the 2-letter ISO code shown on the pill badge (no flags).
 */
export const HOMEPAGE_PILLS: { label: string; symbol: string; exchange: MIC; country: string }[] = [
  // — Germany (XETRA, DAX heavyweights)
  { label: "SAP",            symbol: "SAP",   exchange: "XETRA",    country: "DE" },
  { label: "Siemens",        symbol: "SIE",   exchange: "XETRA",    country: "DE" },
  { label: "Allianz",        symbol: "ALV",   exchange: "XETRA",    country: "DE" },
  // — USA (NASDAQ + NYSE heavyweights)
  { label: "Apple",          symbol: "AAPL",  exchange: "NASDAQ",   country: "US" },
  { label: "NVIDIA",         symbol: "NVDA",  exchange: "NASDAQ",   country: "US" },
  { label: "Microsoft",      symbol: "MSFT",  exchange: "NASDAQ",   country: "US" },
  { label: "Tesla",          symbol: "TSLA",  exchange: "NASDAQ",   country: "US" },
  // — Europe (broad mix)
  { label: "LVMH",           symbol: "MC",    exchange: "EURONEXT", country: "FR" },
  { label: "ASML",           symbol: "ASML",  exchange: "NASDAQ",   country: "NL" },
  { label: "Nestlé",         symbol: "NESN",  exchange: "SIX",      country: "CH" },
];
