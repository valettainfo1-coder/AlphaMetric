/* Lokale Konfiguration für METRICGYM.
   ============================================================================
   ⚠️  SICHERHEIT — UNBEDINGT LESEN
   Diese Datei wird beim Deploy ÖFFENTLICH ausgeliefert und ist für jeden unter
   <deine-domain>/config.js abrufbar. Es DÜRFEN HIER KEINE GEHEIMEN SCHLÜSSEL
   stehen (Gemini, OpenRouter, Groq). Solche Keys gehören ausschließlich
   serverseitig in die Supabase Edge Function 'ai-proxy' (siehe SUPABASE_SETUP.md).

   Die zuvor hier hinterlegten Gemini-, OpenRouter- und Groq-Keys waren in einem
   öffentlichen Bundle enthalten und gelten damit als KOMPROMITTIERT.
   → In den jeweiligen Dashboards SOFORT widerrufen und neu erzeugen, dann nur
     noch als Supabase-Secret setzen:
       supabase secrets set GEMINI_API_KEY=...  OPENROUTER_API_KEY=...  GROQ_API_KEY=...
       supabase functions deploy ai-proxy
   ============================================================================
   Der Supabase anon/publishable-Key ist für das Frontend gedacht (öffentlich);
   Row-Level-Security schützt die eigentlichen Daten. */
window.METRICGYM_CONFIG = {
  /* KEINE KI-Keys mehr im Client. Alle KI-Aufrufe laufen über den Server-Proxy
     (useAiProxy:true), sobald die Edge Function 'ai-proxy' deployt ist.
     Ohne Proxy bleibt die App local-first nutzbar; KI-Funktionen sind dann inaktiv. */
  geminiKey: "",
  openrouterKey: "",
  openrouterModel: "openai/gpt-4o-mini",
  groqKey: "",

  /* Konten mit dauerhaftem ELITE-Zugang (z. B. Gründer, Familie, Presse).
     Wird beim Login/App-Start geprüft — Klein-/Großschreibung egal. */
  eliteAccounts: ["lovisstumpfe@icloud.com"],

  /* Cloud-Sync pro Konto. anon-Key ist öffentlich – Schutz erfolgt über RLS. */
  supabaseUrl: "https://nsdziafvhhzuuhrctozl.supabase.co",
  supabaseAnonKey: "sb_publishable_Be3Xcvik1HiQnHfPblaSKQ_-nt9rf0c",

  /* ===== OBSERVABILITY (D3, optional) =====
     sentryDsn: EU-DSN aus sentry.io (Region Frankfurt wählen!) — Fehler-
     berichte werden vor dem Senden von PII befreit (beforeSend).
     plausibleDomain: die Site-Domain aus plausible.io (EU, cookielos —
     ohne Consent-Banner nutzbar). Leer = beides komplett aus. */
  sentryDsn: "",
  plausibleDomain: "",

  /* ===== STRIPE (D4) =====
     Erst auf true setzen, wenn die Edge Functions create-checkout,
     stripe-webhook (--no-verify-jwt) und create-portal deployt sind und
     alle STRIPE_*-Secrets gesetzt wurden (siehe SUPABASE_SETUP.md §10).
     Solange false: die App verkauft NICHTS und sagt das ehrlich. */
  stripeEnabled: false,

  /* ===== KI-PROXY (für Produktion erforderlich) =====
     Auf true setzen, NACHDEM die Edge Function 'ai-proxy' deployt ist und die
     Secrets serverseitig gesetzt sind. Dann laufen ALLE KI-Aufrufe (Coach,
     Ernährung, Vision) über den Server – kein Key liegt im Browser. */
  useAiProxy: true,

  /* Alt — alter Groq-only-Proxy. Deaktiviert. */
  useGroqProxy: false,

  /* ===== RECHTLICHE BETREIBER-ANGABEN (DE-PFLICHT vor Launch!) =====
     Impressum (§5 DDG) + Verantwortlicher (DSGVO) verlangen ECHTE Angaben.
     Solange ein Feld leer ist, zeigt die App sichtbar „[bitte ausfüllen]" —
     so geht nie versehentlich ein blankes Impressum live. Vor dem öffentlichen
     Start ALLE Felder befüllen und idealerweise anwaltlich prüfen lassen. */
  legal: {
    name: "",            // Name / Firma (z. B. „Max Mustermann" oder „MetricGym UG")
    street: "",          // Straße + Hausnummer
    cityZip: "",         // PLZ + Ort
    country: "Deutschland",
    email: "",           // Kontakt-E-Mail (Pflicht)
    phone: "",           // Telefon (empfohlen)
    vatId: "",           // USt-IdNr. (falls vorhanden)
    responsible: "",     // Verantwortlich i.S.d. § 18 Abs. 2 MStV (meist = Name)
    supabaseRegion: "",  // Serverstandort/Region des Supabase-Projekts (z. B. „EU (Frankfurt)")
    termsDate: "",       // Stand der AGB (z. B. „Juni 2026")
    authority: ""        // zuständige Landesdatenschutzbehörde (z. B. „LDI NRW, www.ldi.nrw.de")
  }
};
