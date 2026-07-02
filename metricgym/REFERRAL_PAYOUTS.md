# METRICGYM — Referral-Cash-Auszahlung: Sicherheits-Checkliste

Das Empfehlungsprogramm zahlt **echtes Geld** (unbegrenzter Werber-Hebel). Damit das
fair, legal und betrugssicher ist, gilt: **Bargeld-Auszahlung erst live schalten
(`PAYOUTS_LIVE = true` in `index.html`), wenn ALLE Punkte unten erfüllt sind.**

Solange `PAYOUTS_LIVE = false`:
- Guthaben wird sichtbar gesammelt und ist **sofort als Pro-Zeit** einlösbar.
- Konto-Auszahlungen werden ehrlich als „beim Launch freigeschaltet" kommuniziert —
  **kein** falsches „in 1–3 Werktagen aufs Konto"-Versprechen.

## Bereits im Client umgesetzt (Absicherungen)
- ✅ **Selbstfinanzierend:** Guthaben entsteht nur, wenn der geworbene Freund zahlt.
- ✅ **Provisions-Deckel:** `REF_MAX_PCT = 35 %` — die Firma behält immer ≥ 65 % brutto.
- ✅ **Haltefrist:** `REF_HOLD_DAYS = 14` — Guthaben wird erst nach Ablauf auszahlbar
  (schützt vor Auszahlung auf später stornierte/zurückgebuchte Abos).
- ✅ **Selbst-Werbung gesperrt:** eigener Code wird abgelehnt (URL + manuelle Eingabe).
- ✅ **Mindestauszahlung:** `MIN_PAYOUT = 25 €` (senkt Gebühren-Overhead & Kleinbetrugs-Anreiz).

## ZWINGEND serverseitig nötig VOR `PAYOUTS_LIVE = true`
Diese Punkte kann ein reiner Client **nicht** sicher durchsetzen — sie müssen in eine
Supabase Edge Function / einen Server wandern:

1. **Echte Zahlungs-Bestätigung (Stripe-Webhook).**
   `settleReferralCash` darf Guthaben NUR fällig stellen, wenn ein Stripe-Webhook die
   tatsächliche Abo-Zahlung des geworbenen Freundes bestätigt. Heute entscheidet das der
   Client (Demo) — das ist für echtes Geld unzulässig.
2. **Stripe Connect / PayPal Payouts** für die tatsächliche Geldsendung anbinden.
3. **Server-autoritative Wallet-Bilanz.** `available`/`pending`/`paidOut` müssen
   serverseitig geführt werden; der Client darf sie nur anzeigen, nie bestimmen
   (sonst: localStorage editieren = Geld erzeugen).
4. **Betrugserkennung:** Geräte-/IP-/Zahlungsmittel-Fingerprint gegen Fake-Konten-Ringe,
   Velocity-Limits (max. Werbungen/Zeit), Chargeback-Rückbuchung des Guthabens.
5. **Identitäts-/KYC- & Steuerpflichten** prüfen: Ab gewissen Auszahlungssummen können
   Identitätsprüfung und steuerliche Meldepflichten greifen (länderabhängig).
6. **Rechtliche Prüfung:** AGB des Empfehlungsprogramms, Abgrenzung zu MLM/Schneeball,
   DSGVO für Auszahlungsdaten (IBAN/PayPal = personenbezogen).

## Wichtiger strategischer Hinweis (bei 0 Downloads)
Empfehlung ist ein **Verstärker, kein Igniter**: `0 Nutzer × bester Anreiz = 0`.
Der Cash-Hebel zündet erst, wenn die ersten ~100 begeisterten Nutzer da sind. Diese
ersten 100 kommen über Communities/Direktansprache/Content — nicht über das Wallet.
