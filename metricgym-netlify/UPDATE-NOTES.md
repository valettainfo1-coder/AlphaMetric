# METRICGYM — Update „Landing & App Redesign"

Stand: Juli 2026 · Basis: metricgymUNIVERSUM_3

## Was ist neu

### 1. Login & Registrierung repariert („Load failed")
- Ursache: Bei konfiguriertem Cloud-Sync lief JEDE Anmeldung zwingend über den
  Supabase-Server. War der nicht erreichbar (pausiertes Projekt, Funkloch),
  brach alles mit „Load failed" ab.
- Jetzt: Netzwerkfehler werden erkannt → die App legt das Konto **lokal auf dem
  Gerät** an bzw. meldet lokal an und erklärt das verständlich. Kein toter
  Registrierungs-Button mehr. Alle Cloud-Aufrufe haben ein 12-s-Timeout und
  menschenlesbare Fehlermeldungen.
- Der weiße Google-Button war durch eine spätere CSS-Regel dunkel auf dunkel
  (unlesbarer Fleck) — behoben.
- Auth-Screens rutschen nicht mehr unter die iPhone-Notch (Safe-Area).
- **Wichtig:** Prüfe im Supabase-Dashboard, ob das Projekt
  `nsdziafvhhzuuhrctozl` pausiert ist (Free-Tier pausiert nach Inaktivität) —
  „Restore project" genügt, dann läuft auch der Cloud-Sync wieder.

### 2. Mystische Rauch-Sphäre (der „KI-Geist")
- Der leblose dunkle Kreis im Hero ist ersetzt: eine WebGL-Sphäre mit echtem,
  driftendem Volumen-Rauch, wanderndem Licht-Kern („da denkt etwas") und
  subtiler Reaktion auf den Finger/Cursor. Läuft mit 30 fps akkuschonend,
  pausiert unsichtbar, fällt ohne WebGL sauber auf die CSS-Sphäre zurück.
- **Kein Ring/Kreis mehr um die Sphäre**: Der Rand folgt der Rauchdichte und
  franst frei in die Dunkelheit aus — wie ein echter Nebel, keine Scheibe.
- Überall identisch: Hero, Plan-Bühne, Plan-Genese, KI-Hub, Final-CTA.

### 3. Drehbarer 3D-Körper (ersetzt Vorderseite/Rückseite)
- Signature-Feature, anatomische Ausführung (in 6 Screenshot-Bewertungs-
  Iterationen gegen anthropometrische Referenzwerte und ein Écorché-Vorbild
  entwickelt): Proportionen nach Mensch (Schritt ~49 % H, Akromion 81 %,
  Ellbogen 66 %, Handgelenk 50 %, Knie 29 %, Wadenbauch 21 %); Rumpf als fein
  tessellierte Drehfläche mit modellierter Anatomie: Pec-Platten mit
  Brustfalte + Sternum-Rinne, Sixpack-Reihen mit Linea alba, Obliques,
  Clavicula-Kante, Latissimus-V, Trapez-Diagonale, Schulterblätter,
  durchgehende Wirbelsäulen-Furche, geformtes Gesäß mit Schritt-Gewölbe
  (kein „Puppenbein"-Absatz); Gliedmaßen mit echten Muskelbäuchen und
  Trennfurchen (Rectus femoris + Vastus-Köpfe, IT-Band-Furche, Patella,
  zwei Gastrocnemius-Wadenköpfe, Bizeps/Trizeps-Separation,
  Unterarm-Strecker); Schultern als nahtlose Kugelgelenk-Delts in
  Tropfenform; Streiflicht-Setup macht die Muskelformen aus jedem
  Winkel lesbar.
- Muskeln sind IN die Oberfläche gemalt (per-Vertex-Regionen mit weichen
  anatomischen Masken): primär beanspruchte glühen Puderblau, sekundäre Gold,
  mit ruhigem Puls aus dem Material heraus — keine aufgesetzten Formen.
- **Mit dem Finger drehen** (vertikal scrollt die Seite weiter), Trägheit beim
  Loslassen, sanfte Auto-Rotation im Leerlauf. three.js liegt lokal in
  `vendor/three.min.js` — kein CDN nötig, offline ab Start.
- Eingesetzt überall, wo vorher die zwei 2D-Ansichten standen: Landing-Demo,
  Übungs-Detail (inkl. Griff-Varianten), Muskel-Heatmap, Session-Fokus.
- Fallback: ohne WebGL erscheinen die 2D-Ansichten — deren Größen-Asymmetrie
  (Vorderseite kleiner als Rückseite) ist ebenfalls behoben.

### 4. Landingpage: Struktur, „schwarze Stellen", Animationen
- Navigation ist jetzt immer Glas mit Blur — vorher transparent, wodurch Logo
  und „Anmelden" mitten in Überschriften standen.
- Alle harten Schwarz-Schatten und dunklen Karten-Flecken ersetzt durch weiche,
  kühle Schatten und einheitliches Glas-Material.
- Das 240-vh-Scrollytelling (riesige leere Schwarzflächen beim Scrollen) ist
  eine kompakte, selbstlaufende Bühne: 3 Akte, wechseln automatisch, per Tipp
  auf die Punkte oder Wischen steuerbar.
- Sticky-CTA erscheint erst nach dem Hero und verschwindet an der finalen
  CTA-Sektion (vorher klebte er ab dem ersten Pixel doppelt unter dem
  Hero-Button).
- Reveal-Animationen und Zähler laufen jetzt auch nach Rückkehr zur Landing
  (vorher blieben die Zahlen beim zweiten Besuch auf 0).

### 5. Komplett neues Wording (USP-geschärft)
- USP: **Beweis statt Bauchgefühl** — die App behauptet nicht, sie belegt.
  Dahinter: eine Intelligenz, die den Plan aus 40+ Studien baut und ihn an den
  echten Zahlen des Nutzers misst.
- Neue Headline: „Rate nicht, ob dein Training wirkt. **Wisse es.**"
- Jede Sektion neu getextet (Hero, Claims, Live-Demo, Plan-Bühne, Showcase,
  Rechner, Analytics, 3 Schritte, Wissenschaft, Final-CTA), dazu Title/OG-Meta,
  Auth-Screens und Plan-Genese in derselben Stimme.

### 6. Passwort-Reset & Konto-Sicherheit (Level-Up C1)
- „Passwort vergessen?" funktioniert jetzt end-to-end: E-Mail-Feld → Supabase-
  Reset-Mail → Klick auf den Link öffnet einen eigenen **Recovery-Screen** in
  der App (neues Passwort, 2× eingeben, Mindestlänge) → automatisch angemeldet.
  Abgelaufene/kaputte Links landen mit klarer Meldung auf dem Login.
- Antwort absichtlich ohne Konto-Verrat („Falls ein Konto existiert, ist die
  Mail raus") — keine E-Mail-Enumeration.
- Neu im Profil („Dein Konto" → Sicherheit, nur mit Cloud-Konto sichtbar):
  **Passwort ändern**, **E-Mail ändern** (mit Bestätigungs-Mail) und
  **überall abmelden** (Global-Logout aller Geräte).

### 7. Abo-Tier serverseitig (Level-Up C4)
- Der Plan (FREE/PRO/ELITE) kommt jetzt vom **Server** (`my_tier()`-RPC über
  `subscriptions` + `elite_accounts`), nicht mehr aus dem lokal manipulierbaren
  Gerätespeicher. Sync bei Login, Registrierung, Recovery und App-Start;
  offline gilt der letzte bekannte Stand.
- Der KI-Proxy prüft pro Aufruf: gültige Anmeldung (JWT), Tier und
  **Tageslimit** (FREE 5 / PRO 60 / ELITE 200 Coach-Antworten). Limit-/
  Login-Fehler kommen als ehrliche deutsche Meldung in der App an.
- „Kauf" ohne echten Zahlungsanbieter ist für Cloud-Konten deaktiviert und
  sagt ehrlich, dass Stripe noch fehlt ([BETREIBER]). SQL & Deploy-Schritte:
  `SUPABASE_SETUP.md` Abschnitt 4–5.

### 8. Ernährung v2: Open Food Facts, eigene Lebensmittel, Vorlagen (A1+A2)
- **Open Food Facts angebunden** (~3 Mio. reale Produkte): Die Suche zeigt
  jetzt vier Sektionen — Favoriten ★, Meine Lebensmittel, lokale Datenbank,
  Open Food Facts (mit Quelle + Marke, z. B. „Open Food Facts · Milsani").
  Jeder Treffer wird 30 Tage in IndexedDB gecacht → zweiter Abruf klappt
  offline; ohne Netz fällt die Suche sichtbar sauber auf lokale Treffer
  zurück („Online-Datenbank nicht erreichbar"). Höflich: max. 1 Request/s,
  6-s-Timeout. CSP um `https://*.openfoodfacts.org` erweitert.
- **Eigene Lebensmittel**: Die Schätzmaske für Unbekanntes hat eine Checkbox
  „Als eigenes Lebensmittel speichern" (Standard an) — Werte werden auf
  100 g normalisiert, der Eintrag überlebt Reload + Cloud-Sync und wird ab
  sofort auch vom **Voice-Parser** erkannt („250 g Kaiserschmarrn"). Geloggte
  OFF-Produkte werden automatisch als eigene Kopie übernommen (offlinefähig).
- **Mahlzeiten-Vorlagen**: „Als Mahlzeit speichern" unter dem Tageslog macht
  aus den heutigen Einträgen eine Vorlage; Vorlagen erscheinen als Chips im
  Magic-Log — 1 Tipp lädt den Stack als Vorschau (Mengen editierbar, Makros
  skalieren live mit), 2. Tipp loggt alles.
- **Echte Favoriten**: Nutzungszähler statt Namensraterei — meistgeloggte
  Lebensmittel stehen in Suche und Schnellzugriff zuoberst; Bestandsdaten
  werden einmalig aus der Log-Historie übernommen.
- **Portions-Chips**: nach Auswahl eines Treffers z. B. „100 g / Portion
  (150 g)" — OFF-`serving_size` wird geparst, Stück-Basen der lokalen
  Datenbank bleiben erhalten.

### 9. Barcode-Scanner & Voice-Parser v2 (A3+A4)
- **Barcode-Scanner** (Icon neben dem Ernährungs-Suchfeld): Vollbild mit
  Kamerabild, Zielrahmen und Taschenlampen-Toggle (wo die Kamera es kann).
  Erkennung: nativer `BarcodeDetector` → **lokal gevendortes zxing-wasm**
  (`vendor/zxing/`, kein CDN, offline via Service-Worker-Precache) → manuelle
  EAN-Eingabe (immer sichtbar; abgelehnte Kamera-Permission sagt das klar).
  Treffer → Open-Food-Facts-Preview mit Portions-Chips → loggen (wird als
  eigenes Lebensmittel übernommen, Barcode gespeichert). Unbekannte EAN →
  Schätzmaske mit Namensfeld + vorbefülltem Barcode.
- **Voice-Parser v2**: Mengen-Synonyme („1 EL" → 15 g, „1 TL" → 5 g, „1 Tasse"
  → 240 ml, „2 Scheiben", „eine halbe/ein viertel/anderthalb"), Marken-
  Stripping („Ja! Magerquark" → Magerquark), robusteres Tippfehler-Matching
  (Sellers-Distanz im Wortinneren + 80-%-Zeichenfolge-Kriterium: „häncxen
  200 g" → Hähnchenbrust 200 g, aber „Schmaus" wird NICHT zu „Schmand").
  Unerkannte Posten werden online bei Open Food Facts nachgeschlagen; offline
  erscheinen sie als „nicht bestätigt" mit **Schätzen-Button** statt still
  verworfen zu werden. Jeder Preview-Posten zeigt Quelle (DB/Eigenes/OFF) +
  Konfidenz.
- CSP: `script-src` um `'wasm-unsafe-eval'` ergänzt (nur WebAssembly, kein
  JS-eval — nötig für zxing).

### 10. Muskel-Maps für alle 112 Übungen handkuratiert (B1)
- Vorher waren nur 41 Übungen von Hand gemappt, der Rest lief über einen
  groben Generator. Jetzt hat **jede der 112 Übungen** eine handkuratierte
  Primär-/Sekundär-Muskelkarte (z. B. Face Pull: hintere Schulter primär,
  Trapez sekundär; Sumo-Kreuzheben: Gluteus + Adduktoren primär; Dips:
  Brust + Trizeps primär) — auch die Konditionierungs-Übungen (Burpees,
  Seilspringen, Ergometer) zeigen ehrlich, was arbeitet.
- Der Generator `exActFor()` ist nur noch Fallback für künftige eigene
  Übungen. Neue Dev-Prüfung: `MGDEV.checkCoverage()` in der Konsole meldet
  Abdeckung (aktuell 112/112), Tippfehler in Muskel-IDs und verwaiste
  Einträge.

### 11. Player-Upgrade: der beste Satz-Moment (B4)
- **Verlauf inline**: direkt über den Log-Feldern eine kompakte Karte
  „Letzte 3 Sessions" dieser Übung — Datum, Satzzahl, Topsatz, e1RM — plus
  e1RM-Trend-Sparkline der letzten 8 Sessions.
- **Warm-up-Rechner**: beim ersten Satz ab 40 kg Zielgewicht erscheint der
  Chip „Aufwärmen: 40 %×10 · 60 %×5 · 80 %×3" — antippen zeigt die auf
  2,5 kg gerundeten Gewichte inklusive Scheiben-Beladung pro Seite.
- **Scheiben-Rechner**: Waage-Button am Gewichtsfeld (Langhantel-Übungen)
  öffnet ein Sheet mit der Beladung pro Seite; das Stangen-Gewicht
  (20/15/10 kg) ist umstellbar und bleibt gespeichert (`S.settings.barKg`).
- **Hintergrund-fester Pausen-Timer**: Endzeit liegt als absoluter
  Zeitstempel in localStorage; beim Zurückwechseln in die App resynct ein
  `visibilitychange`-Hook sofort auf die echte Restzeit. Am Ende: Vibration,
  **Web-Audio-Doppel-Beep** (Kontext wird bei der Satz-Geste geweckt —
  Autoplay-sicher) und, wenn erlaubt und die App im Hintergrund ist, eine
  System-Benachrichtigung „Pause vorbei — Satz 3 · Bankdrücken".

### 12. Hevy/Strong-CSV-Import — die Wechsler-Pipeline (B5)
- Neuer Einstieg im Profil („Aus anderer App importieren") und im Onboarding
  (Medical-Schritt): CSV-Export aus **Hevy** oder **Strong** wählen — das
  Format wird an der Headerzeile automatisch erkannt (inkl. lb→kg-Umrechnung
  bei Strong).
- Vorschau vor dem Import: Workouts, Sätze, Zeitraum; unbekannte Übungen
  lassen sich per Dropdown einer der 112 Übungen zuordnen oder überspringen.
  ~150 gängige EN-Namen sind vorgemappt (Bench Press→Bankdrücken …).
- **Duplikat-Schutz**: jeder Satz bekommt einen Hash (Datum+Übung+Satz+
  Gewicht+Reps) — dieselbe Datei zweimal zu importieren erzeugt 0 Dubletten.
- Import läuft gechunkt mit Fortschrittsbalken (1.000 Zeilen ≈ 0,3 s);
  danach sind e1RM-Kraftkurven, Empfehlungen („Letztes Mal") und der
  Session-Verlauf sofort mit der alten Historie gefüllt.

### 13. Supersets (B2)
- Im Plan-Editor lassen sich zwei benachbarte Übungen **verketten**
  (⛓-Button) — der Tag zeigt dann „Superset spart ~X Min" und die
  Wochenübersicht rechnet die gesparte Zeit in die Dauer ein. Entkoppeln
  jederzeit mit einem Tipp.
- Der Player führt Paare **alternierend**: A1 → B1 ohne Pause, EINE Pause
  pro Runde, danach automatisch zurück zu A („Runde 2"). Banner zeigt
  Partner + Rundenstand. Logs landen normal bei beiden Übungen — e1RM,
  Empfehlungen und der MEV–MRV-Wochenkorridor zählen jede Teilübung wie
  gewohnt.
- Bei Zeitknappheit im Assessment (Session ≤ 45 Min) schlägt die Engine
  einmalig sinnvolle Antagonisten-Paare vor (Brust↔Rücken, Bizeps↔Trizeps,
  Quads↔Beinbeuger) — nur benachbarte Übungen, im Editor jederzeit lösbar.

### 14. Eigene Übungen mit Body-Map-Tap (B3)
- Im Plan-Editor („+ Übung hinzufügen" → „✚ Eigene Übung erstellen"): Name,
  Equipment, Bewegungsmuster (12 Muster) und die Muskeln direkt auf der
  2D-Körperkarte antippen — 1. Tipp primär (blau), 2. Tipp sekundär (gold),
  3. Tipp aus. Vorder- und Rückseite nebeneinander.
- Die eigene Übung zählt danach **überall** mit: Wochen-Korridor
  (MEV–MRV, inkl. getrennter Bizeps-/Trizeps-Bänder), e1RM-Kraftkurven,
  Muskel-Heatmap, Übungs-Detail, Player-Empfehlungen. Sync läuft automatisch
  über den Cloud-Zustand.
- Löschen jederzeit im selben Sheet — die geloggte Historie bleibt erhalten.

### 15. „Deine Woche im Beweis" — Nutrition-Insights (A5)
- Neue Wochenkarte im Ernährungs-Tab mit vier Beweis-Zeilen aus den echten
  letzten 7 Tagen: **Protein-Konstanz** (Tages-Punkte, „5/6 Tage ≥ Ziel"),
  **Wochen-Kalorienbilanz** (Trainingstage zählen mit dem Trainings-Ziel,
  Wearable-Tage mit dem echten Verbrauch — Eat-back; Bewertung passend zum
  Ziel, nie moralisierend), **Ballaststoff-Schnitt** (nur aus echten
  Produktdaten via Barcode/Open Food Facts — Ballaststoffe laufen jetzt
  durchs Logging mit) und **dein ehrlichster Tag** (Logging-Konsistenz als
  stärkster Erfolgs-Prädiktor).
- Jede Zeile nennt ihre Datenbasis („Datenbasis: 6 geloggte Tage der
  letzten 7") und verlinkt ins Studien-Erklärsystem (neue Einträge:
  Wochen-Bilanz/Helms 2014, Ballaststoffe/DGE 30 g, Selbst-Monitoring/
  Burke 2011). Unter 3 geloggten Tagen: ehrlicher Empty-State.

## Deploy
Ordner unverändert als Netlify-Site deployen (Drag & Drop oder CLI). Neu dabei:
`vendor/three.min.js` und `vendor/zxing/` (werden vom Service Worker
vorgecacht). Cache-Version aktuell **v12** — Nutzer bekommen Updates beim
nächsten Besuch automatisch.
Für C4/KI-Proxy: `supabase/functions/ai-proxy` deployen + Secrets setzen,
SQL aus `SUPABASE_SETUP.md` Abschnitt 4 ausführen ([BETREIBER]).
