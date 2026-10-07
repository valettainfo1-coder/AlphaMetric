# Arbeitsregeln für dieses Projekt

## Maßgeblich: `docs/AUFTRAG.md`

Der Rebrief „Prüfbares Training" in [`docs/AUFTRAG.md`](docs/AUFTRAG.md) ist der
gültige Auftrag für alle Sessions, bis er ersetzt wird. Er geht den Regeln hier
vor, wo beides etwas zum selben Punkt sagt. Insbesondere:

* **Paketweise arbeiten.** Pro Paket Kurzplan (max. 10 Zeilen) → Umsetzung →
  Tests → STATUSBERICHT im Format aus Abschnitt 9. Nie mehrere Pakete in einem
  Commit, Paket-ID im Commit-Titel (`A3: …`).
* **Ein Branch pro Phase:** `phase1-fundament`, `phase2-pruefschleife`,
  `phase3-launch`. Nichts auf `claude/landing-app-redesign-*`.
* **Nicht verhandelbar** (Abschnitt 4): keine erfundenen Quellen, DOIs oder
  Nutzerzahlen; keine LLM-Zahl, die der Nutzer als Ergebnis sieht; local-first
  bleibt; Nutzerdaten werden migriert, nie verworfen; keine Aussage über
  Ergebnisse ohne Spanne.
* **Bestandsaufnahme:** [`docs/PARAMS-INVENTUR.md`](docs/PARAMS-INVENTUR.md) —
  87 Stellgrößen, 42 davon ohne Quelle, fünf Widersprüche W1–W5.

**Achtung Repository:** `origin/main` trägt ein anderes Projekt (Next.js). Das
gesamte METRICGYM hängt allein an der Linie, die mit
`claude/landing-app-redesign-d4ejyc` begann; `phase1-fundament` ist davon
abgezweigt, nicht von `main`.

## Nach JEDEM Update: zwei Pakete ausliefern

Der Nutzer hat das als Dauerauftrag gesetzt. Es gilt für jede Änderung am
Code, nicht nur für große.

```
./pakete.sh
```

Erzeugt im Projektstamm:

* `A-metricgym-netlify-vNN-JJJJ-MM-TT.zip` — Ordner `metricgym` bei Netlify
  reinziehen
* `B-METRICGYM-iOS-JJJJ-MM-TT.zip` — auf dem Mac/in GitHub Actions bauen

**Beide mit `SendUserFile` schicken**, nicht nur erwähnen. Und vorher die
Version in `metricgym-netlify/sw.js` hochzählen, wenn sich `index.html`
geändert hat — sonst bekommen bestehende Nutzer die alte Fassung aus dem
Cache.

`pakete.sh` läuft erst die Tests und bricht ab, wenn eine Suite rot ist. Es
prüft außerdem jedes Paket nach dem Packen: fehlende Dateien, Schlüssel, die
nicht hineingehören, E-Mail-Adressen in der öffentlich ausgelieferten
`config.js`, die Unversehrtheit des Xcode-Projekts und ob App und Server
dieselben Produkt-Kennungen kennen. Jeder dieser Punkte war schon einmal
kaputt, ohne dass man es beim Packen gesehen hätte.

## Was dieses Projekt ist

* `metricgym-netlify/` — die App. Eine einzige `index.html` (~16 300 Zeilen),
  kein Bundler. Zustand in `S`, `save()` schreibt nach localStorage,
  `render()` verzweigt über `S.tab`, Handler hängen an `window.A`.
* `metricgym-app/` — dieselbe App als Capacitor-Hülle für iOS und Android.
  **Ein Codestand, kein Fork:** `sync.sh` kopiert die Weboberfläche hinüber.
* `metricgym-netlify/supabase/` — Datenbank und Edge Functions.

## Zwei Regeln, die hier teuer erkauft sind

**Die Stufe vergibt ausschließlich der Server.** `my_tier()` ist die Wahrheit.
Jede clientseitige Abkürzung war bisher eine Hintertür — zuletzt eine Liste
von E-Mail-Adressen in `config.js`, die ohne Passwort ELITE gab.

**`config.js` wird öffentlich ausgeliefert.** Dort gehören keine Schlüssel und
keine Personendaten hinein. KI-Schlüssel nur als Supabase-Secret.

## Tests

```
npx http-server metricgym-netlify -p 8896 -s &
node metricgym-netlify/tests/<suite>.mjs
```

Sechs Suiten (`app`, `endurance`, `ui-guard`, `dsgvo`, `ios`, `effizienz`)
plus die Belegprüfung unter `supabase/functions/_shared/apple.test.mjs`.
`CHROMIUM=/opt/pw-browsers/chromium`, `NODE_PATH=/opt/node22/lib/node_modules`.

Suiten importieren Playwright über `createRequire`, nicht mit `import` —
ESM beachtet `NODE_PATH` nicht.

Messgeräte zuerst prüfen. Mehrere Prüfungen in dieser Sitzung waren rot,
ohne dass die App etwas falsch machte — falscher Tab-Name, fehlendes Profil,
zu kurze Wartezeit, nicht zurückgesetzter Zustand aus der vorigen Probe. Eine
Prüfung, die in beiden Fällen gleich ausfällt, misst nichts. Profile im Test
auf dem echten Weg bauen (`bmrCalc`/`tdeeCalc`/`generateTrainingPlan`/
`generateOptimalSchedule`), nicht von Hand zusammenstecken.

Und: `pkill -f "http-server"` erschießt die eigene Shell, weil das Muster auf
die eigene Kommandozeile passt. Server-PID merken und `kill $PID`.

## Zitate nicht aus dem Gedächtnis schreiben

```
node metricgym-netlify/tests/zitate-pruefen.mjs           # ganzes Register
node metricgym-netlify/tests/zitate-pruefen.mjs Morton    # eine Arbeit
```

Prüft jeden Registereintrag gegen PubMed — Erstautor, Jahr und, wo angegeben,
Band/Heft/Seiten. Läuft **nicht** im CI-Gate, weil es Netz braucht; vor dem
Eintragen neuer Quellen von Hand laufen lassen.

Der Anlass: beim Einbau der Effizienz-Eichung waren drei von sechs neu
geschriebenen Zitaten falsch — erfundener Erstautor („Nunes" statt
„Lixandrão"), falsches Journal bei zwei weiteren. Alle sahen plausibel aus.
Dazu zitierte die App durchgehend „Pelland et al. Sports Med 2025"; die Arbeit
steht in Sports Med 2026;56(2):481–505. Hätten manche Einträge 2025 und
andere 2026 gesagt, hätte `quellenZahl()` **eine** Arbeit als **zwei** gezählt
— und die auf der Startseite beworbene Zahl wäre zu hoch gewesen. Genau das
ist die Behauptung, für die es dieses Register gibt.

Der UI-Wächter verbietet jede zweite, von Hand gepflegte Studienzahl auf der
Seite. Die Spannweite einer zitierten Meta-Analyse deshalb über die
Teilnehmerzahl angeben („1.863 Teilnehmer"), nicht über die Studienzahl.
