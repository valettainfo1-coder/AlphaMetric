# PARAMS-Inventur — P0-A, Schritt 1

Stand: 2026-10-07 · `index.html` 18.246 Zeilen · Commit `0362df7`
**Noch kein Code geändert.** Diese Liste ist die Grundlage dafür.

## Wie erhoben

Maschinell aus acht Rechenkern-Bereichen extrahiert (`4099–4500`, `4506–4800`,
`4880–5010`, `5751–5800`, `5935–6010`, `6030–6420`, `6578–6630`, `6813–6910`),
Kommentarzeilen und String-Literale vorher entfernt.

| | |
|---|---|
| Zeilen mit Zahlen im Rechenkern | **466** |
| verschiedene Zahlwerte | **158** |
| davon unten als echte Stellgröße geführt | **87** |

Der Rest sind Indizes, Rundungsfaktoren (`*10)/10`), Millisekunden-Umrechnungen
und Array-Positionen — die bekommen keinen PARAMS-Schlüssel, aber der geplante
Build-Test muss sie von echten Parametern unterscheiden können (siehe „Offene
Punkte", Nr. 7).

### Zustand des Quellenregisters (gemessen, nicht geschätzt)

| | |
|---|---|
| Zitate in `QUELLEN` | 53 |
| **mit DOI** | **0** |
| **mit Link** | **0** |
| ohne Band/Seitenangabe | **31 (58 %)** |

Deine Annahme „etwa die Hälfte" war zu günstig.

---

## Typ-Schlüssel

| Typ | Bedeutung |
|---|---|
| `beleg` | Zahl stammt direkt aus einer benannten Arbeit |
| `modell` | Funktionsform ist gesetzt, nicht gemessen (Kurve, Dämpfung) |
| `praxisregel` | Verbreitete Trainerpraxis, nicht begutachtet |
| `nutzerdaten` | Wird aus den Daten des Nutzers gerechnet |
| **`unbelegt`** | **Keine Quelle im Code, keine im Register** |

---

## A · Energie & Makros

| Schlüssel | Wert | Zeile | Typ | Quelle im Code | Anmerkung |
|---|---|---|---|---|---|
| `BMR_MIFFLIN_*` | 10 / 6,25 / 5 / +5 / −161 | 4099 | `beleg` | — (im Register erwähnt) | Mifflin-St Jeor, Originalkoeffizienten |
| `BMR_KATCH_*` | 370 / 21,6 | 4100 | `beleg` | — | Katch-McArdle |
| `NEAT_SEDENTARY` | 1,2 | 4130 | `praxisregel` | — | **unbelegt** |
| `NEAT_LIGHT` | 1,3 | 4130 | `praxisregel` | — | **unbelegt** |
| `NEAT_MODERATE` | 1,4 | 4130 | `praxisregel` | — | **unbelegt** |
| `NEAT_ACTIVE` | 1,475 | 4130 | `praxisregel` | — | **unbelegt**, krumme Zahl ohne Herleitung |
| `NEAT_VERY_ACTIVE` | 1,55 | 4130 | `praxisregel` | — | **unbelegt** |
| `TRAIN_KCAL_PRO_KG_H` | 3,5 | 4134 | `modell` | Kommentar „bewusst konservativ" | **unbelegt** |
| `GOAL_D.muscle_gain` | +0,10 | 4138 | `praxisregel` | — | **unbelegt** |
| `GOAL_D.fat_loss` | −0,20 | 4138 | `praxisregel` | Garthe 2011 (indirekt) | Register nennt 0,5–0,7 %/Wo, nicht −20 % |
| `GOAL_D.recomp` | +0,10 / −0,10 | 4138 | `praxisregel` | — | **unbelegt** |
| `GOAL_D.strength` | +0,05 | 4138 | `praxisregel` | — | **unbelegt** |
| `RECOMP_LEAN_M` | 18 % KF | 4166 | `praxisregel` | — | **unbelegt** (ästhetische Schwelle) |
| `RECOMP_LEAN_W` | 26 % KF | 4166 | `praxisregel` | — | **unbelegt** |
| `RECOMP_DIR_FAT` | −0,12 | 4168 | `praxisregel` | — | **unbelegt** |
| `RECOMP_DIR_BAL` | −0,05 | 4169 | `praxisregel` | — | **unbelegt** |
| `RECOMP_DIR_GAIN` | +0,05 | 4170 | `praxisregel` | — | **unbelegt** |
| `RECOMP_OHNE_KF` | −0,10 / 0 / +0,04 | 4172 | `praxisregel` | — | **unbelegt**, BMI-Pfad |
| `RECOMP_FATFIRST` | −0,20 / −0,15 | 4174 | `praxisregel` | — | **unbelegt** |
| `RECOMP_AUSGEWOGEN` | **−0,08** | 4175 | `praxisregel` | — | **unbelegt** (dein Befund) |
| `STRENGTH_CUT` | −0,12 / −0,08 | 4184 | `praxisregel` | — | **unbelegt** |
| `CUT_EASY` | −0,12 | 4192 | `praxisregel` | Garthe 2011 | Zuordnung zur Quelle nicht geprüft |
| `CUT_FAST` | −0,25 / −0,22 | 4193 | `praxisregel` | Garthe 2011 | liegt **über** dem zitierten Korridor |
| `CUT_MOD` | **−0,22 / −0,20** | 4195 | `praxisregel` | Garthe 2011 | dein Befund |
| `BULK_DIR` | +0,10 | 4199 | `praxisregel` | — | **unbelegt** |
| `BMI_SCHWELLE_27` | 27 | mehrfach | `praxisregel` | — | **unbelegt** |
| `BMI_SCHWELLE_30` | 30 | mehrfach | `praxisregel` | — | **unbelegt** |
| `KCAL_FLOOR_W` | 1400 | 4228 | `praxisregel` | — | **unbelegt** |
| `KCAL_FLOOR_M` | 1600 | 4228 | `praxisregel` | — | **unbelegt** |
| `PROT_CUT_FFM` | 2,6 g/kg FFM | 4241 | `beleg` | Helms 2014 | Register nennt 2,3–3,1 → 2,6 ist Setzung |
| `PROT_ERHALT_FFM` | 2,2 g/kg FFM | 4241 | `beleg` | Helms 2014 | dto. |
| `PROT_CUT_KG` | 2,1 g/kg | 4242 | `modell` | — | Ersatzpfad ohne KF-Wert |
| `PROT_ERHALT_KG` | 1,8 g/kg | 4242 | `modell` | — | dto. |
| `PROT_ALTER_BONUS` | +0,2 ab 50 J. | 4240 | `beleg` | Moore 2015 · Wall 2015 | ohne Band/Seiten |
| `PROT_BMI_KAPPE` | 25 | 4242 | `praxisregel` | — | **unbelegt** |
| `FETT_BODEN` | 0,5 g/kg KG | 4252 | `praxisregel` | „Hormonhaushalt" | **unbelegt** |
| `FETT_FFM_CUT` | 1,0 g/kg FFM | 4254 | `praxisregel` | — | **unbelegt** |
| `FETT_FFM_SONST` | 1,1 g/kg FFM | 4254 | `praxisregel` | — | **unbelegt** |
| `FETT_KG_CUT` | 0,8 g/kg | 4255 | `praxisregel` | — | **unbelegt** |
| `FETT_KG_SONST` | 0,9 g/kg | 4255 | `praxisregel` | — | **unbelegt** |
| `KH_BODEN_FFM` | 2,0 g/kg FFM | 4257 | `praxisregel` | — | **unbelegt** |
| `KH_BODEN_KG` | 1,5 g/kg | 4257 | `praxisregel` | — | **unbelegt** |
| `KCAL_PRO_KG_FETT` | 7700 | 4271 (Kommentar) | `modell` | Hall 2011 | Register sagt selbst, die Regel sei falsch |

## B · Volumen-Korridor

| Schlüssel | Wert | Zeile | Typ | Quelle | Anmerkung |
|---|---|---|---|---|---|
| `VOL_BANDS.Beine` | 12–30 | 4452 | `praxisregel` | Israetel 2017 | **nicht als Praxismodell gekennzeichnet** |
| `VOL_BANDS.Brust` | 10–20 | 4452 | `praxisregel` | Israetel 2017 | MRV unter Quelle (22) |
| `VOL_BANDS.Rücken` | 10–22 | 4452 | `praxisregel` | Israetel 2017 | MRV unter Quelle (25) |
| `VOL_BANDS.Schultern` | 8–20 | 4452 | `praxisregel` | Israetel 2017 | |
| `VOL_BANDS.Bizeps` | 8–20 | 4452 | `praxisregel` | Israetel 2017 | |
| `VOL_BANDS.Trizeps` | 6–18 | 4452 | `praxisregel` | Israetel 2017 | |
| `VOL_BANDS.Arme` | 10–22 | 4452 | `praxisregel` | — | **unbelegt** (Sammelgruppe) |
| `VOL_BANDS.Core` | 4–16 | 4452 | `praxisregel` | — | **unbelegt** |
| `SEK_ANTEIL` | 0,5 | 4406–4417 | `modell` | Register („Konvention") | als Konvention gekennzeichnet — gut |
| `EXP_MEV_BEGINNER` | **0,65** | 4493 | `modell` | — | **unbelegt** (dein Befund) |
| `EXP_MRV_BEGINNER` | **0,80** | 4493 | `modell` | — | **unbelegt** |
| `EXP_MEV_NOVICE` | **0,78** | 4493 | `modell` | — | **unbelegt** |
| `EXP_MRV_NOVICE` | **0,90** | 4493 | `modell` | — | **unbelegt** |
| `EXP_MRV_ADVANCED` | **1,12** | 4493 | `modell` | — | **unbelegt** |
| `DEFIZIT_UNTERGRENZE` | **0,78** | 4488 | `modell` | — | **unbelegt** (dein Befund) |
| `MEV_ABSOLUT_MIN` | 4 | 4500 | `praxisregel` | — | **unbelegt** |

## C · Sättigung & Effizienz

| Schlüssel | Wert | Zeile | Typ | Quelle | Anmerkung |
|---|---|---|---|---|---|
| `SAETTIGUNG_WACHSTUM` | 31 | 4555 | `beleg` | Pelland 2026 | ✓ belegt, Band/Seiten vorhanden |
| `SAETTIGUNG_KRAFT` | 3 | 4556 | `beleg` | Pelland 2026 | ✓ |
| `ERHALT_ANTEIL` | 1/3 | 4557 | `beleg` | Bickel 2011 · Spiering 2021 | ✓ |
| `ENDURANCE_ABSCHLAG` | 0,8 | 4566 | `modell` | — | **unbelegt** |
| `ALTER_ZUSCHLAG` | ×1,5 ab 50 J. | 4577 | `modell` | Bickel 2011 | Richtung belegt, Betrag gesetzt |
| `REIZ_K_TEILER` | 3 | 4580 | `modell` | — | **unbelegt** (Kurvenparameter) |
| `PROTEIN_PLATEAU` | 1,6 g/kg | 4644 | `beleg` | Morton 2018 | ✓ |
| `PROT_FAKTOR_BASIS` | 0,8 + 0,2×Deckung | 4659 | `modell` | Kommentar 4636 | Form gesetzt |
| `PROT_MIN_TAGE` | 5 | 4653 | `modell` | — | **unbelegt**, aber begründet |
| `PROT_KNAPP` | < 0,9 | 4659 | `modell` | — | **unbelegt** |

## D · Eichung (N-of-1)

| Schlüssel | Wert | Zeile | Typ | Quelle | Anmerkung |
|---|---|---|---|---|---|
| `KALIB_VERLAESSLICH` | (6,5²)/(9,7²) ≈ 0,449 | 4697 | `beleg` | Chaves 2025 | ✓ belegt, Band/Seiten vorhanden |
| `KALIB_MIN_WOCHEN` | 6 | 4698 | `modell` | — | **unbelegt** |
| `KALIB_MIN_PUNKTE` | 8 | 4699 | `modell` | — | **unbelegt** |
| `KALIB_SPANNE` | 0,65–1,60 | 4700 | `modell` | — | **unbelegt** |
| `KALIB_SCHRITT` | 0,35 | 4701 | `modell` | — | **unbelegt** |
| `KALIB_FENSTER_TAGE` | 112 | 4702 | `modell` | — | **unbelegt** |
| `KALIB_SCHWELLE_HOCH` | 0,9 | 4762 | `modell` | Lixandrão 2024 | Richtung belegt, Schwelle gesetzt |
| `KALIB_SCHWELLE_RUNTER` | 0,6 | 4766 | `modell` | — | **unbelegt** |
| `TREND_KLAR_FAKTOR` | 1,5 × SE | 4743 | `modell` | — | **unbelegt** |
| `GRUPPE_MIN_ANTEIL` | 0,5 | 4725 | `modell` | Konvention aus B | konsistent |
| `GRUPPE_MIN_PUNKTE` | 3 | 4727 | `modell` | — | **unbelegt** |

## E · Progression & Plan

| Schlüssel | Wert | Zeile | Typ | Quelle | Anmerkung |
|---|---|---|---|---|---|
| `SETS_BY_EXP.*` | c/a/i/count je Stufe | 5939–5942 | `praxisregel` | Schoenfeld 2019 | ohne Band/Seiten |
| `DELOAD_FAKTOR` | 0,6 | 5948 | `praxisregel` | Israetel 2017 | ✓ **als Praxismodell gekennzeichnet** |
| `DELOAD_WOCHE` | 4 | 5948 | `praxisregel` | Israetel 2017 | ✓ gekennzeichnet |
| `SPITZENWOCHE_BONUS` | +1 Satz (Wo 3) | 5952 | `praxisregel` | — | **unbelegt** |
| `REST_STRENGTH` | 210/150/90 s | 5980 | `beleg` | Grgic 2018 | ohne Band/Seiten |
| `REST_HYPER` | 150/120/60 s | 6007 | `beleg` | Grgic 2018 | dto. |
| `REST_ENDURANCE` | 75/60/45 s | 5981 | `praxisregel` | — | **unbelegt** |
| `REST_DECON` | 120/90/60 s | 5983 | `praxisregel` | — | **unbelegt** |
| `RIR_HYPER` | 1–2 | 6007 | `beleg` | Robinson 2024 · Helms 2016 | ohne Band/Seiten |
| `RIR_SONST` | 2–3 | mehrfach | `praxisregel` | — | **unbelegt** |
| `PROG_STEP_STD` | 2,5 kg | 6820 | `praxisregel` | — | **unbelegt** |
| `REP_RANGE_FALLBACK` | 6–12 | 6821 | `praxisregel` | — | **unbelegt** |
| `FOKUS_BONUS_MAX` | 2 je Einheit | 6041 | `modell` | — | **unbelegt** |
| `DECON_BMI` | 30 (bzw. 27 + Anfänger) | 5979 | `praxisregel` | — | **unbelegt** |

## F · Status, Fortschritt & Prognose

| Schlüssel | Wert | Zeile | Typ | Quelle | Anmerkung |
|---|---|---|---|---|---|
| `E1RM_MAX_REPS` | 12 | 4362 | `modell` | — | **unbelegt** |
| `E1RM_EPLEY_TEILER` | 30 | 4367 | `beleg` | — (Epley) | Formel bekannt, **nicht im Register** |
| `E1RM_RPE_BASIS` | 10 − RPE (Std. 8) | 4366 | `modell` | — | **unbelegt** |
| `STATUS_GEW_SCHLAF` | 0,30 | 4371 | `modell` | — | **unbelegt** |
| `STATUS_GEW_ENERGIE` | 0,25 | 4371 | `modell` | — | **unbelegt** |
| `STATUS_GEW_STRESS` | 0,20 | 4371 | `modell` | — | **unbelegt** |
| `STATUS_GEW_SCHMERZ` | 0,25 | 4371 | `modell` | — | **unbelegt** |
| `STATUS_STUFEN` | 80/60/40 | 4373 | `modell` | — | **unbelegt** |
| `FORECAST_DAEMPFUNG` | 0,85 je Block | 4383 | `modell` | — | **unbelegt** |
| `FORECAST_DECKEL` | ×1,15 | 4383 | `modell` | — | **unbelegt** |
| `FORECAST_BLOCK_TAGE` | 28 | 4383 | `modell` | — | **unbelegt** |
| `VELO_FAST.*` | 6 / 4 / 2,5 / 1,5 %/Mon | 4981 | `praxisregel` | — | **unbelegt** |
| `VELO_MIN_PUNKTE` | 5 | 4977 | `modell` | — | **unbelegt** |
| `VELO_MIN_SPANNE` | 14 Tage | 4978 | `modell` | — | **unbelegt** |
| `VELO_KONFIDENZ` | min(85, 40 + 4n) | 4983 | `modell` | — | **unbelegt**, erzeugt eine Prozentzahl |
| `ACWR_SPRUNG` | +30 %/Woche | 16360 | `praxisregel` | Gabbett 2016 | **umstritten, s. u.** |
| `STEIGERUNG_DECKEL` | ≤ 10 %/Woche | 9482 | `praxisregel` | Nielsen 2014 | **umstritten, s. u.** |
| `SAETTIGUNG_INDEX` | Holt-Heuristik | 4999 | `praxisregel` | Holt 1995 | **Einzelstudie, s. u.** |

## G · Ernährungs-KI — Zahlen, die wie Messwerte aussehen

| Schlüssel | Wert | Zeile | Typ | Anmerkung |
|---|---|---|---|---|
| `KI_VORRANG` | KI vor Datenbank | **16999** | — | `if(aiActive()){ A.aiParse(...); return; }` — der geprüfte Pfad (7299/7317) wird nie erreicht |
| `KONF_MIN` | 0,50 | 17029 | `modell` | **erfunden**: untere Klemme ohne Modellgrundlage |
| `KONF_MAX` | 0,97 | 17029 | `modell` | **erfunden** |
| `KONF_STD` | **0,82** | 17029 | `modell` | **erfunden** — wird gezeigt, wenn das Modell gar keinen Wert liefert |
| `KONF_STD_B` | 0,75 | 17153 | `modell` | zweiter Pfad, anderer Standardwert |
| `KONF_DB_BASIS` | 0,55 (+0,3/+0,1/−0,1·dist) | 7317–7318 | `modell` | Datenbankpfad, ebenfalls gesetzt |
| `AUTO_COMMIT` | ohne Vorschau | 17003/17013/17032 | — | `autoCommitVoice()` übernimmt direkt |

---

## Widersprüche (gemessen)

**W1 — Landing-Demo liest nicht aus `VOL_BANDS`.**
Zeile 9726: `{g:"Rücken",tot:18,mev:12,mrv:22}` — **MEV 12**, während `VOL_BANDS["Rücken"] = [10,22]` **MEV 10** sagt.
Zeile 9701 (`Brust`, mev 10, mrv 20) stimmt derzeit zufällig überein, ist aber ebenfalls hart verdrahtet und kann jederzeit auseinanderlaufen.

**W2 — Pelland 2026 trägt zwei verschiedene Aussagen.**
`SAETTIGUNG_WACHSTUM = 31` (Zuwächse bis ~30 Sätze) steht neben `VOL_BANDS.Brust = [10,20]`.
Die App begründet beides mit derselben Arbeit, erklärt den Unterschied zwischen *Dosis-Wirkung* (Sättigung) und *erholbarem Wochenvolumen* (MRV) aber nirgends. Für den Leser ist das ein Widerspruch.

**W3 — Code-Kommentar widerspricht dem Register.**
Zeile 4449: „Die MRV bleiben bewusst unter Israetels Werten **(22/25 statt 20/22)**" — die Werte stehen vertauscht. Das Register (Zeile 9449) sagt es richtig herum: „20 statt 22 bei der Brust, 22 statt 25 beim Rücken".

**W4 — `VOL_BANDS` hat 8 Gruppen, die Fokus-Auswahl 12.**
Das Onboarding lässt u. a. Gesäß, Quadrizeps, Beinbeuger, Waden, seitliche und hintere Schulter einzeln wählen; der Korridor kennt nur `Beine` (12–30) und `Schultern` (8–20). Die Oberfläche verspricht mehr Auflösung, als die Engine hat. (Steht bei dir als P2, gehört aber hier dokumentiert.)

**W5 — `MEV/MRV` ist nur an *einer* Stelle als Praxismodell gekennzeichnet.**
Zeile 9483 kennzeichnet die Deload-Woche korrekt („Praxismodell, nicht begutachtet"). Zeile 9449 — derselbe Urheber, dieselbe Modellfamilie, der eigentliche Volumen-Korridor — tut es nicht.

---

## Umstrittene Quellen — Vorschlag zur Einstufung

Ich habe diese **noch nicht** gegen neuere Evidenz geprüft; das ist der nächste
Schritt und braucht Netzzugriff auf PubMed. Meine Einschätzung vorab, damit du
die Richtung freigeben kannst:

| Quelle | Verwendung | Vorschlag |
|---|---|---|
| Gabbett 2016 (ACWR) | „Sprünge > 30 %/Woche erhöhen das Risiko" | **Herabstufen auf `praxisregel`.** Die ACWR-Methodik steht seit ~2020 unter methodischer Kritik. Formulierung entschärfen oder Aussage streichen. |
| Nielsen 2014 (10-%-Regel) | Deckel ≤ 10 %/Woche | **Herabstufen.** Die Arbeit stützt die 10-%-Regel nicht in der Allgemeinheit, in der die App sie benutzt. |
| Holt 1995 (Sättigungsindex) | Sättigungs-Heuristik | **Als Einzelstudie kennzeichnen** oder durch eine neuere Übersicht ersetzen. |

---

## Offene Punkte — die brauche ich von dir

1. **DOI-Beschaffung:** Soll ich die 53 Zitate gegen PubMed auflösen (Netz nötig, `zitate-pruefen.mjs` kann das bereits) und dir die nicht auflösbaren als Liste zurückgeben? Das sind realistisch 2–3 Stunden Laufzeit und ein paar Rückfragen.
2. **Die 42 `unbelegt`-Einträge:** Drei Wege — (a) Quelle suchen, (b) ehrlich als „Annahme der App" deklarieren und in der Herleitung so zeigen, (c) Wert ändern. Ich schlage für die meisten **(b)** vor: ehrlich ist belastbarer als eine nachgeschobene Quelle. Dein Urteil?
3. **W1:** Landing-Demo aus `VOL_BANDS` speisen — einverstanden? (Rücken-MEV sinkt dann in der Demo von 12 auf 10.)
4. **W2:** Soll die App den Unterschied Sättigung ↔ MRV erklären, oder soll ich die Brust-MRV anheben? Ich rate zu **erklären** — die 20 sind durch die Erholungsgrenze begründet, nicht durch die Dosis-Wirkung.
5. **W5:** `MEV/MRV` überall als Praxismodell kennzeichnen heißt: auf der Startseite und in der Landing-Demo steht künftig „Praxismodell, nicht begutachtet" am Korridor. Das schwächt den Verkaufstext. Trotzdem machen?
6. **`KONF_STD = 0,82`:** Ich würde die Konfidenz bei KI-Einträgen **ganz entfernen**, statt sie zu klemmen — eine Zahl, die kein Modell liefert, ist keine Konfidenz. Einverstanden? (Gehört formal zu P0-C, ändert aber das PARAMS-Schema.)
7. **Build-Test-Schärfe:** „Jede numerische Konstante braucht einen PARAMS-Schlüssel" trifft bei wörtlicher Umsetzung auch Array-Indizes und `*10)/10`. Ich schlage eine Positivliste vor: der Test prüft die **Rechenkern-Bereiche** und erlaubt eine kurze, kommentierte Ausnahmeliste. Sonst steht der Build dauerhaft rot.

---

## KPI für P0-A

| Kennzahl | Heute | Ziel |
|---|---|---|
| Engine-Zahlen mit PARAMS-Schlüssel | 0 % | 100 % (Build-Test) |
| Zitate mit DOI | **0 / 53** | ≥ 90 % |
| Zahlen mit Typ und Evidenzgrad | 0 % | 100 % |
| Als `unbelegt` offen deklariert | 0 | 42 (ehrlich sichtbar) |
| Widersprüche Demo ↔ Engine | 1 (W1) | 0, testgesichert |

Gemessen wird 1–4 durch den Build-Test, 5 durch eine Zusicherung, die
Demo-Werte gegen `VOL_BANDS` vergleicht.
