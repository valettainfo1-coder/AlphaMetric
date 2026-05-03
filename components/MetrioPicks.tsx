"use client";
// ═══════════════════════════════════════════════════════════════════
// METRIO EMPFEHLUNGEN — "Lohnt sich reinzuschauen"
// Daily curated picks mit kurzem Thesis-Blurb — KEINE Anlageberatung.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { Sparkles, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";

type Pick = {
  symbol: string;
  name: string;
  sector: string;
  country: "US" | "DE" | "EU" | "GB" | "CH";
  priceNow: number | null;
  changePct: number | null;
  currency: string;
  thesis: string;
  metrioScore: number;
};

function scoreColor(s: number): string {
  if (s >= 80) return "#059669";
  if (s >= 70) return "#10b981";
  if (s >= 55) return "#d97706";
  return "#ef4444";
}

export default function MetrioPicks() {
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/metrio/picks", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.picks)) setPicks(data.picks);
      } catch { /* keep null */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      background: "var(--am-card)",
      border: "1px solid var(--am-border)",
      borderRadius: 16,
      padding: "20px 22px",
      boxShadow: "var(--am-shadow)",
      height: "100%",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div className="am-icon-frame am-ico-accent am-ico-sm">
          <Sparkles size={16} color="#0a0b0e" strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
            fontSize: 15, fontWeight: 600, letterSpacing: "-0.018em",
            color: "var(--am-text)",
          }}>
            Metrio Empfehlungen
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--am-text-muted)" }}>
            Täglich kuratiert · Horizonterweiterung, keine Anlageberatung
          </p>
        </div>
      </div>

      {/* Picks */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              height: 82, borderRadius: 12,
              background: "var(--am-card-soft)",
              border: "1px solid var(--am-border-light, var(--am-border))",
              animation: "am-skeleton 1.4s ease-in-out infinite", opacity: 0.6,
            }} />
          ))}
        </div>
      ) : !picks || picks.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--am-text-muted)", fontStyle: "italic" }}>
          Heute keine Empfehlungen — kommt morgen wieder rein.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {picks.map((p) => {
            const up = (p.changePct ?? 0) >= 0;
            return (
              <a
                key={p.symbol}
                href={`/stock/${encodeURIComponent(p.symbol)}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  padding: "12px 14px",
                  background: "var(--am-card-soft)",
                  border: "1px solid var(--am-border-light, var(--am-border))",
                  borderRadius: 12,
                  textDecoration: "none",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--am-card-hover)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px -10px rgba(0,0,0,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--am-card-soft)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ minWidth: 0 }}>
                  {/* Head: Country + Symbol + Score */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: "var(--am-text-muted)",
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      padding: "2px 5px", borderRadius: 4,
                      border: "1px solid var(--am-border-light)",
                      background: "var(--am-card)",
                    }}>{p.country}</span>
                    <span style={{
                      fontSize: 13, fontWeight: 800, color: "var(--am-text)",
                      fontFamily: "'SF Mono', ui-monospace, Menlo, monospace",
                      letterSpacing: "-0.005em",
                    }}>{p.symbol}</span>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      padding: "1px 6px", borderRadius: 5,
                      background: `${scoreColor(p.metrioScore)}15`,
                      color: scoreColor(p.metrioScore),
                      fontSize: 10, fontWeight: 800,
                      border: `1px solid ${scoreColor(p.metrioScore)}30`,
                    }}>
                      {p.metrioScore}
                    </span>
                    <span style={{ flex: 1 }} />
                    <ArrowUpRight size={12} style={{ color: "var(--am-text-faint)" }} />
                  </div>
                  {/* Name + Sector */}
                  <p style={{
                    margin: 0, fontSize: 12, fontWeight: 600,
                    color: "var(--am-text-secondary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{p.name} · <span style={{ fontWeight: 500, color: "var(--am-text-muted)" }}>{p.sector}</span></p>
                  {/* Thesis */}
                  <p style={{
                    margin: "6px 0 0", fontSize: 11.5, lineHeight: 1.5,
                    color: "var(--am-text-muted)",
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>{p.thesis}</p>
                </div>

                {/* Price cell */}
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                  {p.priceNow !== null ? (
                    <>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--am-text)" }}>
                        {p.priceNow.toFixed(2)} <span style={{ fontSize: 10, color: "var(--am-text-faint)", fontWeight: 600 }}>{p.currency}</span>
                      </span>
                      {p.changePct !== null && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          fontSize: 11, fontWeight: 700,
                          color: up ? "#059669" : "#dc2626",
                        }}>
                          {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {up ? "+" : ""}{p.changePct.toFixed(2)}%
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: 10, color: "var(--am-text-faint)", fontStyle: "italic" }}>—</span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Footnote */}
      <p style={{
        marginTop: 14, paddingTop: 12,
        borderTop: "1px solid var(--am-border-light, var(--am-border))",
        fontSize: 10.5, color: "var(--am-text-faint)", lineHeight: 1.55, letterSpacing: "-0.005em",
      }}>
        Kein Kauf- oder Verkaufsrat — nur Horizonterweiterung.
        Keine Anlageberatung i.S.d. § 85 WpHG.
      </p>

      <style>{`
        @keyframes am-skeleton {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
