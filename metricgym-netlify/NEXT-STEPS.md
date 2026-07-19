# Bewusst NICHT mehr umgesetzt — geplante Folgepakete (D1 · D5 · D6)

Stand: Juli 2026. Auf Wunsch des Betreibers wurden am Ende **keine komplett
neuen Feature-Systeme** mehr eingebaut. Diese drei Pakete aus
PROMPT-LEVEL-UP.md sind daher sauber geplant statt halb gebaut:

## D1 — Performance-Split (Refactoring, kein Feature)
**Warum verschoben:** Die App ist eine verwobene Single-File (~13.000
Zeilen); Landing und App teilen sich `render()`, Styles und State. Ein
Split unter Zeitdruck hätte alle in dieser Session verifizierten Flows
(Auth, Player, DSGVO-Suite, SW-Offline) destabilisiert.
**Plan (je ~1 Arbeitstag):**
1. Landing-Markup + zugehörige CSS-Blöcke + GEIST-Orb in eine eigene
   schlanke `index.html` extrahieren (< 150 KB); CTA-Links → `app.html`.
2. App nach `app.html` + `app.js` (defer) verschieben; `KEY`/State bleibt
   identisch → kein Datenverlust; SW-`SHELL` auf beide Dateien erweitern,
   Cache-Version bumpen; Deep-Links (`?ref`, `#recovery`, `?checkout`) in
   beiden Einstiegen testen.
3. Inline-Skripte in Dateien überführen → CSP `unsafe-inline` für
   `script-src` streichen (Hashes/`'self'`); Lighthouse-Ziel mobil ≥ 90
   (Landing) / ≥ 85 (App) messen und dokumentieren.

## D5 — Retention (Push + Wochenreport)
**Warum verschoben:** komplett neues System (VAPID-Push-Subscriptions,
Server-Cron, E-Mail-Versand) — genau die Kategorie „neues Feature", die
jetzt nicht mehr dazukommen sollte.
**Plan:** `push_subscriptions`-Tabelle (RLS own rows) · Client-Opt-in
NACH dem ersten abgeschlossenen Training (nie beim Start) ·
`sw.js`-`push`/`notificationclick`-Handler · Edge Function `send-push`
(web-push, VAPID-Keys als Secrets) + Cron für Trainingstag-Reminder
(17:00 lokal), Streak-Schutz, Deload-Ankündigung · Wochenreport-E-Mail
via Resend (Edge Cron, Korridor-Grafik als Inline-SVG→PNG).
[BETREIBER: VAPID-Keypair + Resend-API-Key]

## D6 — Wachstum (Share-Card + OG-Bilder + Capacitor)
**Plan:** Canvas-Share-Card 1080×1920 (PR, Wochenvolumen, Streak,
Referral-Code) über `navigator.share` — rein clientseitig, ~150 Zeilen;
OG-Bilder für die SEO-Seiten per einmaligem Node-Script (Playwright-
Screenshot einer Template-HTML); Capacitor-Wrapper erst NACH D1-Split
(sonst wrappen wir 13.000 Zeilen Landing mit ein).

Alle übrigen 20 Pakete (C1–C8, A1–A5, B1–B7, D2–D4) sind umgesetzt,
getestet und in `UPDATE-NOTES.md` dokumentiert.
