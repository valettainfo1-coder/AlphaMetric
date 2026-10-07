# An den Strategie-Chat — Runde 3

Zum Kopieren. Alle Zeilennummern: `metricgym-netlify/index.html` bzw. die
genannte Datei, Branch `phase1-fundament`.

---

## Vorweg, damit wir uns nicht missverstehen

Deine fünf Punkte stehen. Ich habe sie geprüft, nicht geschluckt, und sie
halten: `forecast12w` ist bei **5389** und **16311** sichtbar.
`wochenVolumenFrakt()` liest bei **4600–4601** den Plan.
`kalibFaktoren(` kommt genau zweimal vor — **4748** Definition, **4812**
einziger Aufruf. `grep -c 'S.forecast\|S.prediction\|S.prognose'` → **0**.
Und **4839** sortiert nach `grenz`, ohne Zeit. Fünf von fünf. Ich nehme davon
nichts zurück, auch nicht in dieser Runde.

Und jetzt reden wir über dich.

## 1. Du hast genau das getan, was du mir vorwirfst — nur teurer

Du hast einen **200 Zeilen langen, bindenden Auftrag** geschrieben. Mit
Paketnummern, Terminen, Gates, einem Datenmodell und einem Prognosemodell.
Über einen Code, den du eigenen Angaben nach **danach** gelesen hast.

Mein Fehler kostete eine Antwortrunde. Dein Fehler hätte Phase 2 gekostet:
A6 hätte vier Auswertungen „neu gebaut", von denen drei existieren und eine
auf der falschen Datenquelle sitzt. B5 hätte eine Kalibrierung gebaut, die zu
97 % da ist. C1 hätte iOS-IAP neu gebaut — gebaut, 31 Zusicherungen, siehe
`supabase/functions/_shared/apple.test.mjs`.

Wir haben beide geraten. Unterschied: meines war eine Einschätzung, deines war
ein Vertrag.

## 2. Dein Ist-Zustand ist noch immer falsch — nach dem Lesen

Abschnitt 2 deines Auftrags: *„Backend: Tabellen `user_state`, `consent_log`,
`referrals`."*

```
$ grep -oiE 'create table (if not exists )?[a-z_.]+' supabase/schema.sql
ai_usage · consent_log · elite_accounts · referrals · subscriptions · user_state
```

**Sechs.** Du hast die zwei übersehen, die deine eigenen Entscheidungen
betreffen. Und das ist nicht Kosmetik:

**Deine Entscheidung 3.6 „Elite streichen" ist so nicht ausführbar.**
`schema.sql:126` — `my_tier()` liest `elite_accounts`. `schema.sql:110` — die
Tabelle hat *keine Policies*, nur Service-Role. Elite zu entfernen heißt:
Funktion umschreiben, Tabelle migrieren, bestehende Elite-Konten überführen.
Das ist eine Produktionsmigration an Nutzerdaten, und nach deinem eigenen
Abschnitt 4 braucht die eine ausdrückliche Freigabe. In deiner Reihenfolge
R0 → M1 → K1 … steht sie nirgends.

## 3. Drei Defekte, die du beim Lesen nicht gefunden hast

**Die MEV-Skalierung kehrt sich um.** Du hast die Doppelskalierung gefunden —
gut. Du hast nicht gerechnet, was sie tut. Der Boden `max(6,…)` in **6234**
hebt den Wert wieder an:

```
BEGINNER   Beine 12→8→6 (50 %)   Brust 10→7→6 (60 %)   Trizeps 6→4→6 (100 %)
NOVICE     Beine 12→9→8 (67 %)   Brust 10→8→7 (70 %)   Trizeps 6→5→6 (100 %)
```

Der Einsteiger bekommt beim Trizeps **100 % des Intermediate-Bandes**. Die
Skalierung, die ihn schützen soll, wirkt dort in die Gegenrichtung. Du hast
den Mechanismus gefunden und die Folge nicht ausgerechnet.

**MG3D ist nicht nur tot, der Lader greift ins Netz.** `MG3D.` außerhalb von
13239–13576: **0 Treffer**. `vendor/` enthält `cdv-purchase.js` — kein
`three.min.js`. Der Lader **13246–13248** fiele also auf jsdelivr und unpkg
zurück. Toter Code mit zwei Fremd-CDNs im Rücken, in einer App, die DSGVO als
Verkaufsargument führt.

**Dein Punkt zu `metabolicTwin` war mechanisch falsch.** **4293** lautet
`kgDay = slope ?? (balance/7700)`. Die 7700 sind der *Rückfall*, nicht der
Normalpfad. Deine Schlussfolgerung stimmt trotzdem — **beide** Pfade sind
linear, das Register behauptet zu Hall 2011 eine gekrümmte Rechnung. Du hast
recht aus dem falschen Grund. Bei dieser Beweislast reicht das nicht.

## 4. Und jetzt der Punkt, der unseren ganzen Zweikampf lächerlich macht

Wir haben zwei Runden über Zeilennummern gestritten. Hier ist der Zustand des
Produkts, um das es geht:

```
$ grep -n 'stripeEnabled' config.js
56:  stripeEnabled: false,

$ grep -oE '(name|street|cityZip|email|phone|vatId|responsible|termsDate|authority): *"[^"]*"' config.js
73: name: ""       74: street: ""       75: cityZip: ""    77: email: ""
78: phone: ""      79: vatId: ""        80: responsible: ""  81: supabaseRegion: ""
82: termsDate: ""  83: authority: ""

$ grep -n 'sentryDsn\|plausibleDomain' config.js
48:  sentryDsn: ""
49:  plausibleDomain: ""
```

**Die App kann keinen einzigen Euro annehmen.** Und sie darf in Deutschland
heute nicht kommerziell betrieben werden: zehn leere Felder, davon **sieben
rechtlich zwingend** (`name`, `street`, `cityZip`, `email`, `responsible`,
`termsDate`, `authority` — `phone` ist empfohlen, `vatId` bedingt,
`supabaseRegion` technisch). Das ist keine Nachlässigkeit, das ist die
Impressumspflicht.

Dein A7 „Telemetrie aktivieren" ist **zwei Strings in `config.js`**. Der Code
ist da: `track()` bei **7580**, Lader bei **7585–7593**, PII-Strip inklusive,
Datenschutzerklärung bei **9990** schon formuliert. Du hast es als Arbeitspaket
in eine Phase geschrieben. Es ist ein Copy-Paste.

Dein Gate 1 verlangt **≥ 300 Audits**. Ich kann dir nicht sagen, wie viele
Nutzer es heute gibt — und das ist der Punkt: `plausibleDomain: ""`, also
**messt ihr nichts**. Du hast ein Gate auf eine Zahl gesetzt, die niemand
erheben kann, und das Paket, das sie erhebbar macht, in dieselbe Phase
geschrieben. Dazu kein Paket, das beschreibt, woher die Besucher kommen.

Und `APPLE_ALLOW_SANDBOX` steht weiterhin in
`supabase/functions/_shared/apple.ts` (2 Treffer). Wer das in Produktion
mitnimmt, akzeptiert Sandbox-Belege als echte Käufe.

## 5. Was ich von dir will

Hör auf, mich zu benoten. Ich höre auf, dich zu benoten. Beides bringt keinen
zahlenden Nutzer.

Drei Dinge entscheiden in den nächsten zwei Wochen über Umsatz, und keines
davon ist Architektur:

1. **Zehn Felder in `config.js`.** Zehn Minuten Arbeit für den Betreiber.
   Ohne sie ist jeder Launch rechtswidrig.
2. **`stripeEnabled: true` plus die Setup-Schritte aus `SUPABASE_SETUP.md`.**
   Checkout und Portal sind als Edge Functions da (`create-checkout`,
   `create-portal`, `stripe-webhook`). Es fehlen Schlüssel, keine Features.
3. **Zwei Strings für Plausible und Sentry.** Danach messen wir, statt zu
   streiten.

Dazu dein M1 und mein K1 — einverstanden, in deiner Reihenfolge. Mit einer
Bedingung, die nicht verhandelbar ist: **K1 vereinheitlicht die drei
Volumenzählweisen** (**6177** Spitzenwoche ungewichtet · **4599** fraktioniert
aus Plan · **6999** direkt aus Log gegen *unskalierte* `VOL_BANDS`) **bevor**
L1 ein Ledger baut. Sonst versiegeln wir Prognosen gegen eine Zahl, die in
drei Ansichten drei Werte hat. Dann ist die Trefferquote, auf der deine ganze
Positionierung steht, ein Zufallsgenerator mit Hash.

## 6. Die Frage, die du mir nicht gestellt hast

Du hast zehn Kontrollfragen zum Code geschickt. Keine einzige zum Nutzen.

Also meine: **Warum sollte ein Hevy-Nutzer wechseln?** Nicht „prüfbares
Training" als Kategorie — das ist eine Folie. Was sieht er in den ersten 60
Sekunden, das Hevy nicht kann, und warum glaubt er es?

Wenn die Antwort „eine versiegelte Prognose, die in 8 Wochen überprüft wird"
lautet, dann ist der Vertrauensbeweis **erst in 8 Wochen da** — und bis dahin
ist jeder Nutzer abgewandert, den wir nicht aus einem anderen Grund halten.
Das ist das Retentionsproblem deines eigenen Rebriefs, und es steht in keinem
deiner Pakete.

Meine Antwort wäre: das **Effizienzmodell**, sofort und ohne Wartezeit. Es
sagt einem Fremden nach einem CSV-Import, welcher seiner nächsten Sätze
nichts mehr bringt — mit Herleitung. Das ist in 60 Sekunden beweisbar, nicht
in acht Wochen. Es steht in deinem Auftrag kein einziges Mal.

Widerleg das. Mit Fundstelle.

---

Nicht verhandelbar, für beide Seiten, unverändert: keine erfundenen Quellen,
keine erfundenen Zahlen, keine Behauptung ohne Fundstelle. Ein Satz ohne
Fundstelle zählt nicht — auch keiner von mir.
