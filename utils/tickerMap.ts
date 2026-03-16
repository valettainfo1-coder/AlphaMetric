// utils/tickerMap.ts
// ─────────────────────────────────────────────────────────────────
// THE SINGLE SOURCE OF TRUTH for all ticker translation.
//
// THE BUG THIS FIXES:
//   Finnhub bare "ALV"  → returns Autoliv Inc (NYSE) ← WRONG
//   Finnhub "ALV.DE"    → returns Allianz SE (XETRA) ← CORRECT
//   TradingView "ALV"   → guesses correctly (XETR:ALV) but unreliably
//   TradingView "ALV.DE"→ FAILS — TV doesn't understand .DE suffix
//   TradingView "XETR:ALV" → CORRECT, explicit, deterministic
//
// RULE: ALL German stocks MUST go through this map.
// NEVER pass bare "ALV" to Finnhub. NEVER pass "ALV.DE" to TradingView.
// ─────────────────────────────────────────────────────────────────

export interface TickerEntry {
  /** Display symbol used in UI and stored in app state */
  display:     string;
  /** Finnhub API symbol — always .DE for XETRA stocks */
  finnhub:     string;
  /** TradingView widget symbol — always XETR: prefix, never .DE */
  tradingView: string;
  /** ISO 4217 currency */
  currency:    "EUR" | "USD" | "GBP" | "CHF";
  /** Exchange display name */
  exchange:    string;
  /** Full company name */
  name:        string;
  /** Sector for portfolio diversification analysis */
  sector:      string;
}

// ─── MASTER TICKER TABLE ─────────────────────────────────────────
// Every row is hand-verified:
//   display  = what we store, show, and route with
//   finnhub  = what we send to /api/quote?symbol=
//   tradingView = what we pass to TradingView iframe src
//
const TICKER_TABLE: TickerEntry[] = [
  // ── DAX 40 — XETRA ────────────────────────────────────────────
  { display:"ALV",  finnhub:"ALV.DE",  tradingView:"XETR:ALV",  currency:"EUR", exchange:"XETRA", name:"Allianz SE",                  sector:"Insurance" },
  { display:"BMW",  finnhub:"BMW.DE",  tradingView:"XETR:BMW",  currency:"EUR", exchange:"XETRA", name:"BMW AG",                      sector:"Automobile" },
  { display:"SAP",  finnhub:"SAP.DE",  tradingView:"XETR:SAP",  currency:"EUR", exchange:"XETRA", name:"SAP SE",                      sector:"Technology" },
  { display:"DTE",  finnhub:"DTE.DE",  tradingView:"XETR:DTE",  currency:"EUR", exchange:"XETRA", name:"Deutsche Telekom AG",         sector:"Telecom" },
  { display:"DBK",  finnhub:"DBK.DE",  tradingView:"XETR:DBK",  currency:"EUR", exchange:"XETRA", name:"Deutsche Bank AG",            sector:"Banking" },
  { display:"SIE",  finnhub:"SIE.DE",  tradingView:"XETR:SIE",  currency:"EUR", exchange:"XETRA", name:"Siemens AG",                  sector:"Industrials" },
  { display:"MBG",  finnhub:"MBG.DE",  tradingView:"XETR:MBG",  currency:"EUR", exchange:"XETRA", name:"Mercedes-Benz Group AG",      sector:"Automobile" },
  { display:"VOW3", finnhub:"VOW3.DE", tradingView:"XETR:VOW3", currency:"EUR", exchange:"XETRA", name:"Volkswagen AG",               sector:"Automobile" },
  { display:"ADS",  finnhub:"ADS.DE",  tradingView:"XETR:ADS",  currency:"EUR", exchange:"XETRA", name:"Adidas AG",                   sector:"Consumer" },
  { display:"BAS",  finnhub:"BAS.DE",  tradingView:"XETR:BAS",  currency:"EUR", exchange:"XETRA", name:"BASF SE",                     sector:"Chemicals" },
  { display:"BAYN", finnhub:"BAYN.DE", tradingView:"XETR:BAYN", currency:"EUR", exchange:"XETRA", name:"Bayer AG",                    sector:"Pharma" },
  { display:"CBK",  finnhub:"CBK.DE",  tradingView:"XETR:CBK",  currency:"EUR", exchange:"XETRA", name:"Commerzbank AG",              sector:"Banking" },
  { display:"CON",  finnhub:"CON.DE",  tradingView:"XETR:CON",  currency:"EUR", exchange:"XETRA", name:"Continental AG",              sector:"Automobile" },
  { display:"EOAN", finnhub:"EOAN.DE", tradingView:"XETR:EOAN", currency:"EUR", exchange:"XETRA", name:"E.ON SE",                     sector:"Utilities" },
  { display:"FRE",  finnhub:"FRE.DE",  tradingView:"XETR:FRE",  currency:"EUR", exchange:"XETRA", name:"Fresenius SE",                sector:"Healthcare" },
  { display:"HEN3", finnhub:"HEN3.DE", tradingView:"XETR:HEN3", currency:"EUR", exchange:"XETRA", name:"Henkel AG",                   sector:"Consumer" },
  { display:"IFX",  finnhub:"IFX.DE",  tradingView:"XETR:IFX",  currency:"EUR", exchange:"XETRA", name:"Infineon Technologies AG",    sector:"Technology" },
  { display:"LHA",  finnhub:"LHA.DE",  tradingView:"XETR:LHA",  currency:"EUR", exchange:"XETRA", name:"Deutsche Lufthansa AG",       sector:"Transport" },
  { display:"MRK",  finnhub:"MRK.DE",  tradingView:"XETR:MRK",  currency:"EUR", exchange:"XETRA", name:"Merck KGaA",                  sector:"Pharma" },
  { display:"MTX",  finnhub:"MTX.DE",  tradingView:"XETR:MTX",  currency:"EUR", exchange:"XETRA", name:"MTU Aero Engines AG",         sector:"Aerospace" },
  { display:"P911", finnhub:"P911.DE", tradingView:"XETR:P911", currency:"EUR", exchange:"XETRA", name:"Porsche AG",                  sector:"Automobile" },
  { display:"PUM",  finnhub:"PUM.DE",  tradingView:"XETR:PUM",  currency:"EUR", exchange:"XETRA", name:"Puma SE",                     sector:"Consumer" },
  { display:"RWE",  finnhub:"RWE.DE",  tradingView:"XETR:RWE",  currency:"EUR", exchange:"XETRA", name:"RWE AG",                      sector:"Utilities" },
  { display:"ZAL",  finnhub:"ZAL.DE",  tradingView:"XETR:ZAL",  currency:"EUR", exchange:"XETRA", name:"Zalando SE",                  sector:"E-Commerce" },
  { display:"BEI",  finnhub:"BEI.DE",  tradingView:"XETR:BEI",  currency:"EUR", exchange:"XETRA", name:"Beiersdorf AG",               sector:"Consumer" },
  { display:"ENR",  finnhub:"ENR.DE",  tradingView:"XETR:ENR",  currency:"EUR", exchange:"XETRA", name:"Siemens Energy AG",           sector:"Energy" },
  { display:"DPW",  finnhub:"DPW.DE",  tradingView:"XETR:DPW",  currency:"EUR", exchange:"XETRA", name:"Deutsche Post AG",            sector:"Logistics" },
  { display:"VNA",  finnhub:"VNA.DE",  tradingView:"XETR:VNA",  currency:"EUR", exchange:"XETRA", name:"Vonovia SE",                  sector:"Real Estate" },
  { display:"HEI",  finnhub:"HEI.DE",  tradingView:"XETR:HEI",  currency:"EUR", exchange:"XETRA", name:"HeidelbergCement AG",         sector:"Construction" },
  { display:"DHER", finnhub:"DHER.DE", tradingView:"XETR:DHER", currency:"EUR", exchange:"XETRA", name:"Delivery Hero SE",            sector:"E-Commerce" },
  // ── US NASDAQ ──────────────────────────────────────────────────
  { display:"AAPL", finnhub:"AAPL",   tradingView:"NASDAQ:AAPL", currency:"USD", exchange:"NASDAQ", name:"Apple Inc.",                sector:"Technology" },
  { display:"NVDA", finnhub:"NVDA",   tradingView:"NASDAQ:NVDA", currency:"USD", exchange:"NASDAQ", name:"NVIDIA Corporation",        sector:"Technology" },
  { display:"MSFT", finnhub:"MSFT",   tradingView:"NASDAQ:MSFT", currency:"USD", exchange:"NASDAQ", name:"Microsoft Corporation",     sector:"Technology" },
  { display:"AMZN", finnhub:"AMZN",   tradingView:"NASDAQ:AMZN", currency:"USD", exchange:"NASDAQ", name:"Amazon.com Inc.",           sector:"E-Commerce" },
  { display:"TSLA", finnhub:"TSLA",   tradingView:"NASDAQ:TSLA", currency:"USD", exchange:"NASDAQ", name:"Tesla Inc.",                sector:"Automobile" },
  { display:"GOOGL",finnhub:"GOOGL",  tradingView:"NASDAQ:GOOGL",currency:"USD", exchange:"NASDAQ", name:"Alphabet Inc.",             sector:"Technology" },
  { display:"META", finnhub:"META",   tradingView:"NASDAQ:META", currency:"USD", exchange:"NASDAQ", name:"Meta Platforms Inc.",       sector:"Technology" },
  { display:"AMD",  finnhub:"AMD",    tradingView:"NASDAQ:AMD",  currency:"USD", exchange:"NASDAQ", name:"Advanced Micro Devices",   sector:"Technology" },
  { display:"NFLX", finnhub:"NFLX",   tradingView:"NASDAQ:NFLX", currency:"USD", exchange:"NASDAQ", name:"Netflix Inc.",              sector:"Media" },
  { display:"INTC", finnhub:"INTC",   tradingView:"NASDAQ:INTC", currency:"USD", exchange:"NASDAQ", name:"Intel Corporation",         sector:"Technology" },
  // ── US NYSE ────────────────────────────────────────────────────
  { display:"JPM",  finnhub:"JPM",    tradingView:"NYSE:JPM",    currency:"USD", exchange:"NYSE",   name:"JPMorgan Chase & Co.",     sector:"Banking" },
  { display:"V",    finnhub:"V",      tradingView:"NYSE:V",      currency:"USD", exchange:"NYSE",   name:"Visa Inc.",                sector:"Fintech" },
  { display:"MA",   finnhub:"MA",     tradingView:"NYSE:MA",     currency:"USD", exchange:"NYSE",   name:"Mastercard Inc.",          sector:"Fintech" },
  { display:"KO",   finnhub:"KO",     tradingView:"NYSE:KO",     currency:"USD", exchange:"NYSE",   name:"Coca-Cola Company",        sector:"Consumer" },
  { display:"XOM",  finnhub:"XOM",    tradingView:"NYSE:XOM",    currency:"USD", exchange:"NYSE",   name:"Exxon Mobil Corporation",  sector:"Energy" },
  { display:"WMT",  finnhub:"WMT",    tradingView:"NYSE:WMT",    currency:"USD", exchange:"NYSE",   name:"Walmart Inc.",             sector:"Retail" },
  { display:"JNJ",  finnhub:"JNJ",    tradingView:"NYSE:JNJ",    currency:"USD", exchange:"NYSE",   name:"Johnson & Johnson",        sector:"Healthcare" },
  { display:"GS",   finnhub:"GS",     tradingView:"NYSE:GS",     currency:"USD", exchange:"NYSE",   name:"Goldman Sachs Group",      sector:"Banking" },
];

// ─── INTERNAL INDEXES ────────────────────────────────────────────
// Built once for O(1) lookup
const BY_DISPLAY   = new Map<string, TickerEntry>();
const BY_FINNHUB   = new Map<string, TickerEntry>();
const BY_TV        = new Map<string, TickerEntry>();

for (const entry of TICKER_TABLE) {
  BY_DISPLAY.set(entry.display.toUpperCase(), entry);
  BY_FINNHUB.set(entry.finnhub.toUpperCase(), entry);
  BY_TV.set(entry.tradingView.toUpperCase(), entry);
}

// Name aliases — maps plain language to display ticker
const NAME_ALIASES: Record<string, string> = {
  "ALLIANZ":"ALV","BAYER":"BAYN","BASF":"BAS",
  "BMW":"BMW","MERCEDES":"MBG","MERCEDES-BENZ":"MBG","DAIMLER":"MBG",
  "VOLKSWAGEN":"VOW3","VW":"VOW3",
  "SIEMENS":"SIE","SAP":"SAP",
  "TELEKOM":"DTE","DEUTSCHE TELEKOM":"DTE",
  "DEUTSCHE BANK":"DBK","COMMERZBANK":"CBK",
  "LUFTHANSA":"LHA","INFINEON":"IFX",
  "ADIDAS":"ADS","PUMA":"PUM","PORSCHE":"P911",
  "ZALANDO":"ZAL","BEIERSDORF":"BEI",
  "E.ON":"EOAN","EON":"EOAN","RWE":"RWE",
  "HENKEL":"HEN3","FRESENIUS":"FRE","CONTINENTAL":"CON",
  "MTU":"MTX","VONOVIA":"VNA","HEIDELBERG":"HEI",
  "APPLE":"AAPL","MICROSOFT":"MSFT","NVIDIA":"NVDA",
  "AMAZON":"AMZN","TESLA":"TSLA",
  "GOOGLE":"GOOGL","ALPHABET":"GOOGL",
  "META":"META","FACEBOOK":"META","NETFLIX":"NFLX",
  "INTEL":"INTC","JPMORGAN":"JPM","JP MORGAN":"JPM",
  "VISA":"V","MASTERCARD":"MA","COCA COLA":"KO","EXXON":"XOM",
};

// ─── CORE RESOLVE FUNCTION ────────────────────────────────────────
/**
 * The single entry point for ALL ticker resolution.
 *
 * Handles every possible input format:
 *   "ALV"        → entry for Allianz (finnhub: "ALV.DE", tv: "XETR:ALV")
 *   "ALV.DE"     → same (strips .DE suffix)
 *   "XETR:ALV"   → same (strips XETR: prefix)
 *   "allianz"    → same (via name alias)
 *   "AAPL"       → entry for Apple  (finnhub: "AAPL",   tv: "NASDAQ:AAPL")
 *
 * Returns null for completely unknown tickers.
 */
export function resolveTicker(raw: string): TickerEntry | null {
  const input = raw.trim().toUpperCase();

  // 1. Strip known TradingView exchange prefixes
  const stripTV = input.replace(/^(XETR|FWB|NASDAQ|NYSE|BATS|TSX|ASX):/i, "");

  // 2. Strip known exchange suffixes
  const stripped = stripTV.replace(/\.(DE|F|BE|HM|MU|SG|ETR|L|PA|AS|MC|SW|TO)$/i, "");

  // 3. Direct lookup by display ticker
  if (BY_DISPLAY.has(stripped))   return BY_DISPLAY.get(stripped)!;

  // 4. Name alias lookup ("ALLIANZ" → "ALV" → entry)
  const alias = NAME_ALIASES[stripped] ?? NAME_ALIASES[input];
  if (alias && BY_DISPLAY.has(alias)) return BY_DISPLAY.get(alias)!;

  // 5. Try original stripped TV prefix (e.g. "NASDAQ:AAPL" → "AAPL")
  if (BY_DISPLAY.has(stripTV)) return BY_DISPLAY.get(stripTV)!;

  // 6. Try full Finnhub symbol lookup (e.g. someone passes "ALV.DE" directly)
  if (BY_FINNHUB.has(raw.toUpperCase())) return BY_FINNHUB.get(raw.toUpperCase())!;

  return null;
}

/**
 * Like resolveTicker but NEVER returns null.
 * For unknown tickers, builds a best-effort fallback.
 * Used in the API route so it never crashes.
 */
export function resolveTickerSafe(raw: string): TickerEntry {
  const known = resolveTicker(raw);
  if (known) return known;

  const clean = raw.trim().toUpperCase()
    .replace(/^(XETR|FWB|NASDAQ|NYSE):/i, "")
    .replace(/\.(DE|F|BE)$/i, "");

  // Unknown: return bare ticker, USD assumed
  return {
    display:     clean,
    finnhub:     clean,
    tradingView: clean,
    currency:    "USD",
    exchange:    "UNKNOWN",
    name:        clean,
    sector:      "Unknown",
  };
}

/**
 * Search tickers by symbol or company name.
 * Used by the autocomplete search bar.
 */
export function searchTickers(query: string): TickerEntry[] {
  const q = query.trim().toUpperCase();
  if (!q || q.length < 1) return [];

  // Check alias first for exact name matches
  const alias = NAME_ALIASES[q];
  if (alias) {
    const aliasEntry = BY_DISPLAY.get(alias);
    if (aliasEntry) return [aliasEntry];
  }

  return TICKER_TABLE
    .map(t => {
      let score = 0;
      const sym  = t.display.toUpperCase();
      const name = t.name.toUpperCase();
      const sec  = t.sector.toUpperCase();
      if (sym === q)              score += 100;
      else if (sym.startsWith(q)) score += 60;
      else if (sym.includes(q))   score += 30;
      if (name.startsWith(q))     score += 50;
      else if (name.includes(q))  score += 25;
      if (sec.includes(q))        score += 10;
      return { entry: t, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(x => x.entry);
}

/**
 * Translate Finnhub symbol to TradingView symbol.
 * Used when you already have the Finnhub symbol and need the TV symbol.
 *
 * Examples:
 *   finnhubToTV("ALV.DE")  → "XETR:ALV"
 *   finnhubToTV("AAPL")    → "NASDAQ:AAPL"
 *   finnhubToTV("UNKNOWN") → "UNKNOWN" (passthrough)
 */
export function finnhubToTV(finnhubSym: string): string {
  const entry = BY_FINNHUB.get(finnhubSym.toUpperCase());
  if (entry) return entry.tradingView;
  // Fallback: strip .DE and return bare (TV will try to guess)
  return finnhubSym.replace(/\.DE$/i, "");
}

/**
 * Returns the currency symbol string for a currency code.
 */
export function currencySymbol(currency: string): string {
  const map: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF " };
  return map[currency] ?? (currency + " ");
}

/**
 * Format a price with the correct currency symbol.
 */
export function formatPrice(value: number | undefined, currency: string): string {
  if (value === undefined || value === null || isNaN(value)) return "—";
  const sym = currencySymbol(currency);
  return `${sym}${value.toLocaleString("de-DE", {
    minimumFractionDigits:  2,
    maximumFractionDigits:  2,
  })}`;
}

/** All known tickers — used for static autocomplete lists */
export function getAllTickers(): TickerEntry[] {
  return TICKER_TABLE;
}
