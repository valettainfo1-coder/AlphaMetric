# A6 — Plan-Prüfung und Reparatur

Status: **ausgeliefert** (v82, `phase1-fundament`) · 70 Zusicherungen

Jemand fügt einen Trainingsplan ein — aus ChatGPT, von Instagram, vom Trainer —
und bekommt jede Muskelgruppe im Korridor, die drei wichtigsten Lücken, zu
jeder Zahl ihre Herleitung **und einen Vorschlag, der die Lücken schließt,
ohne den Plan wegzuwerfen**. Ohne Konto, ohne Netz, ohne KI.

---

## Teil 1 — die erste Fassung (v81)

Parser, Zuordnung, Korridor, drei Befunde, Gegenentwurf über
`besteAufteilung()`. Dabei am Bestandscode repariert: `importedPlanAnalysis()`
rechnete gegen eine hart getippte Bänder-Tabelle (die sechste Zählweise in
dieser App) und `corridorHTML()` kannte „fehlt" und „über dem MRV" nicht.

Mehr dazu weiter unten unter *Was in Runde eins passierte*.

## Teil 2 — was Runde zwei gefunden hat (v82)

Die erste Fassung war ein Aufsatz auf der App, kein Teil von ihr. Drei Defekte,
jeder gemessen, bevor etwas gebaut wurde:

| Defekt | Messung |
|---|---|
| `freq` zählte **Übungen statt Einheiten** | Drei Brustübungen an einem Tag → `uebungen:3`. Der Frequenz-Befund prüfte `uebungen===1` und konnte für genau den Fall, für den er da ist, **nie** auslösen. |
| Tagesüberschriften wurden **verworfen** | Kein Befund konnte einen Tag nennen — obwohl das die Kernaussage sein sollte: „vier Sätze mehr am Donnerstag". |
| Verletzung, Gerät, Schwerpunkt **wirkten nicht** | Vier Profile, identische Befunde. Der eigene Planbauer ist an genau diesen Stellen vorsichtig; die Prüfung war blind. |

Das ist dieselbe Fehlerklasse wie der Stagnations-Zweig, der auf Stagnation
nicht anspringt: eine Prüfung, die in beiden Fällen gleich ausfällt, misst
nichts.

---

## Was jetzt da ist

### Tagesbewusstes Zerlegen

`planTextParsen()` erkennt Tagesüberschriften (Wochentage, „Tag 2", „Push",
Splitnamen), Ruhetage und — wenn gar keine Überschrift dasteht — Leerzeilen als
Tagesgrenze. Die Reihenfolge der Entscheidung ist die Logik: **zuerst** wird
versucht, die Zeile als Übung aufzulösen, **erst danach** gilt sie als
Überschrift. Andersherum verschwand „Pull-ups" als Kopfzeile „pull" — verlorenes
Volumen fällt niemandem auf, eine nicht erkannte Kopfzeile landet ehrlich unter
„nicht erkannt".

`planTage()` leitet daraus die Einheiten ab — eine Quelle, nicht zwei.

### Zwei getrennte Listen, und das ist Absicht

* **`befunde`** — Reizbefunde, jeder mit seiner Wirkung in **Reizpunkten**,
  danach sortiert. Eine Zahl, eine Einheit.
* **`sicherheit`** — Verletzung und fehlendes Gerät. Die haben keinen Reizwert.
  Ihnen einen zu geben, nur damit sie sich einsortieren lassen, wäre eine
  erfundene Vergleichbarkeit. Sie stehen vorn und ungewichtet — dieselbe
  Rangfolge, die der Planbauer selbst anwendet („Sicherheit dominiert
  Variation").

Ein Loch in einem selbst gewählten **Schwerpunkt** wird unter die ersten drei
vorgezogen, und das wird dazugesagt, statt die Wirkungszahl zu frisieren,
damit die Reihenfolge von selbst passt.

### `planReparieren()` — der eigentliche Punkt

Ein Urteil ohne Weg daraus ist eine Sackgasse. Die Reparatur schließt die
Lücken **minimal**: der fremde Plan bleibt stehen, es kommen Sätze dazu und
gehen Sätze weg.

**Fünf Regeln, die nicht verhandelbar sind:**

1. **Das Vokabular ist `SESSION_SLOTS`** — dasselbe, aus dem der Planbauer
   einen METRICGYM-Plan baut. Kein zweiter Wortschatz. Jeder innere Array ist
   ein Bewegungsmuster; gesperrt wird die **Bewegungswurzel**, nicht der
   Slot-Kopf. (Gruppen ohne Slot-Deckung — der Rumpf, den die Engine getrennt
   in `ABS_BLOCK` führt — werden aus EXDB nachgetragen, jede Übung als eigenes
   Muster.)
2. **Keine Ergänzung schiebt eine Gruppe über ihr MRV**, mit Puffer aus dem
   Register.
3. **Keine Kürzung zieht eine Gruppe unter ihr MEV** — symmetrisch zu Regel 2.
   Gekürzt wird proportional über alle Treiber, nie einer ausgeblutet.
4. **Nur was das Profil zulässt**: Ausstattung, Bank, Erfahrung, kein
   Körpergewichts-Ersatz bei voller Ausstattung, und keine Übung, die bei einer
   angegebenen Einschränkung als riskant gilt. Geht eine Lücke damit nicht zu,
   wird das **gesagt** (`offen`) und nicht mit dem gefüllt, was durchkommt.
5. **Zeitbudget pro Woche UND pro Einheit.** Kennt die App ein Profil-Budget
   (Tage × Einheitslänge), gilt das; sonst der Umfang des Plans plus Aufschlag.

Am Ende läuft der reparierte Plan durch **dieselbe Prüfung**, angewandt auf die
Item-Liste statt auf Text — ein zweiter Parser-Durchlauf wäre eine zweite
Fehlerquelle. Wird er nicht messbar besser (Schwelle aus dem Register), gibt es
**keinen Vorschlag**.

**Tagwahl:** Wird eine Gruppe bisher an genau einem Tag geladen und hat der
Plan mindestens zwei, kommt die Ergänzung auf einen *anderen* Tag — das ist der
Frequenzgewinn, auf den sich die App sonst beruft. Sonst in die Einheit, die
die Gruppe schon trainiert: warmer Muskel, zusammengehörendes Muster, kein
Brustheben am Rückentag. Bei Gleichstand die kürzeste Einheit.

### Vier neue Register-Einträge

Was **dosiert**, gehört ins Register; was nur unter mehreren passenden Übungen
eine Rangfolge herstellt, bleibt kommentierte Konstante in `planReparieren()`.

| Schlüssel | Wert | Wofür |
|---|---|---|
| `reparatur.mrv.puffer` | 2 Sätze | Abstand zur Obergrenze jeder mitbelasteten Gruppe |
| `reparatur.satz.max` | 4 Sätze | Höchstbeitrag **einer** ergänzten Übung |
| `reparatur.zeit.aufschlag` | 0,25 | Wachstum ohne bekanntes Profil-Budget |
| `reparatur.besser.schwelle` | 3 Reizpunkte | ab wann ein Vorschlag überhaupt erscheint |

Alle vier als `annahme` deklariert, mit Begründung und Sensitivität. Register
jetzt 122 Stellgrößen.

### Oberfläche

* **Ring** (SVG, animierter `stroke-dashoffset`) mit der Abdeckung, darunter
  **ein Satz**, der sagt was zu tun ist — nicht nur wie es steht.
* **Gestufte Enthüllung**: sieben Stufen, jede trägt die Zahl, die sie gerade
  gemessen hat. Kein Fortschrittsbalken, der nur Zeit vergehen lässt. Bei
  `prefers-reduced-motion` erscheint das Ergebnis sofort.
* **Korridor mit Vorher-Marke**: der Balken zeigt den reparierten Stand, ein
  Punkt den jetzigen, ein `+n` die Differenz. Eine Zeile, zwei Zustände.
* **Reparatur nach Tagen gruppiert**, mit Minuten je Einheit und Begründung je
  Änderung.
* **Übernahme**: „Als Text kopieren" (ohne Konto, ohne Datenänderung) und
  „In der App merken" → `S.importedPlan`. Der **eigene** METRICGYM-Plan wird
  nicht angetastet; ein fremder Plan, der die eigene Planung überschreibt, wäre
  eine Änderung an Nutzerdaten, die niemand bestellt hat.
* **Einstieg**: eigene Karte im Training-Tab (vorher in einem Akkordeon
  vergraben) und auf der Landing direkt nach der Korridor-Erklärung.
* **Wiedervorlage**: `S.auditLetzte` speichert nur das **Ergebnis** — der
  eingefügte Text wird nicht aufbewahrt, und die Oberfläche sagt das.

---

## Fehler, die erst die Messung zeigte

| Fehler | Wie er auffiel |
|---|---|
| `leg curl` → Bizeps-Curls, `hack squat` → Kniebeuge, `incline bench press` → Flachbank | Die Probe fragte nur „zugeordnet?". Synonym-Liste war nicht nach Spezifität geordnet. |
| `Pull-ups` verschwand als Tagesüberschrift „pull" | Synonym-Muster enden auf Wortgrenze → Plural-s blockierte den Treffer, danach griff die Kopfzeilen-Erkennung. |
| `Push-ups` → **Pike Push-ups** | Teilwort-Zuordnung akzeptierte eine *spezifischere* Übung. Jetzt darf ein Datenbankname die Eingabe nur fortsetzen, nicht ihr etwas voranstellen. |
| Dreimal Wadenheben für eine Oberschenkel-Lücke | Muster-Sperre lief über den Slot-Kopf. Jetzt über die Bewegungswurzel (Gerätevorsätze abgestreift). |
| Neun Ergänzungen auf einem Tag = 123 Min. in einer Sitzung | Budget war nur wöchentlich. |
| Acht Sätze Brust weniger zogen den Trizeps unter MEV | Die Kürzung prüfte nur die eigene Gruppe. Korridor stand danach unverändert bei 2/7, nur mit anderer Lücke. |
| „Der Grenznutzen ist **1,0-mal** so hoch wie beim besten anderen" | Das Maximum lief über alle Zeilen, die fehlende Gruppe eingeschlossen — die bei null immer den höchsten Grenznutzen hat. Ein Satz, der sich selbst widerlegt. |
| Klebende Leiste ließ den Inhalt durchscheinen | `backdrop-filter` in einem Element, das selbst einen trägt, komponiert nicht. |
| Vier Sätze „offen" gemeldet, obwohl Muster frei waren | Rundenbegrenzung 2 — eine erfundene Grenze, die sich als Sachaussage ausgab. Jetzt binden MRV, Muster, Satzmaximum und Zeit, also Gründe. |

Dazu drei Fehler in meinen **eigenen Proben**: `.ex` von einem Array gelesen,
ein fehlendes `evaluate`-Argument, und zweimal ein erfundener Schwellenwert in
der Zusicherung (`>1.2`, `×1.5`), der grün/rot entschied, ohne eine Eigenschaft
zu prüfen.

Und einmal habe ich die Datei selbst beschädigt: ein Ersetzen mit zwei Ankern
in falscher Reihenfolge verdoppelte 10 306 Zeilen. Entdeckt über
`Identifier 'INJURY_LABEL' has already been declared`, repariert, nachdem die
Byte-Gleichheit der beiden Hälften nachgewiesen war.

---

## Proben

`metricgym-netlify/tests/audit-tests.mjs` — **70 Zusicherungen**, im Gate von
`pakete.sh`. Die tragenden sind Negativkontrollen:

| Nr. | Was sie ausschließt |
|---|---|
| 3b | Nicht-Übungen („Yoga Flow", „Schach") bleiben unzugeordnet — sonst träfe der Matcher überall irgendetwas |
| 4, 5 | Unsinn und leerer Text erzeugen keinen Korridor |
| 12 | Der Reel-Plan fällt durch (1/7) — ohne das könnte Nr. 11 grün sein, weil die Prüfung alles durchlässt |
| 16 | Dasselbe Volumen auf **zwei** Tage löst den Frequenz-Befund **nicht** aus |
| 20 | **Am Plan der eigenen Engine: 0 Änderungen.** Schlüge die Reparatur dort etwas vor, widersprächen sich zwei Rechnungen, die dieselben Größen benutzen |
| 23 | Ohne Verletzungsangabe sind dieselben Übungen erlaubt — sonst bewiese Nr. 23 nur, dass die Reparatur sie nie wählt |
| 25 | Ein engeres Budget (2×40) ergibt messbar weniger als 3×60 |
| 15b | Der Vergleichsfaktor geht mit den Daten mit (1,2× in magerer, 1,6× in gesättigter Umgebung) |

Dazu über sieben Profile: keine Gruppe über MRV, keine Bewegung doppelt, keine
riskante Übung bei Einschränkung, kein fremdes Gerät.

Alle sieben bestehenden Suiten unverändert grün.

---

## Grenzen, die die Oberfläche selbst nennt

* Wie viele Zeilen zugeordnet wurden und welche nicht — nicht erkannte Sätze
  fehlen in der Rechnung.
* Bei welchen Übungen keine Satzzahl im Text stand.
* **Die sieben Gruppen sind grob**: alle Beinübungen zählen auf *Beine*, Waden
  eingeschlossen. Eine Lücke im Oberschenkel lässt sich nicht von einer in der
  Wade unterscheiden. Bei einer Knie-Einschränkung ist das spürbar, weil fast
  alle Oberschenkel-Muster wegfallen.
* Beurteilt wird Volumen, Frequenz, Zeitnutzen. Nicht beurteilt: Technik,
  Übungsreihenfolge, Progression über Wochen.
* Der Korridor folgt Praxisregeln (`typ: praxisregel`), nicht einer einzelnen
  Studie.

## Offen

* Zwei Hüftbeuge-Varianten („Rumänisches Kreuzheben" + „Sumo-Kreuzheben")
  können beide vorgeschlagen werden — verschiedene Wurzeln, verwandtes Muster.
  Vertretbar, aber nicht sauber.
* Der Parser liest keine Tabellen aus Screenshots. Dafür steht der KI-Bildimport
  daneben; diese Prüfung ist der deterministische Weg.
* Befunde zu Übungsreihenfolge und Progression fehlen — beides wäre eine eigene
  Rechnung.

---

## Was in Runde eins passierte (v81)

**Die sechste Bänder-Tabelle ist weg.** `importedPlanAnalysis()` rechnete gegen
`COARSE={Brust:[10,22],…}`. Im Defizit nennt `deficitScaledBands()` für die
Brust 10–16 — derselbe Plan galt dort als Lücke und im eigenen Editor als in
Ordnung.

**`corridorHTML()` kannte zwei Zustände nicht.** Eine Gruppe mit null Sätzen
erschien als „im Aufbau", eine über dem MRV als „Maximum ausgereizt" — beides
beschönigend. Zeilen ohne `st` verhalten sich unverändert, damit die Landing
gleich bleibt.
