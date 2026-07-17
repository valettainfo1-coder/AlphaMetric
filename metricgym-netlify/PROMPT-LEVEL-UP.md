# CLAUDE-CODE-PROMPT: METRICGYM auf Weltklasse-Niveau

> Diesen kompletten Text als Auftrag an Claude Code geben. Repo:
> `valettainfo1-coder/AlphaMetric`, App-Ordner: `metricgym-netlify/`,
> Branch: `claude/landing-app-redesign-d4ejyc` (weiterführen).

---

## MISSION

Du arbeitest an METRICGYM (`metricgym-netlify/index.html`, Single-File-PWA,
~10.600 Zeilen, deutsch, Supabase-Backend, Netlify-Deploy). USP: „Beweis statt
Bauchgefühl" — jeder Plan belegt (MEV–MRV-Korridor, Studien-Zitate), jede
Aussage mit Datenbasis. Deine Aufgabe: die App in drei Schwerpunkt-Blöcken
massiv anheben — **A) Ernährung**, **B) Trainings-Tiefe**, **C) Art.-9-DSGVO/
Sicherheit** — plus Block D (kompakt) für den Rest. Arbeite Block für Block,
Arbeitspaket für Arbeitspaket, mit Verifikation nach jedem Paket.

## ARBEITSREGELN (gelten immer)

1. **Verifiziere jede Änderung im echten Browser** (Playwright + Chromium,
   iPhone-13-Viewport, CDP-Screenshots — im Scratchpad liegen Vorlagen:
   `shot3.js`, `appcheck.js`, `bodylab.js`-Muster). Pflicht-Regression nach
   jedem Paket: Landing lädt fehlerfrei → Registrieren (Cloud offline ⇒
   lokaler Fallback) → Login → Demo-Modus → Übung loggen → Ernährung loggen.
   `pageerror`-Listener muss leer bleiben.
2. **Design-System einhalten** (siehe `DESIGN-SYSTEM.md`): Dark-Theme,
   Puderblau `#8FB8DC` = primär/optimal, Gold `#C4B47A` = sekundär, Terrakotta
   `#D08B6E` = Warnung (NIE Rot), Creme-Buttons für Primär-Aktionen, Liquid
   Glass, `esc()` für JEDEN nutzer-/API-stammenden String (XSS).
3. **Copy in der „Beweis"-Stimme**: kurz, konkret, zweite Person, keine
   Floskeln; jede neue Kennzahl nennt ihre Datenbasis.
4. **Kein Bruch der Local-First-Architektur**: alles funktioniert offline,
   Cloud ist Sync-Schicht. Neue Persistenzfelder in `S` + `save()`, Sync via
   `SB.push()`. Service-Worker-`CACHE`-Version bei Asset-Änderungen bumpen.
5. **Keine Secrets in den Client.** Alles Geheime in Supabase Edge Functions
   (Ordner `supabase/functions/` neu anlegen, Deploy-Anleitung in
   `SUPABASE_SETUP.md` ergänzen).
6. **Commits**: ein Commit pro Arbeitspaket, deutsche Message
   (`A3: Barcode-Scanner …`), Push nach jedem Block auf den Branch.
7. **CSP pflegen**: neue Hosts in `_headers` unter `connect-src` ergänzen
   (z. B. `https://*.openfoodfacts.org`), nie `unsafe-eval`.
8. Wo dir Betreiber-Input fehlt (Keys, Impressumsdaten), baue alles fertig,
   markiere die Stelle mit `[BETREIBER]` und liste sie am Ende im Report.

---

## BLOCK A — ERNÄHRUNG: von 159 Lebensmitteln zur vollwertigen Nutrition-Engine

Ist-Zustand im Code: `const FOODS=[...]` (159 Einträge, Format
`[Name, Gramm, kcal, Protein, Carbs, Fett]`), Voice-Multi-Item-Parser
(Segmentierung „und/,/+", Fuzzy-Match inkl. Tippfehler), Tageslog
`S.nutritionLog{}`, Ziele aus `multiTargets()`, unbekannte Lebensmittel →
manuelle Schätzmaske. Kein Barcode, keine eigenen Lebensmittel, keine
Vorlagen, keine externe Datenbank.

### A1 — Open-Food-Facts-Anbindung (Suche + Produkt)
- Neues Modul `OFF` im Script: `OFF.search(query)` →
  `https://de.openfoodfacts.org/cgi/search.pl?search_terms=…&search_simple=1&action=process&json=1&page_size=12&fields=code,product_name_de,product_name,brands,nutriments,serving_size,quantity`
  und `OFF.product(barcode)` →
  `https://world.openfoodfacts.org/api/v2/product/{code}.json?fields=…`.
- Nährwert-Mapping: `nutriments["energy-kcal_100g"]`, `proteins_100g`,
  `carbohydrates_100g`, `fat_100g`; zusätzlich, wenn vorhanden: `fiber_100g`,
  `sugars_100g`, `salt_100g` (fließen in Sättigungs-/Mikro-Checks ein).
- **Caching**: IndexedDB-Store `off-cache` (Key = barcode/query-Hash,
  TTL 30 Tage) — zweiter Lookup identischer Produkte ist offline möglich.
  Höflichkeit: max. 1 Request/Sekunde, `User-Agent`-Header via fetch nicht
  setzbar → egal, aber kein Polling.
- Suchreihenfolge überall (Suche UND Voice-Parser):
  **Favoriten → eigene Lebensmittel → lokale FOODS → OFF (nur online)**.
  Bei OFF-Treffern Quelle anzeigen („Open Food Facts · Marke").
- CSP: `https://*.openfoodfacts.org` in `connect-src`.
- Fehlerpfad: offline/Timeout (6 s) → stiller Fallback auf lokal + Hinweis
  „Online-Datenbank nicht erreichbar — lokale Treffer".
- **Abnahme**: Suche „Skyr Aldi" liefert reale Produkte mit kcal/P/C/F;
  Flugmodus → Suche fällt sichtbar sauber auf lokal zurück; zweiter Abruf
  desselben Produkts funktioniert offline (Cache-Hit).

### A2 — Eigene Lebensmittel + Mahlzeiten-Vorlagen + Favoriten
- Datenmodell: `S.customFoods=[{id,name,per:100,kcal,p,c,f,fiber?,createdAt}]`,
  `S.mealTemplates=[{id,name,items:[{ref,grams}],createdAt}]`,
  `S.foodFavs={foodKey:count}` (Nutzungszähler; foodKey = Name|barcode|customId).
  Alles via `save()` + Cloud-Sync (läuft automatisch über `S`).
- UI Ernährungs-Tab: Suchfeld-Ergebnisliste bekommt drei Sektionen
  (Favoriten ★ / Meine Lebensmittel / Datenbank). Unter dem Tageslog Button
  „Als Mahlzeit speichern" (heutige Auswahl → Template). Templates als
  Chips oben („Frühstück-Stack" → 1 Tap = alle Items geloggt, Mengen
  editierbar im Preview).
- Schätzmaske für Unbekanntes erweitert: Checkbox „Als eigenes Lebensmittel
  speichern" (Default an) → landet in `customFoods`, nächstes Mal Treffer.
- Portionslogik: Stück-Gewichte für lokale Basics erweitern (Ei 60 g,
  Banane 120 g …), OFF `serving_size` parsen („30 g" / „1 Riegel (45 g)")
  → Portions-Chips im Mengen-Dialog (100 g / Portion / eigene).
- **Abnahme**: „häufig geloggt" erscheint zuoberst; Template mit 4 Items in
  ≤ 2 Taps geloggt; eigenes Lebensmittel überlebt Reload + taucht im
  Voice-Parser auf.

### A3 — Barcode-Scanner
- Primär: native `BarcodeDetector` (`formats:['ean_13','ean_8','code_128']`)
  auf `getUserMedia`-Video (Kamera-Permission ist in `_headers` bereits
  `camera=(self)`). Fallback-Reihenfolge: BarcodeDetector → `zxing-wasm`
  **lokal gevendort** (`vendor/zxing/…`, KEIN CDN-Zwang; SW-Precache +
  Cache-Version bumpen) → manuelle EAN-Eingabe.
- UI: Scanner-Button (Barcode-Icon) neben dem Ernährungs-Suchfeld → Vollbild-
  Sheet mit Video, Zielrahmen, Taschenlampen-Toggle wo verfügbar; Treffer →
  OFF-Produkt-Preview (A1) → Menge → loggen; Nicht-Treffer → Schätzmaske mit
  vorbefülltem Barcode (wird am customFood gespeichert).
- iOS-PWA-Realität: `getUserMedia` funktioniert in installierten PWAs ab
  iOS 14.3 — teste den Codepfad defensiv (Feature-Detection, klare
  Fehlermeldung „Kamera nicht verfügbar → EAN eintippen").
- **Abnahme**: Desktop-Test mit Bild eines EAN-Codes vor der Webcam ODER
  simuliertem Detector-Stub im Playwright-Test: Scan → Produktname+kcal in
  < 3 s im Preview; Ablehnung der Kamera-Permission zeigt den manuellen Pfad.

### A4 — Voice-Parser v2
- Match-Pipeline auf die neue Reihenfolge umstellen (A1). Zusätzlich:
  Mengen-Synonyme („eine halbe", „ein viertel", „2 Scheiben", „1 EL"→15 g,
  „1 TL"→5 g, „1 Tasse"→240 ml), Marken-Stripping („Ja! Magerquark" →
  Magerquark), Plural/Kasus-Normalisierung.
- Wenn OFF nötig wäre, aber offline: Item als „unbestätigt" ins Preview mit
  Schätz-Button statt stillem Verwerfen.
- Jeder Preview-Eintrag zeigt Quelle + Konfidenz; „alle bestätigen"-Flow bleibt.
- **Abnahme**: „500 g Hähnchen, 2 Scheiben Vollkornbrot und 1 EL Erdnussbutter"
  → 3 korrekte Items mit plausiblen Gramm; Tippfehler-Test („häncxen") grün.

### A5 — Nutrition-Insights ausbauen (der Beweis-USP in der Ernährung)
- Wochenansicht: Protein-Konstanz (Tage ≥ Ziel), Kalorien-Balance vs.
  Wochenziel (Eat-back-Logik existiert in `multiTargets` — visualisieren),
  Ballaststoff-Schnitt (neu, aus fiber-Daten), „ehrlichster Tag"-Karte.
- Jede Karte nennt Datenbasis („aus 6 geloggten Tagen") und verlinkt die
  Studien-Erklärungen (`EXPLAIN`-Modal-System wiederverwenden).
- **Abnahme**: Mit Demo-Daten erscheinen ≥ 3 Wochen-Insights, jede mit
  Datenbasis-Zeile; ohne Daten ehrliche Empty-States („Noch nicht genug Daten").

---

## BLOCK B — TRAININGS-TIEFE: Parität mit Hevy/Strong + eigener Vorsprung

Ist-Zustand: `EXDB` (112 Übungen: sets/reps/rir/tempo/why/alt),
`EX_ACT` (nur 41 kuratierte Muskel-Maps — Rest über Generator `exActFor()`),
`EX_PATTERN` (Bewegungs-Animationen), Player mit Satz-Logging +
Schnell-Eintrag, `GRIP_VARIANTS` (13 Übungen), MEV–MRV-Korridor
(`VOL_BANDS`, `weeklyMuscleSets`), Mesozyklus-Progression, kein Superset,
keine eigenen Übungen, kein Import, Timer ohne Hintergrund-Benachrichtigung.

### B1 — Muskel-Maps für ALLE 112 Übungen kuratieren
- `EX_ACT` vervollständigen: jede EXDB-Übung bekommt handkuratiert
  `{p:[…], s:[…]}` (IDs: chest, delts, reardelts, traps, lats, lowerback,
  biceps, triceps, forearm, abs, obliques, quads, hams, glutes, adductors,
  calves) + in `EXDB[n].why` einen Beleg-Halbsatz mit Zitat, wo er fehlt.
  Arbeite anatomisch korrekt (z. B. Face Pull: p reardelts, s traps;
  Bulgarian Split Squat: p quads/glutes, s hams/adductors).
- Danach: `exActFor()`-Generator NUR noch für Custom-Übungen (B3); baue eine
  Dev-Konsolen-Prüfung `MGDEV.checkCoverage()` die fehlende Maps listet (0).
- **Abnahme**: Konsole meldet 112/112 kuratiert; Landing-Demo + Übungs-Detail
  zeigen für 10 Stichproben anatomisch korrekte Highlights.

### B2 — Supersets & Zirkel
- Datenmodell: In `TYPES[key].main` können Einträge Gruppen sein:
  `{superset:[{n,sets,reps,…},{n,…}], rest:90}` — Plan-Generator erzeugt
  sinnvolle Antagonisten-Paare NUR bei Zeitknappheit-Präferenz (Assessment
  `len` kurz) oder wenn Nutzer sie im Plan-Editor selbst koppelt
  („Verketten"-Button auf zwei benachbarten Übungen).
- Player: Superset-Ansicht A1/B1 → A2/B2 (alternierend), EINE Pause pro
  Runde, Fortschritts-Ring zählt Runden; Korridor (`weeklyMuscleSets`)
  zählt jede Teilübung normal.
- Plan-Editor: Koppeln/Entkoppeln, Badge „Superset spart ~X Min"
  (Zeit-Schätzung `est` anpassen).
- **Abnahme**: Editor koppelt Bankdrücken+Rudern → Player führt alternierend,
  Logs landen bei beiden Übungen, Wochensätze stimmen; Entkoppeln geht.

### B3 — Eigene Übungen (mit Beweis-Anschluss)
- „Übung erstellen" im Plan-Editor + Übungs-Suche: Name, Equipment,
  Bewegungsmuster (Dropdown aus `EX_PATTERN`-Mustern → Animation), Muskeln:
  Body-Map-Tap-UI (2D-Front/Rück, Region antippen = primär, zweiter Tap =
  sekundär, dritter = aus — nutzt `muscleBody` mit Klick-Handlern).
- Persistenz `S.customExercises[{id,name,pattern,p,s,equipment}]` (Sync
  automatisch); überall integriert: Plan-Editor-Tauschliste, Player,
  liftLog/e1RM, Korridor, Heatmap, Voice-Logging (Fuzzy-Match inkl. Custom).
- **Abnahme**: „Landmine Press" anlegen (delts p, chest/triceps s) → in Plan
  aufnehmen → loggen → erscheint in Heatmap + Wochen-Korridor korrekt.

### B4 — Player-Upgrade („der beste Satz-Moment am Markt")
- **Verlauf inline**: über den Log-Zellen kompakte Karte „Letzte 3 Sessions"
  dieser Übung (Datum · Topsatz · e1RM-Trend-Sparkline; Daten aus
  `liftHistory(name)`).
- **Warm-up-Rechner**: beim ersten Satz einer Übung mit Zielgewicht ≥ 40 kg
  Chip „Aufwärmen: 40 %×10 · 60 %×5 · 80 %×3" (gerundet auf 2,5 kg,
  antippbar → zeigt Scheiben-Beladung).
- **Scheiben-Rechner**: Button an jedem Gewichts-Feld → Sheet „pro Seite:
  20+10+2,5" (Stangen-Gewicht einstellbar 20/15/10 kg, in `S.settings`).
- **Hintergrund-fähiger Pausen-Timer**: `localStorage`-Timestamp +
  `visibilitychange`-Resync (Timer stimmt nach App-Wechsel), Web-Audio-Beep
  + `navigator.vibrate` am Ende; wenn Notification-Permission erteilt
  (Block D5), zusätzlich System-Notification „Pause vorbei — Satz 3".
- **Abnahme**: App in Hintergrund → zurück: Timer korrekt weitergelaufen;
  Warm-up-Chips rechnen korrekt; Verlauf zeigt echte letzte Sessions.

### B5 — Hevy/Strong-CSV-Import (Wechsler-Pipeline)
- Onboarding-Schritt + Profil-Eintrag „Aus anderer App importieren":
  File-Input `.csv`, Parser für **Hevy** (`title,start_time,…,exercise_title,
  set_index,weight_kg,reps,rpe`) und **Strong** (`Date,Workout Name,Exercise
  Name,Set Order,Weight,Reps,…`) — Format-Autodetektion an Headerzeile.
- Übungs-Mapping EN→DE: Tabelle `IMPORT_MAP` (Bench Press→Bankdrücken,
  Lat Pulldown→Latzug, … ~60 gängigste); Unbekannte → Dialog „zuordnen oder
  als eigene Übung anlegen (B3)".
- Import-Wizard: Datei → Vorschau (X Workouts, Y Sätze, Zeitraum) →
  Duplikat-Schutz (Hash aus Datum+Übung+Satz) → Schreiben nach `S.liftLog`
  + `S.trainingHistory` in Chunks (requestIdleCallback, Fortschrittsbalken)
  → danach e1RM/Analytics sofort gefüllt („Deine Kraftkurven aus 2 Jahren
  Historie — ab heute mit Beweis").
- **Abnahme**: synthetische Hevy-CSV mit 1.000 Zeilen importiert < 5 s,
  Kraft-Trajektorie zeigt Historie, zweiter Import derselben Datei = 0 neue.

### B6 — Übungs-Detail v2
- Für jede Übung: Ausführungs-Animation (`EX_PATTERN` vorhanden) plus
  „Häufige Fehler" (2–3 Bullets, kuratiert je Bewegungsmuster) und
  Sicherheits-Hinweis bei Verletzungs-Flags (`INJURY_ALT` existiert).
- Kein Video-Hosting einführen (Lizenz/Gewicht) — die animierten Pattern +
  Cues sind der bewusste, eigene Weg; dafür Qualität: alle 14 Pattern-
  Animationen prüfen/schärfen.
- **Abnahme**: 5 Stichproben-Übungen zeigen Animation, Cues, Fehler,
  Alternative, Beleg — ohne Layout-Bruch im Modal.

### B7 — Progression konfigurierbar
- Pro Übung optionales Override in `EXDB`/Editor: Steigerungs-Schritt
  (1,25/2,5/5 kg), Schema (Linear vs. Double Progression „erst Reps, dann
  Gewicht"); Engine `recWhy()`/Empfehlung respektiert Override und erklärt
  es im ⓘ („Double Progression: 3×8→3×10, dann +2,5 kg").
- **Abnahme**: Override auf Double Progression → Empfehlungslogik ändert
  sich nachweislich und erklärt warum.

---

## BLOCK C — ART. 9 DSGVO & SICHERHEIT: von „gut gemeint" zu prüffest

Ist-Zustand: Consent-Checkboxen (ToS + Art.-9-Einwilligung, `LEGAL_VERSION=1`,
`S.consent`), Rechtstexte als Vorlagen mit `[bitte ausfüllen]`-Platzhaltern
aus `config.legal`, Daten-Export vorhanden, lokale Löschung vorhanden,
Cloud-Löschung NICHT vollständig (kein Auth-User-Delete), kein Passwort-
Reset, Tier клиентseitig, CSP mit `unsafe-inline`, keine TOMs/VVT-Doku.

### C1 — Passwort-Reset & Konto-Sicherheit (Blocker!)
- `A.forgot` ersetzen: E-Mail-Feld → `SB.client.auth.resetPasswordForEmail(
  email, {redirectTo: location.origin+'/#recovery'})`; App erkennt beim Boot
  den Recovery-Hash (`onAuthStateChange` Event `PASSWORD_RECOVERY`) → Screen
  „Neues Passwort setzen" (`auth.updateUser({password})`, zxcvbn-artige
  Stärke-Anzeige existiert — wiederverwenden).
- Zusätzlich im Profil: Passwort ändern, E-Mail ändern (mit Verify-Mail),
  „Alle Geräte abmelden" (`auth.signOut({scope:'global'})`).
- **Abnahme**: Playwright-Test mit Supabase-Test-Projekt ODER gemocktem
  Auth-Client: Reset-Flow rendert alle Screens; Fehlerpfade deutsch.

### C2 — Einwilligungs-Management Art. 9 (2) a, prüffest
- Consent-Datensatz erweitern: `S.consent={tos:{ver,at},health:{ver,at},
  analytics:{ver,at|null}}` + **serverseitige Kopie**: Tabelle
  `consent_log(user_id, kind, version, granted_at, revoked_at)` (RLS: nur
  eigene Zeilen) — Einwilligungen müssen NACHWEISBAR sein (Art. 7 Abs. 1).
- `LEGAL_VERSION`-Bump-Flow: bei App-Start Version vergleichen → Re-Consent-
  Sheet (nur geänderte Dokumente, Diff-Hinweis), Ablehnen = Gesundheits-
  Features gesperrt (App zeigt den „Nur-Basis"-Modus, kein Rauswurf).
- **Widerruf** (Art. 7 Abs. 3, „so einfach wie Erteilung"): Profil →
  Datenschutz → „Einwilligung Gesundheitsdaten widerrufen" → sofortiger
  Stopp der Verarbeitung: Cloud-Sync der Gesundheitsfelder aus, Coach/
  Analytics auf Gesundheitsdaten gesperrt, Wahl: „Daten behalten (lokal)"
  oder „alles löschen (C3)"; `consent_log.revoked_at` gesetzt.
- Datenminimierung sichtbar machen: im Register-Screen echte Wahl
  **„Ohne Cloud starten"** (local-only, keine E-Mail-Pflicht → nur Vorname);
  das ist Privacy-by-Design als Verkaufsargument („Deine Daten verlassen
  dein Gerät nie — bis DU syncst").
- **Abnahme**: Version-Bump-Simulation zeigt Re-Consent; Widerruf blockt
  nachweislich Sync (Netzwerk-Log leer) und schreibt revoked_at.

### C3 — Betroffenenrechte end-to-end (Art. 15/17/20)
- **Export (Art. 20)**: bestehenden JSON-Export ausbauen → ein ZIP-ähnliches
  Bundle (JSON maschinenlesbar + „lesbare Zusammenfassung" als HTML-Print-
  View) mit ALLEN Kategorien: Profil, Trainingslogs, Ernährung, Status-
  Checks, Insights, Consent-Historie, Metadaten (Konto-Erstellung).
- **Löschung (Art. 17), vollständig**: Edge Function `delete-account`
  (Service-Role-Key NUR serverseitig): löscht `user_state`, `consent_log`,
  `referrals`, `subscriptions`-Zeilen UND den Auth-User
  (`auth.admin.deleteUser`); Client: Twostep-Bestätigung (Tippe „LÖSCHEN"),
  lokaler Wipe (localStorage + IndexedDB `mg-photos` + `off-cache`),
  Abschieds-Screen. Optional 14-Tage-Kulanz NICHT einbauen — sofortige
  Löschung ist ehrlicher und einfacher belegbar.
- Datenschutzerklärung: Abschnitt „Deine Rechte" verlinkt die beiden
  Funktionen DIREKT (Button im Text).
- **Abnahme**: Test-Konto → Export enthält alle Kategorien; Löschung →
  Login unmöglich, `user_state`-Row weg (per Test-Query), lokal alles leer.

### C4 — Tier/Paywall serverseitig (Sicherheits- UND Umsatz-Thema)
- Tabelle `subscriptions(user_id PK, tier, status, current_period_end,
  stripe_customer_id)` RLS read-only für den Nutzer; Client liest Tier beim
  Boot/Login aus der Tabelle → `S.tier` ist nur Cache. `eliteAccounts` aus
  `config.js` in eine DB-Tabelle überführen (config-Weg entfernen).
- `ai-proxy` prüft Tier pro Request (JWT → user_id → subscriptions) und
  rate-limitet (z. B. FREE: 5 Coach-Fragen/Tag, PRO: 100).
- Client-Manipulation (`S.tier='elite'` in DevTools) darf NICHTS
  freischalten, was der Server bedient; rein lokale Ansichten dürfen
  degradieren, aber beim nächsten Boot resynct Tier.
- **Abnahme**: DevTools-Manipulation + Reload → Tier zurück auf Server-Wert;
  ai-proxy lehnt FREE-Anfrage 6 mit 429 + deutscher Meldung ab.

### C5 — Verarbeitungs-Dokumentation (die Papiere, die Prüfer sehen wollen)
Lege im Repo `compliance/` an (Markdown, versioniert):
- `VVT.md` — Verzeichnis der Verarbeitungstätigkeiten (Zweck: Trainings-/
  Ernährungs-Coaching; Kategorien: Gesundheitsdaten Art. 9; Empfänger:
  Supabase (AVV, EU-Region), KI-Provider via Proxy (Inhaltsdaten der
  Coach-Chats!), Netlify (Hosting/Logs); Fristen; TOMs-Verweis).
- `TOMS.md` — techn./organisatorische Maßnahmen (RLS, TLS, Verschlüsselung
  at rest, Zugriffskonzept, Backup, Pseudonymisierung im Local-Mode).
- `AVV-STATUS.md` — Checkliste: Supabase-DPA akzeptiert [BETREIBER],
  EU-Region verifiziert (Projekt-Region eintragen), Netlify-DPA, KI-Provider-
  DPA (Gemini/OpenRouter/Groq!) — WICHTIG: Coach-Chats enthalten
  Gesundheitsdaten → in Datenschutzerklärung als Empfänger + Zweck nennen,
  Proxy soll PII minimieren (kein Name/E-Mail im Prompt — prüfe und fixe
  `aiUserContext`, falls es Profildaten mitschickt: nur Alter/Ziele, nie
  E-Mail/Name).
- `BREACH-SOP.md` — 72-h-Meldeweg Art. 33 (wer, wohin, Vorlage).
- Datenschutzerklärungs-Vorlage (`legalDoc('privacy')`) auf diese Realität
  aktualisieren: KI-Empfänger, OFF-API (A1 — nur Produktabfragen, keine
  personenbezogenen Daten), Speicherdauern, Beschwerderecht (zuständige
  Landesbehörde), Widerrufs-/Lösch-Buttons verlinkt.
- **Abnahme**: `compliance/` vollständig; Datenschutzerklärung nennt alle
  realen Empfänger; `[BETREIBER]`-Liste im Abschlussreport.

### C6 — Security-Hardening
- `_headers`: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  ergänzen; `connect-src` minimal halten (supabase, openfoodfacts, KI-Hosts
  raus sobald ai-proxy Pflicht ist — dann NUR supabase+off);
  `img-src` um `https://images.openfoodfacts.org` ergänzen (Produktbilder).
- XSS-Audit: grep alle `innerHTML`-Zuweisungen, verifiziere `esc()` auf
  jedem OFF-/Import-/Custom-String (Produktnamen aus OFF sind fremde Daten!).
- Lokalen Auth-Modus ehrlich labeln: im Register-Screen bei „Ohne Cloud"
  Hinweis „Geräteschutz statt Konto: Schütze dein Gerät mit Code/Face ID".
- Supabase: RLS-Review aller Tabellen (user_state, consent_log,
  subscriptions, referrals) als SQL in `SUPABASE_SETUP.md` dokumentiert;
  `flowType` bleibt implicit — prüfe, ob PKCE inzwischen ohne Backend geht,
  wenn ja umstellen.
- **Abnahme**: securityheaders.com-Simulation (Header-Review) A-Level außer
  unsafe-inline (kommt mit D1-Split weg); XSS-Test: OFF-Produkt mit
  `<img onerror>`-Namen rendert escaped.

### C7 — Foto- & Sprachdaten (oft vergessene Art.-9-Ecken)
- Fortschrittsfotos (IndexedDB): bleiben LOKAL (nie syncen) — das explizit
  in Datenschutzerklärung + UI-Hinweis („Fotos verlassen dein Gerät nie").
- Voice: Web Speech API schickt Audio an Browser-Anbieter (Apple/Google) —
  Hinweis beim ersten Mikrofon-Start + Alternative Texteingabe gleichwertig
  (existiert) dokumentieren.
- **Abnahme**: beide Hinweise erscheinen einmalig, sind in der
  Datenschutzerklärung nachlesbar.

### C8 — DSGVO-Regressionstests
- Playwright-Spezialsuite `tests/dsgvo.spec`: Consent-Pflicht (ohne Häkchen
  kein Submit), Widerruf blockt Sync, Export-Datei enthält Stichproben-Keys,
  Lösch-Flow bis Abschieds-Screen, Re-Consent bei Version-Bump.
- **Abnahme**: Suite grün in CI (Block D2).

---

## BLOCK D — DIE ÜBRIGEN METRIKEN (kompakt, aber verbindlich)

- **D1 Performance-Split**: Landing als eigenständige schlanke `index.html`
  (< 150 KB, nur Landing-CSS/JS + GEIST-Orb), App nach `app.html` +
  `app.js` (defer); Ziel: Lighthouse mobil ≥ 90 Landing, ≥ 85 App; als
  Nebeneffekt kann CSP `unsafe-inline` für script entfallen (Hashes).
  SW-Precache + Deep-Links anpassen.
- **D2 Tests/CI**: GitHub Action: Playwright-Suite (Auth, Logging, Plan,
  Paywall, DSGVO aus C8, Import aus B5) gegen `http-server` headless;
  Netlify-Deploy nur bei grün (Deploy-Context).
- **D3 Observability**: Sentry (EU-DSN, `beforeSend` strippt PII) +
  Plausible (EU, cookielos → ohne Consent-Banner nutzbar, in
  Datenschutzerklärung nennen); Event-Plan: land→register→onboard_done→
  first_log→d7_active→paywall_view→checkout.
- **D4 Payment**: Stripe Checkout (Edge Function `create-checkout`,
  Webhook `stripe-webhook` → `subscriptions` upsert), Kundenportal-Link
  fürs Kündigen (Pflicht in DE: „Verträge hier kündigen"-Button!),
  Preise: PRO 4,99 €/M · 39,99 €/J (Anker), 7-Tage-Trial über Stripe.
- **D5 Retention**: Web-Push (VAPID, Edge Function `push`), Opt-in-Prompt
  NACH erstem abgeschlossenen Training (nie beim Start); Reminder am
  geplanten Trainingstag 17:00 lokal, Streak-Schutz, Deload-Ankündigung;
  Wochenreport-E-Mail (Resend, Edge Cron) mit Korridor-Grafik.
- **D6 Wachstum**: Share-Card-Generator (Canvas 1080×1920: PR, Wochenvolumen,
  Streak + Referral-Code) über `navigator.share`; OG-Bilder für die 172
  SEO-Seiten generieren; später Capacitor-Wrapper (Store-Präsenz) — erst
  nach D1-Split sinnvoll.

## REIHENFOLGE & DEFINITION OF DONE

Arbeite: **C1 → C4 → A1 → A2 → A3 → A4 → B1 → B4 → B5 → B2 → B3 → A5 →
B6 → B7 → C2 → C3 → C5 → C6 → C7 → C8 → D2 → D3 → D4 → D1 → D5 → D6.**
(C1/C4 zuerst: Konto-Rettung + Server-Tier sind Blocker für alles Bezahlte;
dann die zwei Produkt-Blöcke im Wechsel mit Compliance-Ausbau.)

Ein Paket ist DONE, wenn: Regression grün (Arbeitsregel 1) · Screenshot-
Beleg erstellt · Abnahme-Kriterium erfüllt · committet & gepusht ·
`UPDATE-NOTES.md` um einen Absatz ergänzt. Am Ende: Abschlussreport mit
allen `[BETREIBER]`-Punkten (Stripe-Keys, Resend-Key, Sentry-DSN,
Impressumsdaten, Supabase-DPA-Bestätigung, VAPID-Keys).
