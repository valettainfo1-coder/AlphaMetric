# METRICGYM · Fitnessbiologisches Audit — 10 Personas, 10 neue Pläne

**Datum:** 02.07.2026 · **Methode:** Headless-Browser (echte Engine, keine Simulation). Jeder Plan wurde frisch generiert und gegen 13 Prüfkriterien getestet.

## Prüfkriterien (je Plan)

1. **Wochenvolumen** je Muskel in der Woche-3-Spitze innerhalb MEV–MRV (Israetel 2017), defizit-skaliert, erfahrungsskaliert (Beginner 0,65×, Novice 0,85×). Arme inkl. **indirektem Volumen** (Israetel-Halbsatz-Konvention: Drücken = 0,5× Trizeps, Ziehen = 0,5× Bizeps)
2. **Rep-Ranges** der Hauptübung passend zum Ziel (Kraft 3–5 · Hypertrophie 6–10 · Defizit 8–12 · Ausdauer 12–15)
3. **Pausenlängen** (Kraft 210 s · Hypertrophie 150 s · Defizit 120 s — Grgic 2017)
4. **RIR** (Defizit/Dekonditioniert 2–3, sonst 1–2 — Helms 2014)
5. **Reihenfolge**: Grundübung an Position 1 (frisch = maximale Last)
6. **Equipment-Validität** (keine Übung, die der Nutzer nicht machen kann; Bank-Pflicht geprüft)
7. **Gym-Regel**: keine Calisthenics-Ersatzübungen im ausgestatteten Studio
8. **Skill-Gate**: keine Progressionen über dem Erfahrungslevel
9. **Verletzungs-Regel**: keine als riskant markierte Übung an Position 1
10. **DUP-Variation**: wiederholte Tage haben unterschiedliche Übungen (A schwer / B Volumen — Zourdos 2016)
11. **Zeitbudget**: geschätzte Dauer ≤ Budget + 15 min
12. **Deload** Woche 4 (−40 % Sätze) und **Progression** Woche 3 (+1 Satz Grundübungen)
13. **Cardio-Logik**: Ausdauer → polarisiert rotierende Protokolle (Zone 2 / 4×4 / Schwelle / HIIT); BMI ≥ 30 → 2 Cardio-Tage; Mobility-Ziel → Mobility-Block

## Ergebnis-Matrix

| # | Persona | Plan | Ergebnis |
|---|---------|------|----------|
| P1 | Lisa 24 · Anfängerin · Abnehmen · BMI 31 · Gym 3T/45min | 3× Ganzkörper + 2 Cardio | ✅ RIR 2–3, 8–12 Wdh, 120 s, 2 Cardio-Tage, gelenkschonende Auswahl, 45–50 min |
| P2 | Markus 32 · Intermediate · Muskelaufbau · PPL 5T/75min | Push/Pull/Legs + Push B/Pull B | ✅ Brust/Rücken/Schultern/Bizeps an MRV, 11 Intensitäts-Techniken · ⚠ Beine 1×/Woche (PPL-Trade-off, s. u.) |
| P3 | Ahmed 41 · Advanced · Muskel+Kraft · PPL 6T/90min | 2× kompletter PPL-Durchlauf | ✅ Beine 30/30, Rücken 22/22 = Maximum ausgereizt, alle ≤ MRV |
| P4 | Sophie 28 · Novice · Recomp · Homegym 4T/60min | UL + UL-B + Cardio | ✅ hartes Training (RIR 1–2) trotz leichtem Defizit — korrekt für Recomp (Helms) |
| P5 | Jonas 19 · Advanced · Calisthenics PPL 5T/60min | Push/Pull/Legs A+B | ✅ Archer, HSPU-Progression, Nordic Curls im Plan · ⚠ Beine 1×/Woche (PPL-Trade-off) |
| P6 | Petra 55 · Novice · Fitness+Mobility · langsam · 3T/45min | 3× Ganzkörper + Cardio | ✅ Mobility-Block (5 Drills), kompakter Core-Block, kein Muskel mehr bei null Direktvolumen |
| P7 | Tim 36 · Intermediate · Maximalkraft · nur Freihanteln 4T/75min | UL + UL-B + Cardio | ✅ 3–5 Wdh @ 210 s Pause, Langhantel-Fokus, Beine am MRV |
| P8 | Nina 30 · Intermediate · Ausdauer+Muskel · 4T/60min | UL ×2 + **2 Cardio** | ✅ polarisiertes Cardio (Zone 2 + 4×4 + Schwelle), Kraft im Hypertrophie-Korridor |
| P9 | Kai 45 · Intermediate · **Knie+Rücken verletzt** · 4T/60min | UL + UL-B + Cardio | ✅ 0 riskante Übungen an Position 1; riskante Muster durch sichere ersetzt (Goblet, brustgestütztes Rudern) |
| P10 | Deniz 27 · Novice · Fettabbau · Minimal-Setup · **nur 30min** | UL ×2 + Cardio | ✅ RIR 2–3, −20 % kcal, Sessions 35–45 min, Arme bewusst über Verbundübungen (s. u.) |

**Endstand: 10/10 Pläne biochemisch valide.** 0 Verstöße gegen MRV, Equipment, Skill-Gate, Reihenfolge, DUP, Deload. 2 dokumentierte Trade-offs (unten).

## Was das Audit gefunden und die Engine dazugelernt hat

Das Audit war kein Schaulaufen — es hat **4 echte Schwächen** aufgedeckt, die alle sofort behoben wurden:

1. **RIR-Lücke im Defizit (P10):** Fettabbau-Pläne ohne hohen BMI bekamen RIR 1–2 statt der vorgesehenen 2–3. Im Kaloriendefizit ist die Erholung real eingeschränkt (Helms 2014) — Training bis nahe ans Versagen erhöht dort v. a. die Ermüdung. **Fix:** RIR-Override greift jetzt bei Defizit und Ausdauer, nicht nur bei Dekonditionierung.
2. **Zeitbudget-Sprengung (P10):** Die MEV-Garantie durfte eine 30-min-Session auf 50 min aufblasen (fixe +12-min-Toleranz = 40 % bei kleinen Budgets). **Fix:** Toleranz jetzt proportional (20 % des Budgets, max. 12 min) und die Kosten der neuen Übung (~5 min) werden VOR dem Einfügen geprüft.
3. **Muskel mit null Direktvolumen (P6):** Bei 45-min-Ganzkörperplänen fiel der Trizeps komplett raus, weil die Zeitgrenze die Injektion blockierte. **Fix:** Zeit-neutrale Umverteilung — die Gruppe mit dem größten MEV-Überschuss (meist Beine) gibt einen Satz ab, die Lücke bekommt ihre Übung. Volumen wandert vom Überfluss zum Defizit statt die Session zu strecken.
4. **Riskante Übung an Position 1 (P9):** Bei Verletzungsangabe konnte Variante B mit einer riskanten Übung starten. **Fix:** Der Tag beginnt jetzt IMMER mit der ersten sicheren Grundübung.

Zusätzlich verkleinert: Core-Block bei Sessions ≤ 45 min (1 Übung × 2 Sätze statt 2 × 3 — Core-MEV bleibt gedeckt, ~6 min gehen in die Hauptmuskeln).

## Dokumentierte Trade-offs (bewusste Entscheidungen, keine Bugs)

**1. PPL bei 5 Tagen = Beine 1×/Woche (P2, P5).** Wer explizit „Push/Pull/Beine" bei 5 Tagen wählt, bekommt im Wochentags-Modus Push–Pull–Legs–Push B–Pull B. Das ist die korrekte Umsetzung des gewählten Splits — aber 2× Frequenz wäre für die Beine besser (Schoenfeld 2016). Die App bietet beide Auswege bereits an: **„Für mich optimieren"** wählt automatisch PPL+UL-Hybrid (jede Gruppe 2×), und der Modus **„Fortlaufende Rotation"** rotiert PPL kontinuierlich (Beine ≈ 1,7×/Woche). Empfehlung im Plan-Screen sichtbar.

**2. Arme im Extremfall nur indirekt (P10: 30 min, Defizit).** Bei 4 × 30 min im Kaloriendefizit priorisiert die Engine Verbundübungen. Trizeps bekommt 4 direkte + ~9 indirekte Sätze über das Drückvolumen — für **Muskelerhalt** im Defizit ausreichend (Erhalt braucht ~⅓ des Wachstums-MEV, Israetel MV). Bei Aufbau-Zielen greift dagegen die Null-Volumen-Rettung und jeder Muskel bekommt direkte Arbeit.

## Methodische Grenzen (Ehrlichkeit)

- Die Dauer-Schätzung ist ein Modell (Satzzeit + Pausen + Auf-/Abwärmen), keine Stoppuhr.
- MEV/MRV-Bänder sind Populations-Richtwerte (Israetel); individuelle Abweichungen fängt die App über Check-ins, Soreness-Modus und Erholungs-Autoregulation zur Laufzeit ab.
- „Woche-3-Spitze" ist die Referenz für die Volumen-Garantie; Woche 1–2 liegen bewusst darunter (progressiver Aufbau), Woche 4 deloadet (−40 %).

## Regressions-Status nach allen Fixes

- 120 Konfigurationen / 1440 Sessions / 8656 Übungen → **0 Probleme**
- gym_full & gym_basic: **0 Calisthenics** (5 Splits × 4 Tageszahlen)
- 5 Bodyweight-Personas ✓ · Plan-Editor ✓ · Anfänger ≥ MEV-Ziel ✓ · 0 Syntaxfehler · 0 Page-Errors
