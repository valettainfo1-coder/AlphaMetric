# METRICGYM als echte App im Store

Stand: 04.10.2026. Jede Zahl hier ist gegen das Projekt oder gegen Apples
Entwicklerseiten geprüft, nicht aus dem Gedächtnis geschrieben.

## Was fertig ist

```
metricgym-app/
  capacitor.config.json   appId de.metricgym.app · appName METRICGYM
  www/                    die Weboberfläche (aus ../metricgym-netlify/)
  android/                fertiges Android-Studio-Projekt
  ios/                    fertiges Xcode-Projekt
  marke.mjs               erzeugt alle Icons und Startbilder aus dem Logo
  sync.sh                 Web-Stand übernehmen + beide Plattformen angleichen
```

iOS ist eingerichtet: Projekt, Berechtigungstexte, Ausfuhr-Erklärung, Icons,
Startbild. Was noch fehlt, steht weiter unten unter „Der echte Rest".

### Icons: der Fehler, der fast in den Store gegangen wäre

`npx cap add` legt eigene Platzhalter ab — das hellblaue Capacitor-Kreuz. Das
stand in **beiden** Projekten, Android inklusive: eine App namens METRICGYM mit
fremdem Logo auf dem Startbildschirm.

`node marke.mjs` erzeugt stattdessen alle 30 Bilder aus `logoSVG()` in
`../metricgym-netlify/index.html` — derselben Funktion, die das Logo *in* der
App zeichnet. Das Icon kann damit nicht mehr vom Logo abweichen.

Zwei Dinge daran sind gemessen, nicht geschätzt:

* **Kugelgröße.** Die Perspektive in `spherePoints` staucht die Sphäre: ihre
  Silhouette ist nur 55 % der SVG-Kante, nicht 91 %, wie der Radius vermuten
  lässt. Wer das Logo auf 65 % der Fläche setzt, bekommt eine 36-%-Kugel. Der
  Umrechnungsfaktor steht im Skript.
* **Punktdichte.** Entschieden an Mustern in den Größen, in denen das Icon
  wirklich erscheint (60 / 90 / 140 px), nicht an der 1024er-Vorschau: 160
  Punkte reißen Löcher, 200 wirken in der Mitte hohl, 280 bleiben bei 60 px
  geschlossen und zeigen bei 140 px noch einzelne Punkte.

Dazu drei stille Fehler, die mit den Platzhaltern mitkamen:

| | war | ist |
|---|---|---|
| Hintergrund des adaptiven Android-Icons | `#FFFFFF` — leuchtende Kugel auf weißem Quadrat | `#0B0E15`, der Grundton der App |
| iOS-App-Icon | Alphakanal vorhanden | reines RGB — **Apple weist Icons mit Alphakanal ab**, auch wenn jedes Pixel deckend ist |
| zwei Vektor-Reste von Capacitor | lagen unbenutzt im Projekt | entfernt (geprüft: kein Verweis darauf) |

Nach einer Logo-Änderung: `node marke.mjs`, dann `./sync.sh`.

## Was ich hier NICHT bauen konnte — und warum

| | Grund |
|---|---|
| **Android-APK/AAB** | Android-SDK fehlt in dieser Umgebung (`sdkmanager`, `adb` nicht vorhanden). Java und Gradle sind da, das Projekt ist baubar — nur nicht hier. |
| **iOS-Binary** | Braucht macOS mit Xcode. Auf Linux grundsätzlich unmöglich, nicht nur hier. Alles, was ohne Mac vorbereitbar war, ist vorbereitet. |

---

## Android — der realistische Weg

**Kosten:** 25 $ einmalig · **Aufwand:** ~2 Std · **Prüfung:** meist 1–3 Tage

1. **Android Studio** installieren, `metricgym-app/android` öffnen
2. **Signatur-Schlüssel erzeugen** (einmalig, gut aufbewahren — ohne ihn kannst
   du nie wieder ein Update für dieselbe App veröffentlichen):
   ```
   keytool -genkey -v -keystore metricgym.keystore -alias metricgym \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
3. *Build → Generate Signed Bundle* → **AAB**
4. Play Console (25 $), App anlegen, AAB hochladen, Datenschutzangaben füllen

---

## iOS — Schritt für Schritt

**Kosten:** 99 $/Jahr · **Zwingend:** ein Mac · **Prüfung:** meist 1–3 Tage

Auf deinem Mac, einmalig:

```
sudo gem install cocoapods          # oder: brew install cocoapods
cd metricgym-app
npm install
./sync.sh                           # holt den Web-Stand, läuft jetzt pod install mit
npx cap open ios                    # öffnet App.xcworkspace in Xcode
```

In Xcode:

1. Ziel **App** → *Signing & Capabilities* → dein Apple-Entwicklerteam wählen
   („Automatically manage signing" anlassen)
2. *Product → Archive* → *Distribute App* → **App Store Connect**
3. In App Store Connect: App anlegen, Screenshots, Beschreibung,
   Datenschutzangaben, zur Prüfung einreichen

Das Projekt ist so eingestellt:

| | Wert |
|---|---|
| Paket-Kennung | `de.metricgym.app` |
| Version | 1.0 (Build 1) |
| Mindest-iOS | 14.0 |
| Hintergrundfarbe vor dem ersten Bild | `#080A0F` — kein weißes Aufblitzen |

### Was an iOS schon erledigt ist

**Berechtigungstexte** in `ios/App/App/Info.plist`. Ohne sie stürzt iOS die App
ab, sobald ein Datei-Feld die Kamera öffnet, und die Prüfung lehnt sie ab. Die
App hat drei Felder mit `accept="image/*"` — Plan abfotografieren, Mahlzeit per
Foto erfassen, Fortschrittsbild — und eines für Gesundheitsdaten als Datei, das
keine Berechtigung braucht. Die Texte erscheinen dem Nutzer wörtlich im
Systemdialog, deshalb sagen sie **wofür**, nicht „Zugriff benötigt":

* `NSCameraUsageDescription`
* `NSPhotoLibraryUsageDescription`
* `NSPhotoLibraryAddUsageDescription`

**`ITSAppUsesNonExemptEncryption = false`** — spart die Ausfuhr-Erklärung bei
jedem Upload. Die App nutzt nur HTTPS, also die Standard-Verschlüsselung des
Systems, keine eigene Kryptografie.

**Geprüft, nicht angenommen:** alle drei `navigator.share`-Aufrufe sind hinter
`if (navigator.share)` bzw. `canShare` abgesichert und haben einen Rückfall —
dass WKWebView die Web-Share-API nicht überall anbietet, führt also zu keinem
stillen Nichts-passiert.

---

## Das Geld — korrigiert

**Ich hatte dir vorher 30 % und „bei 9,99 € bleiben 7,00 €" genannt. Beides war
falsch bzw. veraltet.** Seit dem **1. Oktober 2026** gelten in der EU neue,
einheitliche Bedingungen. Die Kernzahl: Apple nimmt nicht 30 %, und Stripe *in*
der App ist nicht mehr verboten.

Die EU-Sätze (Apple berechnet die Provision auf den Preis **ohne** Steuern):

| Weg | Standard | ermäßigt |
|---|---|---|
| Apple In-App-Kauf | 26 % | **15 %** |
| eigene Kasse **in** der App (z. B. Stripe) | 20 % | **10 %** |
| Link nach draußen (nur Verkäufe binnen 7 Tagen) | 15 % | **10 %** |
| eigener Marktplatz / Web-Vertrieb | 5 % | — |

Den ermäßigten Satz bekommst du über das **App Store Small Business Program**
(unter 1 Mio. $ Erlös im Jahr) oder bei Abos ab dem zweiten Jahr. Als neuer
Entwickler ohne Verkaufshistorie bist du qualifiziert — du musst dich aber
**selbst eintragen**, das passiert nicht von allein.

Weggefallen sind zum 1.10.2026: Core Technology Fee, Initial Acquisition Fee,
Store Services Fee.

### Was bei 9,99 € im Monat tatsächlich übrig bleibt

9,99 € sind der Preis **inklusive** 19 % Umsatzsteuer, also 8,39 € netto. Darauf:

| Weg | Apple | Stripe | dir bleibt |
|---|---|---|---|
| Apple In-App-Kauf (15 %) | 1,26 € | — | **7,14 €** |
| eigene Kasse in der App (10 %) | 0,84 € | ~0,40 € | **7,16 €** |
| Link nach draußen, Kauf binnen 7 Tagen | 0,84 € | ~0,40 € | **7,16 €** |
| Link nach draußen, Kauf später | 0 € | ~0,40 € | **8,00 €** |
| nur über die Website, ohne App | 0 € | ~0,40 € | **8,00 €** |

**Zwei Cent.** So groß ist der Unterschied zwischen Apples Kasse und deiner
eigenen, wenn der Kauf in der App passiert. Die 2,40 €, die ich dir genannt
hatte, gibt es nicht.

Damit kippt die Empfehlung: **nimm Apples In-App-Kauf.** Nicht wegen der
Provision, sondern weil Apple dabei die Umsatzsteuer in allen EU-Ländern
einzieht und abführt. Mit eigener Kasse machst du das selbst — OSS-Registrierung,
Meldungen, Haftung. Für zwei Cent im Monat ist das kein guter Tausch.

Zwei Einschränkungen, die ich nicht verschweigen will:

* Diese Sätze sind die **EU-Bedingungen**. Verkaufst du auch außerhalb der EU,
  gelten dort Apples sonstige Regeln — vor einer weltweiten Veröffentlichung
  separat prüfen.
* Die Stripe-Gebühr ist mit ~1,5 % + 0,25 € für EU-Karten gerechnet. Andere
  Karten und Stripe Billing kosten mehr.
* Steuerlich (Kleinunternehmerregelung, OSS) ist das Steuerberater-Gebiet, nicht
  meines.

---

## Der In-App-Kauf ist gebaut

**Korrektur zu meiner früheren Fassung dieses Abschnitts:** dort stand als
Plugin-Vorschlag `@capacitor-community/in-app-purchases`. **Dieses Paket
existiert nicht** — der Name kam aus meinem Gedächtnis, nicht aus der
Registry. Verwendet wird `capacitor-plugin-cdv-purchase` (13.18.0, Juli 2026,
StoreKit 2, Capacitor 7). Was es kann, steht in
`SUBMIT-IOS.md`; dort ist auch jeder Einreichungsschritt beschrieben.

Gebaut und geprüft ist:

| | wo |
|---|---|
| Kauf, Wiederherstellen, Apple-Abo-Verwaltung | `index.html` (Modul `IAP`) |
| Belegprüfung mit vollständiger Zertifikatskette | `supabase/functions/_shared/apple.ts` |
| Einlösen nach dem Kauf | `supabase/functions/apple-verify` |
| Apples Meldungen (Kündigung, Ablauf, Rückerstattung) | `supabase/functions/apple-notify` |
| Abos aus zwei Kassen nebeneinander | `supabase/schema.sql` |

**Was ich NICHT testen konnte:** den Kauf selbst. Dafür braucht es einen Mac,
ein Apple-Entwicklerkonto und ein Sandbox-Gerät. Testbar war die Entscheidung
davor (27 Zusicherungen in `tests/ios-tests.mjs`, mit nachgebauter
Capacitor-Umgebung) und die Kryptografie der Belegprüfung (31 Zusicherungen in
`supabase/functions/_shared/apple.test.mjs`, gegen eine echte, selbst gebaute
Zertifikatskette). Die Sandbox-Testkäufe bleiben dein Schritt.

### Richtlinie 4.2 — „nur eine Webseite"

Apple lehnt Apps ab, die bloß eine Website anzeigen. METRICGYM hat gute Karten
— Offline-Betrieb, lokale Daten, echter Nutzen ohne Netz — aber es ist kein
Selbstläufer.

---

## Was am Code geändert wurde, damit die App NICHT schlechter ist als die Website

Drei Dinge hätten in der nativen Hülle stumm versagt. Alle drei sind in
`../metricgym-netlify/index.html` behoben — **eine Codebasis, kein Fork**, und
alle 227 Tests bleiben grün.

### 1 · Dein Trainingsverlauf kann nicht mehr verschwinden

Die App legte alles in `localStorage` ab. **iOS und Android dürfen den
WebView-Speicher bei Platzmangel leeren** — für eine Trainings-App heißt das im
schlimmsten Fall: die ganze Historie weg, ohne Vorwarnung.

Jetzt spiegelt jeder Speichervorgang zusätzlich in den nativen
Schlüsselspeicher (Capacitor Preferences). Ist `localStorage` beim Start leer,
wird von dort zurückgeholt und die App einmal neu gestartet. Im Browser
passiert nichts davon.

### 2 · Kein doppelter Cache

Der Service Worker wird in der nativen Hülle **nicht** registriert
(`!window.Capacitor`) und liegt auch nicht in `www/`. In der App lädt alles aus
dem Paket — eine zweite Cache-Schicht hätte nach einem Update die alte Fassung
ausgeliefert.

### 3 · Das Mikrofon sagt die Wahrheit

Der Android-WebView hat **keine** Spracherkennung — die steckt in Chrome, nicht
im WebView. „Sprechen statt tippen" hätte einen Knopf gezeigt, der nichts tut.
Jetzt kommt eine Meldung, die sagt, was zu tun ist. Wer das Feature nativ
braucht: `@capacitor-community/speech-recognition`.

---

## Meine Empfehlung zur Reihenfolge

1. **Erst eine Web-Adresse** (Netlify, 5 Min, kostenlos). Nicht als Ersatz,
   sondern weil Stripe eine `APP_URL` für die Rückleitung nach dem Kauf braucht
   — ohne Adresse keine Zahlung, auch nicht in der App. Siehe
   `../metricgym-netlify/GO-LIVE.md`.
2. **Dann Android.** 25 $, Projekt liegt fertig hier, Prüfung in Tagen, kein
   Mac nötig.
3. **iOS danach** — und rechne den In-App-Kauf als eigenes Arbeitspaket ein,
   nicht als Häkchen.

Ein Hinweis zur Namenswahl: `metricgym.netlify.app` ist von einer anderen App
von dir belegt (liefert „RECOMP.LAB v6"). Für die Store-Einträge brauchst du
ohnehin einen eindeutigen Namen — `de.metricgym.app` ist als Paket-Kennung
schon gesetzt und frei wählbar, solange du noch nichts veröffentlicht hast.

---

### Quellen zu den Provisionszahlen

* [Changes for apps in the European Union — Apple Developer](https://developer.apple.com/support/apps-in-the-eu)
* [Apple allows in-app web checkouts in the EU from 10 % — RevenueCat](https://www.revenuecat.com/blog/company/apple-in-app-web-checkouts-eu)
* [App Store Small Business Program — Übersicht](https://adapty.io/blog/app-store-small-business-program/)
