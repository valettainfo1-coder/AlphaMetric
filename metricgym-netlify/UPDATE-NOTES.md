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

### 16. Übungs-Detail v2 & konfigurierbare Progression (B6+B7)
- **Bewegungs-Animationen**: 13 Bewegungsmuster als reduzierte, animierte
  Linien-Diagramme (Gold = das, was sich bewegt) — bewusst abstrakt statt
  Pseudo-Video, ohne Fremd-Assets. Ein Pattern-Resolver ordnet alle 112
  Übungen (und eigene) dem richtigen Muster zu.
- **Häufige Fehler**: 2–3 kuratierte Fehler-Bullets je Bewegungsmuster im
  Übungs-Detail (Terracotta, nie Alarm-Rot), zusätzlich zum bestehenden
  Sicherheits-Hinweis bei Verletzungs-Flags.
- **Progression einstellbar** (im Detail-Modal unter „Warum diese Übung?"):
  Steigerungs-Schritt +1,25/+2,5/+5 kg und Schema **Linear** vs. **Double
  Progression** (erst Wiederholungen bis zur Range-Obergrenze, dann
  +Gewicht und zurück auf die Untergrenze) — pro Übung gespeichert. Die
  Empfehlung rechnet nachweislich damit und erklärt die Logik im ⓘ
  („Obergrenze erreicht → +2,5 kg und zurück auf 6").

### 17. Einwilligungs-Management Art. 9, prüffest (C2)
- **Nachweisbar** (Art. 7 Abs. 1): Einwilligungen werden je Dokument mit
  Version + Zeitstempel gespeichert und serverseitig in `consent_log`
  protokolliert (RLS: nur eigene Zeilen, unveränderlich; offline-tolerante
  Warteschlange). SQL: `SUPABASE_SETUP.md` Abschnitt 6.
- **Re-Consent**: Wird `LEGAL_VERSION` erhöht, zeigt die App beim Start ein
  Zustimmungs-Sheet mit Links auf die Dokumente. Ablehnen = **Nur-Basis-
  Modus** (Cloud-Sync & KI-Coach aus, kein Rauswurf) — jederzeit im Profil
  wieder aufhebbar.
- **Widerruf so einfach wie die Erteilung** (Art. 7 Abs. 3): Profil →
  Daten & Konto → „Einwilligung Gesundheitsdaten widerrufen" → sofortiger
  Stopp (Sync nachweislich blockiert, Coach aus) mit Wahl „Daten behalten
  (lokal)" oder „alles löschen"; `revoked_at` wird protokolliert. Erneute
  Erteilung mit einem Tipp.
- **„Ohne Cloud starten"** im Register-Screen: lokales Konto nur mit
  Vornamen — keine E-Mail, kein Passwort. Privacy by Design als echte Wahl:
  Daten verlassen das Gerät nie, bis DU syncst.

### 18. Betroffenenrechte end-to-end (C3)
- **Export (Art. 20)**: Ein Tipp lädt zwei Dateien — das vollständige
  maschinenlesbare JSON-Bundle (inkl. Consent-Historie) und einen lesbaren
  **HTML-Bericht** (druckfähig) mit allen Kategorien: Konto, Einwilligungen,
  Profil, Training, Ernährung, Körper/Status, Rechte-Übersicht.
- **Löschung (Art. 17), vollständig**: Neue Edge Function `delete-account`
  löscht serverseitig alle Tabellen UND den Auth-User (Service-Role nur
  serverseitig). Client: Zweistufen-Bestätigung („LÖSCHEN" tippen), lokaler
  Komplett-Wipe (localStorage + beide IndexedDB-Datenbanken: Fotos und
  OFF-Cache), ehrlicher Abschieds-Screen — inklusive Warnung, falls die
  Server-Löschung nicht bestätigt werden konnte. Bewusst ohne Kulanzfrist:
  sofortige Löschung ist ehrlicher und belegbar.
- Die Datenschutzerklärung verlinkt Export und Löschung jetzt **direkt als
  Buttons** im Abschnitt „Deine Rechte".

### 19. Verarbeitungs-Dokumentation (C5)
- Neuer Ordner `compliance/` (versioniert): **VVT.md** (7 Verarbeitungs-
  tätigkeiten inkl. Art.-9-Kennzeichnung), **TOMS.md** (RLS, TLS,
  Datenminimierung, Löschkonzept), **AVV-STATUS.md** (DPA-Checkliste je
  Auftragsverarbeiter — KI-Anbieter explizit, inkl. verifizierter
  PII-Minimierung in `aiContext()`), **BREACH-SOP.md** (72-h-Meldeweg
  Art. 33 mit Vorlage).
- Datenschutzerklärung auf die Realität aktualisiert: alle echten
  Empfänger (Supabase, Netlify, Google/OpenRouter/Groq via Proxy, Open
  Food Facts nur mit Produktanfragen), Foto-lokal-Garantie, Speicherdauern,
  zuständige Aufsichtsbehörde (config-Feld `legal.authority`, [BETREIBER]).

### 20. Security-Hardening, Foto/Voice-Transparenz, DSGVO-Testsuite (C6+C7+C8)
- **Header**: HSTS (`max-age=31536000; includeSubDomains`) und
  `img-src https://images.openfoodfacts.org` ergänzt.
- **XSS-Audit mit echtem Fund & Fix**: Ein präparierter Open-Food-Facts-
  Produktname (`<img onerror>`) wurde in Suche und Scanner korrekt escaped,
  feuerte aber nach dem Loggen in der Tagesliste — die Liste (und die
  Galerie-Kacheln) escapen jetzt; eigene Übungsnamen werden zusätzlich an
  der Quelle von HTML-/Quote-Zeichen befreit. Automatisierte XSS-Probe
  bleibt als Test bestehen.
- **RLS-Review** aller Tabellen als Soll-Tabelle in `SUPABASE_SETUP.md`
  (Abschnitt 8) + dokumentierte PKCE-Entscheidung (Abschnitt 9: bewusst
  implicit, Umstellungsanleitung für den Betreiber).
- **C7**: Einmaliger Hinweis vor der ersten Sprach-Eingabe (Audio geht an
  den Browser-Anbieter; Texteingabe gleichwertig — mit „Lieber tippen"-
  Ausweg), dauerhafter Hinweis „Fotos verlassen dein Gerät nie" an der
  Foto-Sektion, beides in der Datenschutzerklärung nachlesbar; Hinweis
  „Geräteschutz statt Konto" beim Ohne-Cloud-Start.
- **C8**: CI-fähige DSGVO-Regressionssuite `tests/dsgvo-tests.mjs`
  (Consent-Pflicht, Re-Consent, Widerruf-blockt-Sync, Export-Stichproben,
  Lösch-Flow bis Abschied) — Exit-Code ≠ 0 bei Rot, alle 12 Checks grün.

### 21. CI-Pipeline (D2)
- GitHub Action `.github/workflows/ci.yml`: startet die App headless
  (`http-server`) und fährt zwei Playwright-Suiten: **App-Regression**
  (`tests/app-tests.mjs`: Landing, Registrierung mit Offline-Fallback,
  Player-Satz → Kraft-Log, Ernährungs-Log + Voice-Parser, 300-Zeilen-
  CSV-Import inkl. Duplikat-Schutz, Paywall-Ehrlichkeit) und die
  **DSGVO-Suite** aus C8. Rot = Workflow schlägt fehl.
- `netlify.toml` + Anleitung: Netlify-GitHub-Checks aktivieren, damit nur
  bei grünem CI deployt wird ([BETREIBER], einmalig im Dashboard).

### 22. Observability (D3)
- **Plausible Analytics** (EU, cookielos — ohne Consent-Banner nutzbar) und
  **Sentry** (EU-DSN) sind integriert, aber komplett aus, bis der Betreiber
  `plausibleDomain`/`sentryDsn` in `config.js` setzt ([BETREIBER]).
- Sentry-Berichte werden vor dem Senden von PII bereinigt (`beforeSend`:
  user/request raus, E-Mail-Adressen maskiert, Console-Breadcrumbs raus).
- Funnel-Events (einmalig pro Konto, wo sinnvoll): `land` → `register` →
  `onboard_done` → `first_log` → `d7_active` → `paywall_view` → `checkout`.
  CSP um plausible.io + sentry-cdn/ingest erweitert; Datenschutzerklärung
  nennt beide (Abschnitt 8).

### 23. Stripe-Zahlung angeschlossen (D4)
- Drei neue Edge Functions: **create-checkout** (7-Tage-Trial, Preis-IDs
  serverseitig), **stripe-webhook** (Signatur-geprüft, pflegt
  `subscriptions` → `my_tier()` liefert ab dann den bezahlten Tier),
  **create-portal** (Stripe-Kundenportal).
- Client: Upgrade-Button öffnet die echte Kasse, sobald
  `config.js → stripeEnabled: true` gesetzt ist — vorher bleibt der ehrliche
  „Bezahlfunktion kommt"-Hinweis (kein Schein-Kauf). Neuer Button
  **„Verträge hier kündigen · Abo verwalten"** auf der Preisseite
  (§ 312k BGB) öffnet das Kundenportal.
- Launch-Preise: PRO 4,99 €/M · 39,99 €/J (Anker), ELITE 9,99 €/M ·
  79,99 €/J. Setup-Schritte: `SUPABASE_SETUP.md` Abschnitt 10 ([BETREIBER]).

### 24. Feedback-Runde: Quiz-Scroll, Partikel-Ball, Sprach-Sammeln, Paywall-X
- **Quiz-Scroll-Bug behoben**: Beim Beantworten einer Frage bleibt die Seite
  jetzt exakt stehen — der Scroll-Reset passiert nur noch bei echtem
  Seiten-/Step-Wechsel.
- **Rauch-Sphäre ersetzt durch den Partikel-Ball**: 5.000 Partikel auf einer
  Fibonacci-Kugel (Canvas 2D, überall in der Software über dieselbe
  Mount-API). Physikbasiert: Trägheits-Rotation mit Drall per Wisch
  (horizontal wischen dreht, vertikal bleibt Scrollen), Masse-Feder-Dämpfer
  je Partikel und quadratisch abfallende Abstoßung um den Finger — die
  Kugel beult lokal aus und federt zurück. 30 fps, pausiert unsichtbar.
- **Sprach-Eingabe sammelt jetzt ALLES**: Die Erkennung hört kontinuierlich
  zu (Safari-Frühstopps werden automatisch neu gestartet), zeigt eine
  Live-Vorschau im Eingabefeld und finalisiert erst nach ~2,8 s Stille,
  per erneutem Mikro-Tipp (Toggle) oder 45-s-Obergrenze. „Hähnchen,
  Hackfleisch, Skyr … drei Tomaten und eine Gurke" kommt jetzt komplett an.
- **Paywall-Sheet schließbar**: deutliches ✕ oben rechts (zusätzlich zum
  Tipp auf den Hintergrund) — z. B. beim Multi-Ziel-Teaser im Quiz.
- **Landing aufgeräumt**: Der drehbare Körper ist auf der Startseite durch
  das ruhige Vorder-/Rückseiten-Paar ersetzt (Auto-Drehen der Wende-Karte
  ist generell deaktiviert — Drehen nur noch aktiv per Finger); das
  Marquee-Laufband und die doppelte Analytics-Vorschau sind entfernt.

### 25. Magic-Log per Stimme: reinreden → automatisch drin
- Mikro antippen → das Textfeld leuchtet auf, ein „Ich höre zu"-Status
  erscheint und die gesprochenen Wörter schreiben sich **live** ins Feld.
- Nach dem Sprechen (2,8 s Stille oder erneuter Mikro-Tipp) analysiert die
  Engine automatisch und **trägt erkannte Posten sofort ein** — Reward-Chip,
  Tageszahlen springen um, und ein 5-Sekunden-**„Rückgängig"** im Toast
  nimmt bei Bedarf exakt diese Posten (inkl. Favoriten-Zähler) wieder raus.
- Ehrlich bleibt ehrlich: Unerkanntes wird nie blind gebucht — es bleibt
  sichtbar mit „Nährwerte schätzen"-Button stehen. Der getippte Weg über
  „Analysieren" behält bewusst die Vorschau mit Übernehmen/Verwerfen.

### 26. Marken-Logo = Partikel-Sphäre (ein System überall)
- Das Logo ist jetzt **dieselbe Partikel-Sphäre wie der interaktive
  Hero-Ball**: identische Fibonacci-Geometrie, feste Lichtquelle oben
  links vorn (Licht steuert Farbe, Tiefe steuert Punktgröße + Deckkraft),
  weicher Core-Glow darunter. Deterministisch — das Logo sieht in Topbar,
  Landing-Header, App-Icon und Link-Vorschau identisch aus.
- **Alle Markenassets neu gerendert**: `icon-512.png`, `icon-192.png`,
  `apple-touch-icon.png` (Homescreen) und `og-image.png` (Link-Vorschau
  mit Wortmarke + Claim) — Punktdichte skaliert mit der Größe, feiner
  deterministischer Jitter macht große Darstellungen organisch wie den
  Live-Ball. Favicon-Link ergänzt (vorher lief `/favicon.ico` ins Leere).
- Alte Markenreste entfernt: Gradient-Disc-Logo und der ungenutzte
  feTurbulence-Smoke-Orb sind raus; `logoMark` nutzt dieselbe Pipeline.
- Service-Worker-Cache auf **v15** (Icons sind vorgecacht → Update greift
  beim nächsten Besuch automatisch).

### 27. Barcode-Scanner entfernt (A3 zurückgebaut)
- Der Barcode-/EAN-Scanner in der Ernährungs-Eingabe ist **komplett raus**:
  Kamera-Vollbild, `BarcodeDetector`/`zxing-wasm`-Erkennung, EAN-Handeingabe
  und der Scanner-Button neben dem Suchfeld. Lebensmittel werden weiter über
  die **Online-Suche (Open Food Facts)**, eigene Lebensmittel, Vorlagen,
  Favoriten und die Sprach-/Texteingabe geloggt.
- Mit entfernt: das gevendorte `vendor/zxing/` (~1 MB, war SW-vorgecacht),
  der `OFF.product(barcode)`-Lookup samt Code-Cache, die `barcode`/`torch`-
  Icons und die tote „Produktname eingeben"-Maske. Das `barcode`-Feld an
  eigenen Lebensmitteln bleibt (die OFF-Suche setzt es weiter) — nur der
  Scanner-Zufluss fällt weg.
- **CSP verschlankt**: `'wasm-unsafe-eval'` gestrichen (wurde nur von
  zxing gebraucht). Keine WASM-Ausführung mehr im Client.
- Service-Worker-Cache auf **v16** (zxing aus der SHELL-Precache-Liste
  entfernt).

### 28. Preis-Entscheidung: Premium-Anker (Pro 9,99 · Elite 19,99)
- Der Code widersprach sich: Die Preis-*Logik* (Header-Doku + Kommentare)
  war auf **9,99 € Premium-Anker** ausgelegt, die *Konstante* war aber auf
  eine 4,99-„Penetration" heruntergezogen. Aufgelöst zugunsten Premium.
- **Neue Preise** (eine Quelle: `TIER_PRICE`, alle Labels/Tagespreise/
  Jahres-Rabatte/Referral-Auszahlungen leiten sich automatisch ab):
  **Pro 9,99 €/Monat · 79,99 €/Jahr**, **Elite 19,99 €/Monat · 159,99 €/Jahr**
  (Jahr ≈ −33 %, kommuniziert als „Spare 40 € / 80 €", „4 Monate geschenkt").
- **Warum tiefenpsychologisch:** Der Preis *beweist* die Positionierung
  „Beweis statt Bauchgefühl" — ein 4,99-Tag sortiert METRICGYM als „noch ein
  Tracker" (Hevy/Strong-Segment) ein, obwohl es die *denkende* App ist
  (Kategorie-WTP 10–13 €: Fitbod, Dr. Muscle, Whoop/Oura). Der Tages-Reframe
  (≈ 0,33 €/Tag) macht 9,99 trivial; Elite = 2× als Goldilocks-Anker, der Pro
  „vernünftig" wirken lässt. Rabatte kann man später geben — Preise erhöhen
  kaum. Höhere Marge finanziert außerdem die (echten) KI-Kosten pro Nutzer +
  Werbe-Budget (CAC).
- SUPABASE_SETUP §10 auf die neuen Stripe-Preispunkte angeglichen — die
  anzulegenden Stripe-Prices müssen **exakt** diesen Beträgen entsprechen.
  [BETREIBER: 4 Stripe-Prices in Höhe 9,99/79,99/19,99/159,99 anlegen]

### 29. Wording-Politur: weg vom Baukasten-Ton, hin zu Premium
Strukturierter Durchgang über die conversion-nahen Oberflächen. Leitlinie:
**ruhig, präzise, selbstsicher — der Ton beweist den Preis.** Konkret raus:
das gamey „freischalten"/„freigeschaltet" (überall in sichtbarer Copy
ersetzt), Ausrufezeichen, Sprüche wie „willkommen im Inner Circle" und
„los geht's".
- **Paywall:** Headline „Mehr Tiefe freischalten" → **„Das vollständige
  Bild"**; Eyebrow „PERFORMANCE-Funktion" → **„In PERFORMANCE enthalten"**;
  Prognose-Satz von „schaltet … frei — du verlierst" → **„öffnet den
  vollständigen Pfad … Ohne ihn bleibt genau diese Präzision ungenutzt"**.
- **Upgrade-Dialog:** unprofessionelles „(Anbindung folgt)" entfernt.
- **System-Toasts:** „ELITE freigeschaltet — willkommen im Inner Circle" →
  „ELITE ist aktiv — willkommen."; „Tour fertig — leg los." →
  „Tour abgeschlossen."; „erlebe deine Magie live" → sachliche Fassung;
  Reset-Toast entschärft; „Stark —"-Interjektion raus.
- **Feature-Tour:** „dein ganzes Arsenal 💪" → „den vollen Funktionsumfang";
  „Bereich X freigeschaltet" → „Bereich X von N"; Button „Los geht's" →
  „Fertig".
- **Preisseite/Menü:** Frage-Bullet vereinheitlicht („Vitamin- &
  Mineralstoff-Schätzung aus deinem Essen"); Menü-Untertitel
  „Mehr Tiefe freischalten" → „Mehr aus deinen Zahlen holen".
Übungsnamen (Hammer-Curls), „Cool-down", Social-Share-Captions (💪) und
Code-Kommentare wurden bewusst NICHT angefasst — dort ist es korrekt.

### 30. NEU: Ausdauer-Modul (Cycling & Running) — Phase 1
Der Start eines Ausdauer-Ökosystems auf intervals.icu-Niveau — **sport-agnostisch**
(Rad + Laufen ab Tag 1), **lokal-first** (IndexedDB), **additiv** (kein Gym-Flow
berührt). Erreichbar über das Menü → „Ausdauer — Cycling & Running".
- **Wissenschaftliche Engine (18 CI-Tests):** NP, IF, TSS, VI, EF, aerobe
  Entkopplung, Power-Curve/MMP, Critical Power & W′, FTP-Schätzung, PMC
  (CTL/ATL/TSB = Fitness/Ermüdung/Form), Coggan-Power-Zonen, Friel-HF-Zonen.
- **Import GPX · TCX · FIT** — inkl. eigenem FIT-Binär-Decoder (Garmins/Wahoos
  natives Format) → volle Analyse, komplett auf dem Gerät. Deckt Strava/Garmin/
  Wahoo/Komoot/Zwift-Exporte ab.
- **UI:** Dashboard (Form/Fitness/Ermüdung, Wochen-Volumen, FTP W/kg),
  Aktivitäts-Detail (Offline-Route-Karte, NP/IF/TSS/VI/EF, Zeit-in-Zonen,
  Verlaufskurve, ehrliche Auswertung), Athlet-Profil je Sport.
- Architektur, Entscheidungen und der volle Phasenplan (TCX/FIT, Workout-Builder,
  adaptive Pläne, Cycling-Nutrition, KI-Coach, Native/Live-Sensoren, Social):
  siehe `ENDURANCE-ROADMAP.md`.
- **Wichtiger Fix nebenbei:** ein Boot-Reihenfolge-Fehler (Zugriff auf `S` in der
  Temporal Dead Zone) wurde vermieden — die App bootet sauber, Lazy-Init in
  `ENDUR.st()`.

### 31. Ausdauer × Gym: die Zahnräder greifen ineinander
Damit Kraft und Ausdauer *ein* System sind statt zwei nebeneinander:
- **Eine gemeinsame Trainingslast.** Kraft-Einheiten werden in eine
  TSS-äquivalente Last umgerechnet (Foster-sRPE, dokumentierte Heuristik) und
  mit der Ausdauer-TSS zu **einer PMC** zusammengeführt. Das Ausdauer-Dashboard
  zeigt jetzt Fitness/Ermüdung/Form **„gesamt"** und die Wochen-Aufteilung
  „X Ausdauer · Y Kraft".
- **Eine Gewichtsquelle.** FTP-W/kg und Lauf-Kalorien nutzen den Gym-`weightLog`
  (letzter gemessener Wert) — kein zweiter, divergierender Wert mehr.
- **Energie sichtbar.** Der Tages-Kalorienverbrauch aus Rad/Lauf steht bereit
  und wird im Dashboard angezeigt (tiefe Einrechnung ins Makro-Ziel folgt).
- 6 zusätzliche CI-Tests (jetzt 28 Ausdauer-Tests grün).

### 32. Zahnräder perfekt ineinandergreifend (bidirektional)
Die zwei letzten Nähte zwischen Gym und Ausdauer geschlossen:
- **Energie:** Rad-/Lauf-Kalorien heben **echt** dein Kalorien-Tagesziel
  (Eat-back über den vorhandenen Wearable-Pfad; das Wearable hat Vorrang, also
  nie doppelt gezählt). Auf der Ernährungsseite sichtbar erklärt
  („An deine Ausdauer angepasst: X kcal aus Rad/Lauf heute").
- **Readiness:** Deine Bereitschaft berücksichtigt jetzt die **Gesamt-Trainings-
  last** (Kraft + Ausdauer über die Unified-PMC) — ein harter Ride senkt die
  Kraft-Bereitschaft und umgekehrt, mit ausgewiesenem Grund. Im Ausdauer-
  Dashboard sichtbar.
- +3 CI-Tests (31 Ausdauer-Tests grün); Gym-Kalorien- und Readiness-Engine
  angefasst, App- & DSGVO-Suite bleiben grün.

### 33. Verzweigter Funnel: jede Persona bekommt „die perfekte App"
Das Onboarding fragt jetzt **ganz vorn**: „Wofür bist du hier?" → **Muskeln & Kraft ·
Radfahren · Laufen · Hybrid**. Danach **verzweigt der Funnel zwingend**:
- **Cyclist** bekommt Rad-Ziel (FTP steigern / Gran Fondo / Bergfahren / Rennen …),
  **FTP** (überspringbar → wird aus Fahrten geschätzt) und Wochenstunden — **statt**
  Split/Equipment.
- **Runner** bekommt Lauf-Ziel (5 km … Marathon), **Schwellen-Pace** und
  Wochenkilometer.
- **Hybrid** = voller Gym-Funnel + Ausdauer-Disziplin & -Umfang.
- **Gym** bleibt **exakt** wie bisher (Regressions-Pfad unverändert).
Am Ende füllt der Funnel das **Ausdauer-Athletprofil** vor (FTP/Pace/Sport) und
mappt das Ziel korrekt in Ernährung & Projektion → ein Cyclist landet mit
gesetztem FTP und startklarem Ausdauer-Dashboard **statt bei null**.
Technik: `oblocks()` liefert die persona-abhängige Blocksequenz, Persona-Gate als
Vorstufe. +4 CI-Tests. Außerdem behoben: „Du wirst mehr Muskeln" → „Du wirst
muskulöser"; Command-Palette-Header sauber formatiert (✕ oben rechts).

### 34. Abnehmen-Persona + wissenschaftliche Grundlage (reale Studien)
Zwei Dinge, ein Prinzip — **„Beweis statt Bauchgefühl"**, jetzt sichtbar hinterlegt.

**(A) Fünfte Persona: „Abnehmen".** Das Persona-Gate bietet nun **Muskeln & Kraft ·
Abnehmen · Radfahren · Laufen · Hybrid**. Der Abnehm-Pfad verzweigt eigenständig:
statt Split/Ziel-Wahl kommt die **wissenschaftlich entscheidende Frage — das Tempo**
(„Wie schnell willst du abnehmen?": langsam ~0,25 · **moderat ~0,5 ★** · zügig ~0,7 kg/
Woche). Das Tempo **koppelt direkt das Kaloriendefizit** (`calorieDirection`): sanft
−12 %, moderat −20 % (= bisheriger Standard, **App-Test-Pfad byte-identisch**), zügig
−22…−25 % nur bei höherem Körperfett. Das Ziel wird sauber auf **Fettabbau** gemappt →
die volle Cut-Engine greift (Protein hoch nach Helms, Muskelerhalt, ehrlicher
12-Monats-Pfad). Krafttraining bleibt der Kern des Plans — nicht nur Cardio.

**(B) „Wissenschaftliche Grundlage" — reale, korrekt attribuierte Papers.** Ein neues,
gemeinsames Studien-Modul (`SCIENCE_REFS`) hinterlegt die Ausdauer- **und** Abnehm-Pfade
mit **echten** Originalquellen, im vorhandenen Zitier-Stil (Info-Icon, Quelle in Akzent):
- **Ausdauer (6):** Allen & Coggan (NP/IF/TSS/PMC) · Banister 1975 (Fitness-Ermüdung) ·
  Seiler 2010 (polarisiert 80/20) · Monod & Scherrer 1965 / Jones 2017 (Critical Power) ·
  Daniels (VDOT-Pace) · Friel (Entkopplung & HF-Zonen).
- **Abnehmen (5):** Garthe 2011 (Tempo schützt Muskeln) · Helms 2014 (Protein im Defizit) ·
  Longland 2016 (Kraft + Protein baut auf, während Fett fällt) · Fothergill/Hall 2016
  (adaptive Thermogenese — warum Crash-Diäten zurückschlagen) · Wishnofsky 1958
  (~7 700 kcal/kg) — **ehrlich eingeordnet** als Näherung, weil sich der Stoffwechsel
  anpasst (Metric prüft dein echtes Ergebnis nach statt stur zu rechnen).
Sichtbar an drei Stellen: **Reveal** (persona-/ziel-abhängig), **Ausdauer-Dashboard**
(dauerhaft) und **Ernährungsseite** bei Abnehm-Zielen (dauerhaft). Alles nur echte
Quellen — nichts erfunden. +7 CI-Tests (Persona, Defizit-Kopplung, Studien-Attribution).

### 35. Wunsch-Fenster: „Sag Metric, was du willst" (Freitext → alle Zahnräder)
Ein Textfeld, das dein Ziel **in deinen eigenen Worten** entgegennimmt und die App
**sofort** darauf einstellt — Kalorien, Makros, Trainingsplan, Ausdauer-Profil und
Readiness greifen zusammen neu ineinander.

- **Lokaler Intent-Parser (offline, sofort):** übersetzt Freitext in echte Stellhebel —
  Ziele, Modus (Gym/Abnehmen/Rad/Laufen/Hybrid), Abnehm-Tempo und Muskel-Fokus. Beispiele:
  - „Abnehmen, aber Muskeln halten" → **Recomp** (Fettabbau-Fokus, sanftes Tempo, Protein hoch).
  - „Maximale Ausdauer auf dem Rad" → **Cycling-Modus**, Ziel Ausdauer, FTP/Zonen, 80/20.
  - „Muskelaufbau, um auszusehen wie Christian Bale in American Psycho" → **ästhetischer
    Lean-Look**: Aufbau + Fokus auf Schultern/Brust/Rückenbreite/Arme/Core, schlank gehalten (V-Form).
- **Ehrliche Interpretation mit Belegen:** Metric zeigt vor dem Übernehmen, *was* es verstanden
  hat und *warum* — mit realen Studien (Garthe, Helms, Longland, Seiler, Allen & Coggan,
  Israetel, Schoenfeld). „Beweis statt Bauchgefühl", auch hier.
- **Ein Tipp „Übernehmen" → alle Zahnräder neu:** `bmrCalc → tdeeCalc → multiTargets`
  (Defizit/Protein), `generateTrainingPlan` + optimaler Wochenplan, Fokus-Volumen,
  Ausdauer-Athletprofil (Sport/FTP) — dann öffnet sich der passende Ziel-Tab.
- **Wort-Anfang-Erkennung** verhindert Fehlgriffe (z. B. „lauf" in „musku**lauf**bau" wird
  **nicht** als Laufen missverstanden).
- **KI optional:** ist der Coach aktiv, verfeinert er den Wunsch — aber **streng gegen die
  erlaubten Werte validiert**, nie roh übernommen. Ohne KI funktioniert alles genauso.
- Erreichbar über **Menü** („Sag, was du willst") und **Profil**. +6 CI-Tests.

### 36. Wunsch-Fenster wird KI-gesteuert (Weltklasse-Sportwissenschaftler)
Das Wunsch-Fenster ist jetzt **KI-first**: ist der KI-Coach aktiv, analysiert er den Freitext
wie ein **evidenzbasierter Spitzen-Sportwissenschaftler** und konfiguriert die App.

- **Experten-System-Prompt** bündelt reales Wissen (Israetel · Helms · Schoenfeld · Seiler ·
  Coggan · Garthe · Concurrent-Training-Interferenz) und **rechnet mit deinem Profil**
  (Körperfett, Gewicht, Erfahrung, Tage) → z. B. Cut-first vs. Lean-Gain je nach KF.
- **Die KI klassifiziert & begründet, die geprüfte Engine rechnet die Zahlen.** Bewusst so:
  das LLM erfindet **keine** Kalorien/Makros (die kämen sonst halluziniert) — es liefert nur
  die Stellhebel + eine Experten-Begründung, die deterministische Engine macht die Mathematik.
  Das ist vertrauenswürdiger *und* intelligenter zugleich.
- **Reichere Steuerung:** die KI darf zusätzlich Trainingstage (2–6) und Split setzen, plus
  liefert **Titel, Experten-Analyse und einen Coach-Satz**, die im „Verstanden"-Panel erscheinen.
- **Strikt validiert & sicher:** jede KI-Ausgabe wird gegen erlaubte Werte gefiltert
  (Müll/erfundene Ziele/Modi werden verworfen, Tage geclampt), und **jeglicher KI-Text wird
  escaped** (kein HTML-/Script-Inject). Fällt die KI aus, greift **nahtlos die lokale
  Sofort-Analyse** (offline) — kein Absturz, keine Sackgasse.
- **Ehrliche UI:** Coach an → großer Button „Vom KI-Coach analysieren lassen" + Badge; Coach
  aus → Hinweis, dass die Sofort-Analyse läuft und wie man den Coach aktiviert.
- **Voraussetzung Betreiber:** die Edge Function `ai-proxy` ist bereits `useAiProxy:true`
  konfiguriert; Nutzer aktivieren den KI-Coach im Menü (und sind für den Proxy angemeldet).
- +4 CI-Tests (Merge gültiger Antwort · strikte Sanitisierung · Fallback · XSS-Schutz).

### 37. Vollständiger QA-Durchgang — Fehler, Logik & UX geprüft
Systematischer Audit der ganzen App (Laufzeit-Sweep aller Screens/Personas + Logik- und
UX-Prüfung). **Ergebnis: sehr stabil** — 0 Laufzeit-/Konsolenfehler über Boot, alle 5
Personas, alle Tabs, Menü und Ausdauer-Import; 0 tote Buttons (alle 244 `A.*`-Handler
definiert); Engine-Mathematik sauber (alle Ziel-Projektionen gültig, Makro-Summe deckt sich
exakt mit dem Kalorienziel, keine NaN in Readiness/PMC/W-per-kg). Behoben wurde:

- **Paywall-Leck geschlossen:** Das Wunsch-Fenster konnte Free-Nutzern **mehrere Ziele**
  gleichzeitig setzen und so die „multi_goal = Pro"-Schranke umgehen (im Onboarding & Profil
  längst gegated). Jetzt wird im Free-Tier **auf das Hauptziel gekappt** (ehrlicher Hinweis
  „mehrere Ziele zugleich sind Pro"); Pro/Elite behalten mehrere Ziele.
- **Wunsch-Parser deckt jetzt alle gängigen Ziele ab** (vorher Sackgassen ohne Interpretation):
  **Beweglichkeit/Mobility**, **allgemeine Fitness** („fit werden"), **Hybrid**
  („kraft und ausdauer" wurde fälschlich nur als Kraft erkannt → jetzt Hybrid mit Ausdauer),
  **Kraft** („stark …") und **Figur/Ästhetik** („bikini figur", „straffer"). Ästhetik-Fokus
  ist jetzt **geschlechtssensibel** (Frauen: Gesäß/Beine/Core statt V-Taper-Standard).
- **Bessere Leerlauf-Hilfe:** Wird ein Text nicht erkannt, führt Metric jetzt mit Beispielen
  („abnehmen", „Muskeln", „Ausdauer", „stärker", „beweglicher") statt einer nichtssagenden Zeile.

Nicht-Bugs (bewusst so): 4 doppelte statische IDs liegen in **sich gegenseitig ausschließenden**
Render-Zweigen (Bulk- vs. Einzelsatz, Register vs. Passwort-Reset) → kein Laufzeit-Effekt.
Preisseite zeigt vor Stripe-Live echte Preise, ist aber **beim Klick ehrlich** („Bezahlfunktion
wird gerade angeschlossen") — löst sich beim Aktivieren von Stripe von selbst. +3 CI-Tests.

### 38. Copy-Edit-Durchgang — Formatierung & Wording (dt. Typografie)
Systematischer Sprach-/Typografie-Audit (Quelltext + gerenderter Text auf allen Screens).

- **Deutsches Dezimalkomma durchgehend:** Mehrere sichtbare Stellen zeigten einen
  **Dezimalpunkt** statt Komma — direkt neben korrekt formatierten Werten (z. B. Fortschritt:
  „82,7" neben „+0.3 kg", Reveal „+2.1 kg", Ausdauer „3.16 W/kg"). Alle auf **Komma**
  vereinheitlicht: Muskel-/Fett-Projektion, Reveal-Meilensteine, W/kg, km/h, Wochenstunden,
  Ausdauer-Metriken (IF/VI/EF/Entkopplung), Coach-Abgleichsnachricht. Neuer `nf2`-Formatter
  (de-DE, 2 Nachkommastellen). SVG-Koordinaten & CSS-Werte bewusst **unverändert** (dort ist
  der Punkt korrekt). Ergebnis: **0 sichtbare Punkt-Dezimalzahlen** mehr (mit Testdaten geprüft).
- **Grammatik:** „Jederzeit **in einem Tippen** kündbar" → „**mit einem Tipp** kündbar".

Geprüft & sauber: keine Rechtschreibfehler (seperat/Standart/vorraus/… = 0), Abkürzungen
konsistent („z. B." 37×, alle mit Leerzeichen), **keine** englischen Schlusszeichen, sichtbarer
Text nutzt durchgängig deutsche „…"-Anführungszeichen (0 gerade Quotes im UI), Tier-Namen
konsistent (START/PERFORMANCE/ELITE).

- **Ehrlicherer Landing-Claim:** „Fünf Antworten. **Mehr fragt sie nicht.**" → „Fünf Antworten.
  **Den Rest rechnet sie.**" — die fünf gezeigten Kern-Antworten stimmen, aber das Onboarding
  erfragt mehr; die neue Zeile stimmt (du gibst die Kern-Antworten, die Engine leitet den Rest ab).
  Bewusst so gelassen (Stil-Entscheidung): „Session" neben „Einheit" — verständliches Fitness-Deutsch.

### 39. Masterplan Phase 1 & 2 — Ausdauer echt + Kalorienrichtung folgt dem Körperfett
Umsetzung der zwei wichtigsten Befunde aus dem 15-Persona-Engine-Audit.

**Phase 1 — Ausdauer wird echt trainiert (Befund K-1, kritisch).** Rad-/Lauf-Athleten bekamen
bisher einen Kraft-Split + 2 lockere Cardio-Tage. Jetzt ist die Woche **ausdauer-dominant**:
`generateOptimalSchedule` erkennt Ausdauer-Primär (Modus Rad/Lauf bzw. Ausdauer als Erstziel)
und baut **3–5 Ausdauer-Einheiten polarisiert nach 80/20** (überwiegend Zone 2, gezielt
Schwelle/VO₂) + **1–2 kurze Ganzkörper-Krafteinheiten** (Erhalt der Ökonomie, ohne die Ausdauer
zu verdrängen). Die Cardio-Tage lösen über das vorhandene `cardioProtocol` strukturierte
Einheiten **mit HF-/Leistungszonen** auf; die Polarisierung ist jetzt exakt 80/20
(12 locker : 3 hart im Zyklus). Beleg: Seiler 2010 · Beattie 2014. **Der Gym-Pfad bleibt
unverändert.** Ergebnis: Radfahrer #08 / Läuferin #09 erhalten 4 Ausdauer- + 1 Krafteinheit
statt 4 Gym + 2 Cardio.

**Phase 2 — Kalorienrichtung folgt dem Körperfett (Befund M-1).** Ein „lean/definiert"-Wunsch
bei mittlerem Körperfett führte bisher in einen **Überschuss** (Massezuwachs statt Definition).
`calorieDirection` lässt jetzt bei Recomp das **Körperfett führen**: über dem ästhetischen
Schwellwert (m ~18 % / w ~26 %) Erhaltung bis leichtes Defizit, erst darunter Lean-Gain, bei
hohem KF echtes Defizit. Ohne KF-Wert bleibt der BMI-Pfad byte-identisch. „American Psycho"
#15 (18 %) landet jetzt bei −0,14 %/Woche statt +0,11 %.

+8 CI-Tests (Ausdauer-Komposition, 80/20-Polarisierung, KF-gekoppelte Richtung, Gym unverändert).

### 40. Masterplan Phase 3 & 4 — Volumen nach Trainingsalter + Makro-Feinschliff
**Phase 3 (Befunde M-2, N-1).**
- **Volumen-Landmarks nach Trainingsalter:** `deficitScaledBands` skaliert MEV/MRV jetzt zusätzlich
  nach Erfahrung (Einsteiger ~0,65× MEV, Fortgeschrittene ~1,12× MRV). So stimmt der „im Korridor"-
  Claim auch für Einsteiger-Ganzkörperpläne — ohne die tatsächliche Satzzahl zu ändern. Einsteiger #01
  ging von 5 Gruppen „unter MEV" auf faktisch im Korridor.
- **A/B/A statt A/B/B behoben:** ein doppeltes A/B-Suffixing kollidierte → Ganzkörper A/B/**B**. Jetzt
  sauber A/B/A (Zourdos-Variation korrekt).
- **Exakte Tage:** reine Kraft-/Muskel-Ziele bei normalem BMI bekommen genau die angefragten Tage —
  kein aufgedrängter Extra-Cardio-Tag mehr (#01: 3 statt 4).

**Phase 4 (Befunde M-3, N-2).**
- **Protein-Alters-Bonus:** ab ~50 Jahren +0,2 g/kg gegen anabole Resistenz (Moore 2015; Wall 2015).
  Masters-Frau #14: 1,54 → 1,69 g/kg (2,41 g/kg FFM); #06 (58): 1,71 → 1,9 g/kg.
- **Fett im echten Cut knapper** (0,8 statt 0,9 g/kg) → mehr Trainings-Kohlenhydrate; hormonelle
  Untergrenze 0,5 g/kg bleibt gewahrt.
- Bewusst *nicht* erzwungen: harter Bizeps-MRV-Deckel (N-3) — „an MRV" ist die erholbare Obergrenze
  (nicht darüber) und wird bereits korrekt gewarnt; ein Clamp brächte Regressionsrisiko für Mini-Nutzen.

+7 CI-Tests. Alle 4 Masterplan-Phasen umgesetzt, die Ziel-Domänen des Audits bewegen sich Richtung A−.

### 41. Hyperprinzip-Härtung — alle sieben Grenzfall-Befunde behoben (Kohorte-B-Audit)
Ein zweites Audit mit 15 **Grenzfall**-Personas (Alter 16 und 75, Verletzungen, BMI 41,
1,52 m/45 kg, 2,00 m/112 kg, erzwungene Splits, Zielkonflikte) deckte sieben reproduzierbare
Defekte an den Rändern auf. Alle sind behoben — jeder Eingriff folgt einem der fünf Prinzipien:

**① Keine Zusage ohne Deckung · ② Sicherheit dominiert Variation · ③ Deklarierte Priorität ist
bindend · ④ Messung schlägt Surrogat · ⑤ Physiologische Böden sind absolut**

- **G-1 (kritisch) — Prognose folgt jetzt dem ausgegebenen Plan.** Griff der Kalorienboden,
  versprach die App weiter einen Fettverlust, den ihr eigener Plan ausschloss (bei 45 kg:
  −2 bis −3 kg zugesagt, real 0,2 kg — Faktor 10). `goalProjections` rechnet nun aus dem
  gedeckelten Tagesziel gegen den Gesamtumsatz und erklärt den Sonderfall offen
  („der Hebel ist ab hier Bewegung, nicht weniger Essen"). Gegenprobe: ein echtes Defizit
  prognostiziert unverändert 6,2 kg — es wurde nichts kleingerechnet.
- **G-2 (kritisch) — Sicherheit vor Variation.** Die B-Variante erbte kontraindizierte Übungen,
  weil A die sicheren belegt hatte (Knie-Patientin: 3 kontraindizierte Übungen). Jetzt kommen
  bei angegebener Einschränkung **nur** sichere Kandidaten infrage; hat ein Slot gar keine, wird
  er ausgelassen statt kontraindiziert programmiert. Ergebnis: **0 statt 3** riskante Übungen —
  bei unverändertem Umfang (20 Übungen).
- **G-3 (kritisch) — Priorität bindet auch für Kraft.** „Kraft zuerst + Fettabbau" landete im
  vollen Cut (−20 %), identisch zum reinen Abnehmziel. Jetzt knappes Defizit (−8 %/−12 %).
- **G-4 — Fett folgt der fettfreien Masse.** Bei BMI 41 gingen 47 % der Energie in Fett und die
  Kohlenhydrate kollabierten auf 68 g. Fett bemisst sich nun an der stoffwechselaktiven Masse
  (Böden: Fett ≥ 0,5 g/kg, zusätzlich Kohlenhydrat-Boden). Ergebnis: 32 % Fett, 134 g Carbs.
- **G-5 — Körperfett schlägt BMI.** Der Zusatz-Cardio-Tag hing am BMI; ein 2,00-m-Athlet mit
  18 % KF bekam ihn aufgedrängt. Jetzt entscheidet der KF-Wert (altersadjustiert ab 65).
- **G-6 — Muskelschutz bei Ausdauer + Abnehmen.** Nur 1 Krafteinheit im Defizit → jetzt
  mindestens 2 (Longland 2016; Helms 2014).
- **G-7 — Sportart verwirft den Kraftwunsch nicht mehr.** „Marathon laufen und stark bleiben"
  ergab reine Ausdauer; jetzt Hybrid mit erhaltenem Kraftziel.

**Ehrliche Korrektur zum Audit:** Der dort genannte Punkt „7 von 15 bekommen mehr Tage als
angefragt" war ein **Messartefakt** — die Prüfmetrik zählte additive Cardio-Tage als Trainingstage.
Nachgemessen: Die angefragten **Kraft-Tage werden in 15 von 15 Fällen exakt eingehalten**; Cardio
liegt ausschließlich auf Ruhetagen. Kein Defekt.

+10 CI-Tests (G-1 bis G-7 inkl. Gegenproben). Alle drei Suiten grün, Kohorte A ohne Regression.

### 42. Aktivitäts-Profile — zwischen Kraft- und Ausdauer-Oberfläche wechseln
Ein Umschalter oben in der Kopfzeile zeigt die aktive Aktivität; ein Tipp öffnet die Auswahl.
Jede Aktivität hat **eigene Ziele, Trainingstage, Equipment — und ihre eigene Oberfläche**.

**Leitgedanke: ein Mensch, mehrere Trainings-Absichten.** Körperdaten (Geschlecht, Alter, Größe,
Gewicht, Körperfett) bleiben bewusst **geteilt** — es ist derselbe Körper, also derselbe
Grundumsatz; alles andere wäre physiologisch falsch und würde doppelte Pflege erzwingen.
Ein Profil besitzt nur die *Absicht*: Ziel, Tage, Split, Equipment, Fokus.

- **Fünf Aktivitätstypen:** Krafttraining · Abnehmen · Radfahren · Laufen · Hybrid. Der Typ
  bestimmt die Oberfläche: Kraft-Ansicht oder **Ausdauer-Ansicht** (Zonen, FTP/Pace, Power-Analyse).
- **Die Tab-Leiste wechselt mit:** In einer Ausdauer-Aktivität heißt der zweite Tab „Ausdauer"
  (Rad-Symbol) statt „Training" — Heute, Analytics, Ernährung und Profil bleiben geteilt.
- **Wechseln rechnet alles neu** über dieselbe geprüfte Pipeline wie das Wunsch-Fenster:
  Kalorien, Makros, Trainingsplan, Wochenplan und das Ausdauer-Athletprofil (Sport, Gewicht).
  Kein zweites Regelwerk, keine Duplikate.
- **Profile sind isoliert:** „Rennrad-Saison" mit 6 Tagen und „Krafttraining" mit 4 Tagen
  existieren nebeneinander; Änderungen am einen lassen das andere unberührt.
- **Anlegen, umbenennen, löschen** direkt im Sheet; das letzte Profil ist geschützt.
- **Migration ohne Datenverlust:** Das bestehende Setup wird automatisch zum ersten Profil.

+6 CI-Tests (Migration, Interface-Wechsel, Neuberechnung, Isolation, geteilte Körperdaten,
Rückwechsel). Alle drei Suiten grün.

### 43. Design-Sprung: Typografie, immersive Buttons, benennbare Tabs
Rückmeldung war eindeutig — zu wenig immersiv, zu wenig Oura-Niveau. Umgesetzt:

- **Typografie neu skaliert.** Die eingebettete Inter-Variable wurde bisher nicht ausgereizt.
  Jetzt gegenläufige optische Größen: je größer der Grad, desto **enger das Tracking und
  leichter das Gewicht** (H2 auf 28–34 px, Gewicht 520, −0,035 em; Hero-Zahlen Gewicht 250,
  −0,04 em). Genau dieser Gegenlauf trennt „Systemschrift" von redaktioneller Anmutung.
  `font-optical-sizing`, `text-wrap:balance` und Ziffern-Feature-Settings durchgehend aktiv.
- **Buttons sind immersiv statt flach.** Drei Tiefenebenen (Grundfläche, innere Lichtkante,
  weicher Schlagschatten) + **spekularer Glanz, der beim Drücken über die Fläche läuft**.
  Das Drücken ist ein echtes Eindrücken: Schatten kollabiert nach innen, Spring-Kurve statt
  linearer Skalierung. Primär-Aktion mit warmem Verlauf und kühlem Marken-Halo.
- **Frei benennbare Tabs.** Der Name der Aktivität steht unten in der Navigation — „Ausdauer
  Radfahren" erscheint als „Radfahren" (intelligente Kürzung aufs Kernwort), der volle Name
  im Kopfzeilen-Chip und als Vorlesetext. Im Editor gibt es eine **Live-Vorschau des Tabs**.
- **Redaktioneller Ausdauer-Kopf.** Statt kleiner Zeile jetzt Eyebrow + großer Titel mit dem
  Namen der Aktivität; Import als runde Primär-Aktion mit Halo.
- **Toast repariert.** Lange Meldungen brachen auf drei Zeilen mitten in den Inhalt (im
  Nutzer-Screenshot sichtbar). Jetzt einzeilige Glaskapsel über der Tab-Leiste, mit Safe-Area.
- **Gestaffelte Einblendung** der Aktivitätskarten (52 ms Versatz, Spring) — Rhythmus statt
  hartem Schlag. Alle Animationen respektieren `prefers-reduced-motion`.
- **Seriöse Voreinstellungen.** Neue Aktivität ist vollständig vorbelegt (Typ = der noch
  fehlende, Name, Ziel, Tage, Equipment) — ein Tipp auf „Anlegen" genügt. Entschieden werden
  muss nur, was man wirklich ändern will.

## §44 — Mehrere Absichten gleichzeitig, statt Entweder-oder
- **Die Persona-Weiche ist eine Mehrfachauswahl.** Wer Muskeln aufbauen UND abnehmen UND
  Rad fahren will, wählt alles. Die Reihenfolge der Auswahl ist die Priorität: Nummer 1
  führt den Fragebogen und steuert die Kalorienrichtung.
- **Aus der Auswahl entstehen so viele Profile, wie fachlich sinnvoll sind.** Gleiche
  Disziplin verschmilzt zu EINEM Profil mit kombinierten Zielen — Kraft + Abnehmen ist
  keine zweite Sportart, sondern Rekomposition: eine Ernährung, ein Plan, zwei Ziele.
  Eine andere Disziplin bleibt ein eigenes Profil mit eigener Oberfläche und eigenen Tagen.
- **Die Folge ist sichtbar, bevor sie eintritt.** Eine Vorschau im Gate zeigt die Profile,
  die entstehen — mit Zielen und Ansicht. Der Free-Tarif bekommt aus einer Kombination
  ehrlich nur das erstgenannte Ziel, benannt statt stillschweigend gekappt.
- **Alle Verknüpfungen greifen:** Kombi-Absichten belegen die Zielfrage vor, der Reveal legt
  pro Absicht ein Profil an (Nummer 1 mit den Antworten, die übrigen seriös vorbelegt), das
  Kombi-Tab zeigt die führende Absicht, und die Startansicht folgt der aktiven Aktivität.

## §45 — Fokus-Frage: gerechnete Empfehlung statt Ratespiel
- **Zwei Größen bestimmen den Hebel jeder Muskelgruppe.** Die *Deckung* — wie viel Volumen
  sie aus den Verbundübungen des gewählten Splits ohnehin bekommt (regionale Hypertrophie
  folgt der regionalen Aktivierung, Wakahara 2013). Und der *Ziel-Hebel* — wie stark sie auf
  das gesetzte Ziel einzahlt. Hebel = Ziel-Gewicht × (1 − 0,55 · Deckung).
- **Jede der drei Empfehlungen nennt Grund und Quelle** (Wakahara 2013, Schoenfeld/Ogborn/
  Krieger 2017, Maeo 2021 ×2, Kubo 2019). Split, Trainingsalter, Zweitziel und Verletzungen
  gehen mit ein; verletzte Regionen fallen raus.
- **Für Fettabbau steht die Biochemie voran:** punktuelles Abnehmen gibt es nicht —
  Bauchtraining baut kein Bauchfett ab (Vispute 2011), einseitiges Training kein Fett am
  trainierten Bein (Ramírez-Campillo 2013). Deshalb garantiert die Empfehlung im Defizit
  mindestens zwei große Muskelgruppen, und Core steht bewusst nicht drin.
- **Ein Tipp übernimmt die Empfehlung** — die Auswahl bleibt frei änderbar.

## §46 — Heute-Tab: Start-Übersicht mit sichtbarer Wirkungskette
- **Sechs Startschritte mit Fortschritt**, jeder mit den Funktionen, die er freischaltet.
  Kein Schritt steht ohne Wirkung da.
- **Fluss-Bild darunter:** links, was man einträgt; rechts, was daraus lebt. Tages-Check →
  Bereitschaft und Tagesempfehlung, geloggte Sätze → Progression und Kraft-Orakel,
  Mahlzeiten → Makros und Treue, Gewichtskurve → adaptiver Kalorien-Abgleich.
- Alles aus echten Daten abgeleitet. Ist alles erledigt, klappt die Karte zu „So hängt alles
  zusammen" ein und bleibt als Nachschlagewerk erreichbar.

## §47 — Ausdauer komplett neu strukturiert: Plan statt leerer Analyse
- **Der Ausdauer-Tab startet im PLAN.** Vorher sah ein Läufer ohne importierte Datei genau
  eine Sache: „Erste Aktivität importieren". Kein Tutorial, keine Anweisung, kein Plan.
- **Heute:** die konkrete Einheit mit Aufwärmen, Hauptteil und Auslaufen. Jeder Schritt nennt
  seinen **Zielbereich in echten Zahlen** — Pace pro Kilometer oder Watt, nicht „Zone 2".
  Am Ruhetag steht die nächste Einheit schon bereit.
- **Woche:** Mo–So mit Einheitentyp, harte Tage markiert, erledigte abgehakt. Polarisiert
  nach Seiler 2010 (~80 % locker, ~20 % hart), plus Krafttag für die Bewegungsökonomie
  (Rønnestad & Mujika 2014).
- **Aufbau:** Rampe vom heutigen Volumen zum Ziel über die volle Zieldauer, 3 Aufbau- zu
  1 Entlastungswoche. Der Zuwachs bleibt bei höchstens 10 % pro Woche — und zwar in der
  Zahl, die der Mensch liest (Nielsen 2014 zum Verletzungsrisiko großer Sprünge).
- **Zonen** in Pace bzw. Watt (Coggan / Friel-Daniels) und ein Vier-Schritt-Tutorial.
- **Zwei Ehrlichkeits-Regeln:** Ein Startwert ist kein Messwert — ohne eigenen Schwellenwert
  zeigt der Plan keine erfundenen Zonen, sondern steuert über das Sprechtempo. Und ein
  Häkchen ist keine Messung — TSS, Fitness und Form kommen weiterhin ausschließlich aus
  echten Dateien. Eine aus einer Datei geschätzte FTP wird als Schätzung gekennzeichnet.
- **Die ganze App spricht Ausdauer:** Tages-Held, Abschnitt „Heute", Wochenband,
  Start-Übersicht, Tagesroutine und die adaptive Karte folgen der aktiven Aktivität —
  ein Läufer liest nirgends mehr „Cardio", „Sätze" oder „Gewichte".

## §48 — Weniger auf einmal: Kopfzeile, Palette, Player
- **Kopfzeile lief über.** Auf einem 390-px-Gerät war sie 154 px zu breit — die drei
  Icon-Buttons lagen komplett außerhalb des Bildschirms. Jetzt trägt sie Marke,
  Aktivitäts-Umschalter und **zwei** Aktionen; die Glocke ist als Menü-Eintrag mit
  Insight-Zähler umgezogen. Der Chip ist das schrumpfende Element (mit Ellipse), nicht
  die Wortmarke. Geprüft von 320 bis 430 px, auch mit langen Aktivitätsnamen.
- **Funktions-Palette: eine Liste statt einer Wand.** Vorher: Begrüßung, Status, Suche,
  drei KI-Karten, vier Schnellkacheln und fünf horizontale Kartenreihen — über dreißig
  Elemente auf einmal. Jetzt: Suche, **höchstens zwei** Vorschläge und **fünf zugeklappte
  Kategorien** — acht Elemente beim Öffnen. Keine Funktion ist verschwunden: alle 23
  bleiben über die Kategorien und die Suche erreichbar, der Coach steht als Ausweg unten.
  Die vier Schnellkacheln waren exakte Doppelungen der Tab-Leiste und sind entfallen.
- **Player: im Training zählt Tempo.** Sichtbar bleibt, was für den nächsten Satz zählt —
  Übung, Satz-Punkte, Vorschlag in einer Zeile, Gewicht, Wiederholungen, RPE, Loggen.
  Alles Zweitrangige (Aufwärm-Rechner, Schnell-Eintrag, Tempo/RIR, Herkunft des
  Vorschlags, Verlauf der letzten Sessions) liegt hinter **einem** Tipp. Die Karte ist von
  einer Bildschirmlänge auf **456 px** geschrumpft. Der Schnell-Eintrag klappt den Bereich
  automatisch auf, und die RPE-Beschreibung sitzt jetzt in der Label-Zeile statt in einer
  eigenen. Der Scheiben-Hinweis wurde in der schmalen Zelle abgeschnitten — er nennt nur
  noch die Beladung pro Seite, das Stangengewicht steht im Scheiben-Rechner daneben.

## §49 — Analytics spricht die Sprache der aktiven Aktivität (R-2)
- Ein Läufer sah im Analytics-Tab weiterhin **Kraft-Sprache**: „Dein Trainingsvolumen diese
  Woche" in Sätzen, die Muskel-Heatmap mit MEV/MRV-Korridor und sogar Insights wie
  „peile mindestens 12 Sätze an (Fachbegriff: MEV)". Für jemanden ohne Sätze ist das falsch.
- Ausdauer-Profile bekommen an derselben Stelle jetzt: **Wochenumfang** (km bzw. Stunden,
  vier Wochen, mit dem Wochenziel des Plans als gestrichelter Linie) und die **Verteilung
  locker/hart** — das Ausdauer-Gegenstück zum Volumen-Korridor, gerechnet aus dem
  Intensitätsfaktor der importierten Einheiten und bewertet gegen den 80/20-Korridor
  (Seiler 2010). Ohne genug Daten stehen ehrliche Gate-Karten statt erfundener Zahlen.
- Kraft-spezifische Insights (Volumen-Trend in kg/Session, MEV/MRV-Warnungen) erscheinen
  nur noch für Kraft-Profile.

## §50 — Aktivitätsprofil-Übersicht + Paywall
- **Eigene Seite statt Sheet.** Der Chip in der Kopfzeile öffnet jetzt eine vollwertige
  Übersicht: jedes Profil mit Name, Zielen, Oberfläche — und der Kennzahl, die für DIESE
  Absicht zählt (Kraft: Einheiten/Woche · Ausdauer: Zielwoche und Wochenumfang, z. B.
  „Halbmarathon · Woche 1/14 · 30 km/Woche"). Ein Tipp wechselt, das Zahnrad bearbeitet.
  Erreichbar über den Chip, das Menü und den Startschritt auf „Heute".
- **Freie und gesperrte Plätze sind sichtbar** — niemand muss raten, was der Tarif hergibt.
- **Paywall.** Mehrere Aktivitäts-Profile sind das Kernkonzept von PERFORMANCE: kostenlos
  gibt es genau **ein** Profil, PERFORMANCE **drei**, ELITE **acht**. Die Grenze wird an
  EINER Stelle entschieden (`actMax()`) und greift überall — beim Anlegen, in der Übersicht
  und schon im Onboarding: Wer im Fragebogen mehr Absichten wählt, als sein Zugang trägt,
  erfährt das **vor** dem Weiter-Tippen und bekommt danach eine Karte, die benennt, was
  wartet. Nichts wird stillschweigend gekappt.

## §51 — Übungs-Detail: Varianten müssen sich verdienen
- **Abgeschnittener Knopf.** Die Varianten-Chips lagen in einer scrollenden Zeile mit
  `justify-content:center` — „Weiter Stand" ragte aus der Karte, ohne dass etwas auf
  Wischbarkeit hindeutete. Wenige kurze Chips **brechen jetzt um statt zu scrollen**;
  über alle 13 Übungen mit Varianten gemessen: 0 px Überlauf.
- **Die Auswahl war folgenlos.** `EXINFO` lieferte fest verdrahtete Muskelangaben, die
  `exInfoFor()` unabhängig von der gewählten Variante zurückgab — „Weiter Stand" zeigte
  weiterhin „PRIMÄR Quadrizeps", obwohl die Daten Gluteus und Adduktoren sagen. Jetzt
  stammen Muskelangabe **und** Körperkarte aus der Variante selbst. Getestet über alle
  Varianten: jede zeigt anderen Text und andere Einfärbung.
- **Ein Studio-Mythos ist raus.** „Enger Stand → mehr äußerer Quadrizeps (Sweep)" ist
  nicht belegt: kontrolliert gemessen unterscheidet sich die Aktivität der
  Oberschenkelstrecker zwischen den Standbreiten nicht nennenswert; nur Gesäß und
  Adduktoren nehmen mit breiterem Stand zu (Paoli et al. 2009 · Escamilla et al. 2001).
  Die Kniebeuge hat deshalb noch zwei Varianten statt drei — und die tragen ihren Beleg
  sichtbar. Für die Kniebeuge steht daneben, was tatsächlich mehr bringt als die
  Standbreite: die Tiefe (Kubo, Ikebukuro & Yata 2019).
- **Das animierte Strichmännchen ist entfernt.** Neben der anatomischen Muskelkarte wirkte
  es billig und trug keine Information, die der Bewegungstext nicht besser sagt.
  Funktion und Markup restlos raus (37 Zeilen).
- Leeres „SEKUNDÄR —" wird nicht mehr gerendert, wenn eine Variante keine Nebenmuskeln hat.

## §52 — Vierte Suite: der UI-Wächter
Drei Suiten meldeten grün, während die Kopfzeile 154 px aus dem Bildschirm ragte und ein
Varianten-Umschalter folgenlos war. Grund: 179 Prüfungen testeten **Zustand**, keine
einzige **Aussehen**. `tests/ui-guard-tests.mjs` schließt genau diese Lücke.

- **Block 0 · Selbsttest.** Jedes Messgerät wird zuerst gegen einen bekannt-wahren *und*
  einen bekannt-falschen Fall geprüft. Schlägt er fehl, bricht die Suite ab, statt grün zu
  lügen. Er hat sofort angeschlagen — mein erster Überlauf-Detektor war falsch gebaut.
- **Block 1 · Layout-Invarianten.** 16 Screens × 4 Breiten (320–430 px): kein Element ragt
  aus seinem Container, keine Seite scrollt horizontal. Bewusste Ausnahmen (scrollende oder
  abschneidende Container, absolut positionierte Deko, gedrehte Elemente) sind begründet
  übersprungen.
- **Block 2 · Differenz.** Wo der Nutzer wählen kann, muss die Wahl etwas ändern —
  Muskeltext und Körperkarte werden **getrennt** geprüft, sonst deckt eine Änderung die
  andere zu.
- **Block 3 · Persona-Durchläufe.** Fünf Personas durch alle Tabs: kein leerer Screen
  (gemessen am Inhaltsbereich, nicht am Body), keine Fremdsprache (ein Läufer liest nie
  „MEV" oder „Sätze/Woche"), keine Roh-Artefakte (`undefined`, `NaN`, `[object Object]`).

**Mutationsprobe.** Die vier Original-Bugs wurden absichtlich wieder eingebaut; alle vier
werden gefangen. Zwei davon erst, nachdem die Probe **Löcher im Wächter selbst** aufdeckte:
die verschmolzene Varianten-Signatur und die Leer-Messung am Body statt am Inhaltsbereich.

**Dabei gefundene und behobene Layoutfehler** (alle vorher unbemerkt):
Session-Anatomie-Zeilen und Player-Steppzellen ragten auf schmalen Geräten aus der Karte
(fehlendes `min-width:0`, feste Knopfbreiten), Diagramme waren breiter als ihr Kasten,
der Scheiben-Knopf schob sich per negativem Rand hinaus, und die Preiszeile lief bei
320 px um 72 px über. Zusätzlich sind zwei unbelegte Varianten-Behauptungen korrigiert:
Varianten tragen jetzt `kind` — „andere Muskeln" oder „gleiche Muskeln, anderer Reiz" —
und die App sagt das ausdrücklich, statt eine unveränderte Körperkarte unkommentiert zu lassen.

## §53 — Aktivitätsprofile auf Apple-Niveau, Teil 1: Zustand & Automatik
**P0 — der Wechsel vernichtete Arbeit.** Gemessen und behoben: `actApply()` setzte bei
jedem Wechsel `S.exOverrides={}` und überschrieb `S.schedule` mit dem Engine-Vorschlag.
Wer Übungen getauscht oder seinen Wochenplan selbst gelegt hatte, verlor beides — lautlos.
Umgekehrt war der Deload-Zyklus (`currentWeek`) **geteilt**: der Kraft-Block zog die
Radfahr-Woche mit.

Jedes Profil trägt jetzt seinen eigenen Zustand (`schedule`, `exOverrides`, `currentWeek`,
`rotationPos`, `planMode`, `blockNum`, `rotation`). Beim Wechsel wird gesichert und beim
Zurückschalten exakt wiederhergestellt. Muskelkater bleibt bewusst geteilt — der Körper ist
derselbe Mensch. Ändern sich Typ, Tage oder Ziele eines Profils, wird der gespeicherte Plan
verworfen und neu gerechnet, statt einen Plan zu erhalten, der nicht mehr stimmt.

**Automatik — das Profil folgt dem Wochenplan.** Der Kalender weiß längst, dass Montag
Kraft und Dienstag Laufen ist. Hat das aktive Profil heute frei und genau EIN anderes eine
Einheit, schlägt die App den Wechsel vor — als Karte auf „Heute", nicht als Modal. Bei
mehreren Kandidaten schweigt sie lieber. Voreinstellung ist der Vorschlag; wer die Automatik
einschaltet, bekommt den Wechsel einmal täglich still erledigt, mit Rückgängig im Toast.

**Neue Layout-Invariante im UI-Wächter:** kein sichtbarer Knopf darf auf 0 px zusammenfallen.
Sie ist aus einem echten Fund entstanden — im Vorschlagsdialog war „Wechseln" unsichtbar,
weil ein Nachbar mit `width:100%` und `flex:0 0 auto` die ganze Zeile fraß.

## Deploy
Ordner unverändert als Netlify-Site deployen (Drag & Drop oder CLI). Cache-
## §54 — Einheitlich und übersichtlich: Karten-Töne, Screen-Kopf, Gliederung

**Beschwerde:** „super unordentlich von A–Z entlang der Customer Experience".

**Befund vor dem Bauen — gemessen, nicht vermutet.** 30 Karten trugen ein
Inline-`border-color`. Appweit gilt `border:none`. Im Browser nachgemessen:
`border-style: none`, `border-width: 0px`. **Keine einzige dieser Farben hat
je gezeichnet.** Jede Karte sah aus wie jede andere — keine Hierarchie, keine
Gruppen, eine graue Fläche. Dazu: Analytics 7.652 px hoch, 17 Karten, null
Zwischenüberschriften. Fünfzehn verschiedene Zeilenhöhen. 47 verschiedene
Abstandswerte.

**Karten-System.** `data-tone` mit fünf Bedeutungen (hl/good/warn/gold/cy):
gefärbte Lichtkante oben, zarter Verlauf, schmale Kante links — kein Rahmen,
der Grundsatz „Konturen sind abgeschafft" bleibt. 26 tote Rahmenfarben
überführt, 11 doppelte Verläufe entfernt, Dichte-Stufen `pad-0/xs/s/l` statt
zwölf Inline-Paddings. Dieselbe Kur für Knöpfe (`.btn.danger/.attn/.accent`),
Chips und Warnkarten: ein Löschen-Knopf sah aus wie „Weiter".
**Inline-`border-color` in der Quelle: 45 → 0.**

**Screen-Kopf.** `scrHead(kick,title,sub,action)` — dieselbe Hierarchie wie
der Tab-Hero, ohne Szenerie. Player, Ausdauer und Aktivitätsprofile bauten
diesen Dreiklang bisher je einzeln nach. Löst nebenbei einen Widerspruch: der
Übungsname stand als Serif-`h2` *innerhalb* einer Karte — Serif ist der Name
des Screens, er steht jetzt darüber.

**Gliederung.** Analytics 5 Gruppen, Ernährung 3, Profil 4. Reihenfolge und
Inhalt unverändert, nur benannt und gefasst. Oberste Ebene: Analytics 20 → 7,
Ernährung 9 → 4, Profil 16 → 6. Gruppenkopf `.label.sect-h` ist kräftiger als
ein Etikett innerhalb einer Gruppe — vorher trugen beide Ebenen dasselbe
Gewicht, was keine Gliederung ist.

**Rhythmus.** Fließtext von sieben Werten (1,4–1,7) auf 1,55; Display auf 1,2.
Aus 15 Zeilenhöhen wurden 4. Abstände auf 2-px-Raster (118 Werte, höchstens
1 px Versatz).

**Wächter, Block 4 — und zwei eigene Fehlversuche.** Neue Regel: *eine
Deklaration, die hervorheben soll, muss auch hervorheben.* Das Messgerät
brauchte drei Anläufe:
1. Vergleich der berechneten CSS-Strings — fiel auf einen vollständig
   transparenten Verlauf herein (anderer String, identisches Bild).
2. Vergleich der PNG-Bytes — zu streng: ein transparenter Verlauf verschiebt
   das Kantenglätten runder Ecken um wenige Bytes.
3. Echte Pixelwerte mit Toleranz 3/255. Mutationstest bestanden.
Der DOM-Durchlauf allein meldete „0 geprüft" — vier Deklarationen lagen
hinter Bedingungen. Ergänzt um eine Quellenprüfung, die vollständig ist.

## §55 — Coach als eigener Tab, und ein Tab der sein Ziel nennt

**Zwei Meldungen, ein Bereich.**

### Der Tab log

Beschwerde: „wenn ich abnehmen will und unten auf mein Trainingspad drücke
steht da Abnehmen obwohl da dann mein Trainingsplan erscheint. Relativ wirr."

Nachgestellt statt nur gelesen — `tabsFor()` überschrieb die Beschriftung des
zweiten Tabs mit dem Namen des aktiven Profils:

| Profil | Tab sagte | Screen zeigte |
|---|---|---|
| Laufen | „Laufen" | Laufen — stimmig |
| Krafttraining | „Krafttraining" | Oberkörper A. — vertretbar |
| **Abnehmen** | **„Abnehmen"** | **Oberkörper A. — falsch** |

Die Regel funktionierte bei *Aktivitäten* und brach bei *Zielen*. Ein Tab wird
jetzt nach seinem ZIEL benannt („Training" / „Ausdauer"); das Symbol übernimmt
weiter die Aktivität, der Vorlesetext nennt beides („Training · Abnehmen").
Welches Profil aktiv ist, sagt der Chip in der Kopfzeile — samt Umschalter, wo
es ohnehin schon stand.

### Coach als Tab

Die KI hing bereits an acht Stellen (Coach-Blase, freies Ziel, Plan-Chat,
Plan-Foto, Essen per Text, Essen per Foto, Mahlzeit-Vorschlag, Erklärboxen).
Was fehlte, war ein großzügiger Ort für freie Fragen: die schwebende Blase war
200 px hoch, lag über dem Inhalt und war leicht zu übersehen.

Der Coach hat jetzt einen eigenen Tab mit vier Themen (Training, Ernährung,
Abnehmen, Fortschritt), Sprach-Eingabe und dem vollen Verlauf. Neu ist das
Thema **Abnehmen** — Abnehmtempo, Stagnation, Muskelerhalt, alles aus echten
Zahlen: das Abnehmtempo aus dem Körpergewicht, der Trend aus
`metabolicTwin()` (Regression über die Gewichtskurve, sonst Energiebilanz).

Platz: sechs Tabs passen nicht — bei 320 px bricht die Leiste in zwei Reihen
(gemessen: 118 px Leistenhöhe). Deshalb rückt **Profil** ganz ins ☰-Menü, wo
es ohnehin schon zweimal stand. Einstellungen öffnet man selten, den Coach
täglich. Die Blase bleibt als Abkürzung, öffnet aber den Tab statt eines
zweiten Panels — und merkt sich, aus welchem Screen sie kam, damit die
Vorschläge zum Kontext passen. Auf dem Coach-Tab selbst blendet sie sich aus.

### Wächter

Neue Regel: *jeder Tab nennt sein ZIEL, nicht den Profilnamen* — geprüft gegen
eine Positivliste über alle Profiltypen. Mutationstest bestanden: mit wieder
eingebautem Fehler meldet der Wächter „Krafttraining: Tab ,Krafttraining'" und
„Laufen: Tab ,Laufen'".

### Zwei eigene Fehler unterwegs

- Ein `typeof weightTrend==="function"`-Schutz um eine Funktion, die es nie
  gab — der hätte stillschweigend nie einen Trend gezeigt. Ersetzt durch
  `metabolicTwin()`, das die Regression wirklich rechnet.
- Das Abnehmtempo lief durch `nfi` (ganze Zahlen) und wurde zu „1–1 kg".
  Jetzt `nf`: „0,5–1 kg".

## §56 — Tableiste: lesbarer Grund, ein gleitender Anzeiger

Wunsch: „das Menü unten überarbeiten, übersichtlicher, mit Animationen,
schicker, analog Oura."

**Beim Nachmessen kam mehr heraus als „Animationen fehlen".**

*Der Seitentext las sich durch die Leiste.* Der Grund lag bei 50–72 %
Deckkraft; im Screenshot stand „Trainingstag-Ziel — enthält die Kalorien…"
quer über „Heute · Training". Beschriftungen konkurrierten mit dem Inhalt
dahinter — das war der eigentliche Grund für „unübersichtlich". Jetzt trägt
die Leiste einen deckenden Grund; der Blur bleibt für die Tiefe.

*Analytics sah immer ausgewählt aus.* Sein Symbol war dauerhaft cremefarben,
die vier anderen grau. Im Ruhezustand ist es jetzt wie jeder andere Tab und
wird nur ausgezeichnet, wenn es aktiv ist.

*Der erhöhte Knopf ragte über den Inhalt.* Der cremefarbene Kreis saß per
`margin-top:-22px` außerhalb der Leiste und überdeckte die Seite (gemessen:
9 px über der Oberkante, dazu die volle Kreishöhe). Analytics bleibt betont —
aber IN der Reihe, über Farbe statt über Höhe. Der Rhythmus der fünf Tabs
bleibt heil.

**Der gleitende Anzeiger.** Statt einer hüpfenden Pille pro Tab gibt es eine
einzige, die zwischen den Tabs gleitet (Federkurve, feines Überschwingen).
Sie zeigt nicht nur, wo man ist, sondern woher man kam.

Der erste Versuch sprang trotz Transition. Nachgemessen: 288 → 288 → 288 →
288. Ursache war nicht die CSS, sondern dass `render()` die Leiste bei JEDEM
Durchlauf komplett neu baute — das animierbare Element wurde jedes Mal
zerstört. Die Leiste erkennt jetzt an einer Signatur (Tab-Kennungen, Symbole,
Beschriftungen), ob sich die Struktur wirklich geändert hat, und aktualisiert
sonst nur den Zustand. Danach: 159 → 240 → 277 → 288 → 289 → 288. Nebenbei
entfällt bei jedem Rendern der Neuaufbau von fünf Knöpfen.

**Randfälle geprüft**
- Anzeiger sitzt auf allen fünf Tabs exakt mittig über dem Symbol (0 px
  Versatz, gemessen).
- Unter dem aktiven Analytics-Tab blendet er sich aus, sonst lägen zwei
  Hervorhebungen übereinander.
- Auf Screens, die nicht in der Leiste stehen (Profil, Preise), wird er
  unsichtbar, statt stumm auf Tab 1 zu stehen und Aktivität vorzutäuschen.
- Desktop-Seitenleiste: Anzeiger aus, Zustand über den Tab-Hintergrund.
- `prefers-reduced-motion`: Übergangsdauer 0 s, der Wechsel erfolgt sofort.

## §57 — Auswertung auf fünf Seiten, Engine-Genesis, zwei Detailfehler

### Der Moment vor der Auswertung

Nach der letzten Frage stand 1,3 Sekunden ein nackter Kreisel, dann sprang die
Auswertung ins Bild. Der teuerste Moment der App — hier entsteht der Plan —
sah aus wie ein Ladefehler.

Jetzt arbeiten vier Engines sichtbar parallel (Stoffwechsel, Training, Volumen,
Ernährung), jede mit eigenem Balken und eigener Laufzeit, damit es nach echter
Arbeit aussieht statt nach einem gleichmäßigen Fortschrittsbalken. Darunter
ziehen die Quellen durch, mit denen die Engine wirklich rechnet — Schoenfeld
2016, Israetel 2017, Helms 2014, Zourdos 2016, Morton 2018, Wolf 2024, Garthe
2011, Grgic 2018. **Keine erfundenen Titel.** Dauer 3,4 s, jederzeit durch
Antippen überspringbar, bei `prefers-reduced-motion` 0,6 s ohne Bewegung. Der
Plan wird garantiert genau einmal gebaut — auch beim Überspringen.

### Die Auswertung: fünf Seiten statt einer Wand

Beschwerde: „komplett unübersichtlich, zu viel Informationen."

Zu Recht — es war EIN Scroll mit zehn Blöcken: Ziel, Jahrespfad, Gewinne,
Start-Setup, vier USP-Kacheln, Skeptiker-Fakten, Studienbasis, Details.

Jetzt fünf Seiten mit Fortschrittspunkten, eine Aussage pro Seite. Der Inhalt
ist Wort für Wort derselbe — verteilt statt gestapelt:

| Seite | Höhe |
|---|---|
| Dein Ziel | 722 px |
| Dein Weg | 664 px |
| Dein Start | 686 px |
| Warum das wirkt | 778 px |
| Die Belege | 1.271 px |

Zwischenstand unterwegs: der erste Schnitt ergab eine Seite mit 1.758 px und
1.486 von 2.314 Zeichen — die alte Wand, nur verschoben. Nach dem Nachmessen in
zwei Seiten geteilt und die Gewinn-Liste von Seite 2 nach 3 verschoben, weil
Seite 3 sonst fast leer war. Nur die aktive Seite steht im Dokument
(`display:none`), damit weder Screenreader noch Tab-Reihenfolge durch
verborgene Inhalte laufen. Konfetti nur beim ersten Auftritt, nicht bei jedem
Blättern.

### Zwei Detailfehler aus dem Feedback

*Der blaue Kreis an der Übung.* Der Technik-Hinweis („Lengthened Partials: …")
lief durch die **Chip**-Auszeichnung — 999 px Radius, gedacht für zwei Wörter.
Bei drei Zeilen Fließtext wurde daraus eine Blase mit rundgelutschten Ecken.
Ein Hinweis ist kein Chip: eigene Klasse `.exnote` mit maßvollem Radius,
lesbarer Zeilenhöhe und Symbol an fester Position.

*„Optimal dosiert."* Klang nach Apotheke, nicht nach Training. Jetzt
**„Voll ausgereizt"** — an allen drei Stellen (Statuswort, Fließtext, Teilen-Text).

### Was die Tests dabei gelernt haben

Der Wächter fand die Regression sofort: `A.startApp is not a function`. Drei
Suiten warteten mit festen Fristen (1.700–1.900 ms) darauf, dass der Reveal
fertig ist — die Genesis davor macht jede solche Zahl falsch.

Mein erster Fix war selbst fehlerhaft: warten, bis `A.startApp` existiert. `A`
ist global und trug die Funktion aus dem VORHERIGEN Persona-Durchlauf noch, die
Schleife lief sofort durch und rief die veraltete Fassung — drei Personas
fielen um. Jetzt wird auf `S.profile` gewartet, das je Durchlauf zurückgesetzt
wird.

Ebenfalls eigener Messfehler: geprüft, ob der Start-Knopf nur auf der letzten
Seite sichtbar ist, über `getComputedStyle(b).display`. Das sagt nur etwas über
den Knopf selbst, nichts über versteckte Vorfahren — gemeldet wurde „auf allen
Seiten sichtbar", richtig war das Gegenteil. `offsetParent === null` sieht die
ganze Kette.

## §58 — Auswertung Seite 1: Konfetti raus, Kasten raus, Kurve rein

Beschwerde: „Diese Seite geht designmäßig gar nicht!! Bitte moderner."

**Zwei davon waren keine Geschmacksfragen, sondern Fehler.**

*Das Konfetti lag VOR der Schrift.* 190 Partikel auf `z-index:75`, über dem
gesamten Inhalt — ausgerechnet auf dem Screen, der den Plan verkauft, war der
Text schwer lesbar. Ersatzlos gestrichen. Den Moment trägt jetzt die Zahl
selbst: sie kommt aus der Tiefe (Maßstab + Unschärfe), statt zu hüpfen.

*Der Kasten hatte eine 1-px-Kontur.* `border:1px solid rgba(169,196,222,.4)` —
in einer App, deren Gestaltungsregel seit §54 lautet „Konturen sind
abgeschafft". Der Hero war damit das einzige Element, das noch einen Rahmen
trug, und sah entsprechend fremd aus.

**Der Umbau.** Der Moment IST jetzt die Seite: keine Box, keine Kontur, eine
Szene, die nach oben ausläuft — dieselbe Sprache wie die Tab-Heroes. Die Zahl
steht auf `clamp(52px, 16vw, 72px)` statt fix 54 px und dominiert unbestritten.

**Kurve statt Klötze.** Drei Balken lasen sich wie ein Diagramm-Platzhalter.
Jetzt eine steigende Fläche mit weicher Linie (Catmull-Rom → Bézier), die bei
0 startet und über die Meilensteine läuft; die Linie zeichnet sich, die Fläche
blendet nach, die Punkte setzen sich einzeln. Rechnerisch dieselben Zahlen.

**Ein Ausrichtungsfehler dabei gefunden und behoben:** die Werte standen unter
dem Diagramm in drei gleich breiten Spalten (Mitten bei 1/6, 3/6, 5/6), die
Punkte aber bei 1/3, 2/3, 1 — sie passten nie zusammen. Die Beschriftung sitzt
jetzt IM Diagramm, im selben Koordinatensystem wie ihr Punkt, mit
`text-anchor` start/middle/end an den Rändern. Damit stimmt die Zuordnung
unabhängig von Breite und Werten.

`prefers-reduced-motion` schaltet Zeichnen, Einblenden und Punkt-Animation ab;
Inhalt und Ausrichtung bleiben identisch.

**Eigener Fehler unterwegs:** beim Ersetzen des Balken-Blocks blieb ein
doppeltes Backtick stehen — die gesamte Datei war damit syntaktisch kaputt und
`S` existierte nicht mehr. Aufgefallen ist es sofort, weil der Test nicht auf
ein Aussehen wartete, sondern darauf, dass die App überhaupt hochkommt.

## §59 — Ein Knopf, eine Aktion

„Weiter · Dein Weg" packte Aktion UND Zielvorschau in eine Beschriftung. Oura
macht das nie: dort steht die Aktion, sonst nichts. Die Punkte darüber sagen
ohnehin, wo man steht, und die nächste Seite nennt sich beim Öffnen selbst.

- Knopf heißt jetzt schlicht **„Weiter"**.
- „Zurück" war ein zweiter gestapelter Knopf unter dem ersten — zwei
  konkurrierende Aktionen. Jetzt ein Pfeil links neben den Punkten, in einer
  Zeile. Auf Seite 1 unsichtbar, aber platzhaltend, damit die Punkte nicht
  springen (gemessen: 0 px Versatz auf allen fünf Seiten).

**Seite 2 war fast leer.** Der 12-Monats-Pfad entsteht nur bei bestimmten
Zielen; ohne ihn blieb dort eine einzige Karte und viel Nichts. Der Wochenplan
lag dagegen ganz unten im Aufklapp-Bereich vergraben — obwohl er die
konkreteste Antwort auf „wie sieht mein Weg aus" ist. Er steht jetzt als
„Deine Woche" auf Seite 2: sieben Tage, Trainingstage hervorgehoben.

**Eigener Messfehler, zum dritten Mal in dieser Familie:** geprüft, ob der
Zurück-Pfeil auf Seite 1 verborgen ist — über `offsetParent`. Das erkennt
`display:none`, aber nicht `visibility:hidden`: das Element belegt weiter Platz
und gilt als „sichtbar", obwohl der Nutzer nichts sieht. Gemeldet wurde ein
Fehler, der keiner war. `checkVisibility({visibilityProperty:true})` sieht
beides.

## §60 — Die Belege-Seite, und eine Vorabprüfung gegen kaputte Dateien

Seite 5 war die letzte, die nur geteilt und nie gestaltet wurde: EINE Karte,
770 px hoch, in der die Zahlen in einer 78-px-Spalte standen und den Text auf
fünf Zeilen quetschten. Dazu drei gestapelte Knöpfe am Ende.

Jetzt trägt jeder der vier Hebel eine eigene Karte: Zahl und Kurzform in einer
Zeile, darunter der Satz über die volle Breite (zwei bis drei Zeilen statt
fünf), darunter die Quelle. Die Aktionen sind hierarchisiert — „Plan
aktivieren" als einzige Hauptaktion, „Tage selbst wählen" und „Teilen" als
Nebenaktionen nebeneinander statt dreimal volle Breite untereinander.

### Vorabprüfung: ist die Datei überhaupt gültig?

Ich habe `index.html` in dieser Sitzung ZWEIMAL beim Bearbeiten großer
Template-Literale syntaktisch zerstört:
1. ein doppeltes Backtick beim Ersetzen des Balken-Blocks,
2. ein gerades `"` statt `“`, das eine Zeichenkette vorzeitig beendete.

Beide Male meldete der Browser nur „S is not defined", die Suite lief 20
Sekunden in einen Timeout, und ich musste die Ursache suchen. Der Wächter
prüft jetzt VOR allem anderen die Syntax jedes Script-Blocks und bricht mit
der echten Fehlermeldung ab — im Mutationstest: eine Sekunde statt zwanzig,
und die Meldung lautet „Unexpected string" statt „S is not defined".

### Derselbe Stale-State-Fehler, zum zweiten Mal

Nach dem Einbau der Genesis-Animation ersetzte ich in `app-tests` eine feste
Frist durch „warten, bis `S.profile` steht". Dort trägt `S.profile` aber den
Stand aus einem früheren Block — die Schleife lief sofort durch, die Profile
waren noch nicht gebaut, und der Test scheiterte an
`actList().find(...).id`. Wie beim Wächter zuvor: der Zustand muss ZUERST
gelöscht werden, sonst ist er kein Signal.

## §61 — Die Karte wird flach: Inhalt auf dem Grund statt in Schachteln

Drei Runden Feedback, dreimal „immer noch unübersichtlich, nicht Oura-like".
Ich habe jedes Mal lokal geflickt — einen Knopf, eine Seite, eine Karte — statt
zu messen, woran es liegt. Nachgeholt:

| Screen | Fläche, die Kasten ist | Karten | Wörter |
|---|---|---|---|
| Analytics | **86 %** | 17 | 812 |
| Training | 72 % | 3 | 281 |
| Heute | 70 % | 12 | 478 |

Eine Oberfläche, die zu vier Fünfteln aus Schachteln besteht, wirkt unruhig —
unabhängig davon, wie sauber die einzelne Schachtel ist. **Und mein Ton-System
aus §54 hat das verstärkt**, nicht gemildert: es gab 38 Karten zusätzlich
Farbe. Ich habe die App dekorierter gemacht, nicht ruhiger.

**Der Grundsatz kehrt sich um.** Inhalt steht auf dem GRUND, getrennt durch
Raum und eine Haarlinie. Eine Fläche bekommt nur noch, was eine braucht:
Kacheln, Knöpfe, getönte Hinweise. Getönte Hinweise tragen jetzt eine Kante
links und einen zarten Anlauf statt eines vollflächigen Kastens.

Ergebnis, dieselbe Messung:

| Screen | vorher | nachher |
|---|---|---|
| Analytics | 86 % | **5 %** |
| Training | 72 % | **10 %** |
| Heute | 70 % | **45 %** |

Heute bleibt höher, weil dort viele Karten in Wahrheit Knöpfe sind (Briefing,
Wochentage, Kalorien-Kachel) — die sollen eine Fläche haben. Der große Rest
sind die Start-Übersicht und die beiden Orakel-Karten.

**Auch die Kennzahl war erst falsch.** Der erste Durchlauf zählte jede `.card`,
egal ob sie noch etwas malt — und meldete 83 % statt 5 %. Eine flache Karte ist
kein Kasten mehr; gezählt wird jetzt, was tatsächlich Hintergrund oder Schatten
zeichnet.

Eine Änderung, 135 Karten, alle vier Suiten grün — der Layout-Wächter prüft 16
Screens × 4 Breiten und fand keinen Überlauf.

## §62 — Tiefe statt Länge: Analytics klappt auf

Nach dem Flachlegen der Karten (§61) blieb die Frage, wo die restlichen
Oura-Vibes fehlen. Erst gemessen, statt zu raten — drei Verdächtige
ausgeschlossen:

- **Typografie**: große Zahlen liegen bereits auf Gewicht 300, Überschriften
  auf 500–560. Leicht und ruhig, wie es sein soll. (Fund nebenbei: ein
  Vollbreiten-Plus `＋` fällt mangels Zeichen auf **Arial** zurück.)
- **Farbe**: 17 Textfarben klingt viel, aber vier Töne tragen **92 %** aller
  Vorkommen. Der Rest sind Statusfarben mit je ein bis fünf Einsätzen.
- **Lange Absätze**: in der ganzen App genau zwei über 130 Zeichen.

Der wahre Unterschied ist die **Menge**:

| Screen | Länge | Wörter |
|---|---|---|
| Analytics | **9,1 Bildschirme** | 812 |
| Heute | 5,3 | 470 |
| Ernährung | 3,8 | 353 |
| Coach | 1,3 | 83 |

Oura zeigt eine ruhige Oberfläche und legt das Detail einen Tipp weiter. Diese
App legte alles gleichzeitig auf den Tisch — an siebzehn gestapelten
Abschnitten scrollt man vorbei, statt sie zu lesen.

**Die fünf Analytics-Gruppen klappen jetzt auf.** „Das Wichtigste" ist offen,
der Rest liegt einen Tipp entfernt; wer eine Gruppe öffnet, findet sie beim
nächsten Besuch offen vor. Nichts ist verschwunden:

| | Länge | sichtbare Wörter |
|---|---|---|
| vorher | 9,1 Bildschirme | 812 |
| jetzt, eingeklappt | **3,8 Bildschirme** | **320** |
| alles aufgeklappt | 9,0 Bildschirme | 812 |

**Zwei App-Tests wurden dadurch rot** — sie prüften über `innerText`, ob
„Trainingsvolumen" und „Muskel-Heatmap" auf dem Schirm stehen. Eingeklappter
Inhalt zählt dort nicht. Die Tests klappen jetzt vor der Prüfung auf: geprüft
wird, was die Seite ANBIETET, nicht was ohne Zutun gerade sichtbar ist.

## §63 — Kopfzeile ohne Kante, Leiste mit Tiefe, jeder Screen unter vier Bildschirmen

### Die Kopfzeile war wirklich abgehackt

Drei messbare Ursachen, keine davon Geschmack:
1. **„Krafttrai…"** — der Profil-Chip kürzte. Nachgerechnet: 390 px minus
   Wortmarke (125), zwei Knöpfe (76) und Abstände lassen 144 px; „Krafttraining"
   braucht rund 170.
2. Eine harte **1-px-Kante** quer über den Schirm, unter der eine deutlich
   hellere Szene beginnt — der sichtbare Schnitt.
3. Vier gerahmte Formen nebeneinander (Chip, zwei Kreise).

Jetzt löst sich die Kopfzeile nach unten auf: Verlauf plus Maske statt Kante,
beim Scrollen verdichtet sie sich. Die Symbol-Knöpfe verlieren Kreis und
Kontur. Und die Wortmarke verschwindet unter 520 px — die Absicht gab es schon
(Regel bei 360 px), sie griff nur auf keinem üblichen Telefon. Im App-Kopf
trägt sie ohnehin keine Information; das Symbol daneben führt weiterhin nach
Hause. Ergebnis: „Krafttraining" steht vollständig.

### Die Leiste unten

Geschichtete Fläche mit Lichtkante oben und dunkler Unterkante, der Anzeiger
sitzt IM Glas: gefüllte Pille mit gefärbtem Rand und einem Schein darunter, den
man eher ahnt als sieht. Das aktive Symbol nimmt die Akzentfarbe an.

### Maximales Oura-Gefühl: Tiefe statt Länge, überall

Nach Analytics (§62) dasselbe Prinzip auf Heute — aber nur für Abschnitte, die
ERKLÄREN, nicht für das Tagesgeschäft. Zugeklappt starten „Deine Reise",
„Adaptives Training", „Diese Woche", „Analytics" und die Start-Übersicht; der
Status-Check und die heutige Einheit bleiben offen.

Die Start-Übersicht allein war **1.093 px** — ein Viertel des ganzen Screens,
dauerhaft offen, obwohl man sie nach den ersten Tagen selten braucht. Sie
bleibt vollständig, zeigt aber nur noch den Fortschritt („3 von 7 Startschritten
erledigt") und öffnet auf Tipp.

| Screen | vorher | jetzt |
|---|---|---|
| Heute | 5,3 Bildschirme · 470 Wörter | **3,6 · 246** |
| Analytics | 9,1 · 812 | **3,8 · 320** |
| Training | 3,3 | 3,3 |
| Ernährung | 3,8 | 3,8 |
| Profil | 3,3 | 3,3 |
| Coach | 1,3 | 1,3 |

**Jeder Screen liegt unter vier Bildschirmen.** Aufgeklappt sind es wieder
4.458 px und 473 Wörter — nichts ist verschwunden.

Zwei App-Tests wurden rot, weil sie über `innerText` Inhalte aus jetzt
eingeklappten Abschnitten suchten. Sie klappen vor der Prüfung auf — dieselbe
Korrektur wie in §62.

## §64 — Analytics zurück auf offen, und ein Datenverlust-Fehler

### Der Einwand war berechtigt

„Ich will die Analytics eigentlich nicht schmälern, das ist für den Kunden sehr
interessant." Nachgemessen, was das Einklappen aus §62 wirklich gekostet hat:

| | eingeklappt | aufgeklappt |
|---|---|---|
| Zahlenangaben sichtbar | 56 | **186** |
| Diagramme sichtbar | 17 | **33** |

**70 % der Zahlen und die Hälfte der Diagramme** — auf dem Screen, dessen Zweck
genau diese Analyse ist. Der falsche Tausch. Die Gruppen starten wieder offen.

Zuklappen bleibt möglich und wird gemerkt, für alle, die es kompakt wollen. Und
damit auch eine zugeklappte Gruppe ihre Substanz zeigt statt nur einer
Überschrift mit Pfeil, trägt jeder Gruppenkopf jetzt seine eigene Kennzahl:

- Dein Training — „6 Sätze diese Woche · 6 Übungen im Verlauf"
- Körper & Erholung — „+1,7 kg seit Start · 14 Erholungs-Checks"
- Ernährung — „7 Tage geloggt · Ø 2.415 kcal"
- Verlauf — „33 Einheiten · 88 % Konstanz"

Unterm Strich sind es jetzt **194 Zahlen statt 186** — mehr als vor dem Umbau.
Auf Heute bleiben die erklärenden Abschnitte zugeklappt, der Analytics-
Ausschnitt startet offen.

### Dabei einen echten Fehler gefunden: verschwindende Aktivitätsprofile

Beim Prüfen fiel eine unregelmäßig rote Suite auf. Die Ursache war kein
Testproblem:

Nach dem Onboarding bleibt `S.screen` auf „onboarding", bis der Nutzer den Plan
aktiviert. Jedes weitere `render()` lief deshalb erneut in den Reveal-Zweig —
**die Genesis startete nochmal, und ihr Rückruf baute Profil UND
Aktivitätsprofile aus `S.a` neu.** Nachgestellt: ein frisch angelegtes
Laufprofil war vier Sekunden später verschwunden (2 Profile → 1,
Ausdauer-Ansicht → Kraft-Ansicht).

Der Reveal muss sich neu zeichnen lassen, ohne den Plan neu zu rechnen. Eine
Marke (`S.planBuiltFor`) hält fest, dass für diesen Durchlauf gebaut wurde; ein
Rücksprung in den Fragebogen löscht sie wieder.

### Und zwei Testfehler, die das verdeckt hatten

1. Die Tests verließen den Reveal nie — `S.screen` blieb „onboarding", also
   zeigte jedes `render()` die Auswertung statt des angeforderten Tabs. Sie
   wechseln jetzt in die App, wie ein Nutzer es mit „Plan aktivieren" tut.
2. Ein Block erbte sein Laufprofil vom Nachbarblock. Mal war es da, mal nicht.
   Er legt es jetzt selbst an, wenn es fehlt — und zwar VOR dem Zählen.

Vier Läufe der App-Suite hintereinander grün, die übrigen drei je zweimal.

## §65 — Rundum-Prüfung aller zwölf Screens

Bisher habe ich sechs Screens gemessen und dort verbessert. Die App hat zwölf.
Derselbe Maßstab über alle — Länge, Textmenge, Kastenfläche, abgeschnittener
Text:

| Screen | Schirme | Kastenfläche | Befund |
|---|---|---|---|
| Player | 1,2 | 0 % | sauber |
| Abschluss | 0,9 | 25 % | sauber |
| Aktivitäten | 0,8 | 0 % | **Text abgeschnitten** |
| Coach | 1,3 | 16 % | sauber |
| Funktionen | 1,3 | 52 % | sauber |
| Preise | 2,2 | 0 % | sauber |
| Ausdauer | 2,6 | 22 % | **Text abgeschnitten** |
| Profil | 3,3 | **69 %** | höchster Wert der App |
| Heute · Training · Ernährung | 3,3–3,8 | 10–32 % | sauber |
| Analytics | 9,0 | 5 % | bewusst lang (§64) |

**Drei Funde, alle behoben:**

1. *Aktivitäten* — die Zusammenfassung einer Aktivität („Muskelaufbau · 4
   Einheiten/Woche") lief einzeilig mit Ellipse und wurde abgeschnitten. In
   einer Karte ist Platz für zwei Zeilen, begrenzt auf zwei.
2. *Ausdauer* — im Wochenstreifen lassen sieben Spalten rund 48 px; „Grundlage"
   braucht vier mehr und wurde immer gekürzt. Darf jetzt umbrechen.
3. *Profil* — dreizehn gestapelte Aufklapp-Karten, 69 % Kastenfläche. Jetzt eine
   flache Liste mit Trennlinien, wie Einstellungen überall aussehen; die Fläche
   kommt zurück, sobald eine Zeile geöffnet ist und damit Inhalt trägt.
   **69 % → 43 %.**

Außerdem das `＋` im Tagesform-Ring: das Vollbreiten-Zeichen fehlt im Font und
fiel auf Arial zurück — jetzt ein normales Plus in der Hausschrift.

## §66 — Der Korridor: das abstrakte Signal über jeder Gruppe

Aus der Oura-Prüfung (§Bericht) war Priorität 1: Ouras drei Darstellungsebenen
lauten **abstrakt → fokussiert → explorativ**. METRICGYM stand umgekehrt da —
gemessen 6 Ringe gegen 29 Detailgrafiken. Der Blick bekam keine Antwort, bevor
er zu lesen anfing.

**Nicht Ringe kopiert.** In dieser App ist die wahre Form das *Band*: MEV–MRV
ist ein Korridor, ein Kalorienziel ist ein Korridor, Erholung hat einen
persönlichen Bereich. Ein Bauteil, vier Gruppen — Wert, Band, Verlauf,
Zustandsfarbe. Damit fällt Priorität 2 (Referenzbereiche) im selben Zug mit an:
jede Zahl steht ab jetzt in ihrem Bezugsrahmen statt allein.

Jedes Band kommt aus echten Werten, keines ist geschätzt:

| Gruppe | Band | Quelle |
|---|---|---|
| Dein Training | Summe der MEV–MRV-Korridore der trainierten Muskeln | Israetel 2017 |
| Körper & Erholung | dein Mittel ± Streuung aus den Erholungs-Checks | eigene Historie |
| Ernährung | Tagesziel ± 10 % | eigenes Ziel |
| Verlauf | 80–100 % Planerfüllung | eigener Plan |

Fehlt die Grundlage, erscheint **kein** Band — lieber nichts als eine erfundene
Spanne. Der Verlauf der letzten sechs Werte steht als feine Striche hinter der
Skala: Drift ohne Diagramm.

**Farbe signalisiert, sie schmückt nicht** (Ouras zweite Säule): im Band ruhig,
darunter gedämpft — zu wenig ist nicht gefährlich —, darüber Achtung.

### Zwei eigene Korrekturen beim Bauen

1. *Dopplung.* Der Gruppenkopf trug seine Kennzahl UND darunter den Korridor:
   „6 Sätze diese Woche" stand zwei Zeilen später nochmal. Wo ein Korridor
   steht, ist er die Zusammenfassung; die Kennzahl entfällt dort.
2. *Falsche Semantik.* Das Band nahm die Zustandsfarbe an — der Korridor wechselt
   aber nicht die Farbe, nur weil man gerade darunter liegt. Das Ziel bleibt das
   Ziel; den Zustand trägt allein die Marke.

Ergebnis: **vier abstrakte Signale vor 33 Detailgrafiken** statt sofort Detail.

## §67 — Das Feld: eine Szene für Landing und Heute

Wunsch: beide ersten Begegnungen sollen herausstechen — die Landing-Page für
Neukunden, der Heute-Tab für Bestandskunden. „In 4K Ultra HD."

**Zum 4K, ehrlich gesagt:** ein Bild dieser Größe kann das Paket nicht tragen
(es liegt bei 1,9 MB gesamt). Eine generative Szene schon — und sie ist die
bessere Antwort: gezeichnet wird in der ECHTEN Pixeldichte des Geräts
(devicePixelRatio bis 3×). Gemessen auf dem iPhone 13: **1.146 × 1.866 echte
Pixel** auf 390 × 635 CSS-Punkten. Auf einem 4K-Monitor sind es volle 3.840 —
ein festes Bild wäre dort bereits interpoliert. Kosten: rund zwei Kilobyte Code.

**Das Feld ist die These der Seite als Bild.** „Rate nicht, ob dein Training
wirkt. Wisse es." — außen driften die Punkte im Rauschen, zur Fokusachse hin
richten sie sich zu einer glatten Welle. Rauschen wird Signal. Geordnete Punkte
leuchten stärker als ungeordnete, das Signal hebt sich also selbst hervor.

**Auf Heute trägt die Szene Information, nicht Stimmung:** die Ordnung des
Feldes kommt aus der Tagesform. Guter Tag, geordnete Bewegung; zäher Tag, mehr
Streuung. Ohne Check bleibt sie neutral.

**Die Partikel-Kugel ist aus dem Landing-Hero raus.** Zwei Partikelsysteme
übereinander schwächen sich; die Kugel steht weiter als Marke in der Navigation.
Dadurch kommt die Aussage sofort statt als drittes Element.

### Zweimal denselben Fehler gemacht und beide Male korrigiert

Erst lief das Feld quer durch den Fließtext — genau das, was ich an der
Tableiste kritisiert hatte (§56: Text, der gegen den Hintergrund ankämpft).
Beide Male mit Komposition gelöst, nicht mit Übermalen:
- *Landing*: die geordnete Welle wanderte auf 80 % Höhe, unter die Kopie; die
  Kopie bekam einen weichen radialen Grund, der zu den Rändern verschwindet.
- *Heute*: eine Maske hält das Feld dort stark, wo der Ring steht, und blendet
  es über der Begrüßung und unter der Überschrift aus.

Rücksichten: pausiert außerhalb des Sichtfelds und bei verborgenem Tab; bei
`prefers-reduced-motion` wird ein ruhiges Standbild komponiert und angehalten —
die Szene bleibt, die Bewegung nicht.

## §68 — Die Spuren raus: minimalistisch, wie es sein sollte

Rückmeldung: „Die Spuren sind viel zu viel! Würde Oura niemals machen!
Minimalistisch halten!"

Berechtigt, und mein Fehler. Auf „ballern" habe ich mit **mehr** geantwortet
statt mit **besser** — 2.400 Partikel, die Schweife quer über den Schirm zogen.
Genau das Gegenteil dessen, wofür ich die ganze Sitzung argumentiert habe
(§61 Karten flach, §56 Text gegen Hintergrund). Ouras Atmosphäre ist fast
unsichtbar; man spürt sie, statt sie zu sehen.

**Ursache der Schweife:** das Bild wurde je Einzelbild nur halb gelöscht
(`rgba(...,0.055)` statt Vollflächen-Löschen). Dadurch blieben die alten
Positionen stehen und wurden zu Streifen. Jetzt wird vollständig gelöscht — es
bleiben ruhige Punkte statt Bahnen.

| | vorher | jetzt |
|---|---|---|
| Punkte | bis 2.400 | bis 460 |
| Deckkraft (geordnet) | 0,72 | 0,39 |
| helle Bildpunkte, Landing | 5.485 | **29** |
| helle Bildpunkte, Heute | 4.657 | **36** |

Dazu halb so schnell und mit kürzerem Weg je Bild. Der erste Versuch ging mit
12 bzw. 9 Bildpunkten zu weit — da war es abwesend statt zurückhaltend; die
jetzige Stufe liegt dazwischen.

Die Idee bleibt: außen Rauschen, zur Fokusachse hin Ordnung, und auf Heute
kommt diese Ordnung weiterhin aus der Tagesform. Nur trägt sie jetzt so leise,
wie sie soll.

## §69 — Lichtfeld statt Partikel; und der Tagesform-Check wirkt doch

### „Macht der Tagesform-Check wenig Sinn?"

Ich war nahe dran zuzustimmen — und das wäre **falsch** gewesen. Nachgesehen:
`readinessToday()` nimmt den Check als Hauptquelle und speist die
Autoregulation. Bei „Mäßig" gehen die Sätze auf **85 %**, bei „Erholung" auf
**65 %** (`sets * R.mult`), dazu ein RIR-Ziel. Ohne Check und ohne Wearable
gibt es **gar keine** Autoregulation.

Der Check ist also nicht folgenlos — aber er **fühlt** sich so an, und das ist
ein echter Mangel: Die Wirkung stand nur im Trainings-Tab hinter einem Banner.
Dort, wo man vier Fragen beantwortet, kam eine Zahl und sonst nichts.

Jetzt sagt die App direkt nach dem Check, was sich geändert hat:
- schlechter Tag → „Training heute −35 % Sätze · Ziel RIR 2" mit Sprung dorthin
- guter Tag → „Volle Sätze heute — deine Erholung trägt es"

### Das Medium war falsch, nicht die Lautstärke

Erst zu viel (Schweife), dann zu wenig (Staub). Zweimal dieselbe Idee in
anderer Dosis — der Fehler lag eine Ebene tiefer: **Partikel sind Körnung.**
Oura arbeitet mit großflächigem, weichem Licht.

Das Feld besteht jetzt aus fünf driftenden Lichtern im blau-silbernen Band der
Marke, additiv überlagert, auf langsamen Lissajous-Bahnen. Dazu:
- **Korn gegen Streifenbildung**: weiche Verläufe zeigen auf dunklem Grund sonst
  sichtbare Ringe. Ein Hauch Rauschen löst sie auf — das ist der Unterschied
  zwischen „Verlauf" und „hochwertig".
- Gezeichnet wird auf 42 % Fläche und hochskaliert: bei weichem Licht sichtbar
  verlustfrei, aber ein Vielfaches günstiger.
- Die Kohärenz kommt auf Heute weiterhin aus der Tagesform.

**Und meine Schleier haben die Szene erstickt.** Sie stammten aus der
Partikel-Zeit, wo Körnung von der Schrift weggehalten werden musste. Gemessen
war der Canvas hell (Mittel 194, Spitze 595 von 765) — sichtbar war fast
nichts. Weiches Licht greift Text nicht an; die Schleier sind raus, nur ein
weicher Auslauf nach unten bleibt.

### Dritte Ursache der unregelmäßigen Suite

In §64 hatte ich zwei Ursachen behoben und die Suite für stabil erklärt. Sie
war es nicht. Die dritte: `actAutoRun()` wechselt beim Rendern einmal täglich
das aktive Profil. In der App gewollt und mit Rückgängig versehen — im Test zog
es dem Ausdauer-Block das Profil unter den Füßen weg. Dort ist die Automatik
jetzt stillgelegt; drei Läufe hintereinander grün.

## §70 — Der USP: nicht „wissenschaftlich", sondern nachprüfbar

**Die Frage war: ist die Wissenschaft der USP?** Halb. „Wissenschaftlich
fundiert" behauptet jede Fitness-App — Freeletics, Fitbod, Alpha Progression,
Dr. Muscle, JuggernautAI. Was alle sagen, unterscheidet niemanden; es ist
Eintrittskarte, kein Vorsprung. Und „40+ Studien" ist eine *Mengen*behauptung,
das Erkennungszeichen der Nahrungsergänzungs-Werbung — ausgerechnet bei dem
Publikum, das Belege ernst nimmt, zahlt sie negativ ein.

**Der echte Unterschied steht längst im Code: die Rechnung liegt offen.**
Andere Apps geben dir eine Zahl. METRICGYM gibt dir die Zahl, das Toleranzband,
in dem sie liegt, den Grund und die Arbeit. Das ist mit einer Marketingzeile
nicht kopierbar — dafür müsste ein Wettbewerber die App neu bauen.

**Gebaut:**
- **Quellen-Register** (`QUELLEN`, 41 Regeln / 57 Arbeiten). Links steht in
  Alltagssprache, *was die Regel in der App tut*, rechts die Arbeit. Zitate
  stehen so, wie der Code sie führt (`src:`-Felder, `why:`-Texte) — keine
  erfundenen Journale, keine erfundenen DOIs.
- **Der Beleg im Hero** (`.lp-beleg`): `corridorHTML()` — exakt die Komponente
  aus der App, kein Werbebild. Ein Blick: 16 Sätze, Korridor MEV 10–MRV 20,
  Israetel 2017. Das Versprechen wird gezeigt, nicht behauptet.
- **Die Kachel ist antippbar** → Register. Eine Behauptung, die man sofort
  prüfen kann, ist keine Behauptung mehr.
- **Register auch in der App** (Menü). Die Landing sagt „nachprüfbar in der
  App" — ohne diesen Eintrag wäre das für jeden Angemeldeten eine leere Zusage.

**Drei eigene Fehler, gefunden und behoben:**
1. Die erste Zählung ergab 66 — sie zählte „MEV–MRV", „DUP" und Journalnamen
   als eigene Arbeiten. Jetzt zählt nur, was eine Jahreszahl trägt.
2. Danach 58 — darin Seiler 2010 und Helms 2014 doppelt, weil dieselbe Arbeit
   an zwei Stellen unterschiedlich ausführlich zitiert ist. Normalisierung auf
   Erstautor + Jahr: **57**. Lieber untertrieben als aufgeblasen.
3. Der Beleg drückte den Haupt-CTA unter die Falz (gemessen: y=639 bei 664 px
   Fensterhöhe). Text gestrafft, Polster reduziert → y=551, ganz sichtbar.
   Ein Beweis, der den Startknopf verdrängt, kostet mehr als er bringt.

**Und eine Drift, die schon live war:** die `<meta>`-Beschreibungen trugen
weiterhin „über 40 Studien" — eine zweite, eingefrorene Zahl neben der
gerechneten. In Google und in jeder Link-Vorschau stand die falsche. Die Zahl
ist dort jetzt raus; sie existiert auf der Seite genau einmal und kommt aus
`quellenZahl()`.

**Wächter (`ui-guard`, Block 5):** die genannte Anzahl muss dem Register
entsprechen, jede Regel eine Jahreszahl tragen, jede Arbeit sagen was sie
steuert, das Register im Menü stehen, und keine zweite handgepflegte
Studienzahl auf der Seite existieren. Mutationsgetestet: erfundene Zahl,
entfernter Menüeintrag und geschmuggeltes „über 90 Studien" werden alle drei
rot. Die Umlaute im Register waren zuerst als `ae/oe/ue` geschrieben — 63
Stellen korrigiert.

## §71 — Animation, Sprache, Abstand. Und ein Bug, den die Flakiness verdeckt hat

**Die Animation war messbar tot, nicht Geschmackssache.** Die alten Lichter
liefen auf Lissajous-Bahnen mit `fx` zwischen 0,04 und 0,11 — nachgerechnet
sind das **95 bis 260 Sekunden für eine volle Runde**. Wer acht Sekunden auf
die Seite schaut, sieht davon 30 Grad Bahn. Gemessen am Canvas: nach 8 s lag
die größte Pixeländerung bei **21/255**, im Mittel 2,2. Das liegt unter der
Wahrnehmungsschwelle für weiche Verläufe. Der Fehler steckte in der Periode,
nicht in Farbe oder Dichte — beides hatte ich vorher zweimal falsch verstellt.

Neu: **ein Lichtband** statt runder Flecken.
- Periode steht in **Sekunden** im Code (13–34 s) — sie kann nicht mehr
  unbemerkt ins Unsichtbare rutschen, man liest sie ab.
- Zeit läuft in **echten Sekunden**, nicht in Frames. Auf 120 Hz lief das alte
  Feld doppelt so schnell wie auf 60 Hz.
- **Hell-Dunkel statt mehr Farbe:** die Marke ist ausdrücklich „kühl &
  hochwertig", mehr Sättigung würde sie brechen. Zwei sehr große dunkle Massen
  tragen das Band, darin sitzt EIN kleiner heller Kern. Fünf gleich helle
  Flecken ergaben vorher Dunst.
- Achse von 0,80 auf 0,52: das Band lag vorher genau dort, wo `.lp-hero::after`
  abdunkelt — es leuchtete gegen den eigenen Schleier an, während die
  Schlagzeile auf Schwarz stand.

Ergebnis gemessen: nach 8 s **14,1 mittlere / 98 maximale** Änderung statt
2,2 / 21 — **6,4× mehr Bewegung**. Helligkeitsspanne im Feld 36 → 564 von 765.

**Sprache: zwei eigene Schnitzer.** „Trainingsplan mit **offener Rechnung**"
heißt im Alltagsdeutsch *ungetilgte Schuld*, nicht Transparenz. Und „jede Zahl
hat einen **Beleg**" hört ein normaler Mensch als **Kassenbon**. Ich hatte wie
ein Ingenieur geschrieben, der sein System rechtfertigt. Jetzt aus Kundensicht:

> KRAFTTRAINING · ABNEHMEN · AUSDAUER
> **Ein Plan, der sich erklärt.**
> Warum 16 Sätze Brust — und nicht 25? Bei METRICGYM steht die Antwort
> daneben. Aus 57 wissenschaftlichen Quellen, nicht aus dem Bauch.

Frage → Antwort → Quelle, in drei Blicken; der Beweis darunter beantwortet die
Frage sofort. „Arbeiten" (Fachjargon) heißt überall „Quellen" — korrekt, weil
auch Fachbücher dabei sind, und für jeden verständlich.

**Abstand:** `.lp-sec` hatte 46 px oben UND unten — bei neun Abschnitten 830 px
reines Polster. Einheitlich auf 34 px.

**Der Bug, den die Flakiness verdeckt hat.** Der Ausdauer-Block der App-Suite
war seit Wochen unregelmäßig rot. Ich habe zuerst falsch geschlossen, meine
Änderungen seien schuld (je ein Lauf pro Seite — zu wenig). Drei weitere Läufe
zeigten: es ist die Flakiness. Die Ursache war aber kein Testartefakt:

`"a"+Date.now().toString(36)` war der **einzige ID-Generator der Datei ohne
Zufallsanteil** — alle anderen hängen `Math.random()` an. Zwei Profile, die in
derselben Millisekunde entstehen, bekommen dieselbe ID. `actCurrent()` findet
dann das erste: **der Nutzer legt „Laufen" an und bekommt „Krafttraining"
aktiviert**, und das Umschalten zwischen beiden bleibt dauerhaft kaputt.
Bewiesen mit eingefrorener Uhr — vorher `["amtmjz2j8","amtmjz2j8"]`, aktiv
„Krafttraining"; nachher getrennte IDs, aktiv „Laufen".

Behoben in beiden Profil-Generatoren, dazu dieselbe Härtung bei eigenen
Übungen (`cx`) und Mahlzeit-Vorlagen (`tp`). **Selbstheilung** in `actList()`:
wer bereits doppelte IDs gespeichert hat, bekommt sie einmalig getrennt — sonst
bliebe sein Umschalten für immer kaputt. Zwei neue Tests sichern das ab; beide
sind gegen den alten Code rot.

## §72 — Deutsch statt Übersetzung; der wartende Ring; ein Knopf, der Klicks stahl

**Der Vorwurf „klingt übersetzt" war messbar richtig.** Gezählt im *gerenderten*
Text der beiden Kundenschirme — nicht im Code, wo englische Bezeichner in Ordnung
sind: **34 sichtbare Anglizismen**, 17 auf der Landing, 17 auf Heute.
„vom Satz zum Log", „Übungen, die die Engine versteht", „Ziel, Level, Equipment",
„Player starten", „Analytics-Insights", „Einen Tag Ernährung tracken", „STREAK",
„LEVEL", „Tages-Briefing", „Homescreen". Entwicklersprache sickert beim Bauen von
selbst in die Oberfläche.

Dazu drei Konstruktionen, die im Deutschen schlicht nicht funktionierten:
- **„Den Rest rechnet sie."** und **„Du loggst. Sie denkt."** — „sie" hatte kein
  Bezugswort. Der Leser weiß nicht, wer da denkt.
- **„alles, was die Intelligenz wissen muss"** — „die Intelligenz" als handelnde
  Person ist keine deutsche Wendung.
- **„Keine Versprechen. Ansichten."** — „Ansichten" heißt Meinungen *oder*
  Bildschirme. Beides gemeint, nichts verstanden.

Und ein **Template-Fehler**, kein Tippfehler: `${tLabel}` + `"-Plan"` erzeugte auf
Heute wörtlich **„Training-Plan"**. Der Bindestrich stammte aus dem Code, nicht
aus der Sprache.

Bewusst *nicht* geändert: **„Tracking"** im Datenschutzsatz — das ist etabliertes
Deutsch, keine Übersetzungsspur. Und **„Gym"** ist im Sprachgebrauch angekommen.

Der Tab heißt jetzt **Auswertung** statt Analytics (der Schlüssel `analytics` im
Code bleibt), „Arbeiten" heißt überall **Quellen** — korrekt, weil auch Fachbücher
dabei sind, und für jeden verständlich.

**Wächter (`ui-guard`, Block 6):** 15 Begriffe, geprüft am sichtbaren Text beider
Schirme. Er hat sich sofort bezahlt gemacht — **fünf weitere Stellen**, die ich
von Hand übersehen hatte, wurden nacheinander rot: „Analytics-Tab", „letzten
Sessions", der Funktions-Hinweis, der Demo-Hinweis und der Checklisten-Fuß.

**Der wartende Ring.** Ohne Tagesform stand auf Heute ein 184-px-Kreis mit 7-px-Rand
in 7 % Weiß — praktisch unsichtbar, und geometrisch ein *anderes* Objekt als der
gefüllte Ring (voller Kreis statt 3/4-Bogen). Morgens sah man etwas Unfertiges,
abends plötzlich etwas anderes. Jetzt ist es derselbe Bogen mit derselben Bahn,
nur ohne Füllung; ein kurzes Segment wandert langsam entlang und sagt „hier fehlt
deine Eingabe", ohne zu blinken. Bei reduzierter Bewegung steht es still.

**Der Knopf, der Klicks stahl.** Die schwebende Coach-Blase ist ersatzlos entfallen.
Seit der Coach einen eigenen Tab hat, führte sie an dasselbe Ziel wie die immer
sichtbare Tab-Leiste — und bezahlt hat das die Hauptaktion: gemessen überlappte sie
auf Heute den Knopf „Tages-Check starten" um **5 × 53 px**, und in diesem Streifen
gewann *sie* den Klick (`elementFromPoint` → `fab`). Wer rechts auf den Knopf zielte,
landete im Coach. Ein Ziel, ein Weg.

## §73 — Lesbarkeit über bewegtem Licht: was messbar war und was nicht ging

**Der Befund war eindeutig und mein Fehler.** Gemessen nach WCAG, über einen
ganzen Lichtzyklus, mit ausgeblendeter Schrift (sonst ist das hellste Pixel in
der Textbox die Schrift selbst und man misst immer 1,00:1):

| | vorher | nötig | jetzt |
|---|---|---|---|
| Kategoriezeile | 6,2:1 | 4,5 | **9,3:1** |
| Schlagzeile | 4,2:1 | 3,0 | **17,4:1** |
| **Vorspann** | **1,13:1** | 4,5 | **10,6:1** |
| Beleg-Kleinzeile | 1,01:1 | 4,5 | **5,7:1** |
| Beleg-Text | 1,04:1 | 4,5 | **5,8:1** |

1,13:1 heißt: der hellste Grund unter dem Satz war **heller als die Schrift**.
Entstanden aus drei eigenen Runden — heller Kern (a 0,78), Band in die Bildmitte
(achse 0,52) und der Schleier, den ich zwei Runden vorher entfernt hatte.

**Acht Anläufe, und die Erkenntnis war strukturell.** Radiale Ellipsen scheiterten
alle am selben Punkt: zog man sie groß genug, dass die unterste Zeile geschützt
war, verdunkelten sie den halben Hero; zog man sie enger, fiel je nach Stand des
wandernden Lichts entweder die Kategoriezeile oder der Vorspann durch. Der Grund:
eine Ellipse deckt einen **rechteckigen** Textblock ungleich. Gelöst mit einer
weichgezeichneten Fläche und **festem** Eckradius — `44% / 36%` machte daraus
wieder eine Ellipse, deren Ecken genau die unterste Zeile freigaben (2,5:1).

**Die ehrliche Grenze:** Auf einem 390-px-Hero, der zu ~90 % aus Text besteht,
schließen sich helles Wanderlicht und WCAG-lesbare Schrift hinter derselben
Fläche geometrisch aus. Gemessen: jede Einstellung, die das Licht dramatisch
machte, drückte Text unter 4,5:1; jede, die den Kontrast rettete, ließ vom Band
15–25 von 255 übrig. Deshalb liegt das Band jetzt auf **Höhe der Glaskarte** und
nicht hinter dem Fließtext — dort darf Licht hindurch, weil die Weichzeichnung
ihm die Struktur nimmt und nur die Farbe stehen lässt. Die Karte ist von 88 % auf
70 % Deckung geöffnet worden und leuchtet jetzt sichtbar.

**Zum „4K"-Wunsch, gemessen statt behauptet:** Das Feld lief auf 42 % Auflösung
und wurde hochskaliert. Volle Gerätepixel kosten das 5,6-Fache an Fläche für ein
Viertel der Bildrate (20 → 15 Bilder/s) und bringen bei **reinen Weichverläufen**
fast nichts — dort steckt per Definition keine feine Struktur. Jetzt 0,62 als
ehrlicher Mittelweg. Was ein Bild wirklich hochwertig macht, ist nicht die
Rechenauflösung des Nebels, sondern das Korn darüber (volle Gerätepixel) und die
scharfen Elemente davor.

**Wächter (`ui-guard`, Block 7):** WCAG AA für jede Hero-Zeile. Zwei Eigenheiten,
die den Test überhaupt erst aussagekräftig machen — die Schrift wird samt aller
Nachkommen unsichtbar geschaltet, und der Lichtzyklus wird **deterministisch**
abgefahren (18 Stützstellen über die längste Periode, `inst.sek` direkt gesetzt).
Der erste Versuch mit 8 Echtzeit-Proben über 8,8 s verfehlte den schlechtesten
Moment eines 34-s-Zyklus und blieb bei absichtlich zerstörter Bühne grün.
Mutationsgetestet: Bühne auf 10 % → rot (1,64:1).

Version aktuell **v53** — Nutzer bekommen Updates beim nächsten Besuch
automatisch. (`vendor/zxing/` ist entfernt; falls three.js lokal gewünscht
ist, kann `vendor/three.min.js` hinterlegt werden, sonst lädt es vom CDN.)
Für C4/KI-Proxy: `supabase/functions/ai-proxy` deployen + Secrets setzen,
SQL aus `SUPABASE_SETUP.md` Abschnitt 4 ausführen ([BETREIBER]).
