import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = { title: "Impressum" };

export default function Impressum() {
  return (
    <div style={{ background: "var(--am-bg)", minHeight: "100vh", color: "var(--am-text)", padding: "80px 24px 60px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 32 }}>Impressum</h1>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Angaben gemäß § 5 TMG</h2>
          <p style={{ color: "var(--am-text-secondary)", lineHeight: 1.8, fontSize: 14 }}>
            [Dein vollständiger Name]<br />
            [Straße und Hausnummer]<br />
            [PLZ und Ort]<br />
            Deutschland
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Kontakt</h2>
          <p style={{ color: "var(--am-text-secondary)", lineHeight: 1.8, fontSize: 14 }}>
            E-Mail: [deine@email.de]
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p style={{ color: "var(--am-text-secondary)", lineHeight: 1.8, fontSize: 14 }}>
            [Dein vollständiger Name]<br />
            [Adresse wie oben]
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Haftungsausschluss</h2>
          <p style={{ color: "var(--am-text-secondary)", lineHeight: 1.8, fontSize: 14 }}>
            Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
            Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.
          </p>
        </section>

        <div style={{ padding: "20px 24px", background: "var(--am-card-soft)", border: "1px solid var(--am-border)", borderRadius: 12, fontSize: 13, color: "var(--am-text-muted)" }}>
          <strong>Hinweis:</strong> Bitte ergänze dieses Impressum mit deinen echten Angaben, bevor du die Seite öffentlich zugänglich machst. Ein unvollständiges Impressum kann abgemahnt werden.
        </div>
      </div>
      <Footer />
    </div>
  );
}
