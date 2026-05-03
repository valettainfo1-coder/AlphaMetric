"use client";
// ═══════════════════════════════════════════════════════════════════
// /watchlists — WATCHLIST ECOSYSTEM (Epic 3)
//
// Custom watchlists stored in localStorage.
// - Tabs: switch between lists (Main, US Tech, Dividenden, custom)
// - Create New List button
// - Professional table: Logo, Name, Ticker, Exchange, Live Price, 24h %
// - Live price fetch respects exchange suffix (.DE, .L, etc.)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import {
  Plus, Trash2, Star, TrendingUp, TrendingDown,
  RefreshCw, X, Edit2, ChevronRight,
} from "lucide-react";
import { resolveEntry, EXCHANGES, type MIC } from "@/lib/exchange-registry";

// ─── TYPES ───────────────────────────────────────────────────────
interface WatchlistItem {
  symbol:   string;
  exchange: MIC;
}

interface Watchlist {
  name:  string;
  items: string[];  // "SYMBOL:EXCHANGE" keys
}

interface LiveQuote {
  price:    number;
  change:   number;
  changePct: number;
  name:     string;
  currency: string;
  sector:   string;
  logo:     string;
}

// ─── STOCK SUGGESTIONS FOR BEGINNERS ────────────────────────────
const SUGGESTIONS: { label: string; items: { symbol: string; exchange: string; name: string }[] }[] = [
  {
    label: "Blue Chips USA",
    items: [
      { symbol: "AAPL", exchange: "NASDAQ", name: "Apple Inc." },
      { symbol: "MSFT", exchange: "NASDAQ", name: "Microsoft Corp." },
      { symbol: "GOOGL", exchange: "NASDAQ", name: "Alphabet Inc." },
      { symbol: "AMZN", exchange: "NASDAQ", name: "Amazon.com Inc." },
      { symbol: "JPM", exchange: "NYSE", name: "JPMorgan Chase" },
    ],
  },
  {
    label: "Dividenden-Stars",
    items: [
      { symbol: "JNJ", exchange: "NYSE", name: "Johnson & Johnson" },
      { symbol: "PG", exchange: "NYSE", name: "Procter & Gamble" },
      { symbol: "KO", exchange: "NYSE", name: "Coca-Cola Co." },
      { symbol: "PEP", exchange: "NASDAQ", name: "PepsiCo Inc." },
      { symbol: "ABBV", exchange: "NYSE", name: "AbbVie Inc." },
    ],
  },
  {
    label: "Wachstum & Tech",
    items: [
      { symbol: "NVDA", exchange: "NASDAQ", name: "NVIDIA Corp." },
      { symbol: "TSLA", exchange: "NASDAQ", name: "Tesla Inc." },
      { symbol: "META", exchange: "NASDAQ", name: "Meta Platforms" },
      { symbol: "NFLX", exchange: "NASDAQ", name: "Netflix Inc." },
      { symbol: "AMD", exchange: "NASDAQ", name: "Adv. Micro Devices" },
    ],
  },
  {
    label: "DAX / Europa",
    items: [
      { symbol: "SAP", exchange: "XETRA", name: "SAP SE" },
      { symbol: "ALV", exchange: "XETRA", name: "Allianz SE" },
      { symbol: "SIE", exchange: "XETRA", name: "Siemens AG" },
      { symbol: "DTE", exchange: "XETRA", name: "Deutsche Telekom" },
      { symbol: "ASML", exchange: "NASDAQ", name: "ASML Holding" },
    ],
  },
];

// ─── THEME-BASED AUTO-SUGGESTIONS ───────────────────────────────
// Wird automatisch vorgeschlagen wenn der Listenname passt (z.B. "Banking")
type SuggestionItem = { symbol: string; exchange: string; name: string };
type Region = { label: string; items: SuggestionItem[] };
type ThemedSuggestion = {
  label: string;
  keywords: RegExp;
  rationale: string;
  items: SuggestionItem[];
  regions?: Region[];
};

// Banking-Regionen — werden zu items[] aggregiert, aber regional getrennt angezeigt.
const BANKING_REGIONS: Region[] = [
  {
    label: "USA",
    items: [
      { symbol: "JPM",   exchange: "NYSE",   name: "JPMorgan Chase" },
      { symbol: "BAC",   exchange: "NYSE",   name: "Bank of America" },
      { symbol: "GS",    exchange: "NYSE",   name: "Goldman Sachs" },
      { symbol: "MS",    exchange: "NYSE",   name: "Morgan Stanley" },
      { symbol: "WFC",   exchange: "NYSE",   name: "Wells Fargo" },
      { symbol: "C",     exchange: "NYSE",   name: "Citigroup" },
      { symbol: "BK",    exchange: "NYSE",   name: "BNY Mellon" },
      { symbol: "BLK",   exchange: "NYSE",   name: "BlackRock" },
      { symbol: "SCHW",  exchange: "NYSE",   name: "Charles Schwab" },
      { symbol: "AXP",   exchange: "NYSE",   name: "American Express" },
      { symbol: "V",     exchange: "NYSE",   name: "Visa Inc." },
      { symbol: "MA",    exchange: "NYSE",   name: "Mastercard" },
    ],
  },
  {
    label: "Europa",
    items: [
      { symbol: "DBK",   exchange: "XETRA",  name: "Deutsche Bank" },
      { symbol: "CBK",   exchange: "XETRA",  name: "Commerzbank" },
      { symbol: "ALV",   exchange: "XETRA",  name: "Allianz SE" },
      { symbol: "MUV2",  exchange: "XETRA",  name: "Munich Re" },
      { symbol: "DB1",   exchange: "XETRA",  name: "Deutsche Börse" },
      { symbol: "BNP",   exchange: "EPA",    name: "BNP Paribas" },
      { symbol: "ACA",   exchange: "EPA",    name: "Crédit Agricole" },
      { symbol: "SAN",   exchange: "BME",    name: "Banco Santander" },
      { symbol: "BBVA",  exchange: "BME",    name: "BBVA" },
      { symbol: "ISP",   exchange: "BIT",    name: "Intesa Sanpaolo" },
      { symbol: "UCG",   exchange: "BIT",    name: "UniCredit" },
      { symbol: "HSBA",  exchange: "LSE",    name: "HSBC Holdings" },
      { symbol: "BARC",  exchange: "LSE",    name: "Barclays" },
      { symbol: "UBSG",  exchange: "SWX",    name: "UBS Group" },
      { symbol: "ING",   exchange: "AMS",    name: "ING Groep" },
    ],
  },
  {
    label: "Asien",
    items: [
      { symbol: "8306",  exchange: "TSE",    name: "Mitsubishi UFJ" },
      { symbol: "8316",  exchange: "TSE",    name: "Sumitomo Mitsui" },
      { symbol: "8411",  exchange: "TSE",    name: "Mizuho Financial" },
      { symbol: "1398",  exchange: "HKEX",   name: "ICBC" },
      { symbol: "0939",  exchange: "HKEX",   name: "China Construction Bank" },
      { symbol: "3988",  exchange: "HKEX",   name: "Bank of China" },
      { symbol: "0005",  exchange: "HKEX",   name: "HSBC Hong Kong" },
      { symbol: "DBS",   exchange: "SGX",    name: "DBS Group" },
      { symbol: "U11",   exchange: "SGX",    name: "UOB" },
      { symbol: "HDFCBANK", exchange: "NSE", name: "HDFC Bank" },
      { symbol: "ICICIBANK", exchange: "NSE", name: "ICICI Bank" },
    ],
  },
];

const THEMED_SUGGESTIONS: ThemedSuggestion[] = [
  {
    label: "Banking & Finanzen",
    keywords: /bank|finanz|financ|kredit|versicher|insuranc|fintech/i,
    rationale: "Großbanken USA · Europa · Asien — Zinsprofiteure, Dividendenanker, globale Diversifikation",
    items: BANKING_REGIONS.flatMap(r => r.items),
    regions: BANKING_REGIONS,
  },
  {
    label: "AI & Halbleiter",
    keywords: /\b(ai|ki|artificial|halbleiter|semiconductor|chip|gpu)\b/i,
    rationale: "KI-Infrastruktur und Chip-Hersteller, Wachstums-Core",
    items: [
      { symbol: "NVDA", exchange: "NASDAQ", name: "NVIDIA" },
      { symbol: "AMD",  exchange: "NASDAQ", name: "Adv. Micro Devices" },
      { symbol: "TSM",  exchange: "NYSE",   name: "TSMC" },
      { symbol: "ASML", exchange: "NASDAQ", name: "ASML Holding" },
      { symbol: "AVGO", exchange: "NASDAQ", name: "Broadcom" },
      { symbol: "MU",   exchange: "NASDAQ", name: "Micron Technology" },
      { symbol: "ARM",  exchange: "NASDAQ", name: "ARM Holdings" },
      { symbol: "MSFT", exchange: "NASDAQ", name: "Microsoft" },
      { symbol: "GOOGL",exchange: "NASDAQ", name: "Alphabet" },
    ],
  },
  {
    label: "Energie & Öl",
    keywords: /energ|(ö|oe|o)l\b|oil|gas\b|petroleum|brent|wti/i,
    rationale: "Big-Oil Majors + Gas-Pipeline, Cashflow-stark",
    items: [
      { symbol: "XOM",  exchange: "NYSE",   name: "ExxonMobil" },
      { symbol: "CVX",  exchange: "NYSE",   name: "Chevron" },
      { symbol: "SHEL", exchange: "NYSE",   name: "Shell plc" },
      { symbol: "BP",   exchange: "NYSE",   name: "BP" },
      { symbol: "TTE",  exchange: "NYSE",   name: "TotalEnergies" },
      { symbol: "COP",  exchange: "NYSE",   name: "ConocoPhillips" },
      { symbol: "EQNR", exchange: "NYSE",   name: "Equinor" },
      { symbol: "OXY",  exchange: "NYSE",   name: "Occidental" },
    ],
  },
  {
    label: "Erneuerbare Energien",
    keywords: /erneuer|renewable|solar|wind|clean.?energy|green|hydrogen|wasserstoff/i,
    rationale: "Solar, Wind, Wasserstoff & Clean-Tech Champions",
    items: [
      { symbol: "ENPH", exchange: "NASDAQ", name: "Enphase Energy" },
      { symbol: "FSLR", exchange: "NASDAQ", name: "First Solar" },
      { symbol: "NEE",  exchange: "NYSE",   name: "NextEra Energy" },
      { symbol: "ORSTED", exchange: "CSE",  name: "Ørsted" },
      { symbol: "VWS",  exchange: "CSE",    name: "Vestas Wind" },
      { symbol: "PLUG", exchange: "NASDAQ", name: "Plug Power" },
      { symbol: "NEL",  exchange: "OSL",    name: "Nel ASA" },
    ],
  },
  {
    label: "Gesundheit & Pharma",
    keywords: /gesund|health|pharma|biotech|medizin|medic/i,
    rationale: "Pharma-Giganten + Medtech, defensiv & dividendenstark",
    items: [
      { symbol: "JNJ",  exchange: "NYSE",   name: "Johnson & Johnson" },
      { symbol: "LLY",  exchange: "NYSE",   name: "Eli Lilly" },
      { symbol: "UNH",  exchange: "NYSE",   name: "UnitedHealth" },
      { symbol: "PFE",  exchange: "NYSE",   name: "Pfizer" },
      { symbol: "MRK",  exchange: "NYSE",   name: "Merck & Co." },
      { symbol: "NOVO-B", exchange: "CSE",  name: "Novo Nordisk" },
      { symbol: "SAN",  exchange: "NYSE",   name: "Sanofi" },
      { symbol: "AZN",  exchange: "NASDAQ", name: "AstraZeneca" },
    ],
  },
  {
    label: "Luxus & Konsum",
    keywords: /luxus|luxury|konsum|consumer|retail|fashion|marke/i,
    rationale: "Globale Premium-Marken mit Preissetzungsmacht",
    items: [
      { symbol: "LVMH", exchange: "EPA",    name: "LVMH" },
      { symbol: "MC",   exchange: "EPA",    name: "LVMH" },
      { symbol: "RMS",  exchange: "EPA",    name: "Hermès" },
      { symbol: "CFR",  exchange: "SWX",    name: "Richemont" },
      { symbol: "KER",  exchange: "EPA",    name: "Kering" },
      { symbol: "NKE",  exchange: "NYSE",   name: "Nike" },
      { symbol: "COST", exchange: "NASDAQ", name: "Costco" },
    ],
  },
  {
    label: "Cloud & SaaS",
    keywords: /cloud|saas|software|enterprise/i,
    rationale: "Hyperscaler und Enterprise-SaaS mit hohem ARR-Wachstum",
    items: [
      { symbol: "MSFT", exchange: "NASDAQ", name: "Microsoft" },
      { symbol: "AMZN", exchange: "NASDAQ", name: "Amazon" },
      { symbol: "GOOGL",exchange: "NASDAQ", name: "Alphabet" },
      { symbol: "CRM",  exchange: "NYSE",   name: "Salesforce" },
      { symbol: "ORCL", exchange: "NYSE",   name: "Oracle" },
      { symbol: "NOW",  exchange: "NYSE",   name: "ServiceNow" },
      { symbol: "SNOW", exchange: "NYSE",   name: "Snowflake" },
      { symbol: "ADBE", exchange: "NASDAQ", name: "Adobe" },
    ],
  },
  {
    label: "Verteidigung & Defense",
    keywords: /verteidigung|defense|r(ü|ue)stung|militar|aerospace|arms/i,
    rationale: "Defense-Primes mit langfristigen Staatsaufträgen",
    items: [
      { symbol: "LMT",  exchange: "NYSE",   name: "Lockheed Martin" },
      { symbol: "RTX",  exchange: "NYSE",   name: "RTX Corp." },
      { symbol: "NOC",  exchange: "NYSE",   name: "Northrop Grumman" },
      { symbol: "GD",   exchange: "NYSE",   name: "General Dynamics" },
      { symbol: "BA",   exchange: "NYSE",   name: "Boeing" },
      { symbol: "RHM",  exchange: "XETRA",  name: "Rheinmetall" },
      { symbol: "BAE",  exchange: "LSE",    name: "BAE Systems" },
    ],
  },
  {
    label: "Krypto & Blockchain",
    keywords: /krypto|crypto|bitcoin|btc|blockchain|ethereum/i,
    rationale: "Krypto-Exchange, Miner und BTC-Treasury-Plays",
    items: [
      { symbol: "COIN", exchange: "NASDAQ", name: "Coinbase" },
      { symbol: "MSTR", exchange: "NASDAQ", name: "MicroStrategy" },
      { symbol: "MARA", exchange: "NASDAQ", name: "Marathon Digital" },
      { symbol: "RIOT", exchange: "NASDAQ", name: "Riot Platforms" },
      { symbol: "HOOD", exchange: "NASDAQ", name: "Robinhood" },
    ],
  },
  {
    label: "REITs & Immobilien",
    keywords: /reit|immobil|real.?estate|property|wohnen/i,
    rationale: "Qualitäts-REITs mit regelmäßigen Ausschüttungen",
    items: [
      { symbol: "O",    exchange: "NYSE",   name: "Realty Income" },
      { symbol: "PLD",  exchange: "NYSE",   name: "Prologis" },
      { symbol: "AMT",  exchange: "NYSE",   name: "American Tower" },
      { symbol: "EQIX", exchange: "NASDAQ", name: "Equinix" },
      { symbol: "SPG",  exchange: "NYSE",   name: "Simon Property" },
      { symbol: "VNA",  exchange: "XETRA",  name: "Vonovia" },
    ],
  },
  {
    label: "E-Mobilität & Auto",
    keywords: /auto|automotiv|ev\b|elektro|mobilit|tesla|car/i,
    rationale: "EV-Pure-Plays und klassische OEMs im Umbruch",
    items: [
      { symbol: "TSLA", exchange: "NASDAQ", name: "Tesla" },
      { symbol: "BYDDY",exchange: "OTC",    name: "BYD Company" },
      { symbol: "RIVN", exchange: "NASDAQ", name: "Rivian" },
      { symbol: "MBG",  exchange: "XETRA",  name: "Mercedes-Benz" },
      { symbol: "BMW",  exchange: "XETRA",  name: "BMW" },
      { symbol: "VOW3", exchange: "XETRA",  name: "Volkswagen" },
      { symbol: "P911", exchange: "XETRA",  name: "Porsche AG" },
    ],
  },
];

function detectTheme(name: string): ThemedSuggestion | null {
  const n = name.trim();
  if (!n) return null;
  for (const t of THEMED_SUGGESTIONS) if (t.keywords.test(n)) return t;
  return null;
}

// ─── HELPERS ─────────────────────────────────────────────────────
function parseKey(key: string): WatchlistItem {
  const [symbol, exchange] = key.split(":");
  return { symbol: symbol ?? "", exchange: (exchange ?? "NASDAQ") as MIC };
}

const STORAGE_KEY = "am_watchlists";

function loadWatchlists(): Watchlist[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
  const defaults: Watchlist[] = [
    { name: "Main", items: [] },
    { name: "US Tech", items: [] },
    { name: "Dividenden", items: [] },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveWatchlists(lists: Watchlist[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function WatchlistsPage() {
  const [lists, setLists] = useState<Watchlist[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showAddStock, setShowAddStock] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [editingName, setEditingName] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  // Load from localStorage
  useEffect(() => { setLists(loadWatchlists()); }, []);

  const activeList = lists[activeTab] ?? { name: "", items: [] };

  // Fetch live quotes for active list
  const fetchQuotes = useCallback(async () => {
    if (activeList.items.length === 0) return;
    setLoadingQuotes(true);
    const newQuotes: Record<string, LiveQuote> = {};

    await Promise.all(
      activeList.items.map(async (key) => {
        const { symbol, exchange } = parseKey(key);
        const entry = resolveEntry(symbol, exchange);
        try {
          const res = await fetch(`/api/quote?symbol=${encodeURIComponent(entry.fetchSymbol)}`);
          if (res.ok) {
            const data = await res.json();
            newQuotes[key] = {
              price:     data.quote?.c ?? 0,
              change:    data.quote?.d ?? 0,
              changePct: data.quote?.dp ?? 0,
              name:      data.profile?.name ?? entry.name,
              currency:  data.currency ?? EXCHANGES[exchange].currency,
              sector:    data.sector ?? entry.sector,
              logo:      data.profile?.logo ?? "",
            };
          }
        } catch { /* skip */ }
      })
    );

    setQuotes(prev => ({ ...prev, ...newQuotes }));
    setLoadingQuotes(false);
  }, [activeList.items]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  // ── List management ──
  const updateLists = (updated: Watchlist[]) => {
    setLists(updated);
    saveWatchlists(updated);
  };

  const createList = () => {
    const name = newListName.trim();
    if (!name) return;
    const updated = [...lists, { name, items: [] }];
    updateLists(updated);
    setActiveTab(updated.length - 1);
    setNewListName("");
    setShowCreateModal(false);
  };

  const deleteList = (idx: number) => {
    if (lists.length <= 1) return; // keep at least one
    const updated = lists.filter((_, i) => i !== idx);
    updateLists(updated);
    setActiveTab(Math.min(activeTab, updated.length - 1));
  };

  const renameList = (idx: number) => {
    if (!editName.trim()) return;
    const updated = lists.map((l, i) => i === idx ? { ...l, name: editName.trim() } : l);
    updateLists(updated);
    setEditingName(null);
  };

  const addStockToList = () => {
    const raw = addInput.trim().toUpperCase();
    if (!raw) return;
    // Parse "AAPL" or "AAPL:NASDAQ" or "ALV:XETRA"
    let symbol = raw;
    let exchange: MIC | undefined;
    if (raw.includes(":")) {
      const parts = raw.split(":");
      symbol = parts[0];
      exchange = parts[1] as MIC;
    }
    const entry = resolveEntry(symbol, exchange);
    const key = `${entry.symbol}:${entry.exchange}`;
    if (activeList.items.includes(key)) { setAddInput(""); setShowAddStock(false); return; }

    const updated = lists.map((l, i) =>
      i === activeTab ? { ...l, items: [...l.items, key] } : l
    );
    updateLists(updated);
    setAddInput("");
    setShowAddStock(false);
  };

  const removeFromList = (key: string) => {
    const updated = lists.map((l, i) =>
      i === activeTab ? { ...l, items: l.items.filter(k => k !== key) } : l
    );
    updateLists(updated);
  };

  const formatPrice = (v: number, cur: string) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(v);

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif", minHeight: "100vh", background: "#f8fafc" }}>
      <style>{`
        @media (max-width: 768px) {
          .wl-layout { flex-direction: column !important; }
          .wl-sidebar { width: 100% !important; flex-direction: row !important; overflow-x: auto !important; padding: 12px !important; gap: 8px !important; border-right: none !important; border-bottom: 1px solid #e5e7eb !important; }
          .wl-sidebar-item { white-space: nowrap !important; }
          .wl-table-row { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em" }}>Watchlists</h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Beobachte Aktien in benutzerdefinierten Listen mit Live-Kursen.</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 16px",
            borderRadius: 10, background: "#0f172a", border: "none", color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            <Plus size={14} /> Neue Liste
          </button>
        </div>

        <div className="wl-layout" style={{
          display: "flex", gap: 0,
          background: "var(--am-card)",
          borderRadius: 16,
          border: "1px solid var(--am-border)",
          overflow: "hidden",
          boxShadow: "var(--am-shadow-lg)",
          isolation: "isolate",
        }}>

          {/* ── SIDEBAR / TABS ── */}
          <div className="wl-sidebar" style={{
            width: 240, flexShrink: 0,
            borderRight: "1px solid var(--am-border)",
            padding: "16px 0",
            display: "flex", flexDirection: "column", gap: 2,
            background: "var(--am-card-soft)",
            position: "relative",
            zIndex: 1,
          }}>
            {lists.map((list, i) => (
              <div key={i} className="wl-sidebar-item" style={{ position: "relative" }}>
                {editingName === i ? (
                  <div style={{ display: "flex", gap: 4, padding: "4px 12px" }}>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && renameList(i)}
                      autoFocus style={{
                        flex: 1, fontSize: 13, padding: "6px 8px", border: "1px solid #3b82f6",
                        borderRadius: 6, outline: "none", fontFamily: "inherit",
                      }} />
                    <button onClick={() => renameList(i)} style={{
                      padding: "4px 8px", background: "#0f172a", border: "none", color: "#fff",
                      borderRadius: 6, fontSize: 11, cursor: "pointer",
                    }}>OK</button>
                  </div>
                ) : (
                  <div onClick={() => setActiveTab(i)} role="button" tabIndex={0} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "10px 14px", border: "none",
                    background: i === activeTab ? "var(--am-card-hover)" : "transparent",
                    borderLeft: i === activeTab ? "3px solid var(--am-accent)" : "3px solid transparent",
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    transition: "background 0.15s ease",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    gap: 6,
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      flex: 1, minWidth: 0, overflow: "hidden",
                    }}>
                      <Star size={14} color={i === activeTab ? "var(--am-text)" : "var(--am-text-ghost)"} fill={i === activeTab ? "currentColor" : "none"} style={{ flexShrink: 0 }} />
                      <span style={{
                        fontSize: 13, fontWeight: i === activeTab ? 700 : 500,
                        color: i === activeTab ? "var(--am-text)" : "var(--am-text-muted)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        minWidth: 0,
                      }}>
                        {list.name}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--am-text-faint)", fontWeight: 600, flexShrink: 0 }}>
                        {list.items.length}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); setEditingName(i); setEditName(list.name); }} style={{
                        background: "transparent", border: "none", cursor: "pointer", padding: 2, opacity: 0.4,
                      }}>
                        <Edit2 size={11} color="#6b7280" />
                      </button>
                      {lists.length > 1 && (
                        <button onClick={e => { e.stopPropagation(); deleteList(i); }} style={{
                          background: "transparent", border: "none", cursor: "pointer", padding: 2, opacity: 0.4,
                        }}>
                          <Trash2 size={11} color="#ef4444" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── MAIN CONTENT ── */}
          <div style={{ flex: 1, minHeight: 400, minWidth: 0, background: "var(--am-card)", position: "relative", zIndex: 0 }}>
            {/* Header bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 24px", borderBottom: "1px solid var(--am-border-light)",
              background: "var(--am-card)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{activeList.name}</h2>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
                  {activeList.items.length} Aktien
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={fetchQuotes} disabled={loadingQuotes} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                  borderRadius: 8, background: "#f1f5f9", border: "1px solid #e5e7eb",
                  fontSize: 11, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit",
                }}>
                  <RefreshCw size={12} className={loadingQuotes ? "spin" : ""} /> Aktualisieren
                </button>
                <button onClick={() => setShowAddStock(true)} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                  borderRadius: 8, background: "#0f172a", border: "none",
                  fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit",
                }}>
                  <Plus size={12} /> Aktie hinzufügen
                </button>
              </div>
            </div>

            {/* Add stock input */}
            {showAddStock && (
              <div style={{
                display: "flex", gap: 8, padding: "12px 20px",
                background: "#f9fafb", borderBottom: "1px solid #f3f4f6",
              }}>
                <input
                  value={addInput} onChange={e => setAddInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addStockToList()}
                  placeholder="Ticker eingeben — z.B. AAPL, ALV:XETRA, BMW:XETRA"
                  autoFocus
                  style={{
                    flex: 1, padding: "9px 14px", border: "1px solid #e5e7eb",
                    borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "inherit",
                  }}
                />
                <button onClick={addStockToList} style={{
                  padding: "9px 16px", background: "#0f172a", border: "none",
                  borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  Hinzufügen
                </button>
                <button onClick={() => { setShowAddStock(false); setAddInput(""); }} style={{
                  padding: "9px", background: "#f3f4f6", border: "none",
                  borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center",
                }}>
                  <X size={16} color="#6b7280" />
                </button>
              </div>
            )}

            {/* Persistent Themed Suggestion Panel — always visible while the list still has room. */}
            {(() => {
              const theme = detectTheme(activeList.name);
              if (!theme) return null;
              if (activeList.items.length >= 50) return null;
              const remaining = theme.items.filter(s => !activeList.items.includes(`${s.symbol}:${s.exchange}`));
              if (remaining.length === 0) return null;
              return (
                <div style={{
                  margin: "16px 20px 8px",
                  padding: "16px 18px",
                  borderRadius: 14,
                  border: "1px solid var(--am-border)",
                  background: "linear-gradient(180deg, var(--am-card-soft), var(--am-card))",
                  backdropFilter: "blur(18px) saturate(160%)",
                  WebkitBackdropFilter: "blur(18px) saturate(160%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px -18px rgba(0,0,0,0.15)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--am-text-faint)", margin: 0, textTransform: "uppercase" }}>
                        Vorschläge für „{activeList.name}"
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--am-text)", margin: "2px 0 0", letterSpacing: "-0.01em" }}>
                        {theme.label} · {remaining.length} weitere
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newItems = remaining.map(s => `${s.symbol}:${s.exchange}`);
                        const merged = [...new Set([...activeList.items, ...newItems])];
                        const updated = lists.map((l, i) => i === activeTab ? { ...l, items: merged } : l);
                        updateLists(updated);
                      }}
                      style={{
                        padding: "7px 14px", borderRadius: 9, fontSize: 11, fontWeight: 700,
                        background: "var(--am-accent, #0f172a)",
                        color: "var(--am-accent-text, #fff)",
                        border: "1px solid var(--am-border)",
                        cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em",
                      }}
                    >
                      Alle {remaining.length} hinzufügen
                    </button>
                  </div>
                  {theme.regions && theme.regions.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {theme.regions.map(region => {
                        const regionRemaining = region.items.filter(s => !activeList.items.includes(`${s.symbol}:${s.exchange}`));
                        if (regionRemaining.length === 0) return null;
                        return (
                          <div key={region.label}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingLeft: 2 }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, color: "var(--am-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                {region.label}
                                <span style={{ fontSize: 10, color: "var(--am-text-faint)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "none" }}>
                                  · {regionRemaining.length} Titel
                                </span>
                              </span>
                              <button
                                onClick={() => {
                                  const newItems = regionRemaining.map(s => `${s.symbol}:${s.exchange}`);
                                  const merged = [...new Set([...activeList.items, ...newItems])];
                                  const updated = lists.map((l, i) => i === activeTab ? { ...l, items: merged } : l);
                                  updateLists(updated);
                                }}
                                style={{
                                  fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 7,
                                  background: "var(--am-card)",
                                  color: "var(--am-text)",
                                  border: "1px solid var(--am-border)",
                                  cursor: "pointer", fontFamily: "inherit",
                                  letterSpacing: "0.04em", textTransform: "uppercase",
                                }}
                              >
                                Region +
                              </button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
                              {regionRemaining.map(s => {
                                const key = `${s.symbol}:${s.exchange}`;
                                return (
                                  <button
                                    key={key}
                                    onClick={() => {
                                      const updated = lists.map((l, i) => i === activeTab ? { ...l, items: [...l.items, key] } : l);
                                      updateLists(updated);
                                    }}
                                    style={{
                                      display: "flex", alignItems: "center", justifyContent: "space-between",
                                      padding: "7px 10px",
                                      borderRadius: 8,
                                      border: "1px solid var(--am-border-light, var(--am-border))",
                                      background: "var(--am-card)",
                                      cursor: "pointer",
                                      fontFamily: "inherit", textAlign: "left",
                                    }}
                                  >
                                    <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--am-text)", fontFamily: "'SF Mono', ui-monospace, Menlo, monospace" }}>{s.symbol}</span>
                                      <span style={{ fontSize: 11, color: "var(--am-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                                    </span>
                                    <Plus size={12} color="var(--am-text)" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
                      {remaining.map(s => {
                        const key = `${s.symbol}:${s.exchange}`;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              const updated = lists.map((l, i) => i === activeTab ? { ...l, items: [...l.items, key] } : l);
                              updateLists(updated);
                            }}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "7px 10px",
                              borderRadius: 8,
                              border: "1px solid var(--am-border-light, var(--am-border))",
                              background: "var(--am-card)",
                              cursor: "pointer",
                              fontFamily: "inherit", textAlign: "left",
                            }}
                          >
                            <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--am-text)", fontFamily: "'SF Mono', ui-monospace, Menlo, monospace" }}>{s.symbol}</span>
                              <span style={{ fontSize: 11, color: "var(--am-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                            </span>
                            <Plus size={12} color="var(--am-text)" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Table */}
            {activeList.items.length === 0 ? (
              <div style={{ padding: "32px 20px 40px" }}>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <Star size={36} color="var(--am-text-faint)" style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--am-text)", marginBottom: 4 }}>
                    Noch keine Aktien in dieser Liste
                  </p>
                  <p style={{ fontSize: 13, color: "var(--am-text-muted)", marginBottom: 16 }}>
                    Wähle aus den Vorschlägen oder füge manuell eine Aktie hinzu.
                  </p>
                  <button onClick={() => setShowAddStock(true)} style={{
                    padding: "9px 18px", borderRadius: 10,
                    background: "var(--am-accent, #0f172a)",
                    border: "1px solid var(--am-border)",
                    color: "var(--am-accent-text, #fff)",
                    fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                    <Plus size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Manuell hinzufügen
                  </button>
                </div>

                {/* Legacy inline theme card kept for visual parity in empty state */}
                {(() => {
                  const theme = detectTheme(activeList.name);
                  if (!theme) return null;
                  return (
                    <div style={{
                      marginBottom: 24,
                      display: "none",
                      padding: "18px 20px",
                      borderRadius: 14,
                      border: "1px solid var(--am-border)",
                      background: "linear-gradient(180deg, var(--am-card-soft), var(--am-card))",
                      backdropFilter: "blur(18px) saturate(160%)",
                      WebkitBackdropFilter: "blur(18px) saturate(160%)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px -18px rgba(0,0,0,0.15)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--am-text-faint)", margin: 0, textTransform: "uppercase" }}>
                            Auto-Match für „{activeList.name}"
                          </p>
                          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--am-text)", margin: "2px 0 0", letterSpacing: "-0.01em" }}>
                            {theme.label}
                          </p>
                          <p style={{ fontSize: 12, color: "var(--am-text-muted)", margin: "3px 0 0", lineHeight: 1.55 }}>
                            {theme.rationale}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const newItems = theme.items.map(s => `${s.symbol}:${s.exchange}`);
                            const merged = [...new Set([...activeList.items, ...newItems])];
                            const updated = lists.map((l, i) => i === activeTab ? { ...l, items: merged } : l);
                            updateLists(updated);
                          }}
                          style={{
                            padding: "9px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                            background: "var(--am-accent, #0f172a)",
                            color: "var(--am-accent-text, #fff)",
                            border: "1px solid var(--am-border)",
                            cursor: "pointer", fontFamily: "inherit",
                            letterSpacing: "0.02em",
                          }}
                        >
                          Alle {theme.items.length} hinzufügen
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
                        {theme.items.map(s => {
                          const key = `${s.symbol}:${s.exchange}`;
                          const alreadyAdded = activeList.items.includes(key);
                          return (
                            <button
                              key={key}
                              disabled={alreadyAdded}
                              onClick={() => {
                                if (alreadyAdded) return;
                                const updated = lists.map((l, i) => i === activeTab ? { ...l, items: [...l.items, key] } : l);
                                updateLists(updated);
                              }}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "7px 10px",
                                borderRadius: 8,
                                border: "1px solid var(--am-border-light, var(--am-border))",
                                background: alreadyAdded ? "var(--am-card-soft)" : "var(--am-card)",
                                cursor: alreadyAdded ? "default" : "pointer",
                                opacity: alreadyAdded ? 0.55 : 1,
                                fontFamily: "inherit", textAlign: "left",
                              }}
                            >
                              <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--am-text)", fontFamily: "'SF Mono', ui-monospace, Menlo, monospace" }}>{s.symbol}</span>
                                <span style={{ fontSize: 11, color: "var(--am-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                              </span>
                              <Plus size={12} color={alreadyAdded ? "var(--am-text-faint)" : "var(--am-text)"} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Suggestions */}
                <div style={{ borderTop: "1px solid var(--am-border-light, var(--am-border))", paddingTop: 24 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--am-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, paddingLeft: 4 }}>
                    Weitere Vorschläge
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                    {SUGGESTIONS.map(group => (
                      <div key={group.label} style={{
                        border: "1px solid var(--am-border)",
                        borderRadius: 12, padding: "14px 16px",
                        background: "var(--am-card-soft)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--am-text)" }}>{group.label}</span>
                          <button
                            onClick={() => {
                              const newItems = group.items.map(s => `${s.symbol}:${s.exchange}`);
                              const merged = [...new Set([...activeList.items, ...newItems])];
                              const updated = lists.map((l, i) => i === activeTab ? { ...l, items: merged } : l);
                              updateLists(updated);
                            }}
                            style={{
                              fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
                              background: "var(--am-accent, #0f172a)",
                              color: "var(--am-accent-text, #fff)",
                              border: "1px solid var(--am-border)",
                              cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            Alle +
                          </button>
                        </div>
                        {group.items.map(s => {
                          const key = `${s.symbol}:${s.exchange}`;
                          const alreadyAdded = activeList.items.includes(key);
                          return (
                            <div key={key} style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "6px 0",
                              borderTop: "1px solid var(--am-border-light, var(--am-border))",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{
                                  fontSize: 12, fontWeight: 700,
                                  color: "var(--am-text)",
                                  fontFamily: "'SF Mono','Fira Code',monospace",
                                }}>{s.symbol}</span>
                                <span style={{ fontSize: 11, color: "var(--am-text-muted)" }}>{s.name}</span>
                              </div>
                              <button
                                disabled={alreadyAdded}
                                onClick={() => {
                                  if (alreadyAdded) return;
                                  const updated = lists.map((l, i) => i === activeTab ? { ...l, items: [...l.items, key] } : l);
                                  updateLists(updated);
                                }}
                                style={{
                                  fontSize: 16, lineHeight: 1, padding: "2px 6px", borderRadius: 4,
                                  background: alreadyAdded
                                    ? "var(--am-card)"
                                    : "var(--am-green-bg, rgba(16,185,129,0.12))",
                                  color: alreadyAdded
                                    ? "var(--am-text-faint)"
                                    : "var(--am-green-text, #16a34a)",
                                  border: `1px solid ${alreadyAdded ? "var(--am-border)" : "rgba(16,185,129,0.35)"}`,
                                  cursor: alreadyAdded ? "default" : "pointer",
                                  fontWeight: 700,
                                }}
                              >
                                {alreadyAdded ? "\u2713" : "+"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Table header */}
                <div className="wl-table-row" style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 40px",
                  padding: "10px 20px", borderBottom: "1px solid #f3f4f6", gap: 12,
                }}>
                  {["Aktie", "Börse", "Kurs", "24h", "Sektor", ""].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {h}
                    </span>
                  ))}
                </div>

                {/* Rows */}
                {activeList.items.map(key => {
                  const { symbol, exchange } = parseKey(key);
                  const entry = resolveEntry(symbol, exchange);
                  const q = quotes[key];
                  const isUp = q ? q.change >= 0 : true;

                  return (
                    <Link
                      key={key}
                      href={`/stock/${symbol}?exchange=${exchange}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div className="wl-table-row" style={{
                        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 40px",
                        padding: "14px 20px", borderBottom: "1px solid #f9fafb", gap: 12,
                        alignItems: "center", cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        {/* Name & Ticker */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          {q?.logo ? (
                            <img src={q.logo} alt="" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #f3f4f6", objectFit: "contain" }}
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: "#9ca3af" }}>{symbol.slice(0, 2)}</span>
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {q?.name ?? entry.name}
                            </p>
                            <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{symbol}</p>
                          </div>
                        </div>

                        {/* Exchange */}
                        <div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                            color: exchange === "XETRA" ? "#2563eb" : exchange === "NASDAQ" ? "#7c3aed" : exchange === "NYSE" ? "#059669" : "#6b7280",
                            background: exchange === "XETRA" ? "rgba(37,99,235,0.08)" : exchange === "NASDAQ" ? "rgba(124,58,237,0.08)" : exchange === "NYSE" ? "rgba(5,150,105,0.08)" : "#f3f4f6",
                          }}>
                            {exchange}
                          </span>
                        </div>

                        {/* Price */}
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                            {q ? formatPrice(q.price, q.currency) : "—"}
                          </p>
                        </div>

                        {/* 24h Change */}
                        <div>
                          {q ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              {isUp ? <TrendingUp size={12} color="#10b981" /> : <TrendingDown size={12} color="#ef4444" />}
                              <span style={{
                                fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                                color: isUp ? "#10b981" : "#ef4444",
                              }}>
                                {isUp ? "+" : ""}{q.changePct.toFixed(2)}%
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "#d1d5db" }}>—</span>
                          )}
                        </div>

                        {/* Sector */}
                        <div>
                          <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 5 }}>
                            {q?.sector ?? entry.sector}
                          </span>
                        </div>

                        {/* Delete */}
                        <div>
                          <button
                            onClick={e => { e.preventDefault(); e.stopPropagation(); removeFromList(key); }}
                            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, opacity: 0.3 }}
                          >
                            <Trash2 size={13} color="#ef4444" />
                          </button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CREATE LIST MODAL ── */}
      {showCreateModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 500, backdropFilter: "blur(4px)",
        }} onClick={() => setShowCreateModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: 16, padding: 28, width: 380,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 16 }}>
              Neue Watchlist erstellen
            </h3>
            <input
              value={newListName} onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createList()}
              placeholder="Listenname..."
              autoFocus
              style={{
                width: "100%", padding: "12px 16px", border: "2px solid #0f172a",
                borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
                marginBottom: 16,
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCreateModal(false)} style={{
                padding: "10px 18px", borderRadius: 9, background: "#f3f4f6",
                border: "none", fontSize: 13, fontWeight: 600, color: "#6b7280",
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Abbrechen
              </button>
              <button onClick={createList} disabled={!newListName.trim()} style={{
                padding: "10px 18px", borderRadius: 9,
                background: newListName.trim() ? "#0f172a" : "#e5e7eb",
                border: "none", fontSize: 13, fontWeight: 700,
                color: newListName.trim() ? "#fff" : "#9ca3af",
                cursor: newListName.trim() ? "pointer" : "default",
                fontFamily: "inherit",
              }}>
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      <Footer />
    </div>
  );
}
