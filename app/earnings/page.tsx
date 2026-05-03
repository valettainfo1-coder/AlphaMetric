"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, RefreshCw, Search, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import Footer from "@/components/Footer";

// ═══════════════════════════════════════════════════════════════════
// /earnings — Vollständige Quartalszahlen-Übersicht
// Gruppiert nach Datum, sortiert nach Datum → Tageszeit → Market Cap.
// Zeigt Company, Ticker, BMO/AMC, EPS-Estimate, BEAT/MISS-Badge.
// ═══════════════════════════════════════════════════════════════════

type EarningsItem = {
  symbol: string;
  companyName?: string;
  date: string;
  time: "bmo" | "amc" | "dmh" | "";
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  marketCap?: number | null;
  quarter: number | null;
  year: number | null;
};

type EarningsResponse = {
  items: EarningsItem[];
  from: string;
  to: string;
  source: "nasdaq" | "finnhub" | "fallback";
  updatedAt: string;
};

// ── Helpers ──────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtDateShort(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

function timeWeight(t: EarningsItem["time"]): number {
  if (t === "bmo") return 0;
  if (t === "dmh") return 1;
  if (t === "amc") return 2;
  return 3;
}

function timeShort(t: EarningsItem["time"]): string {
  if (t === "bmo") return "Vor Handel";
  if (t === "amc") return "Nach Handel";
  if (t === "dmh") return "Handel";
  return "–";
}

function timeColor(t: EarningsItem["time"]): string {
  if (t === "bmo") return "#d97706";
  if (t === "amc") return "#4f46e5";
  if (t === "dmh") return "#0ea5e9";
  return "var(--am-muted)";
}

function verdict(e: EarningsItem): { label: string; color: string; bg: string } | null {
  if (e.epsActual === null || e.epsEstimate === null) return null;
  const diff = e.epsActual - e.epsEstimate;
  const rel = Math.abs(e.epsEstimate) > 0 ? diff / Math.abs(e.epsEstimate) : 0;
  if (rel > 0.02) return { label: "BEAT", color: "#059669", bg: "rgba(5,150,105,0.10)" };
  if (rel < -0.02) return { label: "MISS", color: "#dc2626", bg: "rgba(220,38,38,0.10)" };
  return { label: "IN LINE", color: "#6b7280", bg: "rgba(107,114,128,0.10)" };
}

function fmtEps(n: number | null): string {
  if (n === null) return "—";
  return (n >= 0 ? "$" : "−$") + Math.abs(n).toFixed(2);
}

// ── Major-Index-Filter ────────────────────────────────────────────
// Auswahl bekannter S&P-500- und DAX-Namen, damit „Highlights" nur
// wirklich relevante Unternehmen zeigt (kein Longtail aus Small Caps).
const MAJOR_TICKERS = new Set<string>([
  // US Mega/Large Cap (S&P 500-Kernwerte)
  "AAPL","MSFT","GOOGL","GOOG","AMZN","META","NVDA","TSLA","BRK.B","JPM",
  "V","MA","UNH","XOM","JNJ","PG","HD","CVX","LLY","ABBV","KO","PEP","BAC",
  "WMT","MRK","AVGO","CRM","COST","MCD","DIS","NKE","ORCL","NFLX","ADBE",
  "CSCO","TMO","INTC","AMD","QCOM","IBM","PYPL","SBUX","BA","CAT","GE","GS",
  "MS","WFC","C","AXP","BLK","T","VZ","TMUS","F","GM","UBER","SHOP",
  // DAX 40
  "SAP.DE","SIE.DE","ALV.DE","DTE.DE","MUV2.DE","BAS.DE","BAYN.DE","DBK.DE",
  "BMW.DE","MBG.DE","VOW3.DE","ADS.DE","IFX.DE","HEN3.DE","DHL.DE","HEI.DE",
  "RWE.DE","VNA.DE","MRK.DE","FRE.DE","FME.DE","PAH3.DE","EOAN.DE","DB1.DE",
  "SAP","SIE","ALV","DTE","BAS","BAYN","DBK","BMW","MBG","VOW3","ADS","IFX",
  "HEN","HEN3","DHL","HEI","RWE","VNA","FRE","FME","MRK","PAH3","EOAN","DB1",
  // UK / FR bekannte Namen
  "LVMH","MC.PA","OR.PA","AIR.PA","SAN.PA","BNP.PA","SHEL","HSBA","AZN","BARC",
  "ULVR","BP","RIO","GSK","VOD",
  // Asien Mega Cap ADRs
  "TSM","BABA","JD","PDD","NIO","TM","SONY","SNE",
]);

function isMajor(sym: string): boolean {
  if (MAJOR_TICKERS.has(sym.toUpperCase())) return true;
  const base = sym.split(".")[0].toUpperCase();
  return MAJOR_TICKERS.has(base);
}

// ── Mini News for Sidebar ────────────────────────────────────────
type MiniNews = {
  id: string; headline: string; source: string; url: string;
  publishedAt: string; impact: "HIGH" | "MED" | "LOW"; category: string;
};

// ── Component ────────────────────────────────────────────────────
type ViewMode = "highlights" | "date" | "alpha";

export default function EarningsPage() {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [days, setDays] = useState(14);
  const [viewMode, setViewMode] = useState<ViewMode>("highlights");
  const [news, setNews] = useState<MiniNews[]>([]);

  async function load(d = days) {
    setLoading(true);
    try {
      const res = await fetch(`/api/news/earnings?days=${d}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(days); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days]);

  // Mini-News-Feed rechts
  useEffect(() => {
    let cancelled = false;
    fetch("/api/news/feed?sort=relevance&limit=20&verify=0", { cache: "no-store" })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { if (!cancelled) setNews((d.items ?? []).slice(0, 15)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const grouped = useMemo(() => {
    if (!data) return [] as { date: string; items: EarningsItem[] }[];
    const q = query.trim().toLowerCase();
    let filtered = data.items.filter(i =>
      !q || i.symbol.toLowerCase().includes(q) || (i.companyName ?? "").toLowerCase().includes(q)
    );

    // Highlights-Mode: nur S&P500 / DAX Namen
    if (viewMode === "highlights") {
      filtered = filtered.filter(i => isMajor(i.symbol));
    }

    if (viewMode === "alpha") {
      // Alphabetisch, ein einziger Block "A–Z"
      const sorted = [...filtered].sort((a, b) => {
        const an = (a.companyName ?? a.symbol).toLowerCase();
        const bn = (b.companyName ?? b.symbol).toLowerCase();
        return an.localeCompare(bn);
      });
      // Gruppieren nach Anfangsbuchstabe
      const by = new Map<string, EarningsItem[]>();
      for (const e of sorted) {
        const letter = (e.companyName ?? e.symbol).charAt(0).toUpperCase();
        const key = /[A-Z]/.test(letter) ? letter : "#";
        if (!by.has(key)) by.set(key, []);
        by.get(key)!.push(e);
      }
      return Array.from(by.entries()).map(([date, items]) => ({ date, items }));
    }

    // date und highlights: nach Datum → Tageszeit → MarketCap
    const sorted = [...filtered].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      const tw = timeWeight(a.time) - timeWeight(b.time);
      if (tw !== 0) return tw;
      return (b.marketCap ?? 0) - (a.marketCap ?? 0);
    });
    const by = new Map<string, EarningsItem[]>();
    for (const e of sorted) {
      if (!by.has(e.date)) by.set(e.date, []);
      by.get(e.date)!.push(e);
    }
    return Array.from(by.entries()).map(([date, items]) => ({ date, items }));
  }, [data, query, viewMode]);

  const total = data?.items.length ?? 0;
  const highlightsCount = data ? data.items.filter(i => isMajor(i.symbol)).length : 0;

  const groupHeader = (key: string) => {
    if (viewMode === "alpha") return key === "#" ? "#" : key;
    return fmtDate(key);
  };

  return (
    <div style={{
      fontFamily: "'Inter', 'Geist', sans-serif",
      background: "var(--am-bg, #f8fafc)",
      minHeight: "100vh",
      color: "var(--am-text, #0f172a)",
      letterSpacing: "0.01em",
    }}>
      {/* ── Header ── */}
      <div style={{
        borderBottom: "1px solid var(--am-border, rgba(15,23,42,0.08))",
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        <div style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <Link href="/" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--am-muted, #64748b)",
            fontSize: 13,
            textDecoration: "none",
            letterSpacing: "0.04em",
          }}>
            <ArrowLeft size={14} strokeWidth={1.5} />
            Zurück
          </Link>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Calendar size={18} strokeWidth={1.25} />
              <h1 style={{
                fontSize: 18,
                fontWeight: 600,
                margin: 0,
                letterSpacing: "-0.01em",
              }}>
                Quartalszahlen
              </h1>
              <span style={{
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--am-muted, #64748b)",
                padding: "3px 8px",
                borderRadius: 4,
                background: "rgba(15,23,42,0.04)",
                border: "1px solid var(--am-border, rgba(15,23,42,0.08))",
              }}>
                {total} Termine
              </span>
            </div>
          </div>

          {/* Search */}
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--am-border, rgba(15,23,42,0.08))",
            background: "rgba(255,255,255,0.6)",
            minWidth: 220,
          }}>
            <Search size={14} strokeWidth={1.5} color="var(--am-muted, #64748b)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ticker oder Unternehmen…"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 13,
                width: "100%",
                letterSpacing: "0.01em",
                color: "var(--am-text, #0f172a)",
              }}
            />
          </div>

          {/* View-Mode Toggle */}
          <div style={{ display: "flex", gap: 4, padding: 3, background: "rgba(15,23,42,0.04)", borderRadius: 8 }}>
            {([
              { k: "highlights", l: "Highlights" },
              { k: "date",       l: "Datum" },
              { k: "alpha",      l: "A–Z" },
            ] as const).map(m => (
              <button
                key={m.k}
                onClick={() => setViewMode(m.k)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  border: "none",
                  background: viewMode === m.k ? "var(--am-accent, #0f172a)" : "transparent",
                  color: viewMode === m.k ? "var(--am-accent-text, #fff)" : "var(--am-text-muted, #64748b)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {m.l}
              </button>
            ))}
          </div>

          {/* Days selector */}
          <div style={{ display: "flex", gap: 4 }}>
            {[7, 14].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  padding: "7px 11px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  border: "1px solid var(--am-border, rgba(15,23,42,0.08))",
                  background: days === d ? "var(--am-text, #0f172a)" : "transparent",
                  color: days === d ? "#fff" : "var(--am-muted, #64748b)",
                  cursor: "pointer",
                }}
              >
                {d} Tage
              </button>
            ))}
          </div>

          <button
            onClick={() => load()}
            aria-label="Neu laden"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 8,
              border: "1px solid var(--am-border, rgba(15,23,42,0.08))",
              background: "transparent",
              cursor: "pointer",
              color: "var(--am-muted, #64748b)",
            }}
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Body: 2-Column Grid (Earnings links | News rechts) ── */}
      <div style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "32px 24px 80px",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 340px",
        gap: 28,
      }} className="earnings-grid">
        <div>
        {/* Mode hint strip */}
        <div style={{
          marginBottom: 18,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid var(--am-border, rgba(15,23,42,0.08))",
          background: "var(--am-card-soft)",
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          fontSize: 12, color: "var(--am-text-muted, #64748b)",
        }}>
          <span style={{ fontWeight: 700, color: "var(--am-text)" }}>
            {viewMode === "highlights" && `${highlightsCount} Highlights aus S&P 500 und DAX`}
            {viewMode === "date"       && `${total} Termine · chronologisch`}
            {viewMode === "alpha"      && `${total} Termine · alphabetisch`}
          </span>
          <span style={{ opacity: 0.8 }}>
            {viewMode === "highlights" && "Nur Unternehmen, die man wirklich kennt."}
            {viewMode === "date"       && "Gruppiert nach Release-Datum + Tageszeit."}
            {viewMode === "alpha"      && "Gruppiert nach Anfangsbuchstabe A–Z."}
          </span>
        </div>

        {loading && !data && (
          <div style={{
            padding: 60,
            textAlign: "center",
            color: "var(--am-muted, #64748b)",
            fontSize: 13,
            letterSpacing: "0.04em",
          }}>
            Lade Quartalszahlen…
          </div>
        )}

        {!loading && grouped.length === 0 && (
          <div style={{
            padding: 60,
            textAlign: "center",
            color: "var(--am-muted, #64748b)",
            fontSize: 13,
          }}>
            Keine Termine gefunden.
          </div>
        )}

        {grouped.map(({ date, items }) => (
          <section key={date} style={{ marginBottom: 36 }}>
            <div style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              marginBottom: 14,
              paddingBottom: 10,
              borderBottom: "1px solid var(--am-border, rgba(15,23,42,0.08))",
            }}>
              <h2 style={{
                fontSize: 14,
                fontWeight: 600,
                margin: 0,
                letterSpacing: "0.02em",
                textTransform: "capitalize",
              }}>
                {groupHeader(date)}
              </h2>
              <span style={{
                fontSize: 11,
                color: "var(--am-muted, #64748b)",
                letterSpacing: "0.08em",
              }}>
                {items.length} Unternehmen
              </span>
            </div>

            <div style={{
              display: "grid",
              gap: 8,
            }}>
              {items.map((e, i) => {
                const v = verdict(e);
                return (
                  <Link
                    key={`${e.symbol}-${i}`}
                    href={`/stock/${encodeURIComponent(e.symbol)}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0,1fr) 120px 110px 90px",
                      alignItems: "center",
                      gap: 16,
                      padding: "13px 16px",
                      borderRadius: 10,
                      border: "1px solid var(--am-border, rgba(15,23,42,0.08))",
                      background: "rgba(255,255,255,0.55)",
                      backdropFilter: "blur(14px) saturate(150%)",
                      WebkitBackdropFilter: "blur(14px) saturate(150%)",
                      color: "inherit",
                      textDecoration: "none",
                      transition: "border-color 140ms ease, background 140ms ease",
                    }}
                    onMouseEnter={(ev) => {
                      (ev.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(15,23,42,0.22)";
                      (ev.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.85)";
                    }}
                    onMouseLeave={(ev) => {
                      (ev.currentTarget as HTMLAnchorElement).style.borderColor = "var(--am-border, rgba(15,23,42,0.08))";
                      (ev.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.55)";
                    }}
                  >
                    {/* Company */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        letterSpacing: "-0.005em",
                      }}>
                        {e.companyName || e.symbol}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: "var(--am-muted, #64748b)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        marginTop: 2,
                      }}>
                        {e.symbol}
                      </div>
                    </div>

                    {/* Time */}
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: timeColor(e.time),
                      letterSpacing: "0.04em",
                    }}>
                      <span style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: 2,
                        background: timeColor(e.time),
                        opacity: 0.75,
                      }} />
                      {timeShort(e.time)}
                    </div>

                    {/* EPS estimate */}
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 11,
                        color: "var(--am-muted, #64748b)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}>
                        EPS-Schätzung
                      </div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        fontVariantNumeric: "tabular-nums",
                        marginTop: 1,
                      }}>
                        {fmtEps(e.epsEstimate)}
                      </div>
                    </div>

                    {/* Verdict */}
                    <div style={{ textAlign: "right" }}>
                      {v ? (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.12em",
                          color: v.color,
                          background: v.bg,
                          border: `1px solid ${v.color}22`,
                        }}>
                          {v.label === "BEAT" && <TrendingUp size={10} strokeWidth={2} />}
                          {v.label === "MISS" && <TrendingDown size={10} strokeWidth={2} />}
                          {v.label}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 10,
                          letterSpacing: "0.12em",
                          color: "var(--am-muted, #64748b)",
                        }}>
                          AUSSTEHEND
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {/* Source footer */}
        {data && (
          <div style={{
            marginTop: 32,
            paddingTop: 16,
            borderTop: "1px solid var(--am-border, rgba(15,23,42,0.08))",
            fontSize: 11,
            color: "var(--am-muted, #64748b)",
            letterSpacing: "0.04em",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}>
            <span>Quelle: {data.source === "nasdaq" ? "Nasdaq" : data.source === "finnhub" ? "Finnhub" : "Kuratiert"}</span>
            <span>Aktualisiert: {new Date(data.updatedAt).toLocaleString("de-DE")}</span>
          </div>
        )}
        </div>{/* end left column */}

        {/* ── Right rail: Live News Feed ────────────────────────── */}
        <aside className="earnings-news-rail" style={{
          position: "sticky",
          top: 90,
          alignSelf: "start",
          maxHeight: "calc(100vh - 110px)",
          overflow: "auto",
          padding: "16px 16px 20px",
          borderRadius: 16,
          background: "var(--am-card-soft)",
          border: "1px solid var(--am-border)",
          backdropFilter: "blur(22px) saturate(160%)",
          WebkitBackdropFilter: "blur(22px) saturate(160%)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ width: 6, height: 6, background: "#10b981", borderRadius: "50%" }} />
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", color: "var(--am-text-faint)", textTransform: "uppercase", margin: 0 }}>
              Live Newsfeed
            </p>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--am-text)", margin: "0 0 12px", letterSpacing: "-0.01em" }}>
            Was den Markt heute bewegt
          </h3>
          {news.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--am-text-muted)" }}>Lade Schlagzeilen…</p>
          )}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
            {news.map(n => (
              <li key={n.id}>
                <a href={n.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "block",
                  padding: "10px 0",
                  borderTop: "1px solid var(--am-border-light, var(--am-border))",
                  textDecoration: "none",
                  color: "var(--am-text)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.10em",
                      color: n.impact === "HIGH" ? "#dc2626" : n.impact === "MED" ? "#d97706" : "var(--am-text-faint)",
                      textTransform: "uppercase",
                    }}>{n.impact === "HIGH" ? "Hoch" : n.impact === "MED" ? "Mittel" : "Info"}</span>
                    <span style={{ fontSize: 10, color: "var(--am-text-faint)" }}>· {n.source}</span>
                  </div>
                  <p style={{ fontSize: 12.5, lineHeight: 1.4, margin: 0, color: "var(--am-text)", fontWeight: 500 }}>
                    {n.headline}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @media (max-width: 960px) {
          .earnings-grid { grid-template-columns: 1fr !important; }
          .earnings-news-rail { position: static !important; max-height: none !important; }
        }
        @media (max-width: 720px) {
          section > div > a {
            grid-template-columns: 1fr 90px !important;
          }
          section > div > a > div:nth-child(3),
          section > div > a > div:nth-child(4) {
            display: none !important;
          }
        }
      `}</style>

      <Footer />
    </div>
  );
}
