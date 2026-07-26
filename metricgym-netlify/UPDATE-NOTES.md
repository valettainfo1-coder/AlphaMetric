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

## Deploy
Ordner unverändert als Netlify-Site deployen (Drag & Drop oder CLI). Cache-
Version aktuell **v16** — Nutzer bekommen Updates beim nächsten Besuch
automatisch. (`vendor/zxing/` ist entfernt; falls three.js lokal gewünscht
ist, kann `vendor/three.min.js` hinterlegt werden, sonst lädt es vom CDN.)
Für C4/KI-Proxy: `supabase/functions/ai-proxy` deployen + Secrets setzen,
SQL aus `SUPABASE_SETUP.md` Abschnitt 4 ausführen ([BETREIBER]).
