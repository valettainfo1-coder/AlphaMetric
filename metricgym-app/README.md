# METRICGYM als echte App im Store

Stand: 04.10.2026. Alles hier ist gegen das Projekt geprüft, nicht aus dem
Gedächtnis geschrieben.

## Was schon fertig ist

Das Android-Projekt liegt in diesem Ordner und ist vollständig:

```
metricgym-app/
  capacitor.config.json   appId de.metricgym.app · appName METRICGYM
  www/                    die Weboberfläche (aus ../metricgym-netlify/)
  android/                fertiges Android-Studio-Projekt
  sync.sh                 Web-Stand übernehmen + synchronisieren
```

## Was ich hier NICHT bauen konnte — und warum

| | Grund |
|---|---|
| **Android-APK/AAB** | Android-SDK fehlt in dieser Umgebung (`sdkmanager`, `adb` nicht vorhanden). Java und Gradle sind da, das Projekt ist baubar — nur nicht hier. |
| **iOS** | Braucht macOS mit Xcode. Auf Linux grundsätzlich unmöglich, nicht nur hier. |

---

## Android — der realistische Weg

**Kosten:** 25 $ einmalig · **Aufwand:** ~2 Std · **Prüfung:** meist 1–3 Tage

1. **Android Studio** installieren, dieses Projekt öffnen:
   `metricgym-app/android`
2. **Signatur-Schlüssel erzeugen** (einmalig, gut aufbewahren — ohne ihn kannst
   du nie wieder ein Update für dieselbe App veröffentlichen):
   ```
   keytool -genkey -v -keystore metricgym.keystore -alias metricgym \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
3. In Android Studio: *Build → Generate Signed Bundle* → **AAB**
4. Play Console (25 $), App anlegen, AAB hochladen, Datenschutzangaben füllen

**Nach jeder Web-Änderung:** `./sync.sh` ausführen, dann neu bauen.

---

## iOS — ehrlich zu den Hürden

**Kosten:** 99 $/Jahr · **Zwingend:** ein Mac

```
npm install @capacitor/ios && npx cap add ios && npx cap open ios
```

Zwei Hürden, die du vorher kennen musst:

### Der 30-Prozent-Haken

Apple verlangt für digitale Abos **In-App-Kauf**. Stripe im WebView verstößt
gegen die Regeln und führt zur Ablehnung.

| | über Stripe | über Apple |
|---|---|---|
| Preis | 9,99 € | 9,99 € |
| Abzug | ~0,59 € | **2,99 €** (bzw. 1,50 € im Small-Business-Programm) |
| dir bleibt | ~9,40 € | **7,00 €** |

Das ist keine technische, sondern eine **kaufmännische** Entscheidung: entweder
du akzeptierst die Marge, oder iOS-Nutzer schließen das Abo auf der Website ab
(erlaubt, aber du darfst in der App nicht darauf hinweisen).

### Richtlinie 4.2 — „nur eine Webseite"

Apple lehnt Apps ab, die bloß eine Website anzeigen. METRICGYM hat gute Karten
— Offline-Betrieb, lokale Daten, echter Nutzen ohne Netz — aber es ist kein
Selbstläufer.

---

## Was am Code geändert wurde, damit die App NICHT schlechter ist als die Website

Drei Dinge hätten in der nativen Hülle stumm versagt. Alle drei sind in
`../metricgym-netlify/index.html` behoben — **eine Codebasis, kein Fork**, und
alle 227 Tests bleiben grün:

### 1 · Dein Trainingsverlauf kann nicht mehr verschwinden

Die App legte alles in `localStorage` ab. **iOS und Android dürfen den
WebView-Speicher bei Platzmangel leeren** — für eine Trainings-App heißt das im
schlimmsten Fall: die ganze Historie weg, ohne Vorwarnung.

Jetzt spiegelt jeder Speichervorgang zusätzlich in den nativen
Schlüsselspeicher (Capacitor Preferences). Ist `localStorage` beim Start leer,
wird von dort zurückgeholt und die App einmal neu gestartet. Im Browser
passiert nichts davon.

### 2 · Kein doppelter Cache

Der Service Worker wird in der nativen Hülle **nicht** registriert (`!window.Capacitor`)
und liegt auch nicht in `www/`. In der App lädt alles aus dem Paket — eine
zweite Cache-Schicht hätte nach einem Update die alte Fassung ausgeliefert.

### 3 · Das Mikrofon sagt die Wahrheit

Der Android-WebView hat **keine** Spracherkennung — die steckt in Chrome, nicht
im WebView. „Sprechen statt tippen" hätte einen Knopf gezeigt, der nichts tut.
Jetzt kommt eine Meldung, die sagt, was zu tun ist. Wer das Feature nativ
braucht: `@capacitor-community/speech-recognition`.

---

## Meine Empfehlung zur Reihenfolge

1. **Erst eine Web-Adresse** (Netlify, 5 Min, kostenlos). Nicht als Ersatz,
   sondern weil Stripe eine `APP_URL` für die Rückleitung nach dem Kauf braucht
   — ohne Adresse keine Zahlung, auch nicht in der App.
2. **Dann Android.** 25 $, Projekt liegt fertig hier, Prüfung in Tagen.
3. **iOS zuletzt** — und rechne die 30 % vorher durch. Die Entscheidung
   verändert deine Preisgestaltung, nicht nur den Build.

Ein Hinweis zur Namenswahl: `metricgym.netlify.app` ist von einer anderen App
von dir belegt (liefert „RECOMP.LAB v6"). Für die Store-Einträge brauchst du
ohnehin einen eindeutigen Namen — `de.metricgym.app` ist als Paket-Kennung
schon gesetzt und frei wählbar, solange du noch nichts veröffentlicht hast.
