# AUFTRAG METRICGYM — Umsetzung Rebrief „Prüfbares Training“

## 0. Arbeitsmodus
- Lovis vermittelt zwischen dir und dem Produktstrategen. Jede deiner Antworten endet
  mit einem STATUSBERICHT im Format aus Abschnitt 9, damit er ihn 1:1 weitergeben kann.
- Speichere diesen Auftrag unverändert als `docs/AUFTRAG.md` und verweise in `CLAUDE.md`
  darauf. Er gilt für alle folgenden Sessions, bis er ersetzt wird.
- Arbeite paketweise. Pro Paket: Kurzplan (max. 10 Zeilen) → Umsetzung → Tests →
  STATUSBERICHT. Nie mehrere Pakete in einem Commit.
- Branches: ein Branch pro Phase (`phase1-fundament`, `phase2-pruefschleife`,
  `phase3-launch`), Commits pro Paket mit Paket-ID im Titel (z. B. „A3: …“).
  Nichts auf fremde Feature-Branches (z. B. `claude/landing-app-redesign-*`).

## 1. Mission und Positionierung
METRICGYM wechselt von Autorität (Zitate) zu Rechenschaft (überprüfte Prognosen).
Kategorie: prüfbares Training. Jeder Trainingsblock (6–8 Wochen) erhält eine versiegelte
Prognose mit Spanne. Am Blockende misst die App das Ergebnis, erstellt einen Prüfbericht,
kalibriert die persönlichen Parameter und veröffentlicht aggregiert, wie oft die
Prognosen eintreffen.
Claim bleibt: „Rate nicht, ob dein Training wirkt. Wisse es.“
Unterzeile: „Jeder Plan ist eine Prognose. Wir zeigen, ob sie eintrifft.“
Zielgruppe: Kraftsportler mit 1–5 Jahren Erfahrung, 3–5 Einheiten pro Woche, Ziel
Muskelaufbau oder Kraft, loggen bereits (Hevy, Strong). Sekundär: Personal Trainer.
Fokus: Kraft und Hypertrophie. Ernährung nur als Stellgröße (Protein, Energie).

## 2. Ist-Zustand v76 (geprüft)
- `index.html` 1,65 MB, ~18.200 Zeilen, Inline-JS und -CSS, 31 Render-Funktionen,
  281 Aktionen. 112 Übungen in EXDB.
- `forecast12w`: lineare Regression, Dämpfung 0,85, Deckel +15 %, Punktwert ohne
  Intervall, nicht gespeichert, nie nachgeprüft.
- Eichung mit Dämpfung (Hubal 2005, Chaves 2025, Varianzverhältnis ≈ 45 %) vorhanden.
- e1RM: Epley mit RIR-Korrektur, Deckel 12 Wiederholungen.
- Maße (5 Felder, kein Messprotokoll), Fotos in IndexedDB, nicht mit Prognosen verknüpft.
- Hevy-/Strong-CSV-Import ohne Auswertung; fehlende RPE wird als 8 angenommen.
- Backend: Tabellen `user_state` (gesamter Zustand als JSON-Blob, letzter Schreibvorgang
  gewinnt), `consent_log`, `referrals`. Keine Auswertung über Nutzer möglich.
- `stripeEnabled:false`; Tiers im Web lokal umschaltbar (`A.upgrade`, `A.startTrial`);
  Impressum leer.
- KI-Ernährung blockiert den Datenbankpfad (Zeile ~16999); Standardkonfidenz 0,82/0,75.
- QUELLEN: 53 Zitate, 0 DOI, 0 Link. 87 Stellgrößen, davon 42 ohne Quelle
  (siehe PARAMS-INVENTUR.md).

## 3. Bereits getroffene Entscheidungen (umsetzen, nicht erneut fragen)
P0-A:
1. Stellgrößen ohne Quelle → `typ:"annahme"`, Pflichtfelder `begruendung` (1 Satz),
   `sensitivitaet` (Änderung der Empfehlung bei ±20 %), `sichtbar`. Keine
   nachträgliche Quellensuche. Zuerst alle mit `sichtbar:true`.
2. Volumen-Korridor aufteilen: Untergrenze und Dosis-Wirkung = `beleg`
   (Pelland et al. Sports Med 2026;56(2):481–505); Obergrenze = `praxisregel`
   (Israetel et al. 2017, „bewusst konservativ, Erholungsdeckel“). Erklärung
   Dosis-Wirkung ≠ erholbares Volumen in den Register-Eintrag (löst W2).
3. Build-Test nur für Entscheidungsfunktionen der Engine; Positivliste 0, 1,
   Rundung (10/100), Array-Indizes; jede Ausnahme kommentiert; alles andere über PARAMS.
4. Gabbett 2016 und Nielsen 2014 herabstufen (Kritik: Lolli et al. BJSM 2019;
   Impellizzeri et al. IJSPP 2020; Buist et al. Am J Sports Med 2008). Holt 1995 als
   Einzelstudie mit niedrigem Evidenzgrad. Jede Angabe per DOI verifizieren; was nicht
   sicher zuordenbar ist → `unvollstaendig`.
5. W1 (Landing liest aus VOL_BANDS) und W3 (Kommentar Zeile 4449) beheben.
Produkt (freigegeben):
6. Streichen: Elite-Tier, 3D-Körper (three.js), Empfehlungsprogramm mit
   Geld-Auszahlung (ersetzen durch Gutschrift von einem Gratis-Block je zahlender
   Empfehlung).
7. Einfrieren hinter Feature-Flag, Standard aus: Ausdauer (TSS/NP/CP/FIT, TABS_ENDUR),
   Mobility. Code bleibt, keine Weiterentwicklung.
8. Tiers: Free / Pro (€9,99/Monat, €69,99/Jahr) / Trainer (€39/Monat, bis 20 Kunden,
   erst Phase 3).
9. Ergebnis-Zusage: bauen, aber hinter `guaranteeEnabled=false`. Entscheidung über
   die Aktivierung steht aus.

## 4. Nicht verhandelbar
- Keine erfundenen Quellen, DOIs, Studienwerte oder Nutzerzahlen. Unbekannt =
  `annahme` oder `unvollstaendig`.
- Prognose, Prüfbericht und Kalibrierung rechnet die Engine deterministisch. Kein LLM
  in einer Zahl, die der Nutzer als Ergebnis sieht. Die KI erklärt nur.
- Local-first bleibt: Logging und Plan funktionieren offline und ohne Konto.
- Gesundheitsdaten nur nach Einwilligung an KI-Anbieter; Forschungs-/Aggregatnutzung nur
  mit separater Einwilligung (`consent_research`).
- Bestehende Nutzerdaten werden migriert, nie verworfen. Produktions-Migrationen und
  jedes Löschen von Nutzerdaten nur nach ausdrücklicher Freigabe im Chat.
- Funktionen außerhalb von Abschnitt 3 nur nach Freigabe entfernen.
- UI-Texte deutsch, sachlich, ohne Heilsversprechen. Keine Aussage über Ergebnisse
  ohne Spanne.

## 5. Zielarchitektur
### 5.1 Datenmodell (Supabase, RLS: Nutzer sieht nur eigene Zeilen)
- `profiles(user_id, training_age, sex, consent_research bool, consent_research_at)`
- `sets(id, user_id, performed_at, exercise_key, weight_kg, reps, rir NULL,
   is_warmup, source enum('app','hevy','strong'), import_hash UNIQUE)`
- `blocks(id, user_id, start_date, end_date, weeks, status, plan_snapshot jsonb)`
- `predictions(id, block_id, user_id, metric, exercise_key NULL, baseline,
   p10, p50, p90, conditions jsonb, model_version, params_version, hash, sealed_at)`
   → Insert NUR über Edge Function `seal-prediction` (setzt `sealed_at` serverseitig,
   `hash` = SHA-256 des kanonischen JSON). Keine UPDATE/DELETE-Policy für Nutzer.
- `measurements(id, user_id, measured_at, kind, value, protocol_ok bool)`
- `outcomes(prediction_id, observed, adherence_sets_pct, protein_days,
   conditions_met bool, verdict enum('below','within','above'), evaluated_at)`
   → geschrieben nur von Edge Function `evaluate-block`.
- Migration: Dual-Write (Tabellen + bisheriger Blob), Backfill aus `user_state`,
  dann Lesepfad umstellen. Offline-Queue mit idempotenten Inserts (`import_hash`).
- Vor dem Coden: Schema als `supabase/migrations/*.sql` + `docs/DATENMODELL.md`
  vorlegen und Freigabe abwarten.

### 5.2 Code-Struktur
- Engine aus `index.html` herauslösen: `src/engine/` (params, volume, e1rm, forecast,
  calibration, evaluate), `src/ui/`, `src/data/`. Build-Schritt (esbuild oder Vite),
  Ausgabe weiterhin als statische PWA. Nur so viel modularisieren, wie die Pakete
  brauchen.
- `PARAMS`-Register als einzige Quelle aller Engine-Zahlen; `QUELLEN` wird daraus
  erzeugt. Jede Prognose speichert `params_version` und `model_version`.
- Unit-Tests für die Engine (Vitest o. ä.), lauffähig ohne Browser.

### 5.3 Prognosemodell (ersetzt `forecast12w`)
Für Leitübung L, Block mit w Wochen:
- Messgröße: e1RM = Median der besten 2–3 Arbeitssätze pro Woche. Baseline = Median der
  2 Wochen vor Blockstart; Ergebnis = Median der letzten 2 Blockwochen.
- Erwartungswert relativer Zuwachs:
  g = g_base(trainingsalter, w) × f_dosis(fraktionierte Wochensätze Zielmuskel) × k_user
  - g_base: Startwerte als PARAMS mit Quelle oder `typ:"annahme"` + Begründung.
  - f_dosis: sättigende Kurve in der Form von Pelland 2026 (abnehmender Ertrag);
    `typ:"modell"`.
  - k_user: nach jedem Block k ← k × (1 + 0,45 × (beobachtet/erwartet − 1))
    (Varianzverhältnis nach Chaves 2025, bereits im Code; als PARAMS führen).
- Spanne: log-normal. σ² = σ_zwischen² / (1 + n × r) + σ_mess²; n = abgeschlossene
  Blöcke. σ_zwischen aus Hubal 2005 als Startwert, σ_mess aus der Streuung wiederholter
  e1RM-Schätzungen des Nutzers. 80-%-Intervall = p50 × exp(±1,2816 σ).
- Fehlende RIR/RPE → Satz zählt, verbreitert aber σ_mess (kein pauschales RPE 8).
- Pflichttest: Simulation mit ≥ 5.000 synthetischen Nutzern aus den Startverteilungen;
  Abdeckung des 80-%-Intervalls muss bei 78–82 % liegen. Test + Ergebnis im Bericht.
- Gewichtsabhängige 1RM-Gleichung (Marzagao 2026, arXiv 2603.17495) als Alternative
  zu Epley prüfen und Ergebnis berichten, nicht ungefragt umstellen.

## 6. Phase 1 — Fundament (bis 08.11.2026, Branch phase1-fundament)
A1 P0-A abschließen: PARAMS, QUELLEN-Ableitung, Build-Test, DOIs, W1–W5.
A2 Herleitung pro Zahl: Tippen auf eine Zahl (Sätze, kcal, Protein, Last, Pause,
   Prognose) öffnet Sheet: Eingabe → Regel → Parameter (Typ, Evidenzgrad) → Quelle
   (DOI-Link) → Ergebnis. Standardansicht max. 2 Zeilen.
A3 Ernährung: Datenbank zuerst (eigene + Open Food Facts), KI nur Fallback, Einträge
   markiert „Schätzung, keine Quelle“, immer Vorschau (auch Sprache), keine künstliche
   Konfidenz, Korrekturrate loggen.
A4 Monetarisierung: lokales Setzen von S.tier außerhalb `S.devMode` entfernen; Tier nur
   über `my_tier`; Trial serverseitig ans Konto binden; Stripe Checkout + Portal
   aktivieren (fehlende Setup-Schritte als Liste an Lovis); Elite und Geld-Auszahlung
   entfernen (Abschnitt 3).
A5 Datenmodell nach 5.1 (erst Schema zur Freigabe, dann Dual-Write, Backfill).
A6 Trainings-Audit als Route `/audit`, ohne Konto, Verarbeitung lokal im Browser:
   - Eingabe Hevy-/Strong-CSV (bestehender Parser; unbekannte Übungen: alle zuordenbar,
     nicht nur 8).
   - Ausgabe: fraktionierte Wochensätze je Muskel (letzte 12 Wochen) gegen Korridor;
     e1RM-Trend je Hauptübung (%/Monat); Stagnation (kein neues e1RM-Hoch ≥ 6 Wochen);
     Zusammenhang Volumen ↔ Fortschritt; genau 3 Befunde, sortiert nach erwarteter
     Wirkung, jeder mit Herleitung.
   - Teilbares Ergebnisbild (Canvas, ohne personenbezogene Daten).
   - Warteliste mit E-Mail, Double-Opt-in.
   - Ziel: Auswertung < 60 s bei 2 Jahren Historie.
A7 Telemetrie: Plausible-Events (cookielos) und Sentry (EU, PII-Filter) aktivieren.
   Events: audit_started, audit_completed, waitlist_joined, account_created,
   first_session_logged, session_logged, set_logged (mit Dauer), derivation_opened,
   ai_food_corrected, paywall_viewed, trial_started, subscribed, cancelled,
   block_started, prediction_sealed, report_opened.
A8 Umfang: Feature-Flags für Ausdauer und Mobility (aus), three.js entfernen;
   Bundle-Größe vorher/nachher berichten.
Gate 1 (Lovis/Strategie entscheidet): ≥ 300 Audits, ≥ 25 % Audit → Warteliste.

## 7. Phase 2 — Prüfschleife v1 (09.11.–06.12.2026, Branch phase2-pruefschleife)
B1 Prognosemodell nach 5.3 inkl. Simulationstest.
B2 Block-Start: 3–4 Leitübungen wählen, Prognose + Bedingungen anzeigen
   (≥ 80 % geplante Sätze, Protein an ≥ 5/7 Tagen, keine Pause > 7 Tage),
   Versiegelung über `seal-prediction`, Bestätigung mit Zeitstempel und Hash.
B3 Messprotokoll: Umfänge alle 2 Wochen mit Anleitung (morgens, nüchtern, gleiche
   Stelle, 2 Messungen → Mittel), Erinnerung; Fotos mit Standardpose.
B4 Prüfbericht über `evaluate-block`: je Kennzahl Prognose, Ergebnis, Verdict;
   Ursachen (Adhärenz, Energiebilanz, Readiness, Volumen je Muskel); ein Satz zur
   Änderung des nächsten Blocks.
B5 Kalibrierung: k_user und σ nach Blockende aktualisieren, Verlauf sichtbar.
B6 Logging-Tempo: letzte Werte vorausgefüllt, 1 Tipp bestätigen, RIR per Geste,
   Pausentimer automatisch. Ziel Median ≤ 3 s pro Satz; Messung berichten.
B7 Pilot-Kohorte: Flag `pilot=true` für 50–100 Nutzer, Blockstart 09.11.2026.
Gate 2: W4-Retention ≥ 40 %, ≥ 60 % adhärent.

## 8. Phase 3 — Launch (07.12.2026–10.01.2027, Branch phase3-launch)
C1 iOS über Capacitor + cdv-purchase (StoreKit 2), Belegprüfung serverseitig,
   Tier-Sync; keine lokale Freischaltung (Richtlinie 3.1.1).
C2 Pro live; Ergebnis-Zusage vollständig gebaut, bleibt aus bis zur Freigabe.
C3 Trefferquote: SQL-View/Edge Function über `outcomes` mit `consent_research=true`,
   Veröffentlichung erst ab n ≥ 100 Blöcken, aufgeschlüsselt nach Trainingsalter und
   Übung; öffentliche Seite `/trefferquote`.
C4 Landing neu nach Abschnitt 1: Prüfschleife, Audit-CTA, Trefferquote (oder
   „wird ab 100 Blöcken veröffentlicht“). Alle Aussagen mit Spanne oder Quelle.
C5 Trainer-Lizenz: Kundenübersicht, Prüfberichte unter Trainer-Namen (Umfang erst
   nach Freigabe des Konzepts).
Gate 3: Kalibrierung intern 70–90 %, Trial → bezahlt ≥ 25 %.

## 9. STATUSBERICHT (Ende jeder Antwort, exakt dieses Format)
STATUSBERICHT
- Paket: <ID> — <erledigt | teilweise | blockiert>
- Branch/Commits: <branch>, <hashes>
- Geändert: <Dateien, je 1 Zeile was>
- Tests: <Befehl> → <Ergebnis, Abdeckung, Simulationswert falls B1>
- Messwerte: <Bundle-Größe, Ladezeit, Logging-Tempo o. ä.>
- Abweichungen vom Auftrag: <was, warum> oder „keine“
- Offene Entscheidungen: <nummeriert, je Empfehlung + Alternative + Folge>
- Risiken/Funde: <neu entdeckte Probleme>
- Nächster Schritt: <Paket-ID + 1 Satz>

## 10. Start
1. `docs/AUFTRAG.md` anlegen, CLAUDE.md verweisen, Branch `phase1-fundament` anlegen;
   die Inventur vom bisherigen Branch dorthin übernehmen.
2. A1 mit den Entscheidungen aus Abschnitt 3 umsetzen.
3. Parallel nur planen, nicht coden: A5-Schema als Migration + DATENMODELL.md zur Freigabe.
