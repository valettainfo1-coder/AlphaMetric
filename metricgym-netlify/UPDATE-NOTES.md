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

Version aktuell **v40** — Nutzer bekommen Updates beim nächsten Besuch
automatisch. (`vendor/zxing/` ist entfernt; falls three.js lokal gewünscht
ist, kann `vendor/three.min.js` hinterlegt werden, sonst lädt es vom CDN.)
Für C4/KI-Proxy: `supabase/functions/ai-proxy` deployen + Secrets setzen,
SQL aus `SUPABASE_SETUP.md` Abschnitt 4 ausführen ([BETREIBER]).
