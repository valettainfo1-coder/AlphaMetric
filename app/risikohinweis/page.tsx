import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = { title: "Risikohinweis" };

export default function Risikohinweis() {
  return (
    <div style={{ background: "var(--am-bg)", minHeight: "100vh", color: "var(--am-text)", padding: "80px 24px 60px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 32 }}>Risikohinweis</h1>

        <div style={{ padding: "20px 24px", background: "var(--am-red-bg)", border: "1px solid var(--am-red-text)", borderRadius: 12, marginBottom: 32, fontSize: 14, color: "var(--am-red-text)", fontWeight: 600, lineHeight: 1.8 }}>
          AlphaMetric stellt keine Anlageberatung dar. Alle Informationen dienen ausschließlich der allgemeinen Finanzbildung.
        </div>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Keine Anlageberatung</h2>
          <p style={{ color: "var(--am-text-secondary)", lineHeight: 1.8, fontSize: 14 }}>
            Die auf AlphaMetric dargestellten Informationen, Analysen, Scores und KI-gestützten Einschätzungen stellen keine Empfehlung zum Kauf oder Verkauf von Finanzinstrumenten dar. Sie sind keine Anlageberatung im Sinne des § 85 WpHG und ersetzen nicht die individuelle Beratung durch einen qualifizierten Finanzberater.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Risiken des Wertpapierhandels</h2>
          <p style={{ color: "var(--am-text-secondary)", lineHeight: 1.8, fontSize: 14 }}>
            Der Handel mit Wertpapieren ist mit erheblichen Risiken verbunden und kann zum vollständigen Verlust des eingesetzten Kapitals führen. Vergangene Wertentwicklung ist kein verlässlicher Indikator für zukünftige Ergebnisse. Sie sollten nur Kapital investieren, dessen Verlust Sie sich leisten können.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Metrio AI</h2>
          <p style={{ color: "var(--am-text-secondary)", lineHeight: 1.8, fontSize: 14 }}>
            Metrio ist ein KI-gestütztes Analyse-Tool und generiert keine rechtsverbindlichen Anlageempfehlungen. Die Einschätzungen basieren auf öffentlich verfügbaren Daten und Sprachmodellen mit begrenztem Trainingsdatum. Fehlerhafte oder veraltete Informationen sind möglich. Überprüfe alle Angaben eigenständig.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Paper Trading</h2>
          <p style={{ color: "var(--am-text-secondary)", lineHeight: 1.8, fontSize: 14 }}>
            Das Paper-Trading-Portfolio verwendet ausschließlich virtuelles Kapital. Simulierte Ergebnisse weichen regelmäßig von realen Handelsresultaten ab, da u.a. Slippage, Orderbook-Tiefe und Marktimpact nicht simuliert werden.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Datengenauigkeit</h2>
          <p style={{ color: "var(--am-text-secondary)", lineHeight: 1.8, fontSize: 14 }}>
            Kursdaten können verzögert sein (bis zu 15 Minuten bei bestimmten Börsen). AlphaMetric übernimmt keine Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität der dargestellten Daten. Datenquelle: Finnhub.
          </p>
        </section>

        <p style={{ color: "var(--am-text-faint)", fontSize: 12, marginTop: 40 }}>Stand: April 2026</p>
      </div>
      <Footer />
    </div>
  );
}
