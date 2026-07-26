# Ausdauer-Modul (Cycling & Running) — Architektur & Roadmap

Ziel: ein Ausdauer-Ökosystem auf **intervals.icu-/TrainingPeaks-Niveau**, sport-
agnostisch aufgebaut (Radfahren + Laufen ab Tag 1, erweiterbar auf Swim/Tri/Row).

## Leitentscheidungen (bewusst, senior)
1. **Lokal-first wie der Rest der App.** Roh-Zeitreihen (Sekundenwerte, groß)
   liegen in **IndexedDB** (`mg-endurance`); nur kleine Aktivitäts-Summaries in
   `S.endur`. → State bleibt klein & syncbar, App funktioniert **offline und ohne
   Backend-Deploy**.
2. **Sport-agnostisch:** jede Aktivität hat `sport`. Run/Swim/Tri erben dieselbe
   Engine, nur die Primär-Metrik wechselt (Power ↔ Pace).
3. **Datei-Import statt Live-API** als Universalweg (wie intervals.icu): **GPX**
   heute, TCX/FIT als Nächstes. Deckt Garmin/Wahoo/Strava/Komoot-Exporte ab —
   ohne Partner-Verträge, ohne Client-Secrets im Browser.
4. **Reine, getestete Engine.** 18 CI-Referenztests (`tests/endurance-tests.mjs`).

## Warum bestimmte Dinge (noch) NICHT im PWA gehen
- **Live-Sensoren (BLE/ANT+), ERG-Trainer-Steuerung (FTMS), Hintergrund-GPS als
  Head-Unit, natives HealthKit/Google-Fit** — technisch unmöglich in einer PWA.
  → Phase 4 (Capacitor/Native), **nach dem Go-Live**.
- **Garmin/Strava/TrainingPeaks/Zwift-Live-Sync** — Partner-Approvals + OAuth-
  Secrets (gehören serverseitig in Edge Functions, nie in den Client). Phase 4.
- **Echte Karten-Tiles** — externer Host vs. self-only-CSP. Aktuell: Route als
  **Offline-Polyline** auf Canvas aus lat/lng (kein externer Host).

## Status
### ✅ Phase 1 (Slice 1) — GELIEFERT
- **Berechnungs-Engine:** NP, IF, TSS, VI, EF, aerobe Entkopplung (Pw:Hr),
  Mean-Maximal-Power/Power-Curve, Critical Power & W′ (2-Parameter-Modell),
  FTP-Schätzung (mehrere Methoden + Konfidenz), **PMC** (CTL/ATL/TSB,
  Impulsantwort), Power-Zonen (Coggan), HF-Zonen (Friel), Pace-Zonen, rTSS.
- **Import GPX · TCX · FIT** — GPX/TCX (XML) + ein eigener **FIT-Binär-Decoder**
  (Definition-/Daten-Messages, LE/BE, Developer-Felder, Invalid-Sentinels,
  Compressed-Timestamp, Semicircle-GPS, FIT-Epoche). Deckt Strava/Garmin/Wahoo/
  Komoot/Zwift-Exporte ab → 1-Hz-Streams → Summary.
- **UI:** Ausdauer-Modus (über Menü) mit **Dashboard** (Form/Fitness/Ermüdung aus
  PMC, Wochen-Volumen, FTP W/kg, letzte Aktivitäten), **Aktivitäts-Detail**
  (Offline-Route, Metrik-Kacheln, Zeit-in-Zonen, Verlaufskurve, ehrliche
  Auswertung), **Athlet-Profil** (FTP/Schwellen/HF pro Sport).
- Lokal-first (IndexedDB), additiv, bricht keinen Gym-Flow (App+DSGVO-Suite grün).

### ✅ Integration / „Zahnräder" (Gym ↔ Ausdauer) — GELIEFERT
Damit es *ein* Produkt ist statt zweier Systeme:
- **Eine Trainingslast:** Kraft-Sessions → TSS-äquivalente Last (Foster-sRPE:
  RPE × geschätzte Dauer × 0,12, dokumentierte Heuristik) + Ausdauer-TSS →
  **eine gemeinsame PMC** (Fitness/Ermüdung/Form über *alles*). Das Dashboard
  zeigt „gesamt" + die Wochen-Aufteilung Ausdauer/Kraft.
- **Eine Gewichtsquelle:** die Ausdauer liest den Gym-`weightLog` (letzter
  gemessener Wert) → FTP-W/kg kann nie auseinanderlaufen.
- **Energie:** Ausdauer-kcal je Tag stehen für die Kalorienbilanz bereit
  (`burnForDay`/`todayBurn`), im Dashboard sichtbar; die tiefe Einrechnung in
  das Makro-Ziel folgt als vorsichtiger nächster Schritt.

### ▢ Phase 2 — Planung
- ✅ TCX + FIT Import (in Phase 1 vorgezogen — komplett).
- Strukturierter **Workout-Builder + Player** (Ziele: Power/HF/Pace/Zeit; ohne ERG).
- **Adaptive Trainingspläne** (FTP-Aufbau, 100/200 km, Gran Fondo, Rennen, Klettern,
  Zeitfahren, Abnehmen) — Periodisierung passt sich an erledigte Einheiten an.
- **Cycling-Nutrition** (Carbs/h, Hydration, Gel-/Flaschen-Planer, Kalorien).
- **Goals** (100/200 km, FTP-Ziel, Wochenstunden, Monats-Höhenmeter, Streaks).

### ▢ Phase 3 — Intelligenz
- **KI-Ausdauer-Coach** über die vorhandene `ai-proxy`-Edge-Function (kein neues
  KI-System): Ride-Summary + PMC + Power-Curve → Insights („FTP jetzt ~287 W",
  „du fadest nach 2 h", „+20 g Carbs/h"), Schwächen, Zukunfts-Workouts.
- Fortschritts-Analytik (FTP-Trend, Power-Curve über Zeit, Volumen, Konsistenz).

### ▢ Phase 0-Cloud (Betreiber, parallelisierbar)
- Supabase-Tabellen `activities` + Storage-Bucket + **Sync v2** (Feld-Merge statt
  jsonb-LWW) → behebt zugleich das markierte #1-Datenverlust-Risiko.

### ▢ Phase 4 — Native (Capacitor, NACH Go-Live)
- Live-Aufzeichnung, BLE/ANT+-Sensoren, ERG, Hintergrund-GPS, HealthKit/Google-Fit,
  Partner-Live-Sync (Strava/Garmin/intervals.icu via Edge-Function-OAuth), Karten.

### ▢ Phase 5 — Social & Skalierung
- Challenges/Leaderboards/Achievements (echtes Multi-User-Backend).
- Sport-Abstraktion zahlt sich aus: Running (vertieft), Swimming, Triathlon, Rowing.
