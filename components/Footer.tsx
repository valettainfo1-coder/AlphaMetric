// ═══════════════════════════════════════════════════════════════════
// FOOTER — site-wide reusable footer.
// Used on every page so the navigation, legal disclosures and brand
// info are consistently available. Pulled out of app/page.tsx into a
// standalone component so we can drop it onto every route with one line.
// ═══════════════════════════════════════════════════════════════════

import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{
      background: "var(--am-bg-tertiary)",
      borderTop: "1px solid var(--am-border)",
      color: "var(--am-text-secondary)",
      padding: "60px 24px 32px",
    }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div className="footer-grid" style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr 1fr",
          gap: 48,
          marginBottom: 36,
        }}>
          {/* BLOCK 1 — Marke + Positionierung */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                <defs>
                  <linearGradient id="ft-g" x1="0" y1="40" x2="40" y2="0">
                    <stop offset="0%" stopColor="#1a1d22" />
                    <stop offset="100%" stopColor="#0a0b0e" />
                  </linearGradient>
                </defs>
                <rect width="40" height="40" rx="11" fill="url(#ft-g)" />
                <path d="M12 32L20 8L28 32" stroke="#e6e8ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M15 24L25 24" stroke="#c0c5ce" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
                <path d="M20 12L20 5" stroke="#e6e8ee" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                <path d="M16.5 8.5L20 5L23.5 8.5" stroke="#e6e8ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <span style={{
                fontFamily: "'Space Grotesk','Inter',sans-serif",
                fontSize: 16, fontWeight: 700, color: "var(--am-text)",
              }}>
                Alpha<span style={{ color: "var(--am-text-muted)" }}>Metric</span>
              </span>
            </div>
            <p style={{
              fontSize: 13, color: "var(--am-text-muted)",
              lineHeight: 1.7, maxWidth: 320,
            }}>
              Institutionelle Aktienanalyse für Privatanleger. Echtzeit-Daten von XETRA bis NYSE, verifiziert von Metrio AI.
            </p>
            <p style={{ fontSize: 11, color: "var(--am-text-faint)", marginTop: 12 }}>
              Keine Anlageberatung · § 85 WpHG
            </p>
          </div>

          {/* BLOCK 2 — Plattform */}
          <div>
            <p style={{
              fontSize: 11, fontWeight: 700,
              color: "var(--am-text-faint)",
              textTransform: "uppercase", letterSpacing: "0.1em",
              marginBottom: 14,
            }}>Plattform</p>
            {[
              ["Watchlists",  "/watchlists"],
              ["Screener",    "/screener"],
              ["Heatmap",     "/heatmap"],
              ["Daily Brief", "/brief"],
              ["Earnings",    "/earnings"],
              ["Vergleich",   "/compare"],
              ["Portfolio",   "/portfolio"],
            ].map(([l, h]) => (
              <Link key={l} href={h} style={{
                display: "block", fontSize: 13, color: "var(--am-text-muted)",
                textDecoration: "none", marginBottom: 8,
              }}>{l}</Link>
            ))}
          </div>

          {/* BLOCK 3 — Unternehmen & Recht */}
          <div>
            <p style={{
              fontSize: 11, fontWeight: 700,
              color: "var(--am-text-faint)",
              textTransform: "uppercase", letterSpacing: "0.1em",
              marginBottom: 14,
            }}>Unternehmen &amp; Recht</p>
            {[
              ["Über uns",      "/about"],
              ["Kontakt",       "/kontakt"],
              ["Impressum",     "/impressum"],
              ["Datenschutz",   "/datenschutz"],
              ["Risikohinweis", "/risikohinweis"],
            ].map(([l, h]) => (
              <Link key={l} href={h} style={{
                display: "block", fontSize: 13, color: "var(--am-text-muted)",
                textDecoration: "none", marginBottom: 8,
              }}>{l}</Link>
            ))}
          </div>
        </div>

        <div style={{
          borderTop: "1px solid var(--am-border)",
          paddingTop: 24, marginBottom: 16,
        }}>
          <p style={{
            fontSize: 11, color: "var(--am-text-faint)",
            lineHeight: 1.8, maxWidth: 900,
          }}>
            <strong>Wichtiger Hinweis:</strong> Keine Anlageberatung gemäß § 85 WpHG. Alle auf AlphaMetric dargestellten Informationen, Analysen und Scores dienen ausschließlich der allgemeinen Finanzbildung und stellen keine Empfehlung zum Kauf oder Verkauf von Wertpapieren dar. Die Nutzung erfolgt auf eigenes Risiko. Vergangene Wertentwicklung ist kein Indikator für zukünftige Ergebnisse. Paper-Trading-Portfolios verwenden virtuelles Kapital ohne reale Marktauswirkungen. Metrio AI generiert keine rechtsverbindlichen Anlageempfehlungen.
          </p>
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 12,
        }}>
          <p style={{ fontSize: 12, color: "var(--am-text-faint)" }}>
            © {new Date().getFullYear()} AlphaMetric. Alle Rechte vorbehalten.
          </p>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontSize: 11, color: "var(--am-text-faint)" }}>Daten: Finnhub</span>
            <span style={{ fontSize: 11, color: "var(--am-text-faint)" }}>Charts: TradingView</span>
          </div>
        </div>
      </div>

      {/* Mobile responsive grid override */}
      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
      `}</style>
    </footer>
  );
}
