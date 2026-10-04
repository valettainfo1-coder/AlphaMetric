# Arbeitsregeln für dieses Projekt

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

Fünf Suiten (`app`, `endurance`, `ui-guard`, `dsgvo`, `ios`) plus die
Belegprüfung unter `supabase/functions/_shared/apple.test.mjs`.
`CHROMIUM=/opt/pw-browsers/chromium`, `NODE_PATH=/opt/node22/lib/node_modules`.

Messgeräte zuerst prüfen. Mehrere Prüfungen in dieser Sitzung waren rot,
ohne dass die App etwas falsch machte — falscher Tab-Name, fehlendes Profil,
zu kurze Wartezeit. Eine Prüfung, die in beiden Fällen gleich ausfällt, misst
nichts.
