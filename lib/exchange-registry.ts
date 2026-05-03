// ═══════════════════════════════════════════════════════════════════
// ALPHAMETRIC EXCHANGE REGISTRY
// Single source of truth for all global stock / exchange mappings.
// Used by: SearchWithExchange, quote API route, portfolio page, watchlists
// ═══════════════════════════════════════════════════════════════════

export type MIC = "XETRA" | "NYSE" | "NASDAQ" | "LSE" | "EURONEXT" | "SIX" | "TSX" | "OTHER";

export interface ExchangeMeta {
  mic:       MIC;
  label:     string;   // Human label shown in UI
  currency:  string;   // Default currency on this exchange
  /** Suffix to append for Yahoo Finance fetch symbol, e.g. ".DE" */
  yahooSuffix: string;
  /** TradingView prefix, e.g. "XETR:" */
  tvPrefix:  string;
  /** ISO-2 country code shown in UI (no emoji, monospace badge) */
  country:   string;
  /** @deprecated emoji flag — kept for legacy callers, prefer `country` */
  flag:      string;
}

export const EXCHANGES: Record<MIC, ExchangeMeta> = {
  XETRA:    { mic:"XETRA",    label:"XETRA (Frankfurt)",   currency:"EUR", yahooSuffix:".DE",  tvPrefix:"XETR:",    country:"DE", flag:"" },
  NYSE:     { mic:"NYSE",     label:"NYSE (New York)",     currency:"USD", yahooSuffix:"",     tvPrefix:"NYSE:",    country:"US", flag:"" },
  NASDAQ:   { mic:"NASDAQ",   label:"NASDAQ (New York)",   currency:"USD", yahooSuffix:"",     tvPrefix:"NASDAQ:",  country:"US", flag:"" },
  LSE:      { mic:"LSE",      label:"LSE (London)",        currency:"GBP", yahooSuffix:".L",   tvPrefix:"LSE:",     country:"UK", flag:"" },
  EURONEXT: { mic:"EURONEXT", label:"Euronext (Paris/AMS)", currency:"EUR", yahooSuffix:".PA", tvPrefix:"EURONEXT:",country:"EU", flag:"" },
  SIX:      { mic:"SIX",      label:"SIX (Zürich)",        currency:"CHF", yahooSuffix:".SW",  tvPrefix:"SIX:",     country:"CH", flag:"" },
  TSX:      { mic:"TSX",      label:"TSX (Toronto)",       currency:"CAD", yahooSuffix:".TO",  tvPrefix:"TSX:",     country:"CA", flag:"" },
  OTHER:    { mic:"OTHER",    label:"Other",               currency:"USD", yahooSuffix:"",     tvPrefix:"",         country:"--", flag:"" },
};

// ─────────────────────────────────────────────────────────────────
// STOCK ENTRY — one entry per stock×exchange listing
// ─────────────────────────────────────────────────────────────────
export interface StockEntry {
  /** Bare ticker as user types it, e.g. "DTE" */
  symbol:     string;
  /** Display name */
  name:       string;
  /** Exchange MIC */
  exchange:   MIC;
  /** Yahoo Finance fetch symbol (precomputed) */
  fetchSymbol: string;
  /** TradingView widget symbol (precomputed) */
  tvSymbol:   string;
  /** Sector / industry tag */
  sector:     string;
  /** Whether it is a "known" entry (shows in autocomplete) */
  known:      boolean;
}

function entry(symbol: string, name: string, exchange: MIC, sector: string): StockEntry {
  const ex = EXCHANGES[exchange];
  return {
    symbol,
    name,
    exchange,
    fetchSymbol: symbol + ex.yahooSuffix,
    tvSymbol:    ex.tvPrefix + symbol,
    sector,
    known: true,
  };
}

// ─────────────────────────────────────────────────────────────────
// THE MASTER REGISTRY — all well-known global listings
// Stocks that share a TICKER across exchanges (e.g. DTE) are listed
// MULTIPLE TIMES — user picks the exchange from the dropdown.
// ─────────────────────────────────────────────────────────────────
export const REGISTRY: StockEntry[] = [
  // ── US MEGA-CAP ──
  entry("AAPL",  "Apple Inc.",              "NASDAQ", "Technology"),
  entry("NVDA",  "NVIDIA Corporation",      "NASDAQ", "Technology"),
  entry("MSFT",  "Microsoft Corporation",   "NASDAQ", "Technology"),
  entry("AMZN",  "Amazon.com Inc.",         "NASDAQ", "Consumer Cyclical"),
  entry("GOOGL", "Alphabet Inc. Class A",   "NASDAQ", "Technology"),
  entry("GOOG",  "Alphabet Inc. Class C",   "NASDAQ", "Technology"),
  entry("META",  "Meta Platforms Inc.",     "NASDAQ", "Technology"),
  entry("TSLA",  "Tesla Inc.",              "NASDAQ", "Automotive"),
  entry("AMD",   "Advanced Micro Devices",  "NASDAQ", "Technology"),
  entry("INTC",  "Intel Corporation",       "NASDAQ", "Technology"),
  entry("NFLX",  "Netflix Inc.",            "NASDAQ", "Communication"),
  entry("ORCL",  "Oracle Corporation",      "NYSE",   "Technology"),
  entry("CRM",   "Salesforce Inc.",         "NYSE",   "Technology"),
  entry("ADBE",  "Adobe Inc.",              "NASDAQ", "Technology"),
  entry("CSCO",  "Cisco Systems Inc.",      "NASDAQ", "Technology"),
  entry("QCOM",  "Qualcomm Inc.",           "NASDAQ", "Technology"),
  entry("AVGO",  "Broadcom Inc.",           "NASDAQ", "Technology"),
  entry("TXN",   "Texas Instruments",       "NASDAQ", "Technology"),
  entry("JPM",   "JPMorgan Chase",          "NYSE",   "Finance"),
  entry("GS",    "Goldman Sachs Group",     "NYSE",   "Finance"),
  entry("MS",    "Morgan Stanley",          "NYSE",   "Finance"),
  entry("BAC",   "Bank of America",         "NYSE",   "Finance"),
  entry("WFC",   "Wells Fargo",             "NYSE",   "Finance"),
  entry("V",     "Visa Inc.",               "NYSE",   "Finance"),
  entry("MA",    "Mastercard Inc.",         "NYSE",   "Finance"),
  entry("BRKB",  "Berkshire Hathaway B",    "NYSE",   "Finance"),
  entry("JNJ",   "Johnson & Johnson",       "NYSE",   "Healthcare"),
  entry("UNH",   "UnitedHealth Group",      "NYSE",   "Healthcare"),
  entry("PFE",   "Pfizer Inc.",             "NYSE",   "Healthcare"),
  entry("LLY",   "Eli Lilly and Co.",       "NYSE",   "Healthcare"),
  entry("ABBV",  "AbbVie Inc.",             "NYSE",   "Healthcare"),
  entry("MRK",   "Merck & Co. Inc.",        "NYSE",   "Healthcare"),  // US Merck
  entry("XOM",   "ExxonMobil Corp.",        "NYSE",   "Energy"),
  entry("CVX",   "Chevron Corporation",     "NYSE",   "Energy"),
  entry("WMT",   "Walmart Inc.",            "NYSE",   "Consumer Defensive"),
  entry("PG",    "Procter & Gamble",        "NYSE",   "Consumer Defensive"),
  entry("KO",    "Coca-Cola Company",       "NYSE",   "Consumer Defensive"),
  entry("PEP",   "PepsiCo Inc.",            "NASDAQ", "Consumer Defensive"),
  entry("COST",  "Costco Wholesale",        "NASDAQ", "Consumer Defensive"),
  entry("HD",    "Home Depot Inc.",         "NYSE",   "Consumer Cyclical"),
  entry("MCD",   "McDonald's Corporation",  "NYSE",   "Consumer Cyclical"),
  entry("NKE",   "Nike Inc.",               "NYSE",   "Consumer Cyclical"),
  entry("SBUX",  "Starbucks Corporation",   "NASDAQ", "Consumer Cyclical"),
  entry("COIN",  "Coinbase Global",         "NASDAQ", "Finance"),
  entry("PLTR",  "Palantir Technologies",   "NYSE",   "Technology"),
  entry("HOOD",  "Robinhood Markets",       "NASDAQ", "Finance"),
  entry("UBER",  "Uber Technologies",       "NYSE",   "Technology"),
  entry("ABNB",  "Airbnb Inc.",             "NASDAQ", "Technology"),
  entry("SPOT",  "Spotify Technology",      "NYSE",   "Communication"),
  entry("RIVN",  "Rivian Automotive",       "NASDAQ", "Automotive"),

  // ── DTE ── BOTH LISTINGS (this is the key disambiguation)
  entry("DTE",   "Deutsche Telekom AG",     "XETRA",  "Telecom"),   // XETRA:DTE → DTE.DE
  entry("DTE",   "DTE Energy Company",      "NYSE",    "Utilities"), // NYSE:DTE  → DTE (bare)

  // ── XETRA / DAX ──
  entry("BMW",   "BMW AG",                  "XETRA",  "Automotive"),
  entry("MBG",   "Mercedes-Benz Group AG",  "XETRA",  "Automotive"),
  entry("SAP",   "SAP SE",                  "XETRA",  "Technology"),
  entry("ALV",   "Allianz SE",              "XETRA",  "Finance"),
  entry("DBK",   "Deutsche Bank AG",        "XETRA",  "Finance"),
  entry("SIE",   "Siemens AG",              "XETRA",  "Industrials"),
  entry("VOW3",  "Volkswagen AG Vz.",        "XETRA",  "Automotive"),
  entry("ADS",   "Adidas AG",               "XETRA",  "Consumer Cyclical"),
  entry("BAS",   "BASF SE",                 "XETRA",  "Materials"),
  entry("BAYN",  "Bayer AG",                "XETRA",  "Healthcare"),
  entry("CBK",   "Commerzbank AG",          "XETRA",  "Finance"),
  entry("CON",   "Continental AG",          "XETRA",  "Automotive"),
  entry("EOAN",  "E.ON SE",                 "XETRA",  "Utilities"),
  entry("FRE",   "Fresenius SE & Co.",       "XETRA",  "Healthcare"),
  entry("HEN3",  "Henkel AG & Co. KGaA",    "XETRA",  "Consumer Defensive"),
  entry("IFX",   "Infineon Technologies AG","XETRA",  "Technology"),
  entry("LHA",   "Deutsche Lufthansa AG",   "XETRA",  "Industrials"),
  entry("MRK",   "Merck KGaA",              "XETRA",  "Healthcare"),  // German Merck
  entry("MTX",   "MTU Aero Engines AG",     "XETRA",  "Industrials"),
  entry("P911",  "Porsche AG",              "XETRA",  "Automotive"),
  entry("PUM",   "Puma SE",                 "XETRA",  "Consumer Cyclical"),
  entry("RWE",   "RWE AG",                  "XETRA",  "Utilities"),
  entry("ZAL",   "Zalando SE",              "XETRA",  "Consumer Cyclical"),
  entry("BEI",   "Beiersdorf AG",           "XETRA",  "Consumer Defensive"),
  entry("HEI",   "HeidelbergMaterials AG",  "XETRA",  "Materials"),
  entry("ENR",   "Siemens Energy AG",       "XETRA",  "Industrials"),
  entry("DPW",   "Deutsche Post AG",        "XETRA",  "Industrials"),
  entry("VNA",   "Vonovia SE",              "XETRA",  "Real Estate"),
  entry("QIA",   "Qiagen N.V.",             "XETRA",  "Healthcare"),
  entry("SHL",   "Siemens Healthineers AG", "XETRA",  "Healthcare"),
  entry("AIR",   "Airbus SE",               "XETRA",  "Industrials"),
  entry("MUV2",  "Munich Re AG",            "XETRA",  "Finance"),
  entry("HNR1",  "Hannover Rück SE",        "XETRA",  "Finance"),
  entry("SRT3",  "Sartorius AG Vz.",         "XETRA",  "Healthcare"),
  entry("HFG",   "HelloFresh SE",           "XETRA",  "Consumer Cyclical"),
  entry("DHER",  "Delivery Hero SE",        "XETRA",  "Consumer Cyclical"),
  entry("EVD",   "CTS Eventim AG",          "XETRA",  "Communication"),
  entry("AFX",   "Carl Zeiss Meditec AG",   "XETRA",  "Healthcare"),

  // ── LSE (London) ──
  entry("SHEL",  "Shell plc",               "LSE",     "Energy"),
  entry("HSBA",  "HSBC Holdings plc",       "LSE",     "Finance"),
  entry("ULVR",  "Unilever plc",            "LSE",     "Consumer Defensive"),
  entry("BP",    "BP plc",                  "LSE",     "Energy"),
  entry("GSK",   "GSK plc",                 "LSE",     "Healthcare"),
  entry("AZN",   "AstraZeneca plc",         "LSE",     "Healthcare"),
  entry("RIO",   "Rio Tinto plc",           "LSE",     "Materials"),
  entry("BHP",   "BHP Group plc",           "LSE",     "Materials"),
  entry("LLOY",  "Lloyds Banking Group",    "LSE",     "Finance"),
  entry("BARC",  "Barclays plc",            "LSE",     "Finance"),
  entry("VOD",   "Vodafone Group plc",      "LSE",     "Telecom"),

  // ── EURONEXT ──
  entry("ASML",  "ASML Holding N.V.",       "EURONEXT","Technology"),
  entry("OR",    "L'Oréal S.A.",            "EURONEXT","Consumer Defensive"),
  entry("MC",    "LVMH Moët Hennessy",      "EURONEXT","Consumer Cyclical"),
  entry("TTE",   "TotalEnergies SE",        "EURONEXT","Energy"),
  entry("SAN",   "Sanofi S.A.",             "EURONEXT","Healthcare"),
  entry("BNP",   "BNP Paribas S.A.",        "EURONEXT","Finance"),
  entry("AI",    "Air Liquide S.A.",        "EURONEXT","Materials"),
  entry("CS",    "AXA S.A.",                "EURONEXT","Finance"),

  // ── SIX (Switzerland) ──
  entry("NESN",  "Nestlé S.A.",             "SIX",     "Consumer Defensive"),
  entry("ROG",   "Roche Holding AG",        "SIX",     "Healthcare"),
  entry("NOVN",  "Novartis AG",             "SIX",     "Healthcare"),
  entry("UBSG",  "UBS Group AG",            "SIX",     "Finance"),
  entry("ABBN",  "ABB Ltd",                 "SIX",     "Industrials"),
  entry("ZURN",  "Zurich Insurance Group",  "SIX",     "Finance"),
];

// ─────────────────────────────────────────────────────────────────
// NAME-ALIAS SEARCH  (maps typed text to symbol candidates)
// ─────────────────────────────────────────────────────────────────
const NAME_ALIASES: Record<string, string> = {
  "APPLE":"AAPL","NVIDIA":"NVDA","MICROSOFT":"MSFT","AMAZON":"AMZN",
  "ALPHABET":"GOOGL","GOOGLE":"GOOGL","META":"META","TESLA":"TSLA",
  "DEUTSCHE TELEKOM":"DTE","TELEKOM":"DTE","DT TELEKOM":"DTE",
  "BMW":"BMW","MERCEDES":"MBG","MERCEDES-BENZ":"MBG","DAIMLER":"MBG",
  "VOLKSWAGEN":"VOW3","VW":"VOW3","SIEMENS":"SIE","ALLIANZ":"ALV",
  "BAYER":"BAYN","BASF":"BAS","ADIDAS":"ADS","DEUTSCHE BANK":"DBK",
  "COMMERZBANK":"CBK","LUFTHANSA":"LHA","INFINEON":"IFX","PORSCHE":"P911",
  "PUMA":"PUM","ZALANDO":"ZAL","BEIERSDORF":"BEI","MERCK KGAA":"MRK",
  "CONTINENTAL":"CON","EON":"EOAN","E.ON":"EOAN","MTU":"MTX",
  "HENKEL":"HEN3","FRESENIUS":"FRE","RWE":"RWE","SAP":"SAP",
  "VONOVIA":"VNA","DEUTSCHE POST":"DPW","SIEMENS ENERGY":"ENR",
  "AIRBUS":"AIR","MUNICH RE":"MUV2","ALLIANZ SE":"ALV",
  "NESTLE":"NESN","ROCHE":"ROG","NOVARTIS":"NOVN","UBS":"UBSG",
  "SHELL":"SHEL","ASTRAZENECA":"AZN","HSBC":"HSBA",
  "ASML":"ASML","LVMH":"MC","LOREAL":"OR","SANOFI":"SAN",
};

// ─────────────────────────────────────────────────────────────────
// SEARCH FUNCTION
// Returns up to `limit` matching entries, disambiguated by exchange.
// This is what powers the SearchWithExchange dropdown.
// ─────────────────────────────────────────────────────────────────
export function searchRegistry(query: string, limit = 8): StockEntry[] {
  const q = query.toUpperCase().trim();
  if (!q) return [];

  const scores: { entry: StockEntry; score: number }[] = [];

  for (const e of REGISTRY) {
    let score = 0;
    if (e.symbol === q)                   score = 100;
    else if (e.symbol.startsWith(q))      score = 80;
    else if (e.symbol.includes(q))        score = 60;
    else if (e.name.toUpperCase().includes(q)) score = 40;
    if (score > 0) scores.push({ entry: e, score });
  }

  // Also check name aliases
  const aliasSymbol = NAME_ALIASES[q] ?? NAME_ALIASES[query.toUpperCase()];
  if (aliasSymbol) {
    for (const e of REGISTRY) {
      if (e.symbol === aliasSymbol && !scores.find(s => s.entry === e)) {
        scores.push({ entry: e, score: 75 });
      }
    }
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .map(s => s.entry)
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────
// RESOLVE — given symbol + exchange, return the StockEntry
// Falls back to a synthetic entry for unknown tickers (US assumed)
// ─────────────────────────────────────────────────────────────────
export function resolveEntry(symbol: string, exchange?: MIC): StockEntry {
  const sym = symbol.toUpperCase().trim();
  const mic = exchange ?? guessExchange(sym);
  const found = REGISTRY.find(e => e.symbol === sym && e.exchange === mic);
  if (found) return found;
  // Synthetic fallback (unknown US stock, ETF, etc.)
  const ex = EXCHANGES[mic] ?? EXCHANGES["NASDAQ"];
  return {
    symbol: sym,
    name: sym,
    exchange: mic,
    fetchSymbol: sym + ex.yahooSuffix,
    tvSymbol: ex.tvPrefix + sym,
    sector: "Unknown",
    known: false,
  };
}

/** Best-guess exchange for a bare ticker not in registry */
export function guessExchange(symbol: string): MIC {
  const s = symbol.toUpperCase();
  if (s.endsWith(".DE"))  return "XETRA";
  if (s.endsWith(".L"))   return "LSE";
  if (s.endsWith(".PA"))  return "EURONEXT";
  if (s.endsWith(".SW"))  return "SIX";
  if (s.endsWith(".TO"))  return "TSX";
  // Heuristic: German tickers are rarely pure letters < 4 chars unless in map
  return "NASDAQ";
}

/** Format for display in UI: "NVDA · NASDAQ" */
export function formatStockLabel(e: StockEntry): string {
  return `${e.symbol} · ${e.exchange}`;
}
