# Meldeweg bei Datenschutzverletzungen (Art. 33/34 DSGVO) — 72-Stunden-SOP

Stand: Juli 2026 · Verantwortlich: **[BETREIBER: Name + Erreichbarkeit]**

## Was ist ein meldepflichtiger Vorfall?
Verlust, unbefugter Zugriff oder unbeabsichtigte Offenlegung personenbezogener
Daten — bei METRICGYM besonders kritisch, weil **Gesundheitsdaten (Art. 9)**
betroffen sein können. Beispiele: kompromittierter Supabase-Service-Role-Key,
fehlerhafte RLS-Policy, geleakte Backups, Übernahme des Netlify-/Supabase-
Accounts.

## Ablauf (die Uhr läuft ab Kenntnis!)

**Stunde 0–4 — Eindämmen & Festhalten**
1. Betroffene Keys sofort rotieren (Supabase: Settings → API; Netlify-Tokens;
   KI-Provider-Keys in den Function-Secrets).
2. Verdächtige Policies/Functions deaktivieren (`supabase functions delete`
   bzw. RLS-Policy droppen) — lieber Feature aus als Datenabfluss.
3. Zeitpunkt der Kenntnis, Entdeckungsweg und erste Fakten schriftlich
   festhalten (dieses Dokument als Vorlage kopieren).

**Stunde 4–24 — Bewerten**
4. Umfang klären: Welche Tabellen/Zeilen? Wie viele Nutzer? Waren
   Gesundheitsdaten dabei? (Supabase-Logs, Netlify-Logs.)
5. Risikoprognose: Bei Art.-9-Daten ist im Zweifel von **hohem Risiko**
   auszugehen → Meldung UND Benachrichtigung der Betroffenen einplanen.

**Bis Stunde 72 — Melden (Art. 33)**
6. Meldung an die zuständige Aufsichtsbehörde: **[BETREIBER: zuständige
   Landesdatenschutzbehörde eintragen — die des Bundeslands des Sitzes;
   Online-Meldeportale existieren in allen Ländern]**.
7. Inhalt (Vorlage unten): Art des Vorfalls, Kategorien & ungefähre Zahl der
   Betroffenen, wahrscheinliche Folgen, ergriffene Maßnahmen, Kontakt.

**Bei hohem Risiko — Betroffene benachrichtigen (Art. 34)**
8. In-App-Hinweis + E-Mail (bei Cloud-Konten) in klarer Sprache: was ist
   passiert, was bedeutet es, was tun wir, was können Betroffene tun
   (Passwort ändern etc.).

## Meldungs-Vorlage
```
Vorfall: [Kurzbeschreibung]
Kenntnis am: [Datum/Uhrzeit] · Entdeckt durch: [Quelle]
Betroffene Daten: [Kategorien; Art.-9-Anteil ja/nein]
Betroffene Personen (ca.): [Zahl]
Wahrscheinliche Folgen: [Einschätzung]
Ergriffene Maßnahmen: [Key-Rotation, Policy-Fix, ...]
Kontakt: [BETREIBER-Kontakt]
```

## Nachbereitung
- Ursachenanalyse + Fix ins Repo (TOMs aktualisieren).
- Vorfall im internen Verzeichnis dokumentieren (auch NICHT meldepflichtige —
  Rechenschaftspflicht Art. 5 Abs. 2).
