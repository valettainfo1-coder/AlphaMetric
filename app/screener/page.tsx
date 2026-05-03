"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, Zap, RefreshCw, Loader2,
  ArrowUpRight, ArrowDownRight, Activity, Sparkles, ExternalLink,
} from "lucide-react";
import Footer from "@/components/Footer";

// ── Types ────────────────────────────────────────────────────────
interface Mover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  sector?: string;
}

interface MoversData {
  gainers: Mover[];
  losers: Mover[];
  trending: Mover[];
  updatedAt: string;
}

// ── Smart explanation generator with sector context ─────────────
function getExplanation(m: Mover): string {
  const abs = Math.abs(m.changePct);
  const sector = m.sector || "";
  const dir = m.changePct >= 0 ? "steigt" : "fällt";
  const dirNoun = m.changePct >= 0 ? "Kursanstieg" : "Kursrückgang";

  if (abs > 15) {
    if (sector.includes("Krypto")) return `Massiver ${dirNoun} — Krypto-Markt unter hoher Volatilität`;
    if (sector.includes("EV")) return `Extrembewegung im EV-Sektor — mögliche Quartalszahlen oder Partnerschaften`;
    return `Außergewöhnlicher ${dirNoun} von ${abs.toFixed(1)}% — Breaking News wahrscheinlich`;
  }
  if (abs > 8) {
    if (sector.includes("Halbleiter")) return `${m.symbol} ${dir} stark — Chip-Sektor reagiert auf Nachfragedaten`;
    if (sector.includes("Pharma") || sector.includes("Gesundheit")) return `Starke Bewegung im Health-Sektor — FDA-News oder Studienergebnisse möglich`;
    if (sector.includes("Banken") || sector.includes("Finanzen")) return `Deutlicher ${dirNoun} — Zinserwartungen oder Quartalsbericht treiben den Kurs`;
    if (sector.includes("Social Media")) return `Social-Media-Aktie ${dir} deutlich — Nutzerwachstum oder Werbeeinnahmen im Fokus`;
    if (sector.includes("KI")) return `KI-Sektor in Bewegung — ${m.symbol} ${dir} durch AI-Hype oder Auftragslage`;
    return `Starker ${dirNoun} — erhöhtes Handelsvolumen deutet auf Nachrichtenlage`;
  }
  if (abs > 5) {
    if (sector.includes("Solar") || sector.includes("Energie")) return `Energiesektor volatil — regulatorische oder Rohstoff-Einflüsse`;
    if (sector.includes("FinTech")) return `FinTech-Bewegung — Markt reagiert auf Nutzerdaten oder Partnerschaften`;
    if (sector.includes("Tech") || sector.includes("Cloud")) return `Tech-Sektor ${dir} — Analysteneinschätzungen oder Markttrend`;
    return `Überdurchschnittliche Bewegung im ${sector || "Sektor"} — Marktsentiment verändert sich`;
  }
  if (abs > 2.5) {
    if (sector) return `Moderate Bewegung im ${sector}-Sektor — sektorweiter Trend`;
    return `Moderate Kursänderung — Marktstimmung im Wandel`;
  }
  if (abs > 1) {
    return `Leichte ${m.changePct >= 0 ? "Erholung" : "Korrektur"} im normalen Handelsrahmen`;
  }
  return "Geringe Volatilität — Kurs bewegt sich seitwärts";
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);
}

function timeSince(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  return `vor ${hours} Std.`;
}

// ── Component ────────────────────────────────────────────────────
export default function TopMoversPage() {
  const [data, setData] = useState<MoversData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");
  const [updateTime, setUpdateTime] = useState("");
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/movers", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdate(new Date().toLocaleTimeString("de-DE"));
        setUpdateTime(json.updatedAt);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Inject styles client-side to avoid SSR hydration mismatch
  useEffect(() => {
    const id = "movers-styles";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @media (max-width: 768px) {
          .movers-grid { grid-template-columns: 1fr !important; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const goStock = (symbol: string) => {
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  };

  const renderMoverCard = (m: Mover, rank: number) => {
    const isUp = m.changePct >= 0;
    const explanation = getExplanation(m);
    return (
      <div
        key={m.symbol}
        onClick={() => goStock(m.symbol)}
        style={{
          display: "flex", gap: 14, padding: "14px 18px", cursor: "pointer",
          borderBottom: "1px solid #f3f4f6", transition: "background 0.15s",
          alignItems: "flex-start",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        {/* Rank */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: rank <= 3 ? (isUp ? "#dcfce7" : "#fef2f2") : "#f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800,
          color: rank <= 3 ? (isUp ? "#166534" : "#991b1b") : "#9ca3af",
        }}>
          {rank}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: "var(--am-text)" }}>{m.symbol}</span>
            <span style={{
              fontSize: 11, color: "#6b7280", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160,
            }}>
              {m.name}
            </span>
            {m.sector && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: "#6366f1", background: "#eef2ff",
                padding: "2px 6px", borderRadius: 4, textTransform: "uppercase",
                letterSpacing: "0.04em", flexShrink: 0,
              }}>
                {m.sector}
              </span>
            )}
          </div>
          {/* Metrio AI Explanation */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4, background: "#111827",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Sparkles size={8} color="#facc15" />
            </div>
            <p style={{ fontSize: 11, color: "#6b7280", margin: 0, lineHeight: 1.4 }}>
              {explanation}
            </p>
          </div>
        </div>

        {/* Price & Change */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--am-text)", fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(m.price)}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end",
            fontSize: 13, fontWeight: 800,
            color: isUp ? "#16a34a" : "#dc2626",
          }}>
            {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {isUp ? "+" : ""}{m.changePct.toFixed(2)}%
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end",
            marginTop: 2,
          }}>
            <ExternalLink size={10} color="#c4c4c4" />
            <span style={{ fontSize: 9, color: "#c4c4c4" }}>Analyse</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      fontFamily: "'Inter','Helvetica Neue',sans-serif",
      background: "var(--am-bg)", color: "var(--am-text)", minHeight: "100vh",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="am-metal" style={{
              width: 42, height: 42, borderRadius: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={22} color="#0a0b0e" strokeWidth={2.5} />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--am-text)", margin: 0 }}>
                Top Movers
              </h1>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, marginTop: 2 }}>
                Die größten Kursbewegungen des Tages — Live-Daten
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {updateTime && (
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 11, color: "#9ca3af", display: "block" }}>Aktualisiert: {lastUpdate}</span>
                <span style={{ fontSize: 10, color: "#d1d5db" }}>{timeSince(updateTime)}</span>
              </div>
            )}
            <button onClick={fetchData} disabled={loading} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "8px 14px",
              borderRadius: 9, background: "#f1f5f9", border: "1px solid #e5e7eb",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#374151",
            }}>
              <RefreshCw size={13} className={loading ? "spin" : ""} /> Aktualisieren
            </button>
          </div>
        </div>

        {/* Metrio AI hint */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
          padding: "10px 16px", borderRadius: 10, background: "var(--am-card-soft)",
          border: "1px solid var(--am-border)",
        }}>
          <div className="am-metal" style={{
            width: 22, height: 22, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Sparkles size={11} color="#0a0b0e" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 12, color: "var(--am-text-secondary)" }}>
            <strong>Metrio AI</strong> analysiert die Kursbewegungen und liefert Kontext-Erklärungen in Echtzeit.
          </span>
        </div>

        {/* Loading */}
        {loading && !data && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 10, padding: "100px 0", color: "#9ca3af", fontSize: 14,
          }}>
            <Loader2 size={20} className="spin" /> Lade Marktdaten...
          </div>
        )}

        {data && (
          <>
            {/* Trending Banner */}
            <div style={{
              display: "flex", gap: 10, marginBottom: 28, overflowX: "auto",
              padding: "4px 0",
            }}>
              {data.trending.slice(0, 10).map(m => {
                const isUp = m.changePct >= 0;
                return (
                  <div key={m.symbol} onClick={() => goStock(m.symbol)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
                    borderRadius: 12, background: isUp ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${isUp ? "#bbf7d0" : "#fecaca"}`,
                    cursor: "pointer", flexShrink: 0, transition: "transform 0.1s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    <Activity size={14} color={isUp ? "#16a34a" : "#dc2626"} />
                    <span style={{ fontWeight: 800, fontSize: 13 }}>{m.symbol}</span>
                    <span style={{
                      fontWeight: 800, fontSize: 13,
                      color: isUp ? "#16a34a" : "#dc2626",
                    }}>
                      {isUp ? "+" : ""}{m.changePct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Two columns: Gainers and Losers */}
            <div className="movers-grid" style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}>
              {/* Gainers */}
              <div style={{
                border: "1px solid #dcfce7", borderRadius: 16, overflow: "hidden",
                background: "var(--am-card)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "16px 18px",
                  background: "#f0fdf4", borderBottom: "1px solid #dcfce7",
                }}>
                  <TrendingUp size={18} color="#16a34a" />
                  <span style={{ fontWeight: 800, fontSize: 15, color: "#166534" }}>
                    Tagesgewinner
                  </span>
                  <span style={{ fontSize: 11, color: "#16a34a", marginLeft: "auto", fontWeight: 600 }}>
                    Top {data.gainers.length}
                  </span>
                </div>
                {data.gainers.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                    Keine Daten verfügbar
                  </div>
                ) : (
                  data.gainers.map((m, i) => renderMoverCard(m, i + 1))
                )}
              </div>

              {/* Losers */}
              <div style={{
                border: "1px solid #fecaca", borderRadius: 16, overflow: "hidden",
                background: "var(--am-card)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "16px 18px",
                  background: "#fef2f2", borderBottom: "1px solid #fecaca",
                }}>
                  <TrendingDown size={18} color="#dc2626" />
                  <span style={{ fontWeight: 800, fontSize: 15, color: "#991b1b" }}>
                    Tagesverlierer
                  </span>
                  <span style={{ fontSize: 11, color: "#dc2626", marginLeft: "auto", fontWeight: 600 }}>
                    Top {data.losers.length}
                  </span>
                </div>
                {data.losers.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                    Keine Daten verfügbar
                  </div>
                ) : (
                  data.losers.map((m, i) => renderMoverCard(m, i + 1))
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
