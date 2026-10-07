# Prompt für den Strategie-Chat

Zum Kopieren. Alle Zeilennummern beziehen sich auf
`metricgym-netlify/index.html` im Branch `phase1-fundament` (18.246 Zeilen).

---

## HALT — bevor du irgendetwas zu METRICGYM sagst

Dein Rebrief „Prüfbares Training" enthält gute Strategie, beschreibt die App
aber an mehreren Stellen falsch. Mehrere Pakete planen Dinge, die seit Monaten
gebaut sind. Das ist kein Vorwurf — du hast die App offenbar nie vollständig
gelesen. Das holst du jetzt nach.

**Regel für diese Aufgabe: Du antwortest erst, wenn du die unten genannten
Stellen wirklich gelesen hast.** Keine Einschätzung, keine Planung, keine
Umpriorisierung vorher. Wenn du eine Datei nicht lesen kannst, sagst du das,
statt zu schätzen.

### Teil 1 — Kontrollfragen (zuerst beantworten)

Diese Fragen lassen sich **ausschließlich durch Lesen** beantworten. Beantworte
alle zehn wörtlich und mit Zeilenangabe. Rate nicht. „Weiß ich nicht" ist eine
zulässige Antwort, eine erfundene nicht.

1. Was genau gibt `satzAnteile("Bankdrücken")` zurück? Nenne das Objekt.
   (Funktion ab Zeile 4420, Muster ab 4403.)
2. Wie ist `KALIB_VERLAESSLICH` berechnet, und aus welchen zwei Zahlen?
   (Zeile 4697.) Was bedeuten die beiden Zahlen?
3. Wie viele Ziele kennt `ZEIT_KURVE` (Zeile 11356), und welches einzige davon
   benutzt eine Sigmoidfunktion statt einer Exponentialfunktion? Warum?
4. Wie viele Blöcke liefert `oblocks()` (Zeile 10347) für `mode:"loss"`, und
   wie viele für `mode:"hybrid"`?
5. In welcher Zeile bekommt die KI Vorrang vor der geprüften
   Lebensmitteldatenbank, und was ist der genaue Ausdruck?
6. Wie viele `const QUELLEN`-Deklarationen gibt es in der Datei? Nenne beide
   Zeilen und erkläre, warum die zweite ein Problem ist.
7. Welche vier Bedingungen prüft `kalibFaktoren()` (ab 4748), und was passiert
   im Fall „an der Sättigung und trotzdem flach"?
8. Was rechnet `grenzNutzen(n,k)` (Zeile 4584), und wozu dient
   `satzSekunden()` (4589) in derselben Rechnung?
9. Nenne die sieben Testsuiten und die Gesamtzahl der Zusicherungen.
10. Was macht `capWeeklyVolume()` (ab 6160) mit der Fokus-Liste des Nutzers?

### Teil 2 — Pflichtlektüre

Lies diese Bereiche vollständig, nicht überfliegend:

| Bereich | Zeilen | Was dort steht |
|---|---|---|
| Energie & Makros | 4099–4271 | BMR, TDEE, `calorieDirection`, `multiTargets` |
| Stoffwechsel-Zwilling | 4272–4360 | 6-Wochen-Projektion aus echter Aufnahme |
| Fraktionierte Sätze | 4387–4433 | 1,0 primär / 0,5 sekundär |
| Volumen-Korridor | 4434–4505 | `VOL_BANDS`, `deficitScaledBands` |
| **Effizienzmodell** | **4506–4700** | Sättigung, Grenznutzen, Zeitkosten, Protein |
| **Eichung (N-of-1)** | **4697–4795** | Trend mit Standardfehler, Dämpfung, Pooling |
| Effizienzbericht | 4795–4895 | was der Nutzer davon sieht |
| Planbau | 6030–6420 | `generateTrainingPlan`, `capWeeklyVolume` |
| Rotation & Start | 6578–6910 | Rotation, Startgewichte, `strengthOracle` |
| Erkenntnisse | 6951–7100 | `buildInsights` |
| Ausdauer-Modul | 3273–3800 | `window.ENDUR`, FTP/CP/Zonen |
| Aktivitäten | 8477–8600 | mehrere Trainingsprofile je Konto |
| Quellenregister | 9447–9560 | `QUELLEN`, `quellenZahl()` |
| Onboarding | 10286–10600 | `STEPS`, `OBLOCKS`, `oblocks()` |
| Zeitstrahl & Reveal | 11356–11520 | `ZEIT_KURVE`, `ZEIT_MARKEN`, `ZEIT_QUELLE` |

Dazu: alle sieben Dateien in `metricgym-netlify/tests/`, die sieben Edge
Functions in `metricgym-netlify/supabase/functions/`, `docs/PARAMS-INVENTUR.md`
und `ARCHITECTURE.md`.

### Teil 3 — Was die App tatsächlich ist

Damit du beim Lesen die Größenordnung richtig einordnest. Jede Zahl unten ist
gemessen, nicht geschätzt.

**Umfang:** 18.246 Zeilen in einer Datei, 1,6 MB. 32 Render-Funktionen,
284 Aktionen an `window.A`, 112 Übungen in `EXDB`. Dazu **160 SEO-Seiten**
unter `kalorien/`, vier Rechner, zwei Vergleichsseiten, ein Ratgeber,
vier Compliance-Seiten. Sieben Supabase Edge Functions (ai-proxy, apple-notify, apple-verify,
   create-checkout, create-portal, delete-account, stripe-webhook). Sieben Testsuiten mit
**383 Zusicherungen**. Capacitor-Hülle für iOS und Android aus demselben
Codestand.

**Es ist kein Trainings-Logger mit Zitaten. Es sind sechs Systeme:**

1. **Trainingsplanung.** Persona (Gym, Abnehmen, Laufen, Radfahren, Hybrid) →
   Onboarding → Plan über zwölf Tagestypen, Split-Wahl, Rotation, Verletzungs-
   regeln, Ausrüstungsfilter, Fokus-Muskeln, Zeitbudget. `capWeeklyVolume()`
   garantiert MEV und deckelt MRV, skaliert nach Trainingsalter und Energie.

2. **Effizienzmodell** (4506–4700). Das Eigenständigste der App, und in deinem
   Rebrief kommt es nicht vor. Es zählt Sätze fraktioniert, legt sie gegen eine
   sättigende Dosis-Wirkungs-Kurve (Pelland 2026), teilt durch die Zeit, die sie
   kosten (`satzSekunden` rechnet aus Tempo-Notation und Pause), und sagt daraus,
   **wo der nächste Satz am meisten bringt und wo er nur noch Zeit kostet**.
   Mit Protein-Deckel: liegt die Zufuhr unter 1,6 g/kg, nennt die App Eiweiß als
   größeren Hebel als den nächsten Satz.

3. **Eichung auf den einzelnen Nutzer** (4697–4795). Pro Muskelgruppe:
   e1RM-Trend als Regression **mit Standardfehler**, Dämpfung mit dem
   Varianzverhältnis aus Chaves 2025 (≈ 45 %), partielles Pooling über Gruppen,
   Klemmung auf 0,65–1,60, und ein Protokoll in `belege[m]`, warum entschieden
   wurde. **Das ist bereits eine Prüfschleife** — sie vergleicht erwarteten mit
   beobachtetem Fortschritt und zieht daraus Konsequenzen. Was fehlt, ist die
   Prognose zu speichern, einen Bericht zu zeigen und zu aggregieren.

4. **Energie und Ernährung.** Katch-McArdle bzw. Mifflin, NEAT, Eat-back-Cycling
   zwischen Trainings- und Ruhetag, Makros aus fettfreier Masse mit absoluten
   Böden, prioritätsgesteuerte Kalorienrichtung (das erste Ziel kippt die
   Strategie), adaptive Nachkorrektur aus der echten Gewichtskurve,
   Stoffwechsel-Zwilling als 6-Wochen-Projektion.

5. **Ausdauer** (3273–3800). Kein Nebenfeature: FTP-Schätzung aus drei
   Verfahren mit Konfidenz, CP-Modell, Zonentabellen, Wochenaufbau mit
   Entlastung, FIT-Import, eigene Personas mit eigenem Onboarding. 87 eigene
   Zusicherungen. Es ist in `oblocks()`, `renderHome`, `multiTargets` und das
   Profilsystem eingewoben.

6. **Mehrere Trainingsprofile je Konto** (8477 ff.). Ein Mensch kann ein
   Gym-Profil und ein Ausdauer-Profil parallel führen, mit getrenntem Zustand
   (`ACT_STATE`). Dein Datenmodell in 5.1 sieht `profiles(user_id, …)` als eine
   Zeile pro Nutzer vor. Das passt nicht.

### Teil 4 — Konkrete Fehler in deinem Rebrief

Prüfe jeden Punkt am Code, bevor du ihn akzeptierst oder zurückweist.

1. **„`forecast12w` ersetzen"** (5.3). `forecast12w` (4376) ist nicht die
   Prognose, die der Nutzer sieht. Sichtbar sind `ZEIT_KURVE` (11356, sieben
   Ziele, je eigene Kurvenform mit Quelle und Meilensteinen) und
   `metabolicTwin` (4272). `forecast12w` zu ersetzen lässt beide unberührt.

2. **„Keine Tests"** (5.2 impliziert es). Es sind 383 Zusicherungen in sieben
   Suiten, darunter ein UI-Wächter mit eigenen Negativkontrollen. Browsergebunden,
   ja — aber zu sagen, es gäbe keine, ist falsch.

3. **A6 `/audit`** fordert als Ausgabe: fraktionierte Wochensätze je Muskel
   gegen Korridor, e1RM-Trend in %/Monat, Stagnationserkennung, Zusammenhang
   Volumen ↔ Fortschritt. **Alle vier existieren**: `satzAnteile` (4420),
   `wochenVolumenFrakt` (4599), `adaptationVelocity` (4976), `kalibFaktoren`
   (4748), `effizienzBericht` (4795). A6 ist überwiegend eine neue Oberfläche
   auf vorhandener Rechnung, kein neues Modell.

4. **C1 iOS/IAP** ist gebaut: `apple-verify`, `apple-notify`, `_shared/apple.ts`,
   StoreKit-Anbindung, 31 Zusicherungen zur Belegprüfung.

5. **„Ausdauer hinter ein Feature-Flag, Code bleibt"** (3.7) klingt wie ein
   Schalter. Die Ausdauer-Personas sind in Onboarding, Startseite, Makro-Rechnung
   und Profilsystem verwoben. Das ist eine Operation, keine Konfiguration.

6. **Versiegelte Prognose vs. local-first.** Abschnitt 4 garantiert Betrieb
   offline und ohne Konto. 5.1 schreibt vor, dass `predictions` ausschließlich
   über eine Edge Function entsteht. Damit braucht das Kernfeature der neuen
   Positionierung zwingend Server und Konto. Das ist lösbar, aber es ist eine
   Entscheidung, die du treffen musst.

7. **Der Simulationstest in 5.3 prüft Arithmetik, nicht Gültigkeit.** Wer
   5.000 synthetische Nutzer aus den Startverteilungen des eigenen Modells zieht
   und dann die Abdeckung des 80-%-Intervalls misst, bekommt fast per
   Konstruktion 80 %. Der Test findet Rechenfehler. Über die Güte der Prognose
   sagt er nichts — das können nur echte Blöcke.

8. **`arXiv 2603.17495` (Marzagao 2026)** ist nicht verifiziert. Nach deinem
   eigenen Abschnitt 4 darf die niemand verwenden, bevor sie geprüft ist.

9. **Zeitplan.** Phase 1 hat acht Pakete bis 08.11.2026 — gut vier Wochen. A5
   allein (neues Datenmodell, Dual-Write, Backfill) und A6 (eigene Route,
   Canvas-Bild, Double-Opt-in) sind je mehrere Wochen, dazu laut 5.2 die Engine
   aus 18.246 Zeilen herauslösen samt Build-Schritt. Gate 1 verlangt ≥ 300
   Audits, und kein Paket beschreibt, woher die Besucher kommen.

10. **Repository-Risiko.** `origin/main` trägt ein völlig anderes Projekt
    (Next.js). `metricgym-netlify` existiert dort nicht. Das gesamte METRICGYM
    hängt an einer einzigen, nie zusammengeführten Branch-Linie.

### Teil 5 — Was du abliefern sollst

Erst nachdem Teil 1 beantwortet und Teil 2 gelesen ist:

1. **Korrigierter Ist-Zustand.** Abschnitt 2 deines Rebriefs neu, mit
   Zeilenangaben. Jede Aussage belegt.
2. **Pro Paket (A1–A8, B1–B7, C1–C5) eine Zeile:** existiert vollständig /
   existiert teilweise (was fehlt) / existiert nicht. Mit Fundstelle.
3. **Neue Reihenfolge**, begründet aus dem, was wirklich fehlt.
4. **Realistischer Zeitplan** mit Aufwand je Paket.
5. **Die offenen Entscheidungen** (Punkte 6, 7, 8, 10 oben) — jeweils deine
   Empfehlung, die Alternative und die Folge.

Nicht verhandelbar bleibt, was in deinem eigenen Abschnitt 4 steht: keine
erfundenen Quellen, keine erfundenen Zahlen. Wenn du etwas nicht gelesen hast,
schreib das hin, statt es zu plausibilisieren.
