"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import MetrioPicks from "@/components/MetrioPicks";
import Footer from "@/components/Footer";

// ── Types ────────────────────────────────────────────────────────
interface HeatmapEntry {
  symbol: string;
  name: string;
  category: string;
  price: number;
  change: number;
  changePct: number;
}

// ── Tabs ─────────────────────────────────────────────────────────
type TabKey = "usa" | "europa" | "asien" | "emerging";

const TABS: { key: TabKey; label: string }[] = [
  { key: "usa",      label: "US" },
  { key: "europa",   label: "EUR" },
  { key: "asien",    label: "ASIA" },
  { key: "emerging", label: "EM" },
];

// ── Component ────────────────────────────────────────────────────
export default function HeatmapPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("usa");
  const [data, setData] = useState<Record<string, HeatmapEntry[]>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");

  const fetchData = useCallback(async (region: TabKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/heatmap?region=${region}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(prev => ({ ...prev, [region]: json.items }));
        setLastUpdate(new Date().toLocaleTimeString("de-DE"));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(activeTab); }, [activeTab, fetchData]);

  // Inject styles client-side to avoid SSR hydration mismatch
  useEffect(() => {
    const id = "heatmap-styles";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @media (max-width: 768px) {
          .heatmap-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const items = data[activeTab] ?? [];
  const indices = items.filter(i => i.category === "Index" || i.category === "Bond");
  const others = items.filter(i => i.category !== "Index" && i.category !== "Bond");

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      background: "var(--am-bg)",
      minHeight: "100vh",
      color: "var(--am-text)",
    }}>
      {/* ── TOP INDEX BAR (like Yahoo Finance) ── */}
      <div style={{
        background: "#0f172a",
        borderBottom: "1px solid #1e293b",
        overflowX: "auto",
        whiteSpace: "nowrap",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 0,
          maxWidth: 1400, margin: "0 auto", padding: "0 16px",
        }}>
          {/* Region tabs inline */}
          <div style={{ display: "flex", gap: 0, borderRight: "1px solid #334155", marginRight: 4, flexShrink: 0 }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "14px 16px",
                    border: "none",
                    background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                    color: isActive ? "#fff" : "#94a3b8",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.04em",
                    borderBottom: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Index ticker strip */}
          {loading && indices.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", color: "#64748b", fontSize: 12 }}>
              <Loader2 size={14} className="spin" /> Lade...
            </div>
          ) : (
            <div style={{ display: "flex", gap: 0, overflow: "auto" }}>
              {indices.map(item => {
                const isUp = item.changePct >= 0;
                return (
                  <div key={item.symbol} style={{
                    padding: "10px 20px",
                    borderRight: "1px solid #1e293b",
                    display: "flex", flexDirection: "column", gap: 2,
                    minWidth: 140, flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                      {item.price > 0 ? item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 11, fontWeight: 700,
                      color: isUp ? "#4ade80" : "#f87171",
                    }}>
                      {isUp ? "\u25B2" : "\u25BC"}
                      {isUp ? "+" : ""}{item.change.toFixed(2)} {isUp ? "+" : ""}{item.changePct.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Refresh */}
          <div style={{ marginLeft: "auto", flexShrink: 0, padding: "0 12px" }}>
            <button onClick={() => fetchData(activeTab)} disabled={loading} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "6px 10px",
              borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid #334155",
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#94a3b8",
            }}>
              <RefreshCw size={12} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTOR / COUNTRY CARDS ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px" }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--am-text)", margin: 0, letterSpacing: "-0.02em" }}>
            {activeTab === "usa" ? "Sektoren & Indizes" : activeTab === "europa" ? "Europäische Märkte" : activeTab === "asien" ? "Asien-Pazifik Märkte" : "Schwellenländer"}
          </h2>
          {lastUpdate && (
            <span style={{ fontSize: 11, color: "var(--am-text-faint)" }}>Aktualisiert: {lastUpdate}</span>
          )}
        </div>

        {/* Loading state */}
        {loading && others.length === 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 10, padding: "60px 0", color: "var(--am-text-faint)", fontSize: 14,
          }}>
            <Loader2 size={20} className="spin" /> Lade Marktdaten...
          </div>
        )}

        {/* ── SEKTOR-ROTATION-SIGNAL (Investor Feature) ─────────────
            Relative-Strength-Ranking: welche Segmente ziehen Flows
            an, welche verlieren Momentum. Hilft beim Rotations-Timing.
        ───────────────────────────────────────────────────────────── */}
        {others.length >= 3 && (
          <div style={{
            marginBottom: 24,
            padding: "20px 22px",
            borderRadius: 18,
            background: "var(--am-card-soft)",
            border: "1px solid var(--am-border)",
            backdropFilter: "blur(22px) saturate(160%)",
            WebkitBackdropFilter: "blur(22px) saturate(160%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.30), 0 10px 28px -20px rgba(10,10,14,0.18)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", color: "var(--am-text-faint)", textTransform: "uppercase", margin: 0 }}>
                  Sektor-Rotation-Signal
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--am-text)", margin: "2px 0 0", letterSpacing: "-0.01em" }}>
                  Relative Stärke: Welche Segmente ziehen Kapital an
                </p>
              </div>
              <span style={{ fontSize: 11, color: "var(--am-text-muted)" }}>
                Leader → Laggards · Tagesperformance
              </span>
            </div>
            {(() => {
              const ranked = [...others].sort((a, b) => b.changePct - a.changePct);
              const maxAbs = Math.max(0.01, ...ranked.map(r => Math.abs(r.changePct)));
              const top = ranked.slice(0, 5);
              const bottom = ranked.slice(-3).reverse();
              const render = (r: HeatmapEntry, rank: number, kind: "leader" | "laggard") => {
                const pct = r.changePct;
                const w = Math.min(100, (Math.abs(pct) / maxAbs) * 100);
                const good = pct >= 0;
                const barColor = good ? "rgba(16,185,129,0.85)" : "rgba(239,68,68,0.85)";
                return (
                  <div key={r.symbol} style={{
                    display: "grid", gridTemplateColumns: "22px minmax(120px, 1fr) 1fr 64px",
                    alignItems: "center", gap: 10, padding: "6px 0",
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--am-text-faint)", fontFamily: "'SF Mono', ui-monospace, monospace" }}>
                      {kind === "leader" ? `#${rank + 1}` : `L${rank + 1}`}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--am-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.name}
                    </span>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--am-border-light, var(--am-border))", overflow: "hidden", position: "relative" }}>
                      <div style={{ height: "100%", width: `${w}%`, background: barColor, borderRadius: 3, transition: "width 400ms ease" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: good ? "#059669" : "#dc2626", fontFamily: "'SF Mono', ui-monospace, monospace", textAlign: "right" }}>
                      {good ? "+" : ""}{pct.toFixed(2)}%
                    </span>
                  </div>
                );
              };
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
                  <div>
                    <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: "#059669", textTransform: "uppercase", margin: "0 0 6px" }}>
                      Leaders · Kapitalzufluss
                    </p>
                    {top.map((r, i) => render(r, i, "leader"))}
                  </div>
                  <div>
                    <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: "#dc2626", textTransform: "uppercase", margin: "0 0 6px" }}>
                      Laggards · Abflüsse
                    </p>
                    {bottom.map((r, i) => render(r, i, "laggard"))}
                  </div>
                </div>
              );
            })()}
            <p style={{ fontSize: 10.5, color: "var(--am-text-faint)", margin: "12px 0 0", lineHeight: 1.55 }}>
              Rotation-Signal basiert auf tagesrelativer Performance der angezeigten Segmente. Keine Anlageberatung · § 85 WpHG.
            </p>
          </div>
        )}

        {/* Cards grid */}
        {others.length > 0 && (
          <div className="heatmap-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}>
            {others.map(item => {
              const isUp = item.changePct >= 0;
              const borderColor = isUp ? "var(--am-text)" : "var(--am-text-muted)";
              const bgColor = "var(--am-card)";
              return (
                <div key={item.symbol} style={{
                  background: bgColor,
                  borderLeft: `4px solid ${borderColor}`,
                  borderRadius: 8,
                  padding: "14px 16px",
                  transition: "transform 0.1s, box-shadow 0.1s",
                  cursor: "default",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--am-text)" }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--am-text-faint)", fontWeight: 600 }}>{item.symbol}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "var(--am-text)", fontVariantNumeric: "tabular-nums" }}>
                      {item.price > 0 ? "$" + item.price.toFixed(2) : "—"}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end",
                        fontSize: 13, fontWeight: 800, color: borderColor,
                      }}>
                        {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {isUp ? "+" : ""}{item.changePct.toFixed(2)}%
                      </div>
                      <div style={{ fontSize: 10, color: "var(--am-text-muted)", fontVariantNumeric: "tabular-nums" }}>
                        {isUp ? "+" : ""}{item.change.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Also show indices as cards if they exist (for non-USA tabs that may not have them in the top bar) */}
        {indices.length > 0 && others.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--am-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Indizes
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(indices.length, 5)}, 1fr)`,
              gap: 10,
            }}>
              {indices.map(item => {
                const isUp = item.changePct >= 0;
                return (
                  <div key={item.symbol} style={{
                    background: isUp ? "#166534" : "#991b1b",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "14px 16px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.85, marginBottom: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, fontVariantNumeric: "tabular-nums", marginBottom: 2 }}>
                      {item.price > 0 ? item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      {isUp ? "\u25B2" : "\u25BC"} {isUp ? "+" : ""}{item.change.toFixed(2)} {isUp ? "+" : ""}{item.changePct.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── METRIO PICKS — daily curated stocks ─────────────────── */}
        <section style={{ marginTop: 56 }}>
          <div style={{ marginBottom: 14 }}>
            <p style={{
              fontSize: 11, fontWeight: 700,
              color: "var(--am-text-faint)",
              textTransform: "uppercase", letterSpacing: "0.14em",
              marginBottom: 6,
            }}>Metrio empfiehlt</p>
            <h2 style={{
              fontSize: 22, fontWeight: 800, color: "var(--am-text)",
              letterSpacing: "-0.02em", margin: 0,
            }}>Lohnt sich heute reinzuschauen</h2>
            <p style={{
              fontSize: 13, color: "var(--am-text-muted)",
              marginTop: 4, maxWidth: 560,
            }}>
              Tagesaktuelle Picks aus dem Universum, das Metrio AI gerade besonders spannend findet — kuratiert auf Basis von Bewertung, Momentum und Newsflow.
            </p>
          </div>
          <MetrioPicks />
        </section>
      </div>

      <Footer />
    </div>
  );
}
