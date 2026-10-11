# Eichung: zwei Defekte, Reparatur zurückgenommen

Stand 2026-10-11 · Branch `phase1-fundament` · **Code auf v80, nichts geändert**

Auftrag war: die Fehlverdrahtung „Kraftsignal steuert Muskeldosis" reparieren.
Ich habe es gebaut, dabei einen zweiten, schwereren Defekt gefunden — und beides
wieder zurückgenommen, weil ich die ersetzende Zusicherung nicht belegen konnte.

## Defekt 1 — Signal und Ziel sind nicht dasselbe

`gruppenFortschritt(m)` baut den Trend aus `e1Series` — einem **Kraftmaß**.
Dieser Trend verschiebt `saettigungFuer(ziel, a)`, beim Muskelaufbau also den
**Hypertrophie**-Sättigungspunkt (31 Sätze aus dem Hypertrophie-Arm von
Pelland 2026).

Kraft und Querschnitt laufen auseinander: die ersten Wochen Kraftzuwachs sind
weitgehend neural (Moritani & deVries 1979, steht im eigenen Register). Ein
Kraftsignal auf einem Muskelregler ist eine Fehlverdrahtung im Code, keine
Lücke in der Literatur — sie bliebe falsch, selbst wenn die Datenlage lückenlos
wäre.

**Gebaute Reparatur:** bei muskelorientierten Zielen gilt der Messwert als
Stellvertreter und rechtfertigt nur den halben Schritt
(`kalib.proxy.daempfung = 0,5`). Beim Kraftziel misst die App, was sie steuert —
dort bleibt alles. Gemessen wirkte das korrekt: Faktor **1,157 → 1,079**, und
die Begründung wies den Stellvertreter aus.

**Warum zurückgenommen:** die Änderung ist nur zusammen mit Defekt 2 sinnvoll,
und der ist offen.

## Defekt 2 — Der Stagnations-Zweig kann bei Stagnation nicht auslösen

Das ist der schwerere Fund, und er ist neu.

Jeder Zweig der Eichung muss an `f.klar` vorbei. Das prüft
`|rate| > 1,5 × Standardfehler` — also **„der Trend ist verlässlich von null
verschieden"**. Für einen *Rückgang* passt das. Für ein *Plateau* ist es genau
die falsche Frage.

Gemessen an einem echten Plateau über zwölf Wochen mit realistischem Rauschen:

```
rate 0,036 %/Woche   se 0,091   klar: false   →  "kein klarer Trend"
```

Der Zweig, der **„Stagnation unterhalb der Sättigung"** heißt und
**Lixandrão 2024** zitiert — die Arbeit, in der 51 von 85 Älteren am Ein-Satz-
Bein als nicht ansprechend galten und am Vier-Satz-Bein zulegten — löst damit
nur bei **messbarem Rückgang** aus:

```
rate −1,507 %/Woche  se 0,020   klar: true    →  Zweig feuert
```

**Den häufigsten Fall, für den er gebaut wurde, hat er nie gesehen.**

### Die richtige Frage

Stagnation ist eine **Äquivalenzfrage**, keine Unterschiedsfrage: liegt die
obere Vertrauensgrenze der Rate unter dem, was für dieses Trainingsalter zu
erwarten wäre? Die Erwartungswerte existieren bereits in `adaptationVelocity`
(6 / 4 / 2,5 / 1,5 %/Monat nach Trainingsalter).

Gebaut und gemessen: das Plateau wurde korrekt erkannt
(„0,2 statt 2,5 %/Monat"), und wer wie erwartet vorankam, wurde nicht
fälschlich markiert.

### Warum trotzdem zurückgenommen

Die Effizienz-Suite hat eine bewusst gebaute Zusicherung:

> „Eine Eichung, die aus reinem Rauschen einen Trend liest, ist ein Horoskop
> mit Fußnoten." — sie füttert Verläufe OHNE Trend und besteht darauf, dass
> sich nichts bewegt.

Meine Änderung bricht sie. Mein Gegenargument wäre: ein 12-Wochen-Plateau ist
**kein** Rauschen, sondern die korrekt gelesene Abwesenheit eines Trends — und
die Rausch-Abwehr gehört in die Dämpfung (`KALIB_VERLAESSLICH`), nicht in ein
Tor, das echte Plateaus mit aussperrt.

Die ersetzende Zusicherung wäre: **gleiches Urteil unabhängig vom
Rauschmuster** — fünf Durchläufe mit derselben Wahrheit und verschiedenen
Rauschfolgen müssen dasselbe Ergebnis liefern. Ich habe sie gebaut und konnte
sie **nicht belegen**: mein Messgerät las das falsche Rückgabefeld und meldete
durchgehend Faktor 1. Ohne Beleg wird eine bewusste Sicherung nicht ausgehebelt.

## Was die nächste Runde braucht

1. **Rückgabeform von `kalibFaktoren()` festnageln** und einen verlässlichen
   Zugriff für Tests bauen — ohne den ist in diesem Bereich nichts messbar.
2. Dann die Rausch-Unabhängigkeit als Zusicherung formulieren: gleiche
   Wahrheit, verschiedene Rauschfolgen, gleiches Urteil.
3. Erst dann Defekt 2 beheben (Äquivalenz statt Unterschied), danach Defekt 1
   (Stellvertreter-Dämpfung). In dieser Reihenfolge — Defekt 1 allein ändert
   nur die Schrittweite eines Zweigs, der ohnehin selten feuert.

## Was in dieser Runde bestätigt wurde

* Die Stellvertreter-Dämpfung wirkt rechnerisch wie beabsichtigt (1,157 → 1,079).
* Eine Umformulierung von `kalib.schwelle.hoch` als Restnutzen aus der
  Sättigungskurve statt als Dosisanteil ist **beweisbar verhaltensneutral**
  (27,9 gegen 27,93 Sätze bei Hypertrophie; 2,7 gegen 2,7 bei Kraft).
  Sie macht die Zahl erklärbar, ohne etwas zu verändern — ein guter erster
  Schritt für die nächste Runde.
