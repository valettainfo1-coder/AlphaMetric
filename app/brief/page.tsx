"use client";
// ═══════════════════════════════════════════════════════════════════
// DAILY BRIEF — Das 60-Sekunden-Marktupdate.
// Aggregiert Top Movers, Earnings heute und News-Highlights in einer
// einzigen scroll-freundlichen Ansicht. Retention-Hebel.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sunrise, TrendingUp, TrendingDown, Calendar, Zap, ArrowRight,
  Globe, Clock, Sparkles, ArrowUpRight,
} from "lucide-react";
import Footer from "@/components/Footer";

type Mover = { symbol: string; name: string; price: number; change: number; changePct: number };
type NewsItem = {
  id: string; headline: string; summary: string; source: string; url: string;
  publishedAt: string; category: string; impact: "HIGH" | "MED" | "LOW";
  tickers: string[];
  verification: { status: "verified" | "review" | "hold"; score: number; note: string };
};
type EarningsItem = {
  symbol: string; date: string; time: "bmo" | "amc" | "dmh" | "";
  epsEstimate: number | null; epsActual: number | null;
};

// Helpers
function timeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  return `vor ${Math.floor(h / 24)} Tg`;
}

function marketStatus(tz: "DE" | "US"): { open: boolean; label: string; until: string } {
  const now = new Date();
  // Use UTC hours — approximate. DE: 9-17:30 CET (8-16:30 UTC), US: 14:30-21:00 UTC (9:30-16:00 ET)
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const totalMin = h * 60 + m;
  const day = now.getUTCDay();
  const weekend = day === 0 || day === 6;
  if (weekend) return { open: false, label: "Wochenende", until: "Montag" };
  if (tz === "DE") {
    const open = 8 * 60;
    const close = 16 * 60 + 30;
    const isOpen = totalMin >= open && totalMin < close;
    return {
      open: isOpen,
      label: isOpen ? "XETRA offen" : totalMin < open ? "XETRA opens bald" : "XETRA geschlossen",
      until: isOpen ? `bis 17:30 CET` : totalMin < open ? "9:00 CET" : "morgen 9:00 CET",
    };
  }
  // US
  const open = 14 * 60 + 30;
  const close = 21 * 60;
  const isOpen = totalMin >= open && totalMin < close;
  return {
    open: isOpen,
    label: isOpen ? "NYSE offen" : totalMin < open ? "NYSE opens bald" : "NYSE geschlossen",
    until: isOpen ? `bis 22:00 MEZ` : totalMin < open ? "15:30 MEZ" : "morgen 15:30 MEZ",
  };
}

// ─── Sections ────────────────────────────────────────────────────
function HeroBrief() {
  const [greeting, setGreeting] = useState("Guten Morgen");
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setGreeting(h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend");
    setDateStr(now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  }, []);

  const de = useMemo(() => marketStatus("DE"), []);
  const us = useMemo(() => marketStatus("US"), []);

  return (
    <section style={{ padding: "56px 24px 16px", maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div className="am-icon-frame am-ico-accent am-ico-sm">
          <Sunrise size={16} color="#0a0b0e" strokeWidth={2.2} />
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.14em", color: "var(--am-accent)",
        }}>
          Daily Brief
        </span>
      </div>
      <h1 style={{
        fontSize: 40, fontWeight: 900, color: "var(--am-text)",
        letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 10,
      }}>
        {greeting}. <span style={{ color: "var(--am-accent)" }}>Hier ist dein Markt.</span>
      </h1>
      <p style={{ fontSize: 15, color: "var(--am-text-muted)", marginBottom: 22 }}>
        {dateStr} · 60 Sekunden, die dich für den Tag informiert machen.
      </p>

      {/* Market Status Strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
      }}>
        {[{ key: "DE", code: "DE", ...de }, { key: "US", code: "US", ...us }].map(m => (
          <div key={m.key} className="am-glass" style={{
            padding: "14px 18px", borderRadius: 14,
            display: "flex", alignItems: "center", gap: 14,
            border: "1px solid var(--am-border)",
            background: "var(--am-card)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
          }}>
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: "0.12em",
              color: "var(--am-text)", padding: "6px 10px", borderRadius: 8,
              border: "1px solid var(--am-border)",
              background: "var(--am-card-soft)",
              fontFamily: "'SF Mono', ui-monospace, Menlo, monospace",
            }}>{m.code}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: m.open ? "var(--am-accent)" : "var(--am-text-faint)",
                  boxShadow: m.open ? "0 0 10px rgba(120,128,140,0.4)" : "none",
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--am-text)" }}>{m.label}</span>
              </div>
              <p style={{ fontSize: 11, color: "var(--am-text-muted)", marginTop: 2 }}>
                <Clock size={10} style={{ verticalAlign: "middle", marginRight: 4 }} />
                {m.until}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MoversBlock({ gainers, losers }: { gainers: Mover[]; losers: Mover[] }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
    }} className="brief-movers-grid">
      {[{ title: "Top Gainer", items: gainers, up: true, accent: "var(--am-green-text, #10b981)" },
        { title: "Top Loser", items: losers, up: false, accent: "var(--am-red-text, #ef4444)" }].map(col => (
        <div key={col.title} className="am-glass" style={{
          background: "var(--am-card)",
          border: "1px solid var(--am-border)",
          borderRadius: 14, padding: "16px 18px",
          boxShadow: "var(--am-shadow)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            {col.up ? <TrendingUp size={14} color={col.accent} /> : <TrendingDown size={14} color={col.accent} />}
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--am-text)", letterSpacing: "-0.01em" }}>
              {col.title}
            </h3>
          </div>
          {col.items.slice(0, 5).map((m, i) => (
            <Link key={m.symbol} href={`/stock/${encodeURIComponent(m.symbol)}`} style={{
              display: "grid",
              gridTemplateColumns: "16px 1fr auto auto",
              gap: 10, alignItems: "center",
              padding: "8px 6px",
              borderBottom: i < 4 ? "1px solid var(--am-border-light, var(--am-border))" : "none",
              textDecoration: "none",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--am-text-faint)", fontVariantNumeric: "tabular-nums" }}>
                {i + 1}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 800, color: "var(--am-text)",
                  fontFamily: "'SF Mono', ui-monospace, Menlo, monospace",
                }}>{m.symbol}</div>
                <div style={{
                  fontSize: 10.5, color: "var(--am-text-muted)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  maxWidth: 160,
                }}>{m.name}</div>
              </div>
              <span style={{
                fontSize: 11.5, fontWeight: 700, color: "var(--am-text)",
                fontVariantNumeric: "tabular-nums",
              }}>${m.price.toFixed(2)}</span>
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: col.accent,
                fontVariantNumeric: "tabular-nums",
                minWidth: 50, textAlign: "right",
              }}>
                {m.changePct >= 0 ? "+" : ""}{m.changePct.toFixed(2)}%
              </span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

function EarningsBlock({ items }: { items: EarningsItem[] }) {
  if (items.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const todays = items.filter(it => it.date === today).slice(0, 8);
  const show = todays.length > 0 ? todays : items.slice(0, 8);
  const label = todays.length > 0 ? "Earnings heute" : "Earnings diese Woche";

  return (
    <div className="am-glass" style={{
      background: "var(--am-card)",
      border: "1px solid var(--am-border)",
      borderRadius: 14, padding: "16px 18px",
      boxShadow: "var(--am-shadow)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Calendar size={14} color="var(--am-accent)" />
        <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--am-text)" }}>{label}</h3>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 8,
      }}>
        {show.map(e => (
          <Link key={e.symbol + e.date} href={`/stock/${encodeURIComponent(e.symbol)}`} style={{
            padding: "10px 12px", borderRadius: 10,
            background: "var(--am-card-soft)",
            border: "1px solid var(--am-border-light, var(--am-border))",
            textDecoration: "none",
            display: "flex", flexDirection: "column", gap: 3,
          }}>
            <span style={{
              fontSize: 12, fontWeight: 800, color: "var(--am-text)",
              fontFamily: "'SF Mono', ui-monospace, Menlo, monospace",
            }}>{e.symbol}</span>
            <span style={{ fontSize: 10, color: "var(--am-text-muted)" }}>
              {e.time === "bmo" ? "Vor Börse" : e.time === "amc" ? "Nach Börse" : "—"}
              {e.epsEstimate != null && ` · Est. ${e.epsEstimate.toFixed(2)}`}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NewsBlock({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return null;
  const top = items.slice(0, 6);
  return (
    <div className="am-glass" style={{
      background: "var(--am-card)",
      border: "1px solid var(--am-border)",
      borderRadius: 14, padding: "16px 18px",
      boxShadow: "var(--am-shadow)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Sparkles size={14} color="var(--am-accent)" />
        <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--am-text)" }}>Was du wissen musst</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {top.map((n, i) => (
          <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 12, alignItems: "start",
            padding: "10px 4px",
            borderBottom: i < top.length - 1 ? "1px solid var(--am-border-light, var(--am-border))" : "none",
            textDecoration: "none",
          }}>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: "3px 7px",
              borderRadius: 5,
              background: n.impact === "HIGH" ? "rgba(239, 68, 68, 0.12)"
                        : n.impact === "MED" ? "rgba(245, 158, 11, 0.12)"
                        : "rgba(100, 116, 139, 0.10)",
              color: n.impact === "HIGH" ? "#dc2626"
                   : n.impact === "MED" ? "#d97706"
                   : "var(--am-text-muted)",
              letterSpacing: "0.04em",
              alignSelf: "start",
              marginTop: 2,
            }}>
              {n.impact}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 700, color: "var(--am-text)", lineHeight: 1.4,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>{n.headline}</p>
              <p style={{ fontSize: 11, color: "var(--am-text-faint)", marginTop: 3 }}>
                {n.source} · {timeAgo(n.publishedAt)}
                {n.tickers.length > 0 && ` · ${n.tickers.slice(0, 3).join(", ")}`}
              </p>
            </div>
            <ArrowUpRight size={14} style={{ color: "var(--am-text-faint)", alignSelf: "center" }} />
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function DailyBriefPage() {
  const [gainers, setGainers] = useState<Mover[]>([]);
  const [losers, setLosers] = useState<Mover[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [earnings, setEarnings] = useState<EarningsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [mv, nw, ern] = await Promise.all([
          fetch("/api/movers", { cache: "no-store" }).then(r => r.json()).catch(() => ({})),
          fetch("/api/news/feed?limit=30", { cache: "no-store" }).then(r => r.json()).catch(() => ({})),
          fetch("/api/news/earnings", { cache: "no-store" }).then(r => r.json()).catch(() => ({})),
        ]);
        setGainers(Array.isArray(mv?.gainers) ? mv.gainers : []);
        setLosers(Array.isArray(mv?.losers) ? mv.losers : []);
        setNews(Array.isArray(nw?.items) ? nw.items : []);
        setEarnings(Array.isArray(ern?.items) ? ern.items : []);
      } catch { /* keep empty */ }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div style={{
      fontFamily: "'Inter','Helvetica Neue',sans-serif",
      background: "var(--am-bg)", minHeight: "100vh", color: "var(--am-text)",
    }}>
      <style>{`
        @media (max-width: 720px) {
          .brief-movers-grid { grid-template-columns: 1fr !important; }
          .brief-main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <HeroBrief />

      <section style={{ padding: "16px 24px 32px", maxWidth: 1080, margin: "0 auto" }}>
        {loading ? (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
          }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                height: 200, borderRadius: 14,
                background: "var(--am-card-soft)",
                border: "1px solid var(--am-border-light, var(--am-border))",
                animation: "am-skeleton 1.4s ease-in-out infinite",
                opacity: 0.6,
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <MoversBlock gainers={gainers} losers={losers} />
            <div className="brief-main-grid" style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
            }}>
              <EarningsBlock items={earnings} />
              <NewsBlock items={news} />
            </div>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section style={{ padding: "24px 24px 80px", maxWidth: 1080, margin: "0 auto" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12,
        }}>
          {[
            { href: "/watchlists", label: "Watchlist prüfen", icon: <Zap size={14} /> },
            { href: "/portfolio", label: "Paper-Depot", icon: <Globe size={14} /> },
            { href: "/screener", label: "Screener", icon: <TrendingUp size={14} /> },
            { href: "/heatmap", label: "Heatmap", icon: <Sparkles size={14} /> },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10, padding: "14px 18px", borderRadius: 12,
              background: "var(--am-card-soft)",
              border: "1px solid var(--am-border-light, var(--am-border))",
              textDecoration: "none", color: "var(--am-text)",
              fontWeight: 700, fontSize: 13,
              transition: "all 0.18s ease",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--am-card-hover)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "var(--am-card-soft)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {a.icon} {a.label}
              </span>
              <ArrowRight size={14} style={{ color: "var(--am-text-faint)" }} />
            </Link>
          ))}
        </div>
      </section>

      <style>{`
        @keyframes am-skeleton { 0%,100% { opacity: 0.6 } 50% { opacity: 0.35 } }
      `}</style>

      <Footer />
    </div>
  );
}
