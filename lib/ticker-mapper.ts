// ═══════════════════════════════════════════════════════════════════
// TICKER MAPPER — maps raw user input to correct API/TV symbols
// ═══════════════════════════════════════════════════════════════════

export interface TickerConfig {
  fetch: string;
  tv: string;
  display: string;
  name: string;
  exchange: string;
  currency: string;
  region: "DE" | "US" | "OTHER";
}

const GERMAN_TICKER_MAP: Record<string, TickerConfig> = {
  BMW:    { fetch: "BMW.DE",  tv: "XETR:BMW",  display: "BMW",  name: "BMW AG",                  exchange: "XETRA", currency: "EUR", region: "DE" },
  MBG:    { fetch: "MBG.DE",  tv: "XETR:MBG",  display: "MBG",  name: "Mercedes-Benz Group AG",  exchange: "XETRA", currency: "EUR", region: "DE" },
  SAP:    { fetch: "SAP.DE",  tv: "XETR:SAP",  display: "SAP",  name: "SAP SE",                  exchange: "XETRA", currency: "EUR", region: "DE" },
  ALV:    { fetch: "ALV.DE",  tv: "XETR:ALV",  display: "ALV",  name: "Allianz SE",               exchange: "XETRA", currency: "EUR", region: "DE" },
  DBK:    { fetch: "DBK.DE",  tv: "XETR:DBK",  display: "DBK",  name: "Deutsche Bank AG",         exchange: "XETRA", currency: "EUR", region: "DE" },
  DTE:    { fetch: "DTE.DE",  tv: "XETR:DTE",  display: "DTE",  name: "Deutsche Telekom AG",      exchange: "XETRA", currency: "EUR", region: "DE" },
  SIE:    { fetch: "SIE.DE",  tv: "XETR:SIE",  display: "SIE",  name: "Siemens AG",               exchange: "XETRA", currency: "EUR", region: "DE" },
  VOW3:   { fetch: "VOW3.DE", tv: "XETR:VOW3", display: "VOW3", name: "Volkswagen AG",            exchange: "XETRA", currency: "EUR", region: "DE" },
  ADS:    { fetch: "ADS.DE",  tv: "XETR:ADS",  display: "ADS",  name: "Adidas AG",                exchange: "XETRA", currency: "EUR", region: "DE" },
  BAS:    { fetch: "BAS.DE",  tv: "XETR:BAS",  display: "BAS",  name: "BASF SE",                  exchange: "XETRA", currency: "EUR", region: "DE" },
  BAYN:   { fetch: "BAYN.DE", tv: "XETR:BAYN", display: "BAYN", name: "Bayer AG",                 exchange: "XETRA", currency: "EUR", region: "DE" },
  CBK:    { fetch: "CBK.DE",  tv: "XETR:CBK",  display: "CBK",  name: "Commerzbank AG",           exchange: "XETRA", currency: "EUR", region: "DE" },
  CON:    { fetch: "CON.DE",  tv: "XETR:CON",  display: "CON",  name: "Continental AG",           exchange: "XETRA", currency: "EUR", region: "DE" },
  EOAN:   { fetch: "EOAN.DE", tv: "XETR:EOAN", display: "EOAN", name: "E.ON SE",                  exchange: "XETRA", currency: "EUR", region: "DE" },
  FRE:    { fetch: "FRE.DE",  tv: "XETR:FRE",  display: "FRE",  name: "Fresenius SE & Co. KGaA", exchange: "XETRA", currency: "EUR", region: "DE" },
  HEN3:   { fetch: "HEN3.DE", tv: "XETR:HEN3", display: "HEN3", name: "Henkel AG & Co. KGaA",    exchange: "XETRA", currency: "EUR", region: "DE" },
  IFX:    { fetch: "IFX.DE",  tv: "XETR:IFX",  display: "IFX",  name: "Infineon Technologies AG", exchange: "XETRA", currency: "EUR", region: "DE" },
  LHA:    { fetch: "LHA.DE",  tv: "XETR:LHA",  display: "LHA",  name: "Deutsche Lufthansa AG",    exchange: "XETRA", currency: "EUR", region: "DE" },
  MRK:    { fetch: "MRK.DE",  tv: "XETR:MRK",  display: "MRK",  name: "Merck KGaA",               exchange: "XETRA", currency: "EUR", region: "DE" },
  MTX:    { fetch: "MTX.DE",  tv: "XETR:MTX",  display: "MTX",  name: "MTU Aero Engines AG",      exchange: "XETRA", currency: "EUR", region: "DE" },
  P911:   { fetch: "P911.DE", tv: "XETR:P911", display: "P911", name: "Porsche AG",               exchange: "XETRA", currency: "EUR", region: "DE" },
  PUM:    { fetch: "PUM.DE",  tv: "XETR:PUM",  display: "PUM",  name: "Puma SE",                  exchange: "XETRA", currency: "EUR", region: "DE" },
  RWE:    { fetch: "RWE.DE",  tv: "XETR:RWE",  display: "RWE",  name: "RWE AG",                   exchange: "XETRA", currency: "EUR", region: "DE" },
  ZAL:    { fetch: "ZAL.DE",  tv: "XETR:ZAL",  display: "ZAL",  name: "Zalando SE",               exchange: "XETRA", currency: "EUR", region: "DE" },
  BEI:    { fetch: "BEI.DE",  tv: "XETR:BEI",  display: "BEI",  name: "Beiersdorf AG",            exchange: "XETRA", currency: "EUR", region: "DE" },
  HEI:    { fetch: "HEI.DE",  tv: "XETR:HEI",  display: "HEI",  name: "HeidelbergCement AG",      exchange: "XETRA", currency: "EUR", region: "DE" },
  ENR:    { fetch: "ENR.DE",  tv: "XETR:ENR",  display: "ENR",  name: "Siemens Energy AG",        exchange: "XETRA", currency: "EUR", region: "DE" },
  DPW:    { fetch: "DPW.DE",  tv: "XETR:DPW",  display: "DPW",  name: "Deutsche Post AG",         exchange: "XETRA", currency: "EUR", region: "DE" },
  VNA:    { fetch: "VNA.DE",  tv: "XETR:VNA",  display: "VNA",  name: "Vonovia SE",               exchange: "XETRA", currency: "EUR", region: "DE" },
};

const NAME_ALIASES: Record<string, string> = {
  "BMW": "BMW", "BAYERISCHE MOTOREN WERKE": "BMW",
  "MERCEDES": "MBG", "MERCEDES-BENZ": "MBG", "DAIMLER": "MBG",
  "VOLKSWAGEN": "VOW3", "VW": "VOW3",
  "SIEMENS": "SIE", "ALLIANZ": "ALV", "BAYER": "BAYN", "BASF": "BAS",
  "ADIDAS": "ADS", "TELEKOM": "DTE", "DEUTSCHE TELEKOM": "DTE",
  "DEUTSCHE BANK": "DBK", "COMMERZBANK": "CBK", "LUFTHANSA": "LHA",
  "INFINEON": "IFX", "PORSCHE": "P911", "PUMA": "PUM", "ZALANDO": "ZAL",
  "BEIERSDORF": "BEI", "MERCK": "MRK", "CONTINENTAL": "CON",
  "EON": "EOAN", "E.ON": "EOAN", "MTU": "MTX", "HENKEL": "HEN3",
  "FRESENIUS": "FRE", "RWE": "RWE", "SAP": "SAP",
  "SIEMENS ENERGY": "ENR", "DEUTSCHE POST": "DPW", "VONOVIA": "VNA",
};

export function resolveTickerConfig(raw: string): TickerConfig | null {
  const upper = raw.toUpperCase().trim();
  if (GERMAN_TICKER_MAP[upper]) return GERMAN_TICKER_MAP[upper];
  const canonical = NAME_ALIASES[upper];
  if (canonical && GERMAN_TICKER_MAP[canonical]) return GERMAN_TICKER_MAP[canonical];
  const stripped = upper.replace(/\.(DE|F|BE|HM|MU|SG|ETR|XETR)$/i, "");
  if (GERMAN_TICKER_MAP[stripped]) return GERMAN_TICKER_MAP[stripped];
  const withoutPrefix = upper.replace(/^(XETR|FWB|FSX):/i, "");
  if (GERMAN_TICKER_MAP[withoutPrefix]) return GERMAN_TICKER_MAP[withoutPrefix];
  return null;
}

export function getFetchSymbol(raw: string): string {
  const config = resolveTickerConfig(raw);
  if (config) return config.fetch;
  return raw.toUpperCase().replace(/\.(DE|F|BE|HM|MU|SG|ETR)$/i, "");
}

export function getTVSymbol(raw: string): string {
  const config = resolveTickerConfig(raw);
  if (config) return config.tv;
  return raw.toUpperCase();
}

export function getTickerDisplay(raw: string): { display: string; name: string; exchange: string; currency: string } {
  const config = resolveTickerConfig(raw);
  if (config) return { display: config.display, name: config.name, exchange: config.exchange, currency: config.currency };
  return { display: raw.toUpperCase(), name: raw.toUpperCase(), exchange: "NYSE/NASDAQ", currency: "USD" };
}

export function searchTickers(query: string): { symbol: string; name: string; exchange: string }[] {
  const q = query.toUpperCase().trim();
  if (!q) return [];
  const results: { symbol: string; name: string; exchange: string }[] = [];
  for (const [key, config] of Object.entries(GERMAN_TICKER_MAP)) {
    if (key.startsWith(q) || config.name.toUpperCase().includes(q)) {
      results.push({ symbol: key, name: config.name, exchange: config.exchange });
    }
  }
  for (const [alias, canonical] of Object.entries(NAME_ALIASES)) {
    if (alias.startsWith(q) && !results.find(r => r.symbol === canonical)) {
      const config = GERMAN_TICKER_MAP[canonical];
      if (config) results.push({ symbol: canonical, name: config.name, exchange: config.exchange });
    }
  }
  return results.slice(0, 8);
}

export { GERMAN_TICKER_MAP };
