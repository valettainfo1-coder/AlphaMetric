# V1 — Volumenzählung und Zeitbudget: Befund und offener Rest

Stand 2026-10-11 · Branch `phase1-fundament` · **ERLEDIGT und ausgeliefert in v80**

Dieses Dokument hielt den Befund fest, solange die Umsetzung offen war. Sie ist
es nicht mehr: v80 enthält alle fünf Reparaturen. Der Abschnitt „Der offene
Rest" unten beschreibt, was gefehlt hat — er ist erledigt, bleibt aber stehen,
weil er die Fehlersuche dokumentiert.

## Warum zurückgesetzt

Der Umbau war fachlich richtig und hat zwei echte Defekte behoben. Er zieht aber
eine dritte Baustelle nach sich, die ich in derselben Runde nicht sauber
fertigbekommen habe. Eine **halb umgestellte Zählweise ist schlechter als die
alte**: zwei Teile der Engine hätten dann nach verschiedenen Regeln gerechnet,
und genau das war der Ausgangsfehler.

Alle Zahlen unten sind gemessen, nicht geschätzt.

## Befund 1 — Der MRV-Deckel ist blind für fraktioniertes Volumen

`capWeeklyVolume` zählt über `volGroupOf()`, das **einen** Muskel liefert, den
primären. Bankdrücken zählt 1,0 auf die Brust und **0,0 auf den Trizeps**.
Die fraktionierte Zählung, mit der die App wirbt und mit der Effizienzbericht
und Eichung rechnen, sieht ihr eigener Sicherheitsdeckel nicht.

Gemessen an einem 3-Tage-Plan (männlich, 25, 80 kg, erfahren, Muskelaufbau):

| Gruppe | Deckel sieht | tatsächlich | MRV | blind für |
|---|---|---|---|---|
| **Trizeps** | 12 | **22,5** | 18 | **10,5** |
| Schultern | 9 | 15 | 20 | 6 |
| Bizeps | 12 | 18 | 20 | 6 |
| Rücken | 12 | 16,5 | 22 | 4,5 |

Der Trizeps liegt 4,5 Sätze über seiner Obergrenze, ohne dass der Deckel es
bemerkt. Schultern und Bizeps entgehen dem nur, weil ihre Bänder höher liegen.

## Befund 2 — Zwei Zeitmodelle, die sich widersprechen

* `estOfBase()` im Planbau: `sets × (0,75 + rest/60)` — pauschal 45 s Arbeit
  je Satz, ignoriert Tempo und Wiederholungen
* `satzSekunden()` im Effizienzbericht: Wiederholungen × Tempo + Pause

Gemessen bei einem 40-Minuten-Budget, 3 Tage: **225 Min gegen 181 Min**.
Eine der beiden Zahlen lügt den Nutzer an.

## Befund 3 — Es gibt einen Füller, aber keinen Trimmer

Zeile ~7223: `while(estOfBase(base) < budget-6)` — die Schleife **fügt hinzu,
entfernt aber nie**. Ist der Grundplan schon über Budget, trimmt ihn niemand.

| Budget/Einheit | Budget/Woche | tatsächlich gebaut | Überschuss |
|---|---|---|---|
| 40 Min × 3 | 120 | 225 | **+88 %** |
| 60 Min × 3 | 180 | 255 | +42 % |
| 75 Min × 3 | 225 | 255 | +13 % |

Wer 40 Minuten angibt, bekommt einen Plan, den er nicht zu Ende trainieren
kann — und fällt damit unter das Volumen, das die App ihm zugesagt hat.

## Befund 4 — Die Füll-Reihenfolge ist fest

`order = ["Schultern","Bizeps","Trizeps","Brust","Rücken","Core","Beine"]`,
nur nach Fokus umsortiert. Welcher Satz als nächstes am meisten bringt, hängt
aber davon ab, wo man steht — der Grenznutzen fällt mit dem Volumen. Die App
**rechnet** das bereits (`grenzNutzen`), benutzt es beim Planbau aber nicht.

## Was der Entwurf erreicht hat

Mit fraktioniertem Deckel, einem Zeitmodell und einem Budget-Pass (trimmen und
füllen nach Grenznutzen je Minute):

| Plan | Budget | gebaut | im Korridor | Ø Reiz | Reiz/h |
|---|---|---|---|---|---|
| 3×60 | 180 | 180 | 6/7 | 68 % | 23 |
| 3×75 | 225 | 225 | **7/7** | 75 % | 20 |
| 5×60 | 300 | 290 | **7/7** | **80 %** | 17 |
| 6×45 | 270 | 270 | **7/7** | 72 % | 16 |

Kein Muskel mehr über MRV. Trizeps von 22,5 auf 15 (Deckel 18).

**Gegen den „American Psycho"-Plan bei vergleichbarer Zeit:**

| | Zeit | Korridor | Ø Reiz | Reiz/h |
|---|---|---|---|---|
| Reel (3 Tage) | 159 Min | 5/7 | 54 % | 20 |
| METRICGYM 3×60 | 180 Min | **6/7** | **68 %** | **23** |

## Befund 5 — Die Aufteilung eines Wochenbudgets entscheidet mit

Auf- und Abwärmen fallen **je Einheit** an. Bei fünf kurzen Einheiten gehen
davon 65 Minuten weg, bei zwei langen nur 26. Gemessen für Muskelaufbau:

**160 Min/Woche:** 2×80 → 6/7, Ø 66 %, 25 Reiz/h · 3×55 → 5/7, 63 % ·
4×40 → 5/7, 53 % · 5×30 → 2/7, 46 %

**300 Min/Woche:** 5×60 → **7/7, Ø 80 %** · 4×75 → 7/7, 78 % ·
6×50 → 7/7, 77 % · 3×100 → 6/7, 73 %

Bei knappem Budget gewinnen **wenige lange** Einheiten (weniger Rüstzeit), bei
großem Budget **mehr kürzere** (bessere Verteilung unter dem MRV-Deckel).
Ab etwa 300 Minuten begrenzt nicht mehr die Zeit, sondern die Erholung: bei
360 Minuten baut die Engine nur noch 285.

`besteAufteilung(wochenMinuten, a)` im Entwurf rechnet das je Profil durch.

## Der offene Rest — was die nächste Runde braucht

Stellt man den Deckel auf fraktionierte Zählung um, kürzt er `Schulterdrücken`
von 3 auf 2 Sätze. Danach gilt:

* **fraktioniert**: Schulter 12 Sätze, MEV 8 → in Ordnung
* **direkt**: Schulter 7 Sätze, MEV 8 → zu wenig

Die MEV-Garantie (`capWeeklyVolume` Schritt 2.5) und der Bio-Check
(`bioProofParts`, Zeile ~16124) zählen weiter **direkt**. Sie arbeiten dann
gegen den Deckel: er kürzt wegen des Gesamtvolumens, sie melden dieselbe Gruppe
als „unter MEV". Zwei bestehende Zusicherungen wurden dadurch zu Recht rot.

Nach dem eigenen Register sind die Bänder **für fraktionierte Zählung gesetzt**
(„Trizeps MEV 6, weil jedes Drücken 0,5 Sätze zurechnet"). Fraktioniert ist
also richtig — MEV-Garantie und Bio-Check müssen nachziehen.

Ein Umstellen von `bioProofParts` habe ich versucht und zurückgenommen: die
Funktion rekonstruiert den Tag über `peExArr()` aus dem aktuellen Zustand statt
aus dem übergebenen Plan und zeigte dadurch andere Zahlen als derselbe Plan
direkt gemessen (Rücken 7 statt 10,5). Das ist eine eigene Baustelle.

### Reihenfolge für die nächste Runde

1. `bioProofParts` auf den übergebenen Plan statt auf den Zustand stellen
   (eigenes Paket, eigener Test)
2. Dann MEV-Garantie und Bio-Check auf fraktionierte Zählung
3. Dann die bestehenden Volumen-Zusicherungen auf fraktioniert anpassen —
   mit Negativkontrolle, damit sie nicht einfach weicher werden
4. Erst danach den Patch aus `docs/entwuerfe/` anwenden
