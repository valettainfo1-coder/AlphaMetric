# METRICGYM — Tiefenkritik auf 10 Metriken + 25-Schritte-Plan auf 10/10

Stand: Juli 2026 · Basis: Code-Audit (index.html, 10.621 Zeilen), Wettbewerb:
Hevy, Strong, Alpha Progression, Fitbod, Dr. Muscle, MyFitnessPal, Yazio, Whoop.

Gesamturteil: **starkes, differenziertes Konzept („Beweis statt Bauchgefühl")
auf einer Infrastruktur, die noch Prototyp ist.** Die App verliert nicht beim
USP — sie verliert bei Zuverlässigkeit, Zahlungsfähigkeit und Feature-Tiefe
gegen Apps mit 50-Personen-Teams. Die gute Nachricht: 19 der 25 Schritte sind
ohne Backend-Neubau machbar, weil die Architektur (local-first + Supabase)
das Fundament schon hat.

---

## Die 10 Metriken im Urteil

### 1. USP & Differenzierung — 8/10
**Stark:** Kein Wettbewerber verkauft „belegter Plan im MEV–MRV-Korridor mit
antippbarem Beweis". Hevy/Strong sind stumme Tracker, Fitbod ist eine
Blackbox („trust us"), Alpha Progression ist am nächsten dran, erklärt aber
nicht pro Aussage. Die Studien-Zitate pro Empfehlung (Israetel, Schoenfeld,
Helms) sind ein echter Moat im deutschsprachigen Markt.
**Schwach:** Der Beweis ist nicht überall eingelöst: nur 41 von 112 Übungen
haben eine Muskel-Aktivierungs-Map (EX_ACT), der Rest fällt auf einen
Generator zurück. „Konfidenz"-Werte sind Heuristiken — ehrlich dokumentiert,
aber im UI nicht von echter Statistik unterscheidbar. Wenn ein Nutzer EINEN
falschen Beleg findet, kippt die gesamte Beweis-Positionierung.

### 2. Onboarding & Time-to-Value — 7/10
**Stark:** 10 Fragen → Plan-Genese → Reveal mit Projektion ist besser
inszeniert als bei Strong/Hevy (die starten leer). Demo-Modus ist top.
**Schwach:** Fitbod zeigt nach 4 Fragen das erste Workout; hier stehen
Registrierung + Consent VOR dem Aha-Moment. Kein „Plan ansehen ohne Konto".
Die Landing verspricht 60 Sekunden — real sind es mit Consent-Checkboxen und
10 Fragen eher 3–4 Minuten. Kein Import von Hevy/Strong-CSV → Wechsler
(die wertvollste Zielgruppe!) müssen bei null anfangen.

### 3. Trainings-Feature-Tiefe — 5/10
**Benchmark:** Hevy: 400+ Übungen mit Videos, Supersets, eigene Übungen,
Plate-Calculator, Apple-Watch-App. Strong: ähnlich. Alpha Progression:
Auto-Progression + Alternativen auf Geräteebene.
**Ist:** 112 Übungen ohne Videos/Animationen pro Übung (nur Text-Cues),
**keine Supersets**, **keine eigenen Übungen**, keine Warm-up-Satz-Logik im
Player, kein Verlauf „letzte Session dieser Übung" direkt beim Loggen
sichtbar (nur Empfehlung). Voice-Logging ist ein echtes Plus, das keiner der
Großen sauber hat — aber es trägt allein keine Feature-Parität.

### 4. Ernährung — 4/10
**Benchmark:** MyFitnessPal/Yazio: Millionen Lebensmittel, **Barcode-Scanner**,
Rezepte, Mahlzeiten-Vorlagen, Open-Food-Facts-Anbindung.
**Ist:** 159 Lebensmittel hart im Code, kein Barcode, keine eigenen
Lebensmittel persistent, keine Mahlzeiten-Vorlagen/Favoriten. Voice-Multi-Item
(„500 g Hähnchen und Reis") ist der beste Logging-Flow am Markt — aber gegen
eine 159er-Datenbank läuft er ins Leere („nicht gefunden" ist der häufigste
Fall außerhalb der Basics). Der Sättigungs-/Mikronährstoff-Ansatz ist klug,
braucht aber Datenbasis.

### 5. Zuverlässigkeit & Datenintegrität — 4/10
Das ist die gefährlichste Metrik, denn der USP heißt „Vertraue deinen Zahlen":
- Cloud-Sync = **ein** jsonb-Blob, **Last-Write-Wins**: Handy + Tablet
  parallel → stiller Totalverlust einer Seite. Hevy/Strong syncen pro Datensatz.
- **Kein Passwort-Reset** (A.forgot zeigt einen Demo-Hinweis!) → ein
  vergessenes Passwort = Konto weg. Inakzeptabel für zahlende Nutzer.
- localStorage als Primärspeicher: iOS löscht das nach 7 Tagen Inaktivität
  in Safari-Web (als installierte PWA sicherer, aber nicht garantiert).
- Fotos in IndexedDB ohne Sync/Backup.
- **Null automatisierte Tests** im Deploy (die „27 E2E-Checks" der Doku sind
  Vision). Jede Änderung an 10.000 Zeilen ohne Netz.

### 6. Performance & Technik — 6/10
**Stark:** Offline-first PWA mit Service Worker, keine Frameworks, Fonts
eingebettet — nach dem ersten Load schneller als jede React-App der Konkurrenz.
**Schwach:** 1,07 MB HTML **blockierend beim Erstbesuch** (Landing = Konversionsseite!).
Alles in einer Datei: kein Code-Splitting, App-Logik lädt für Landing-Besucher
mit. Kein Image-/OG-Optimizing, kein Lighthouse-Budget. Die SEO-Seiten sind
statisch gut, aber die Haupt-App dürfte bei Lighthouse-Performance ~60–70
liegen (LCP durch 1 MB Parse), Wettbewerber-Landings liegen bei 90+.

### 7. Sicherheit & Compliance — 4/10
Gesundheitsdaten = Art. 9 DSGVO, und genau da klaffen Lücken:
- **Impressum/Datenschutz-Betreiberfelder leer** („[bitte ausfüllen]") — in DE
  abmahnfähig ab Tag 1 des öffentlichen Betriebs.
- **Tier/Paywall rein clientseitig** (S.tier im localStorage): jeder DevTools-
  Nutzer schaltet ELITE frei. Ohne Server-Validierung ist Monetarisierung Deko.
- Lokaler Auth-Modus = SHA-256 im Client, umgehbar (dokumentiert, aber dem
  Nutzer gegenüber nicht transparent).
- CSP nötigt `unsafe-inline` (Single-File-Architektur), AV-Vertrag mit
  Supabase + TOMs/Verzeichnis fehlen, keine Lösch-Automatik für Cloud-Konten.

### 8. Monetarisierung — 2/10
**Es gibt keinen Bezahlweg.** `A.upgrade` ist ein Mock („TODO Real: Stripe“).
Die tiefenpsychologische Paywall ist gut gebaut (Anker, Trial, Identität) —
aber sie verkauft ins Leere. Wettbewerb: Hevy Pro 3,33 €/M, Alpha Progression
~5 €/M, Fitbod ~13 €/M. Preisanker existieren im Markt, das Pricing-UI ist da,
es fehlt: Stripe/RevenueCat + serverseitige Tier-Wahrheit + Webhooks.

### 9. Retention & Engagement — 5/10
**Stark:** Streak, Level, PR-Schockwelle, Tages-Briefing (Zeigarnik), Insights
mit Datenbasis — psychologisch besser durchdacht als Strong.
**Schwach:** **Keine Push-Notifications** (PWA kann das auf iOS 16.4+!), keine
Trainings-Erinnerung, kein Wochenreport per Mail, keine Widgets, kein
Apple-Watch-Begleiter, kein Social/Share-Loop (Hevy wächst primär über
Social-Feed + Workout-Sharing). Nach Tag 3 gibt es keinen externen Trigger,
der den Nutzer zurückholt — Retention hängt allein an Selbstdisziplin.

### 10. Wachstum, SEO & Messbarkeit — 5/10
**Stark:** 160 Kalorien-Seiten + 12 Rechner/Vergleich/Ratgeber-Seiten mit
Sitemap — das hat kaum ein Wettbewerber im DACH-Raum so gezielt; Referral-
Programm ist konzipiert (Supabase-Tabelle).
**Schwach:** **Keinerlei Analytics** (kein Plausible/PostHog): Conversion,
Funnel-Drops, Feature-Nutzung — alles blind. Kein App-Store-Vehikel (PWA-only
= unsichtbar in App Store/Play Store, wo die Kategorie gesucht wird; TWA/Capacitor
fehlt). OG-Image generisch, kein programmatisches Social-Sharing (PR-Cards).

---

## Der 25-Schritte-Plan auf 10/10

**Phase 1 — Vertrauen & Geld (Schritte 1–8): ohne das ist Launch fahrlässig**

1. **Passwort-Reset live schalten** (`supabase.auth.resetPasswordForEmail` +
   Recovery-Screen). Akzeptanz: E-Mail-Reset end-to-end in Prod. *(M5)*
2. **Sync v2 — Feld-Merge statt Blob-LWW:** `updated_at` je Teilbaum
   (liftLog, nutritionLog, profile …), Merge beim Pull, Konflikt-Toast.
   Akzeptanz: Handy+Tablet parallel loggen → beide Sätze vorhanden. *(M5)*
3. **Stripe Checkout + Supabase Edge Function `billing`** (Checkout-Session,
   Webhook → `subscriptions`-Tabelle). Akzeptanz: Testkauf schaltet PRO. *(M8)*
4. **Tier serverseitig durchsetzen:** App liest Tier NUR aus Supabase (RLS),
   lokale Tier-Änderung wirkungslos; KI-Proxy prüft Tier pro Request. *(M7, M8)*
5. **Impressum/Datenschutz final:** config.legal befüllen, AV-Vertrag Supabase,
   Verarbeitungsverzeichnis, Lösch-Button = Cloud-Row + Auth-User löschen. *(M7)*
6. **Playwright-Suite (die „27 Checks" real machen):** Registrieren, Login,
   Logging, Plan-Genese, Paywall, Offline-Fallback; läuft in CI vor jedem
   Deploy (GitHub Action + Netlify-Gate). *(M5)*
7. **Fehler-Telemetrie:** Sentry (EU-Region) + globaler Error-Boundary-Toast.
   Akzeptanz: Produktionsfehler erscheinen mit Stacktrace. *(M5, M10)*
8. **Privacy-Analytics:** Plausible/PostHog EU, Events für Funnel
   (Landing→Register→Onboarding→1. Log→D7). Akzeptanz: Funnel-Dashboard. *(M10)*

**Phase 2 — Feature-Parität Training (Schritte 9–14)**

9. **EX_ACT für alle 112 Übungen kuratieren** (+ Belegsatz pro Übung):
   der „Beweis"-USP gilt dann ausnahmslos. *(M1, M3)*
10. **Übungs-Videos/Loops:** 112 kurze Loops (lizenzfrei produziert oder
    eigene Aufnahmen), lazy geladen; Fallback = animierte Cues. *(M3)*
11. **Supersets/Zirkel + eigene Übungen** (custom Exercise mit Muskel-Zuordnung
    → erscheint in Korridor & Heatmap). *(M3)*
12. **Player-Upgrade:** letzte 3 Sessions der Übung inline, Warm-up-Rechner,
    Plate-Calculator prominenter, Satz-Timer mit Push bei App-im-Hintergrund. *(M3, M9)*
13. **Hevy/Strong-CSV-Import** im Onboarding („Wechsle in 2 Minuten mit
    kompletter Historie") — Conversion-Hebel auf die wertvollste Zielgruppe. *(M2, M3)*
14. **Onboarding-Reihenfolge drehen:** Quiz VOR Konto (Gast-Plan im
    localStorage), Konto erst beim Speichern/Sync — Time-to-Aha < 90 s. *(M2)*

**Phase 3 — Ernährung & Plattform (Schritte 15–19)**

15. **Open Food Facts anbinden** (freie API, DE-Produkte): Suche + Nährwerte;
    lokale 159er-Liste bleibt Offline-Fallback. *(M4)*
16. **Barcode-Scanner** (BarcodeDetector API / zxing-wasm) → OFF-Lookup. *(M4)*
17. **Eigene Lebensmittel, Mahlzeiten-Vorlagen, Favoriten** (persistiert +
    gesynct); Voice-Parser matcht gegen Favoriten zuerst. *(M4)*
18. **Bundle-Split:** Landing als eigene schlanke Seite (<150 KB), App-Code
    per `<script defer src=app.js>`; Ziel Lighthouse ≥90 mobil auf Landing. *(M6)*
19. **App-Store-Präsenz:** Capacitor-Wrapper (iOS/Android) mit denselben
    Dateien + TWA; In-App-Purchase via RevenueCat neben Stripe-Web. *(M8, M10)*

**Phase 4 — Retention & Wachstum (Schritte 20–25)**

20. **Web-Push (iOS 16.4+/Android):** Trainings-Reminder am geplanten Tag,
    Streak-Schutz-Warnung, Deload-Ankündigung — alles opt-in. *(M9)*
21. **Wochenreport per E-Mail** (Supabase Edge + Resend): Volumen je Muskel
    vs. Korridor, PRs, nächste Woche — der „Beweis" landet im Postfach. *(M9, M1)*
22. **Share-Cards:** PR/Wochen-Canvas-Grafik (1080×1920) mit einem Tap teilen
    + Referral-Code integriert → organischer Loop wie bei Hevy. *(M9, M10)*
23. **Apple Health/Google Fit Sync** (via Capacitor aus Schritt 19): Gewicht,
    Workouts, Kalorien raus; Schlaf/HRV rein → Status-Score wird messbar statt
    nur erfragt. *(M3, M9)*
24. **Konfidenz ehrlich machen:** Bootstrap-Intervalle auf e1RM-Trends echte
    statistische CIs; UI trennt „berechnet" vs. „heuristisch" — der Beweis-USP
    wird unangreifbar. *(M1)*
25. **A11y- & i18n-Pass:** komplette Tastatur-/Screenreader-Tour (Fokus-Traps
    in Modals, prefers-contrast), dann EN-Lokalisierung (Strings sind bereits
    zentralisierbar) → Markt ×10. *(M2, M6, M10)*

**Reihenfolge-Logik:** 1–8 zuerst (jede Marketing-Ausgabe vorher verbrennt
Nutzer auf kaputten Kontowegen), 9–14 macht den USP wasserdicht und nimmt
Hevy-Wechslern die Hürde, 15–19 schließt die zwei größten Feature-Lücken
(Ernährung, Erstlade-Performance) und bringt Store-Sichtbarkeit, 20–25 baut
die Rückhol-Schleifen, die aus Downloads Abos machen.
