import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = { title: "Datenschutzerklärung" };

export default function Datenschutz() {
  const S = ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      <div style={{ color: "var(--am-text-secondary)", lineHeight: 1.8, fontSize: 14 }}>{children}</div>
    </section>
  );

  return (
    <div style={{ background: "var(--am-bg)", minHeight: "100vh", color: "var(--am-text)", padding: "80px 24px 60px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 32 }}>Datenschutzerklärung</h1>

        <S title="1. Verantwortlicher">
          <p>Verantwortlicher im Sinne der DSGVO: siehe <a href="/impressum" style={{ color: "var(--am-accent)" }}>Impressum</a>.</p>
        </S>

        <S title="2. Welche Daten wir erheben">
          <p style={{ marginBottom: 8 }}>AlphaMetric erhebt folgende Daten:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li><strong>Nutzungsdaten:</strong> IP-Adresse, Browsertyp, Betriebssystem, Zugriffszeit — automatisch durch den Webserver.</li>
            <li><strong>Account-Daten:</strong> E-Mail-Adresse und Name bei Registrierung (freiwillig).</li>
            <li><strong>Portfolio-Daten:</strong> Paper-Trading-Transaktionen und Watchlists — lokal im Browser gespeichert.</li>
          </ul>
        </S>

        <S title="3. Zweck der Verarbeitung">
          <p>Die Daten werden ausschließlich verwendet für:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li>Bereitstellung und Verbesserung des Dienstes</li>
            <li>Authentifizierung und Account-Verwaltung</li>
            <li>Technische Sicherheit und Missbrauchsprävention</li>
          </ul>
        </S>

        <S title="4. Drittanbieter-Dienste">
          <p>AlphaMetric nutzt folgende externe Dienste:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li><strong>Finnhub:</strong> Bereitstellung von Marktdaten (API-Aufrufe ohne personenbezogene Daten)</li>
            <li><strong>Groq:</strong> KI-gestützte Analyse durch Metrio AI (nur Aktien-bezogene Anfragen, keine persönlichen Daten)</li>
            <li><strong>Vercel:</strong> Hosting und Bereitstellung der Webseite</li>
            <li><strong>Google Fonts:</strong> Schriftarten (Inter, Space Grotesk)</li>
          </ul>
        </S>

        <S title="5. Cookies & lokale Speicherung">
          <p>AlphaMetric verwendet keine Tracking-Cookies. Wir nutzen ausschließlich <code style={{ background: "var(--am-bg-tertiary)", padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>localStorage</code> für:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li>Theme-Präferenz (hell/dunkel)</li>
            <li>Portfolio- und Watchlist-Daten</li>
            <li>Session-Verwaltung</li>
          </ul>
        </S>

        <S title="6. Deine Rechte (DSGVO Art. 15–21)">
          <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Kontaktiere uns per E-Mail (siehe Impressum).</p>
        </S>

        <S title="7. Datensicherheit">
          <p>Die Übertragung erfolgt über TLS/HTTPS-Verschlüsselung. Portfolio-Daten werden lokal in deinem Browser gespeichert und nicht an unsere Server übermittelt.</p>
        </S>

        <p style={{ color: "var(--am-text-faint)", fontSize: 12, marginTop: 40 }}>Stand: April 2026</p>
      </div>
      <Footer />
    </div>
  );
}
