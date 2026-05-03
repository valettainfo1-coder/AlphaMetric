"use client";
// ═══════════════════════════════════════════════════════════════════
// MARKTPULS — kompakter Earnings-Highlights-Teaser (Liquid Glass)
// Zeigt die bekanntesten Unternehmen aus S&P 500 / DAX mit Earnings
// diese Woche. Klick -> /earnings (Daily Brief).
// ═══════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Calendar } from "lucide-react";

type EarningsItem = {
  symbol: string;
  companyName?: string;
  date: string;
  time: "bmo" | "amc" | "dmh" | "";
  epsEstimate: number | null;
  epsActual: number | null;
  marketCap?: number | null;
};

// Bekannte Unternehmen — nur diese qualifizieren als "Highlight"
const MAJOR = new Set<string>([
  "AAPL","MSFT","GOOGL","GOOG","AMZN","META","NVDA","TSLA","JPM","V","MA",
  "UNH","XOM","JNJ","PG","HD","CVX","LLY","ABBV","KO","PEP","BAC","WMT",
  "MRK","AVGO","CRM","COST","MCD","DIS","NKE","ORCL","NFLX","ADBE","CSCO",
  "AMD","QCOM","IBM","PYPL","SBUX","BA","CAT","GE","GS","MS","WFC","C","T",
  "VZ","UBER","SHOP","BRK.B",
  "SAP","SAP.DE","SIE","SIE.DE","ALV","ALV.DE","DTE","DTE.DE","BAS","BAS.DE",
  "BAYN","BAYN.DE","DBK","DBK.DE","BMW","BMW.DE","MBG","MBG.DE","VOW3","VOW3.DE",
  "ADS","ADS.DE","IFX","IFX.DE","DHL","DHL.DE","RWE","RWE.DE","HEI","HEI.DE",
  "MUV2","MUV2.DE","DB1","DB1.DE","FRE","FRE.DE","MRK.DE",
  "TSM","BABA","ASML","NOVO","NVO",
]);

function isMajor(sym: string): boolean {
  const s = sym.toUpperCase();
  if (MAJOR.has(s)) return true;
  return MAJOR.has(s.split(".")[0]);
}

function fmtWeekday(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" });
  } catch { return iso; }
}

function timeBadge(t: EarningsItem["time"]): { label: string; color: string } {
  if (t === "bmo") return { label: "Vorbörse", color: "#d97706" };
  if (t === "amc") return { label: "Nachbörse", color: "#4f46e5" };
  if (t === "dmh") return { label: "Während", color: "#0ea5e9" };
  return { label: "—", color: "var(--am-text-faint)" };
}

export default function MarketPulse({ noWrap = false }: { noWrap?: boolean } = {}) {
  const [items, setItems] = useState<EarningsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/news/earnings?days=7", { cache: "no-store" })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { if (!cancelled) { setItems(d.items ?? []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const highlights = items
    .filter(i => isMajor(i.symbol))
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return (b.marketCap ?? 0) - (a.marketCap ?? 0);
    })
    .slice(0, 5);

  const card = (
    <div style={{
      borderRadius: 18,
      background: "var(--am-card-soft)",
      border: "1px solid var(--am-border)",
      backdropFilter: "blur(22px) saturate(160%)",
      WebkitBackdropFilter: "blur(22px) saturate(160%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 28px -18px rgba(10,10,14,0.18)",
      overflow: "hidden",
      height: "100%",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header — single concise line, matches NewsCarousel rhythm */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid var(--am-border-light, var(--am-border))",
        gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--am-text)", display: "inline-block", boxShadow: "0 0 8px rgba(10,10,14,0.18)" }} />
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "var(--am-text-faint)", textTransform: "uppercase", margin: 0 }}>
            Earnings · Diese Woche
          </p>
        </div>
        <Link
          href="/earnings"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 12, fontWeight: 600, color: "var(--am-text-muted)",
            textDecoration: "none",
            padding: "6px 10px", borderRadius: 8,
            border: "1px solid var(--am-border)",
            background: "var(--am-card)",
          }}
        >
          Alle ansehen
          <ArrowUpRight size={13} strokeWidth={1.7} />
        </Link>
      </div>

        {/* Highlights */}
        {loading && (
          <p style={{ padding: "20px 20px", fontSize: 12, color: "var(--am-text-muted)", margin: 0 }}>
            Lade Kalender…
          </p>
        )}
        {!loading && highlights.length === 0 && (
          <p style={{ padding: "20px 20px", fontSize: 12, color: "var(--am-text-muted)", margin: 0 }}>
            Diese Woche sind keine großen S&P-500- oder DAX-Namen im Kalender.
          </p>
        )}
        {highlights.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1 }}>
            {highlights.map((e, idx) => {
              const t = timeBadge(e.time);
              return (
                <li key={`${e.symbol}-${idx}`}>
                  <Link
                    href={`/stock/${encodeURIComponent(e.symbol)}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 90px 80px",
                      alignItems: "center", gap: 12,
                      padding: "13px 20px",
                      borderTop: idx === 0 ? "none" : "1px solid var(--am-border-light, var(--am-border))",
                      textDecoration: "none", color: "var(--am-text)",
                      transition: "background 160ms ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--am-card)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.companyName || e.symbol}
                      </p>
                      <p style={{ fontSize: 10.5, color: "var(--am-text-faint)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "2px 0 0", fontFamily: "'SF Mono', ui-monospace, Menlo, monospace" }}>
                        {e.symbol}
                      </p>
                    </div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11, color: t.color, fontWeight: 600,
                    }}>
                      <span style={{ width: 5, height: 5, background: t.color, borderRadius: 2, display: "inline-block" }} />
                      {t.label}
                    </span>
                    <span style={{ fontSize: 10.5, color: "var(--am-text-faint)", textAlign: "right", fontFamily: "'SF Mono', ui-monospace, Menlo, monospace" }}>
                      {fmtWeekday(e.date)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );

  if (noWrap) return card;

  return (
    <section style={{ padding: "8px 24px 40px", maxWidth: 1120, margin: "0 auto" }}>
      {card}
    </section>
  );
}
