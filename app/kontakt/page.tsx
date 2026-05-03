import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontaktiere AlphaMetric — für Presse-, Kooperations- und Support-Anfragen.",
};

export default function Kontakt() {
  const Card = ({ title, body, action, href }: { title: string; body: string; action: string; href: string }) => (
    <a href={href} style={{
      display: "block",
      padding: "24px 26px",
      background: "var(--am-card)",
      border: "1px solid var(--am-border)",
      borderRadius: 16,
      textDecoration: "none",
      color: "inherit",
      boxShadow: "var(--am-shadow)",
      transition: "transform 0.18s ease, border-color 0.18s ease",
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--am-text-faint)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
        {title}
      </p>
      <p style={{ fontSize: 15, color: "var(--am-text)", lineHeight: 1.55, marginBottom: 14, fontWeight: 500 }}>
        {body}
      </p>
      <p style={{ fontSize: 13, color: "var(--am-accent)", fontWeight: 700 }}>
        {action} →
      </p>
    </a>
  );

  return (
    <div style={{ background: "var(--am-bg)", minHeight: "100vh", color: "var(--am-text)", padding: "80px 24px 60px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--am-text-faint)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12 }}>
          Kontakt
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 1.1, marginBottom: 20 }}>
          So erreichst du uns.
        </h1>
        <p style={{ fontSize: 17, color: "var(--am-text-muted)", lineHeight: 1.65, marginBottom: 40, maxWidth: 600 }}>
          Wir antworten in der Regel innerhalb von 1–2 Werktagen. Bitte beachte, dass wir keine individuelle Anlageberatung leisten dürfen (§ 85 WpHG).
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }}>
          <Card
            title="Allgemeine Anfragen"
            body="Fragen zum Produkt, Bug-Reports, Feature-Wünsche, Feedback."
            action="hello@alphametric.app"
            href="mailto:hello@alphametric.app"
          />
          <Card
            title="Presse & Kooperationen"
            body="Interview-Anfragen, Co-Marketing, Investor-Relations."
            action="press@alphametric.app"
            href="mailto:press@alphametric.app"
          />
          <Card
            title="Datenschutz / DSGVO"
            body="Auskunft, Berichtigung, Löschung deiner Daten."
            action="privacy@alphametric.app"
            href="mailto:privacy@alphametric.app"
          />
          <Card
            title="Support"
            body="Technische Probleme, Login-Fragen, Account-Hilfe."
            action="support@alphametric.app"
            href="mailto:support@alphametric.app"
          />
        </div>

        <div style={{
          padding: "20px 24px",
          background: "var(--am-card-soft)",
          border: "1px solid var(--am-border)",
          borderRadius: 14,
          marginBottom: 32,
        }}>
          <p style={{ fontSize: 13, color: "var(--am-text-secondary)", lineHeight: 1.7 }}>
            <strong>Wichtiger Hinweis:</strong> Bitte sende uns niemals Passwörter, API-Keys oder vollständige Kontonummern per E-Mail. Sensible Daten gehören ausschließlich in autorisierte Accounts auf der jeweiligen Broker-Plattform.
          </p>
        </div>

        <p style={{ fontSize: 13, color: "var(--am-text-muted)", lineHeight: 1.7 }}>
          Postanschrift, vertretungsberechtigte Personen und Handelsregistereintrag findest du im <a href="/impressum" style={{ color: "var(--am-accent)" }}>Impressum</a>.
        </p>

        <style>{`
          @media (max-width: 640px) {
            div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
      <Footer />
    </div>
  );
}
