# METRICGYM — von €0 zum ersten Euro

Stand: geprüft am 05.09.2026 gegen den Code, nicht aus dem Gedächtnis.

## Der Befund in einem Satz

**Es ist alles gebaut. Nichts ist angeschlossen.**

Die Zahlungsabwicklung ist vollständig implementiert — Client (`A.startCheckout`,
`A.manageSub`), drei Server-Funktionen (`create-checkout`, `create-portal`,
`stripe-webhook`), die Datenbank-Wahrheit (`my_tier()`) und der ehrliche Rückfall,
wenn nichts konfiguriert ist. Geprüft: keine Stubs, keine TODO-Marker.

Der Weg zum ersten Euro ist **Konfiguration, nicht Entwicklung**. Der längste
Posten ist nicht Arbeit, sondern Stripes Identitätsprüfung.

---

## Reihenfolge (jeder Schritt hängt am vorigen)

### 1 · Supabase-Projekt — ohne das geht nichts
**Wer:** Betreiber · **Dauer:** ~30 Min · **Blockiert:** alles Weitere

Das bisherige Projekt (`nsdziafvhhzuuhrctozl.supabase.co`) ist nicht erreichbar.
Neu anlegen, dann **eine einzige Datei** einfügen:

> Supabase → SQL-Editor → Inhalt von **`supabase/schema.sql`** einfügen → Run

Diese Datei ersetzt das Zusammensuchen aus `SUPABASE_SETUP.md` (dort standen die
Blöcke über zehn Abschnitte verteilt — jede Auslassung war ein stiller Fehler).
Sie ist gegen PostgreSQL 16 geprüft, nicht nur gelesen:

* läuft aus einer leeren Datenbank fehlerfrei durch
* `my_tier()` in **8 Fällen** korrekt: kein Abo · aktiv · Testphase · gekündigt ·
  Zeitraum abgelaufen · **ohne Enddatum** (deckt Stripes API-Änderung ab) ·
  Gründerkonto · Gründerkonto in Großbuchstaben
* **5 Angriffe abgewehrt:** fremde Daten lesen, sich selbst ELITE eintragen,
  bestehendes Abo hochstufen, Gründerliste lesen, sich dort eintragen

Am Ende druckt sie **14 Kontrollzeilen**. Steht überall ✓, ist der Schritt fertig
— du musst nichts von Hand nachsehen. Vergiss den auskommentierten Block **4b**
nicht: dort trägst du deine eigene E-Mail als dauerhaftes ELITE-Konto ein.

Danach in `config.js`:

```js
supabaseUrl: "https://DEINPROJEKT.supabase.co",
supabaseAnonKey: "eyJ..."
```

**Prüfen:** Registrierung anlegen → in Supabase unter *Authentication → Users*
muss der Nutzer stehen. Erst wenn das klappt, weiter.

### 2 · Funktionen deployen
**Wer:** Betreiber · **Dauer:** ~20 Min

```bash
supabase functions deploy ai-proxy
supabase functions deploy create-checkout
supabase functions deploy create-portal
supabase functions deploy delete-account
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe schickt kein JWT
```

Der Schalter `--no-verify-jwt` beim Webhook ist **kein Sicherheitsloch**: die
Funktion prüft stattdessen die Stripe-Signatur (`constructEventAsync`). Ohne den
Schalter lehnt Supabase jeden Stripe-Aufruf ab.

### 3 · KI-Schlüssel setzen — bringt sofort Nutzen, unabhängig von Stripe
**Wer:** Betreiber · **Dauer:** ~10 Min

```bash
supabase secrets set CEREBRAS_API_KEY=csk-… GROQ_API_KEY=gsk_… GEMINI_API_KEY=…
```

Reihenfolge im Proxy: Cerebras → Groq → OpenRouter (Text), Gemini (Bilder).
Ein Schlüssel genügt zum Start. **Die beiden Schlüssel aus dem Chatverlauf sind
verbrannt — vorher neue erzeugen.**

Ab hier funktioniert der Coach. Das ist der erste Punkt, an dem Nutzer etwas
bekommen, das sie vorher nicht hatten.

### 4 · Stripe — der lange Posten
**Wer:** Betreiber · **Arbeit:** ~45 Min · **Wartezeit:** 1–5 Werktage

Stripe prüft Identität und Bankverbindung, bevor Live-Zahlungen freigeschaltet
werden. **Diesen Schritt zuerst anstoßen**, dann parallel weiterarbeiten.

1. Konto anlegen, Geschäftsdaten + Bankverbindung hinterlegen
2. Vier Preise anlegen (wiederkehrend):
   PRO 9,99 €/Monat · 79,99 €/Jahr — ELITE 19,99 €/Monat · 159,99 €/Jahr
3. Secrets setzen:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_… STRIPE_WEBHOOK_SECRET=whsec_… \
     APP_URL=https://deine-domain.tld \
     STRIPE_PRICE_PRO_MONTHLY=price_… STRIPE_PRICE_PRO_YEARLY=price_… \
     STRIPE_PRICE_ELITE_MONTHLY=price_… STRIPE_PRICE_ELITE_YEARLY=price_…
   ```
4. Webhook-Endpunkt = URL der Function `stripe-webhook`, Ereignisse:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`
5. Kundenportal aktivieren (Billing → Customer portal), Kündigen erlauben —
   **§312k BGB verlangt, dass Kündigen so einfach ist wie Abschließen**
6. `config.js → stripeEnabled: true`

**Mit Testkarte prüfen** (`4242 4242 4242 4242`), bevor live geschaltet wird:
Kauf → in Supabase muss `subscriptions` eine Zeile mit `tier` und `status`
haben → in der App muss der Tarif ohne Neuladen greifen.

### 5 · Rechtliches — ohne das kein Verkauf in Deutschland
**Wer:** Betreiber · **Dauer:** ~1 Std + anwaltliche Durchsicht

Im Code steht `[bitte ausfüllen]` als sichtbare Warnung, damit nie ein blankes
Impressum live geht. Zu füllen: Name, Anschrift, Kontakt, USt-IdNr.,
Verantwortlicher nach § 18 MStV.

Nutzungsbedingungen, Datenschutzerklärung und Widerrufsbelehrung sind als
Vorlagen vorhanden — **vor dem Verkauf anwaltlich prüfen lassen.** Bei einem
Abo-Modell an Verbraucher ist das keine Formalie.

---

## Was danach kommt — und warum die Reihenfolge stimmt

Nach Schritt 5 kann das Produkt Geld annehmen. Es hat dann trotzdem **null
Nutzer und null Belege**, dass jemand zahlt. Der nächste Engpass ist nicht
Technik:

1. **20–50 echte Nutzer.** Nicht für Umsatz, sondern für Evidenz: Wo brechen sie
   ab? Was verstehen sie nicht? Bleiben sie in Woche zwei?
2. **Die ersten echten Ergebnisse.** Der Abschnitt `STIMMEN` in `index.html` ist
   verdrahtet und erscheint automatisch ab zwei Einträgen. Regeln stehen im Code
   daneben: nur mit Zustimmung, nur gemessene Zahlen. Drei echte Ergebnisse
   bewegen die Abschlussrate mehr als die 57 Quellen zusammen.
3. **Ein Kanal.** Ohne den bleibt alles andere Theorie.

---

## Was das für die Bewertung heißt

| | |
|---|---|
| Heute | Kein Umsatz möglich → als Unternehmen praktisch wertlos |
| Nach Schritt 1–5 | Umsatzfähig, aber ohne Beleg, dass jemand zahlt |
| Nach 20–50 Nutzern mit Bindungsdaten | Erstmals bewertbar — es gibt Zahlen |

Der Sprung von „unverkäuflich" zu „bewertbar" kostet **Tage bis Wochen**, nicht
Monate — weil die Arbeit schon getan ist. Jede weitere Designrunde bewegt die
Bewertung um Prozente; diese fünf Schritte bewegen sie um Größenordnungen.
