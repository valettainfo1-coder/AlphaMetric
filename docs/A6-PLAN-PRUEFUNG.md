# A6 — Plan-Prüfung

Status: **ausgeliefert** (v81, `phase1-fundament`)

## Worum es geht

Jemand fügt einen Trainingsplan ein — aus ChatGPT, von Instagram, vom Trainer,
vom Notizzettel — und bekommt in unter einer Minute jede Muskelgruppe im
Korridor, die drei wichtigsten Lücken und zu jeder Zahl ihre Herleitung.

Ohne Konto. Ohne Netz. Ohne KI. Die Rechnung läuft im Browser; der eingefügte
Text verlässt das Gerät nicht und landet auch nicht in `localStorage`
(Zusicherungen 19 und 20 prüfen genau das).

Das ist der Grund, warum es dieses Paket gibt: der Prognose-Beweis des Rebriefs
ist erst nach acht Wochen da. Dieser hier ist nach sechzig Sekunden da.

## Wo es sitzt

| Ort | Einstieg |
|---|---|
| Landing, direkt nach „Warum 16 Sätze Brust — und nicht 25?" | `showPlanAudit()` |
| Training-Tab → „Plan bearbeiten, importieren oder neu berechnen" | `showPlanAudit()` |

Die Stelle auf der Landing ist bewusst gewählt: wer gerade begriffen hat, was
MEV und MRV sind, hat genau eine Frage — „und wie steht *mein* Plan da?". Davor
wäre die Antwort unverständlich, danach ist sie verkauft.

## Was gebaut wurde

| Funktion | Aufgabe |
|---|---|
| `planTextParsen(text)` | Freitext → Übungen. Tagestitel, Ruhetage und Aufzählungszeichen fallen raus. Erkennt `4 × 6-8`, `3x10`, `3 Sätze`, `·`-Listen und Zeilen ohne Satzangabe. |
| `PLAN_SYNONYM` | 33 Muster für englische und umgangssprachliche Namen. **Reihenfolge ist die Logik:** spezifisch vor allgemein. |
| `planZuordnen(items)` | exakt → Synonym → Teilwort, gegen `EXDB`. Kein Treffer heißt „nicht erkannt", nicht „irgendwas". |
| `planAudit(text, a)` | Die Prüfung. Gibt Korridor-Zeilen, höchstens drei Befunde, Reiz, Minuten, Sätze und die Grenzen der Aussage zurück. |
| `showPlanAudit()` | Oura-Oberfläche: Hero, Korridor-Balken, Befunde, Gegenentwurf, Grenzen. |
| `A.auditHerleitung(g)` | Je Gruppe: die Sättigungsrechnung und die vier Register-Einträge dahinter. |

## Die Prüfung rechnet nicht neu

Sie benutzt dieselben Größen wie der eigene Plan — `deficitScaledBands()`,
`satzAnteile()`, `reizKurve()`, `grenzNutzen()`, `satzSekunden()`. Ein Befund
hier und ein Befund im Plan-Editor können deshalb nicht auseinanderlaufen.

Zusicherung 11 besteht darauf: der von `generateTrainingPlan()` gebaute Plan
wird als Text ausgegeben und durch dieselbe Prüfung geschickt, die ein fremder
Plan durchläuft. Ergebnis **7/7 im Korridor, Ø 73 % Reiz**. Zusicherung 12 ist
die Gegenprobe — der Plan aus dem Instagram-Reel fällt mit **1/7** durch, Beine
als `fehlt`. Ohne diese zweite Probe könnte die erste grün sein, weil die
Prüfung grundsätzlich alles durchlässt.

## Befunde: höchstens drei, sortiert nach Wirkung

Jeder Befund trägt seine erwartete Wirkung in Reizpunkten. Sortiert wird danach,
nicht nach der Reihenfolge im Plan. Fünf Arten:

* `fehlt` — Gruppe kommt nicht vor. Wirkung = der Reiz, den das MEV brächte.
* `low` — unter dem Mindestreiz. Wirkung = Reizdifferenz bis zum MEV.
* `high` — über dem erholbaren Volumen.
* `freq` — viel Volumen an einem einzigen Tag.
* `tausch` — Minuten liegen bei einer gesättigten Gruppe, während eine andere darbt.

Was nicht in die ersten drei passt, wird gezählt und benannt („4 weitere
kleinere Punkte sind hier weggelassen"), nicht verschwiegen.

## Der Gegenentwurf

Aus den gemessenen Minuten des fremden Plans baut `besteAufteilung()` einen
eigenen Plan **bei gleicher Zeit** und rechnet ihn mit denselben Größen durch.
Ohne das bliebe der Befund eine Kritik; damit ist er eine Antwort. Steht der
fremde Plan besser da, sagt die Oberfläche das auch so („Dein Plan hält hier
mit").

Damit ist `besteAufteilung()` zum ersten Mal in der Oberfläche sichtbar.

## Was dabei an Bestandscode repariert wurde

**Die sechste Bänder-Tabelle ist weg.** `importedPlanAnalysis()` rechnete gegen
ein hart getipptes `COARSE={Brust:[10,22],…}`. Im Defizit nennt
`deficitScaledBands()` für die Brust 10–16 — derselbe Plan galt dort als Lücke
und im eigenen Editor als in Ordnung. Jetzt liest die Funktion den echten
Korridor; „Arme" bleibt die Summe aus Bizeps und Trizeps, weil
`matchExerciseMuscle()` nicht feiner trennt.

**`corridorHTML()` kannte zwei Zustände nicht.** Es gab nur `low`/`ok`/`max`.
Eine Gruppe mit null Sätzen erschien als „im Aufbau", eine über dem MRV als
„Maximum ausgereizt" — beides beschönigend. Jetzt gibt es `fehlt` und `high`
mit eigener Farbe. Zeilen ohne `st` verhalten sich unverändert, damit die
Landing gleich bleibt (Zusicherung 13).

## Ein Fehler, den die erste Fassung der Prüfung durchließ

Die erste Zuordnungsprobe fragte nur `x.ex !== null` und war grün, während

```
leg curl             → Bizeps-Curls
hack squat           → Kniebeuge
bulgarian split squat→ Kniebeuge
incline bench press  → Bankdrücken
```

Volumen der falschen Muskelgruppe zugeschrieben wurde — und das ist die Zahl,
auf die sich der ganze Befund stützt. Ursache: `PLAN_SYNONYM` lief von oben
nach unten mit `curl` und `squat` weit vor den spezifischen Mustern.

Die Liste ist jetzt nach Spezifität geordnet, und die Probe nennt neben jedem
Eingabetext, was herauskommen **muss** — 21 Paare. Dazu eine Negativkontrolle
mit vier Nicht-Übungen („Yoga Flow", „Trampolin", „Schach", „Sauna"), die
unzugeordnet bleiben müssen; ohne sie könnte die erste Probe grün sein, weil
der Matcher großzügig irgendetwas trifft.

## Grenzen, die die Oberfläche selbst nennt

* Wie viele Zeilen zugeordnet wurden, und welche nicht. Nicht erkannte Sätze
  fehlen in der Rechnung, und das steht da.
* Bei welchen Übungen keine Satzzahl im Text stand (gerechnet mit 3).
* Beurteilt wird **Volumen, Frequenz, Zeitnutzen**. Nicht beurteilt: Technik,
  Übungsreihenfolge, Gewichtssteigerung über die Wochen, Verletzungsgeschichte.
* Der Korridor folgt Praxisregeln (`typ: praxisregel`), nicht einer einzelnen
  Studie. „Woher die Zahl kommt" nennt je Gruppe Typ und Quelle aus `PARAMS`.

## Offen

* `matchExerciseMuscle()` trennt Bizeps und Trizeps nicht — nur der Fallback
  betrifft das, zugeordnete EXDB-Übungen werden fraktioniert gezählt.
* Der Parser liest keine Tabellen aus Screenshots. Dafür gibt es den
  KI-Bildimport daneben; die Prüfung hier ist der deterministische Weg.
* Befunde zu Übungsreihenfolge und Progression fehlen. Beides wäre eine eigene
  Rechnung, keine Erweiterung dieser.

## Proben

`metricgym-netlify/tests/audit-tests.mjs` — **35 Zusicherungen**, im Gate von
`pakete.sh`. Die wichtigsten sind Negativkontrollen (Nr. 3b, 4, 5, 8, 12).
