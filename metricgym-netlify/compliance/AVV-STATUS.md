# Auftragsverarbeitung — Status & Checkliste (Art. 28 DSGVO)

Stand: Juli 2026 · Jede Zeile muss vor dem Launch auf ✅ stehen.

| Auftragsverarbeiter | Zweck | Datenarten | DPA/AVV | Status |
|---|---|---|---|---|
| **Supabase Inc.** | Datenbank, Auth, Edge Functions | Konto, Gesundheitsdaten (Art. 9), Consent-Log | DPA im Dashboard akzeptieren; **EU-Region des Projekts verifizieren** und in `config.js → legal.supabaseRegion` eintragen | [BETREIBER] ☐ |
| **Netlify Inc.** | Hosting, CDN | technische Logs (IP) | Netlify DPA (Standardvertragsklauseln) akzeptieren | [BETREIBER] ☐ |
| **Google (Gemini API)** | KI-Coach (nur bei aktiver Nutzung, via `ai-proxy`) | Chat-Inhalte inkl. möglicher Gesundheitsdaten, Fotos | Google Cloud/AI DPA + SCCs; API-Tier ohne Trainings-Nutzung wählen | [BETREIBER] ☐ |
| **OpenRouter Inc.** | KI-Fallback (via `ai-proxy`) | Chat-Inhalte | DPA/ToS prüfen; No-Training-Flag setzen | [BETREIBER] ☐ |
| **Groq Inc.** | KI-Fallback/Streaming (via `ai-proxy`) | Chat-Inhalte | DPA/ToS prüfen | [BETREIBER] ☐ |
| **Open Food Facts** | Produktdatenbank | NUR Suchbegriffe/Barcodes — **kein Personenbezug** → kein AVV nötig (kein Auftragsverarbeiter-Verhältnis) | — | ✅ (per Design) |

## Geprüfte Datenminimierung Richtung KI (Code-Stand)
- `aiContext()` sendet: Alter, Größe/Gewicht/Ziele, Trainings-Kennzahlen.
  **Kein Name, keine E-Mail, keine Kontakt- oder Gerätedaten.** (Verifiziert;
  bei Änderungen an `aiContext()` diese Datei aktualisieren.)
- `ai-proxy` hält die API-Keys serverseitig und erzwingt Login + Limits —
  anonyme Anfragen sind nicht möglich.

## Wichtig für die Datenschutzerklärung
Die Coach-Chats KÖNNEN Gesundheitsdaten enthalten → die KI-Anbieter sind in
der Datenschutzerklärung als Empfänger mit Zweck + Drittland genannt
(Abschnitt 5). Diese Nennung muss erhalten bleiben, solange die Provider-
Kette (Gemini → OpenRouter → Groq) aktiv ist.
