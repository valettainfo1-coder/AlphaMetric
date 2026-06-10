# METRICGYM V4 — Zielarchitektur (Performance Intelligence Platform)

> Dieses Dokument ist der Bauplan für die Venture-Scale-Version. Die ausgelieferte
> Single-File-App (`index.html`) implementiert das komplette Produkt- und UX-Modell
> davon clientseitig; dieses Dokument beschreibt, wie dieselben Verträge auf die
> Cloud-Architektur skalieren.

## 1. Produkt-Positionierung

**Nicht** ein weiterer Tracker (MyFitnessPal/Hevy/Strong lösen Tracking).
METRICGYM löst **Verstehen**: *"Understand why your progress is happening."*

Eingaben (Training, Ernährung, Recovery, Gewicht, Schlaf, Status, Stress)
→ Verarbeitungsschicht (Physiologie-/Adaptations-/Progressions-Modelle)
→ **erklärende Insights mit Konfidenz** ("Bank stagniert, wahrscheinlichste
Ursache: niedrige Erholungswerte — Konfidenz 70 %").

**Eisernes Gesetz:** Niemals erfundene Metriken. Ohne ausreichende Datenbasis
zeigt jedes Analytics-Modul "Noch nicht genug Daten" + Sammel-Fortschritt
(z. B. Training 3/7 Tage). Statistische Schwellen pro Modul (implementiert):
Trajectory ≥ 3 Sessions/Übung · Volumen ≥ 3 Sessions · RPE ≥ 10 Sätze ·
Körper ≥ 3 Wiegungen · Recovery ≥ 5 Status-Checks · Ernährung ≥ 3 Tage.

## 2. UX-Architektur (70 % visuell / 20 % interaktiv / 10 % Text)

- **Top App Bar** (sticky, Glassmorphism): Logo links · Seitentitel zentriert ·
  Glocke (Insights) + Avatar (→ Profil) rechts.
- **Bottom Nav, 5 Tabs:** Home · Training · **Analytics (zentriert, erhöht,
  visuell betont — das ist der USP)** · Ernährung · Profil.
- **Kein Coach-Tab.** Globaler **Floating Coach Button** unten rechts auf jedem
  Screen; Kontext folgt dem aktiven Tab (Training-Fragen im Training,
  Protein-Restbedarf in Ernährung, Trend-Erklärung in Analytics) und antwortet
  aus echten Nutzerdaten.
- "Readiness" ist aus dem UI verbannt → **"Dein Status heute"**: 4 Karten
  (Schlaf · Energie · Stress · Muskelkater), je ein Tap; der Score wird intern
  abgeleitet.

### User-Flows
1. Landing → Konto erstellen → 10-Fragen-Assessment → Profil-Reveal → Wochenplan festlegen → Home
2. Landing → Anmelden → Home
3. Landing → **Developer-Modus** → sofort Demo-Konto + 10 Wochen Demo-Historie (einziger Ort, an dem synthetische Daten existieren — klar als "Dev" gebadged)
4. Home → Status-Check (4 Taps) → Session starten → Player → Summary
5. Jeder Screen → Floating Coach → kontextuelle Antwort

## 3. Training: User owns schedule

- Kein Auto-Schedule. Der Nutzer weist Mo–So selbst zu:
  Push / Pull / Legs / Upper / Lower / Cardio / Rest (Tap-Assign per Chips;
  Drag-and-drop in der React-Version via dnd-kit).
- Die KI **schlägt nur vor** ("KI-Vorschlag übernehmen") und überschreibt nie.
- **Voice-first Logging:** "Bankdrücken 100 kg 3x8" → Speech Recognition →
  Exercise-Parsing (Fuzzy-Match) → Validierung → Preview mit **Konfidenz-Score**
  → Nutzer bestätigt → Persistenz → Analytics.

## 4. Ernährung: Voice-first, Multi-Item

"500 g Hähnchen und 300 g Reis, 2 Tomaten" → Segmentierung (und/,/+) →
Food-Matching gegen Datenbank → Gramm-/Stück-Erkennung → Nährwert-Interpolation
→ Preview je Item mit Konfidenz → Approval → Tageslog. Unbekannte Lebensmittel:
manuelle Schätzmaske statt stillem Verwerfen.

## 5. AI-Personalisierungs-Engine (implementiert als Regel-Engine, API-ready)

| Engine | Beispiel-Output | Konfidenz |
|---|---|---|
| Behavior | "Adhärenz-Risiko: nur 57 % der geplanten Sessions" | aus Stichprobengröße |
| Adaptation | "Volumen +18 % über 5 Wochen" | n-abhängig |
| Recommendation | "+2,5 kg sobald alle Sätze RPE ≤ 8" | deterministisch |
| Prediction | "Prognose Kniebeuge: 140 kg in 12 Wochen" | 40 % + 4 %/Datenpunkt, Cap 85 % |
| Risk | "Übertraining: Ø RPE 8,7 über 14 Tage" | 75 % |

Jede Aussage trägt sichtbar ihre Konfidenz; unterhalb der Schwelle wird nichts angezeigt.

## 6. Backend-Zielarchitektur (Microservices)

```
Client (Next.js 15 PWA · TS · Tailwind · shadcn · Framer Motion · React Query · Zustand)
   │ GraphQL (Reads/Aggregation) · REST (Commands) · WebSocket (Live-Session)
   ▼
API-Gateway (NestJS, JWT-Validation, Rate-Limit)
   ├─ User Service          (Auth: JWT + Refresh, RBAC, OAuth Google/Apple)
   ├─ Training Service      (Sessions, Sets, Schedule — CQRS: Write-Model + Events)
   ├─ Nutrition Service     (Logs, Food-DB, Parser)
   ├─ AI Service            (Insight-/Risk-/Prediction-Engines; LLM-Anbindung)
   ├─ Analytics Service     (Aggregationen, TimescaleDB Continuous Aggregates)
   └─ Notification Service  (Push/E-Mail, Event-Consumer)
Event-Bus (z. B. NATS/Kafka): set.logged · meal.logged · status.checked → Projektionen
Daten: PostgreSQL + Prisma (OLTP) · TimescaleDB (Zeitreihen: Sets, Gewicht, Status)
       · Redis/Elasticache (Sessions, Hot-Aggregates, Rate-Limits)
Cloud: AWS — EKS (K8s) · RDS · S3 + CloudFront · Secrets Manager
```

### Datenbank-Kernschema (Prisma-Auszug)
```prisma
model User        { id String @id @default(uuid()) email String @unique pwHash String role Role profile Profile? }
model Profile     { userId String @id sex Sex age Int heightCm Int weightKg Decimal bodyFatPct Decimal? goals Goal[] schedule Json }
model WorkoutSet  { id String @id userId String exercise String weightKg Decimal reps Int rpe Decimal? loggedAt DateTime @db.Timestamptz
                    @@index([userId, loggedAt(sort: Desc)]) }   // Timescale-Hypertable
model MealLog     { id String @id userId String name String grams Int kcal Int proteinG Decimal carbsG Decimal fatG Decimal eatenAt DateTime }
model StatusCheck { id String @id userId String date DateTime sleep Int energy Int stress Int soreness Int score Int @@unique([userId, date]) }
model Insight     { id String @id userId String kind InsightKind text String confidence Int createdAt DateTime }
```

### Security-Modell
- Passwörter: argon2id (Client-Demo nutzt SHA-256 — nur lokal akzeptabel)
- JWT 15 min + Refresh-Rotation (httpOnly), RBAC (user/coach/admin)
- 5-Versuche-Lockout (implementiert), Audit-Log auf Auth-Events
- Gesundheitsdaten = Art.-9-DSGVO: EU-Region, Verschlüsselung at rest, Export/Löschung (implementiert)

### Skalierung
- Services unabhängig horizontal (HPA), Reads über Redis-Aggregate
- Zeitreihen-Abfragen über Timescale Continuous Aggregates (Wochenvolumen etc.)
- Offline-first Client: lokale Queue, idempotente Upserts (UUID-PKs), Last-Write-Wins

## 7. Engineering-Standards
SOLID · Clean Architecture (Domain im Kern, Adapter außen) · DDD-Bounded-Contexts
= Service-Schnitte oben · CQRS im Training-Service · Event-driven Projektionen ·
Repository-Pattern · Feature-Folder · 100 % TypeScript strict · Tests: Unit
(Engines), Integration (Service-APIs), E2E (Playwright — 27 Checks laufen bereits
gegen die ausgelieferte App).
