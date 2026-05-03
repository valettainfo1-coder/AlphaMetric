// utils/tickerResolution.ts
// ─────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for all ticker translation.
//
// THE BUG THIS FIXES:
//   API "ALV"     → Autoliv Inc (NYSE OTC ADR)     ← WRONG
//   API "ALV.DE"  → Allianz SE (XETRA, priced EUR) ← CORRECT
//   TV  "ALV"     → auto-guesses, unreliable        ← WRONG
//   TV  "ALV.DE"  → FAILS (TV doesn't understand .DE)
//   TV  "XETR:ALV"→ Allianz SE on XETRA             ← CORRECT
//
// RULE: German stocks → API gets .DE suffix, TradingView gets XETR: prefix.
//       US stocks     → API gets bare ticker, TradingView gets NASDAQ:/NYSE: prefix.
// ─────────────────────────────────────────────────────────────────

export interface TickerEntry {
  /** Display symbol used in UI and stored in app state */
  display: string;
  /** Symbol for data-fetching APIs (Yahoo/Finnhub) — .DE suffix for XETRA stocks */
  apiFetch: string;
  /** TradingView widget symbol — XETR: prefix for XETRA, NASDAQ:/NYSE: for US */
  tradingView: string;
  /** ISO 4217 currency code */
  currency: "EUR" | "USD" | "GBP" | "CHF";
  /** Exchange display name */
  exchange: string;
  /** Full company name */
  name: string;
  /** Sector for portfolio diversification */
  sector: string;
  /** Region tag */
  region: "DE" | "US" | "OTHER";
}

// ─── MASTER TICKER TABLE ─────────────────────────────────────────
// Every row is hand-verified against Yahoo Finance AND TradingView:
//   display     = what we store, show, and route with
//   apiFetch    = what we send to Yahoo Finance / data APIs (ALV.DE)
//   tradingView = what we pass to TradingView widget (XETR:ALV)
//
const TICKER_TABLE: TickerEntry[] = [
  // ── DAX 40 — XETRA ────────────────────────────────────────────
  { display: "ALV",  apiFetch: "ALV.DE",  tradingView: "XETR:ALV",  currency: "EUR", exchange: "XETRA", name: "Allianz SE",                 sector: "Insurance",    region: "DE" },
  { display: "BMW",  apiFetch: "BMW.DE",  tradingView: "XETR:BMW",  currency: "EUR", exchange: "XETRA", name: "BMW AG",                     sector: "Automobile",   region: "DE" },
  { display: "SAP",  apiFetch: "SAP.DE",  tradingView: "XETR:SAP",  currency: "EUR", exchange: "XETRA", name: "SAP SE",                     sector: "Technology",   region: "DE" },
  { display: "DTE",  apiFetch: "DTE.DE",  tradingView: "XETR:DTE",  currency: "EUR", exchange: "XETRA", name: "Deutsche Telekom AG",        sector: "Telecom",      region: "DE" },
  { display: "DBK",  apiFetch: "DBK.DE",  tradingView: "XETR:DBK",  currency: "EUR", exchange: "XETRA", name: "Deutsche Bank AG",           sector: "Banking",      region: "DE" },
  { display: "SIE",  apiFetch: "SIE.DE",  tradingView: "XETR:SIE",  currency: "EUR", exchange: "XETRA", name: "Siemens AG",                 sector: "Industrials",  region: "DE" },
  { display: "MBG",  apiFetch: "MBG.DE",  tradingView: "XETR:MBG",  currency: "EUR", exchange: "XETRA", name: "Mercedes-Benz Group AG",     sector: "Automobile",   region: "DE" },
  { display: "VOW3", apiFetch: "VOW3.DE", tradingView: "XETR:VOW3", currency: "EUR", exchange: "XETRA", name: "Volkswagen AG",              sector: "Automobile",   region: "DE" },
  { display: "ADS",  apiFetch: "ADS.DE",  tradingView: "XETR:ADS",  currency: "EUR", exchange: "XETRA", name: "Adidas AG",                  sector: "Consumer",     region: "DE" },
  { display: "BAS",  apiFetch: "BAS.DE",  tradingView: "XETR:BAS",  currency: "EUR", exchange: "XETRA", name: "BASF SE",                    sector: "Chemicals",    region: "DE" },
  { display: "BAYN", apiFetch: "BAYN.DE", tradingView: "XETR:BAYN", currency: "EUR", exchange: "XETRA", name: "Bayer AG",                   sector: "Pharma",       region: "DE" },
  { display: "CBK",  apiFetch: "CBK.DE",  tradingView: "XETR:CBK",  currency: "EUR", exchange: "XETRA", name: "Commerzbank AG",             sector: "Banking",      region: "DE" },
  { display: "CON",  apiFetch: "CON.DE",  tradingView: "XETR:CON",  currency: "EUR", exchange: "XETRA", name: "Continental AG",             sector: "Automobile",   region: "DE" },
  { display: "EOAN", apiFetch: "EOAN.DE", tradingView: "XETR:EOAN", currency: "EUR", exchange: "XETRA", name: "E.ON SE",                    sector: "Utilities",    region: "DE" },
  { display: "FRE",  apiFetch: "FRE.DE",  tradingView: "XETR:FRE",  currency: "EUR", exchange: "XETRA", name: "Fresenius SE",               sector: "Healthcare",   region: "DE" },
  { display: "HEN3", apiFetch: "HEN3.DE", tradingView: "XETR:HEN3", currency: "EUR", exchange: "XETRA", name: "Henkel AG",                  sector: "Consumer",     region: "DE" },
  { display: "IFX",  apiFetch: "IFX.DE",  tradingView: "XETR:IFX",  currency: "EUR", exchange: "XETRA", name: "Infineon Technologies AG",   sector: "Technology",   region: "DE" },
  { display: "LHA",  apiFetch: "LHA.DE",  tradingView: "XETR:LHA",  currency: "EUR", exchange: "XETRA", name: "Deutsche Lufthansa AG",      sector: "Transport",    region: "DE" },
  { display: "MRK",  apiFetch: "MRK.DE",  tradingView: "XETR:MRK",  currency: "EUR", exchange: "XETRA", name: "Merck KGaA",                 sector: "Pharma",       region: "DE" },
  { display: "MTX",  apiFetch: "MTX.DE",  tradingView: "XETR:MTX",  currency: "EUR", exchange: "XETRA", name: "MTU Aero Engines AG",        sector: "Aerospace",    region: "DE" },
  { display: "P911", apiFetch: "P911.DE", tradingView: "XETR:P911", currency: "EUR", exchange: "XETRA", name: "Porsche AG",                 sector: "Automobile",   region: "DE" },
  { display: "PUM",  apiFetch: "PUM.DE",  tradingView: "XETR:PUM",  currency: "EUR", exchange: "XETRA", name: "Puma SE",                    sector: "Consumer",     region: "DE" },
  { display: "RWE",  apiFetch: "RWE.DE",  tradingView: "XETR:RWE",  currency: "EUR", exchange: "XETRA", name: "RWE AG",                     sector: "Utilities",    region: "DE" },
  { display: "ZAL",  apiFetch: "ZAL.DE",  tradingView: "XETR:ZAL",  currency: "EUR", exchange: "XETRA", name: "Zalando SE",                 sector: "E-Commerce",   region: "DE" },
  { display: "BEI",  apiFetch: "BEI.DE",  tradingView: "XETR:BEI",  currency: "EUR", exchange: "XETRA", name: "Beiersdorf AG",              sector: "Consumer",     region: "DE" },
  { display: "HEI",  apiFetch: "HEI.DE",  tradingView: "XETR:HEI",  currency: "EUR", exchange: "XETRA", name: "HeidelbergCement AG",        sector: "Construction", region: "DE" },
  { display: "ENR",  apiFetch: "ENR.DE",  tradingView: "XETR:ENR",  currency: "EUR", exchange: "XETRA", name: "Siemens Energy AG",          sector: "Energy",       region: "DE" },
  { display: "DPW",  apiFetch: "DPW.DE",  tradingView: "XETR:DPW",  currency: "EUR", exchange: "XETRA", name: "Deutsche Post AG",           sector: "Logistics",    region: "DE" },
  { display: "VNA",  apiFetch: "VNA.DE",  tradingView: "XETR:VNA",  currency: "EUR", exchange: "XETRA", name: "Vonovia SE",                 sector: "Real Estate",  region: "DE" },
  { display: "DHER", apiFetch: "DHER.DE", tradingView: "XETR:DHER", currency: "EUR", exchange: "XETRA", name: "Delivery Hero SE",           sector: "E-Commerce",   region: "DE" },

  // ── US NASDAQ ──────────────────────────────────────────────────
  { display: "AAPL",  apiFetch: "AAPL",  tradingView: "NASDAQ:AAPL",  currency: "USD", exchange: "NASDAQ", name: "Apple Inc.",              sector: "Technology",  region: "US" },
  { display: "NVDA",  apiFetch: "NVDA",  tradingView: "NASDAQ:NVDA",  currency: "USD", exchange: "NASDAQ", name: "NVIDIA Corporation",      sector: "Technology",  region: "US" },
  { display: "MSFT",  apiFetch: "MSFT",  tradingView: "NASDAQ:MSFT",  currency: "USD", exchange: "NASDAQ", name: "Microsoft Corporation",   sector: "Technology",  region: "US" },
  { display: "AMZN",  apiFetch: "AMZN",  tradingView: "NASDAQ:AMZN",  currency: "USD", exchange: "NASDAQ", name: "Amazon.com Inc.",         sector: "E-Commerce",  region: "US" },
  { display: "TSLA",  apiFetch: "TSLA",  tradingView: "NASDAQ:TSLA",  currency: "USD", exchange: "NASDAQ", name: "Tesla Inc.",              sector: "Automobile",  region: "US" },
  { display: "GOOGL", apiFetch: "GOOGL", tradingView: "NASDAQ:GOOGL", currency: "USD", exchange: "NASDAQ", name: "Alphabet Inc.",           sector: "Technology",  region: "US" },
  { display: "META",  apiFetch: "META",  tradingView: "NASDAQ:META",  currency: "USD", exchange: "NASDAQ", name: "Meta Platforms Inc.",     sector: "Technology",  region: "US" },
  { display: "AMD",   apiFetch: "AMD",   tradingView: "NASDAQ:AMD",   currency: "USD", exchange: "NASDAQ", name: "Advanced Micro Devices", sector: "Technology",  region: "US" },
  { display: "NFLX",  apiFetch: "NFLX",  tradingView: "NASDAQ:NFLX",  currency: "USD", exchange: "NASDAQ", name: "Netflix Inc.",            sector: "Media",       region: "US" },
  { display: "INTC",  apiFetch: "INTC",  tradingView: "NASDAQ:INTC",  currency: "USD", exchange: "NASDAQ", name: "Intel Corporation",       sector: "Technology",  region: "US" },

  // ── US NYSE ────────────────────────────────────────────────────
  { display: "JPM",  apiFetch: "JPM",  tradingView: "NYSE:JPM",  currency: "USD", exchange: "NYSE", name: "JPMorgan Chase & Co.",    sector: "Banking",    region: "US" },
  { display: "V",    apiFetch: "V",    tradingView: "NYSE:V",    currency: "USD", exchange: "NYSE", name: "Visa Inc.",               sector: "Fintech",    region: "US" },
  { display: "MA",   apiFetch: "MA",   tradingView: "NYSE:MA",   currency: "USD", exchange: "NYSE", name: "Mastercard Inc.",         sector: "Fintech",    region: "US" },
  { display: "KO",   apiFetch: "KO",   tradingView: "NYSE:KO",   currency: "USD", exchange: "NYSE", name: "Coca-Cola Company",      sector: "Consumer",   region: "US" },
  { display: "XOM",  apiFetch: "XOM",  tradingView: "NYSE:XOM",  currency: "USD", exchange: "NYSE", name: "Exxon Mobil Corporation", sector: "Energy",    region: "US" },
  { display: "WMT",  apiFetch: "WMT",  tradingView: "NYSE:WMT",  currency: "USD", exchange: "NYSE", name: "Walmart Inc.",            sector: "Retail",    region: "US" },
  { display: "JNJ",  apiFetch: "JNJ",  tradingView: "NYSE:JNJ",  currency: "USD", exchange: "NYSE", name: "Johnson & Johnson",      sector: "Healthcare", region: "US" },
  { display: "GS",   apiFetch: "GS",   tradingView: "NYSE:GS",   currency: "USD", exchange: "NYSE", name: "Goldman Sachs Group",    sector: "Banking",    region: "US" },

  // ── EUROPE (non‑German) ────────────────────────────────────────
  // ASML: Dutch company, trades on Euronext Amsterdam (ASML.AS) and NASDAQ (ASML).
  // TradingView prefers NASDAQ:ASML for ADR‑style clean data; .PA (Paris) also exists as Euronext Paris.
  { display: "ASML", apiFetch: "ASML.AS", tradingView: "AMS:ASML",  currency: "EUR", exchange: "Euronext AMS", name: "ASML Holding N.V.",       sector: "Semiconductors", region: "OTHER" },
  { display: "NVO",  apiFetch: "NVO",     tradingView: "NYSE:NVO",  currency: "USD", exchange: "NYSE",          name: "Novo Nordisk A/S (ADR)",  sector: "Pharma",         region: "OTHER" },
  { display: "LVMH", apiFetch: "MC.PA",   tradingView: "EURONEXT:MC", currency: "EUR", exchange: "Euronext PAR", name: "LVMH Moët Hennessy",      sector: "Luxury",         region: "OTHER" },
  { display: "OR",   apiFetch: "OR.PA",   tradingView: "EURONEXT:OR", currency: "EUR", exchange: "Euronext PAR", name: "L'Oréal S.A.",            sector: "Consumer",       region: "OTHER" },
  { display: "AIR",  apiFetch: "AIR.PA",  tradingView: "EURONEXT:AIR", currency: "EUR", exchange: "Euronext PAR", name: "Airbus SE",               sector: "Aerospace",      region: "OTHER" },
  { display: "TTE",  apiFetch: "TTE.PA",  tradingView: "EURONEXT:TTE", currency: "EUR", exchange: "Euronext PAR", name: "TotalEnergies SE",        sector: "Energy",         region: "OTHER" },
  { display: "NESN", apiFetch: "NESN.SW", tradingView: "SIX:NESN",    currency: "CHF", exchange: "SIX",          name: "Nestlé S.A.",             sector: "Consumer",       region: "OTHER" },
  { display: "ROG",  apiFetch: "ROG.SW",  tradingView: "SIX:ROG",     currency: "CHF", exchange: "SIX",          name: "Roche Holding AG",        sector: "Pharma",         region: "OTHER" },
  { display: "NOVN", apiFetch: "NOVN.SW", tradingView: "SIX:NOVN",    currency: "CHF", exchange: "SIX",          name: "Novartis AG",             sector: "Pharma",         region: "OTHER" },
  { display: "HSBA", apiFetch: "HSBA.L",  tradingView: "LSE:HSBA",    currency: "GBP", exchange: "LSE",          name: "HSBC Holdings plc",       sector: "Banking",        region: "OTHER" },
  { display: "SHEL", apiFetch: "SHEL.L",  tradingView: "LSE:SHEL",    currency: "GBP", exchange: "LSE",          name: "Shell plc",               sector: "Energy",         region: "OTHER" },
  { display: "AZN",  apiFetch: "AZN.L",   tradingView: "LSE:AZN",     currency: "GBP", exchange: "LSE",          name: "AstraZeneca plc",         sector: "Pharma",         region: "OTHER" },
  { display: "ULVR", apiFetch: "ULVR.L",  tradingView: "LSE:ULVR",    currency: "GBP", exchange: "LSE",          name: "Unilever plc",            sector: "Consumer",       region: "OTHER" },
];

// ─── O(1) LOOKUP INDEXES ─────────────────────────────────────────
const BY_DISPLAY  = new Map<string, TickerEntry>();
const BY_APIFETCH = new Map<string, TickerEntry>();
const BY_TV       = new Map<string, TickerEntry>();

for (const entry of TICKER_TABLE) {
  BY_DISPLAY.set(entry.display.toUpperCase(), entry);
  BY_APIFETCH.set(entry.apiFetch.toUpperCase(), entry);
  BY_TV.set(entry.tradingView.toUpperCase(), entry);
}

// ─── NAME ALIASES ────────────────────────────────────────────────
// Maps natural language names → canonical display ticker
const NAME_ALIASES: Record<string, string> = {
  // German
  "ALLIANZ": "ALV", "BAYER": "BAYN", "BASF": "BAS",
  "BMW": "BMW", "BAYERISCHE MOTOREN WERKE": "BMW",
  "MERCEDES": "MBG", "MERCEDES-BENZ": "MBG", "DAIMLER": "MBG",
  "VOLKSWAGEN": "VOW3", "VW": "VOW3",
  "SIEMENS": "SIE", "SAP": "SAP",
  "TELEKOM": "DTE", "DEUTSCHE TELEKOM": "DTE",
  "DEUTSCHE BANK": "DBK", "COMMERZBANK": "CBK",
  "LUFTHANSA": "LHA", "INFINEON": "IFX",
  "ADIDAS": "ADS", "PUMA": "PUM", "PORSCHE": "P911",
  "ZALANDO": "ZAL", "BEIERSDORF": "BEI",
  "E.ON": "EOAN", "EON": "EOAN", "RWE": "RWE",
  "HENKEL": "HEN3", "FRESENIUS": "FRE", "CONTINENTAL": "CON",
  "MTU": "MTX", "VONOVIA": "VNA", "HEIDELBERG": "HEI",
  "SIEMENS ENERGY": "ENR", "DEUTSCHE POST": "DPW",
  "DELIVERY HERO": "DHER",
  // US
  "APPLE": "AAPL", "MICROSOFT": "MSFT", "NVIDIA": "NVDA",
  "AMAZON": "AMZN", "TESLA": "TSLA",
  "GOOGLE": "GOOGL", "ALPHABET": "GOOGL",
  "META": "META", "FACEBOOK": "META", "NETFLIX": "NFLX",
  "INTEL": "INTC", "JPMORGAN": "JPM", "JP MORGAN": "JPM",
  "VISA": "V", "MASTERCARD": "MA", "COCA COLA": "KO",
  "COCA-COLA": "KO", "EXXON": "XOM",
  "WALMART": "WMT", "GOLDMAN": "GS", "GOLDMAN SACHS": "GS",
  // Europe (non‑German)
  "ASML": "ASML", "NOVO NORDISK": "NVO", "NOVO": "NVO",
  "LVMH": "LVMH", "MOET HENNESSY": "LVMH",
  "LOREAL": "OR", "L'OREAL": "OR", "L OREAL": "OR",
  "AIRBUS": "AIR", "TOTAL": "TTE", "TOTALENERGIES": "TTE",
  "NESTLE": "NESN", "NESTLÉ": "NESN",
  "ROCHE": "ROG", "NOVARTIS": "NOVN",
  "HSBC": "HSBA", "SHELL": "SHEL",
  "ASTRAZENECA": "AZN", "UNILEVER": "ULVR",
};

// ─── CORE RESOLUTION ─────────────────────────────────────────────
/**
 * Resolves ANY user input to a TickerEntry or null.
 *
 * Handles all formats:
 *   "ALV"        → Allianz (apiFetch: "ALV.DE", tradingView: "XETR:ALV")
 *   "ALV.DE"     → same (strips .DE suffix, looks up display)
 *   "XETR:ALV"   → same (strips XETR: prefix, looks up display)
 *   "allianz"    → same (via NAME_ALIASES)
 *   "AAPL"       → Apple  (apiFetch: "AAPL", tradingView: "NASDAQ:AAPL")
 */
export function resolveTicker(raw: string): TickerEntry | null {
  const input = raw.trim().toUpperCase();
  if (!input) return null;

  // 1. Direct display match (fastest path: "ALV", "AAPL", "BMW")
  if (BY_DISPLAY.has(input)) return BY_DISPLAY.get(input)!;

  // 2. Direct apiFetch match ("ALV.DE", "BMW.DE")
  if (BY_APIFETCH.has(input)) return BY_APIFETCH.get(input)!;

  // 3. Direct TradingView match ("XETR:ALV", "NASDAQ:AAPL")
  if (BY_TV.has(input)) return BY_TV.get(input)!;

  // 4. Strip exchange suffixes (.DE, .F, .L, etc.) then try display lookup
  const stripped = input.replace(/\.(DE|F|BE|HM|MU|SG|ETR|XETR|L|PA|AS|MC|SW|TO)$/i, "");
  if (BY_DISPLAY.has(stripped)) return BY_DISPLAY.get(stripped)!;

  // 5. Strip TradingView exchange prefixes (XETR:, NASDAQ:, NYSE:, etc.) then try display
  const withoutPrefix = input.replace(/^(XETR|FWB|FSX|NASDAQ|NYSE|BATS|TSX|ASX):/i, "");
  if (BY_DISPLAY.has(withoutPrefix)) return BY_DISPLAY.get(withoutPrefix)!;

  // 6. Name alias lookup ("ALLIANZ" → "ALV", "DEUTSCHE TELEKOM" → "DTE")
  const alias = NAME_ALIASES[input] ?? NAME_ALIASES[stripped] ?? NAME_ALIASES[withoutPrefix];
  if (alias && BY_DISPLAY.has(alias)) return BY_DISPLAY.get(alias)!;

  // 7. Not found in master table
  return null;
}

/**
 * Like resolveTicker but NEVER returns null.
 * For unknown tickers, assumes US stock with bare symbol.
 * This prevents crashes in the API route.
 */
export function resolveTickerSafe(raw: string): TickerEntry {
  const known = resolveTicker(raw);
  if (known) return known;

  // Strip any common exchange suffix/prefix so we can still attempt a lookup
  const clean = raw.trim().toUpperCase()
    .replace(/^(XETR|FWB|NASDAQ|NYSE|LSE|SIX|EURONEXT|AMS|PAR|MIL|MAD|TSE|HKG|ASX):/i, "")
    .replace(/\.(DE|F|BE|HM|MU|SG|ETR|L|PA|AS|MC|SW|TO|MI|MX|HK|T|SI|AX|ST|CO|HE|OL|BR|VI|LS|WA|AT)$/i, "");

  // One more try: maybe the stripped bare symbol IS in our table (e.g. "ASML.PA" → "ASML")
  if (BY_DISPLAY.has(clean)) return BY_DISPLAY.get(clean)!;

  // Last resort — treat as unknown US ticker (bare symbol) so Yahoo can at least try
  return {
    display: clean,
    apiFetch: clean,
    tradingView: clean,
    currency: "USD",
    exchange: "UNKNOWN",
    name: clean,
    sector: "Unknown",
    region: "OTHER",
  };
}

/**
 * Resolve with .DE fallback retry logic.
 * If bare symbol fails to resolve, automatically tries with .DE suffix.
 * This handles the case where a user types "DTE" and we need "DTE.DE" for the API.
 */
export function resolveWithFallback(raw: string): TickerEntry {
  // First try: exact input
  const first = resolveTicker(raw);
  if (first) return first;

  // Second try: append .DE (European fallback)
  const withDE = resolveTicker(raw + ".DE");
  if (withDE) return withDE;

  // Final: safe fallback
  return resolveTickerSafe(raw);
}

// ─── CONVENIENCE GETTERS ─────────────────────────────────────────

/** Get the symbol to pass to Yahoo Finance / data APIs */
export function getApiFetchSymbol(raw: string): string {
  return resolveWithFallback(raw).apiFetch;
}

/** Get the symbol to pass to TradingView widget */
export function getTradingViewSymbol(raw: string): string {
  return resolveWithFallback(raw).tradingView;
}

/** Get the display symbol for UI */
export function getDisplaySymbol(raw: string): string {
  return resolveWithFallback(raw).display;
}

/** Get currency for a ticker */
export function getCurrency(raw: string): string {
  return resolveWithFallback(raw).currency;
}

// ─── SEARCH ──────────────────────────────────────────────────────
/**
 * Search tickers by symbol, company name, or sector.
 * Used by autocomplete search bar.
 * Returns scored results, best match first.
 */
export function searchTickers(query: string): TickerEntry[] {
  const q = query.trim().toUpperCase();
  if (!q || q.length < 1) return [];

  // Exact alias match first
  const alias = NAME_ALIASES[q];
  if (alias) {
    const entry = BY_DISPLAY.get(alias);
    if (entry) return [entry];
  }

  return TICKER_TABLE
    .map(t => {
      let score = 0;
      const sym = t.display.toUpperCase();
      const name = t.name.toUpperCase();
      const sec = t.sector.toUpperCase();
      if (sym === q)               score += 100;
      else if (sym.startsWith(q))  score += 60;
      else if (sym.includes(q))    score += 30;
      if (name.startsWith(q))      score += 50;
      else if (name.includes(q))   score += 25;
      if (sec.includes(q))         score += 10;
      return { entry: t, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(x => x.entry);
}

// ─── CURRENCY FORMATTING ─────────────────────────────────────────

/** Returns the currency symbol string for a currency code */
export function currencySymbol(currency: string): string {
  const map: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF " };
  return map[currency] ?? (currency + " ");
}

/** Format a price with the correct currency symbol and locale */
export function formatPrice(value: number | undefined, currency: string): string {
  if (value === undefined || value === null || isNaN(value)) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Export the full table for static lists */
export function getAllTickers(): TickerEntry[] {
  return [...TICKER_TABLE];
}

/** Export only German tickers */
export function getGermanTickers(): TickerEntry[] {
  return TICKER_TABLE.filter(t => t.region === "DE");
}
