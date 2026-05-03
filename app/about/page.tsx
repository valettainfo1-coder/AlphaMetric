import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Über uns",
  description: "AlphaMetric ist die Investment-Zentrale für Privatanleger: Daily Brief, Top Movers, Aktiensuche, Metrio und Portfolio-Kontext in einer App.",
};

export default function About() {
  const Section = ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14, letterSpacing: "-0.02em" }}>{title}</h2>
      <div style={{ color: "var(--am-text-secondary)", lineHeight: 1.75, fontSize: 15 }}>
        {children}
      </div>
    </section>
  );

  return (
    <div style={{ background: "var(--am-bg)", minHeight: "100vh", color: "var(--am-text)", padding: "80px 24px 60px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Hero */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--am-text-faint)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12 }}>
          Über AlphaMetric
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 1.1, marginBottom: 20 }}>
          Wir machen Investieren verständlich, bevor es teuer wird.
        </h1>
        <p style={{ fontSize: 17, color: "var(--am-text-muted)", lineHeight: 1.65, marginBottom: 48, maxWidth: 600 }}>
          AlphaMetric ist für Menschen gebaut, die investieren wollen, aber nicht jeden Tag zehn Finanzseiten lesen möchten. Daily Brief, Top Movers, Aktiensuche, Metrio und Portfolio-Kontext laufen in einem klaren Ablauf zusammen.
        </p>

        <Section title="Warum es uns gibt">
          <p style={{ marginBottom: 12 }}>
            Viele Privatanleger haben nicht zu wenig Motivation, sondern zu wenig Orientierung. News, Kurse, Kennzahlen, Watchlists und Depotfragen liegen oft in verschiedenen Apps. AlphaMetric bringt diese Bausteine in eine Reihenfolge, die beim Denken hilft.
          </p>
          <p style={{ marginBottom: 12 }}>
            Der Ablauf ist bewusst einfach: Markt über Daily Brief und Top Movers entdecken, Aktien über Suche und Kennzahlen verstehen, Metrio für Klartext nutzen und Ideen im Portfolio einordnen. Alles auf Deutsch, ohne den Anspruch, Anlageberatung zu ersetzen.
          </p>
        </Section>

        <Section title="Unsere Prinzipien">
          <ul style={{ paddingLeft: 18, lineHeight: 1.85 }}>
            <li><strong>Klartext vor Jargon.</strong> Wenn ein Achtklässler es nicht versteht, ist es schlecht erklärt.</li>
            <li><strong>Daten vor Meinung.</strong> Jede Aussage hat eine Quelle, jede Zahl ein Datum.</li>
            <li><strong>Keine Anlageberatung, kein Kompromiss.</strong> § 85 WpHG ist klar — wir bilden, wir empfehlen nicht.</li>
            <li><strong>Privatsphäre als Default.</strong> Portfolio-Daten bleiben lokal im Browser, kein Tracking.</li>
            <li><strong>Datenqualität vor Feature-Flut.</strong> Lieber drei perfekte Kennzahlen als dreißig halbgare.</li>
          </ul>
        </Section>

        <Section title="Datenquellen">
          <p>
            Marktdaten von Finnhub und Yahoo Finance. Charts von TradingView. KI-Analyse über Groq (Llama 3.3 70B) als Primärmodell, Anthropic Claude und OpenAI als Fallback. Hosting auf Vercel. Alle Daten werden DSGVO-konform verarbeitet, siehe <a href="/datenschutz" style={{ color: "var(--am-accent)" }}>Datenschutzerklärung</a>.
          </p>
        </Section>

        <Section title="Kontakt & rechtliche Hinweise">
          <p>
            Für Presse-, Kooperations- oder Support-Anfragen besuche unsere <a href="/kontakt" style={{ color: "var(--am-accent)" }}>Kontaktseite</a>.
            Vollständige Anbieterkennzeichnung im <a href="/impressum" style={{ color: "var(--am-accent)" }}>Impressum</a>.
            Risikohinweise zur Wertpapieranlage findest du im <a href="/risikohinweis" style={{ color: "var(--am-accent)" }}>Risikohinweis</a>.
          </p>
        </Section>

        <p style={{ fontSize: 12, color: "var(--am-text-faint)", marginTop: 48 }}>
          AlphaMetric ist ein Bildungs- und Analyseprodukt. Es stellt keine Anlageberatung im Sinne des § 85 WpHG dar.
        </p>
      </div>
      <Footer />
    </div>
  );
}
