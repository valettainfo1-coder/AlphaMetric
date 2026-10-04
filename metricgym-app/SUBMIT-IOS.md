# METRICGYM in den App Store — die vollständige Liste

Stand: 04.10.2026. Reihenfolge einhalten; Schritt 3 braucht Schritt 1.

**Was du brauchst:** einen Mac mit Xcode, ein Apple-Entwicklerkonto (99 $/Jahr),
ein laufendes Supabase-Projekt.

---

## 0 · Was fertig ist und was nicht

| | Zustand |
|---|---|
| Xcode-Projekt, Icons, Startbild, Berechtigungen, Privatsphäre-Manifest | **fertig** |
| Kauf über Apple, Wiederherstellen, Abo-Verwaltung | **fertig** (Code) |
| Belegprüfung + Apples Meldungen serverseitig | **fertig** (Code) |
| „Bei Apple anmelden" (Richtlinie 4.8) | **fertig** (Code) |
| Produkte in App Store Connect angelegt | **du** |
| Supabase-Projekt läuft, Functions deployt | **du** |
| Sandbox-Testkauf durchgeführt | **du** |
| Screenshots, Beschreibung, Datenschutzangaben | **du** (Vorlagen unten) |
| Impressum/AGB ausgefüllt | **du** (zwei Felder, s. `GO-LIVE.md`) |

Den Kauf selbst habe ich **nicht testen können** — dafür braucht es dein
Entwicklerkonto und ein echtes Gerät. Geprüft ist die Entscheidung davor
(27 Zusicherungen) und die Kryptografie der Belegprüfung (31 Zusicherungen).

---

## 1 · Supabase vorbereiten

```sql
-- Supabase → SQL-Editor → supabase/schema.sql komplett einfügen → Run
-- (ist idempotent; läuft auch über eine bestehende Datenbank)
```

Das Schema stellt den Schlüssel von `subscriptions` auf `(user_id, source)` um.
**Warum:** wer im Web abonniert und später am iPhone noch einmal kauft, hätte
sonst eine der beiden Zahlungen stillschweigend überschrieben. Bestehende Zeilen
bekommen `source='stripe'` — gegen echtes PostgreSQL 16 mit einem Bestandskunden
geprüft.

Dann die Functions:

```bash
supabase functions deploy apple-verify
supabase functions deploy apple-notify --no-verify-jwt   # Apple schickt kein Token
supabase functions deploy stripe-webhook --no-verify-jwt

supabase secrets set APPLE_BUNDLE_ID=de.metricgym.app
# Nur solange du in der Sandbox testest — in Produktion WIEDER ENTFERNEN:
supabase secrets set APPLE_ALLOW_SANDBOX=1
```

> **`APPLE_ALLOW_SANDBOX=1` muss vor dem Launch weg.** Sonst schaltet jeder
> Testkauf echte Stufen frei. Die Prüfung dafür steckt in `umgebungOk()`.

### Anmeldewege freischalten

Supabase → Authentication → Providers:

* **Apple** einschalten (Service ID + Key aus dem Apple-Entwicklerportal)
* **Google** bleibt wie es ist

Supabase → Authentication → URL Configuration → **Redirect URLs**, hinzufügen:

```
de.metricgym.app://auth-callback
```

**Ohne diesen Eintrag funktioniert keine Anmeldung in der App.** Der Grund:
`location.protocol` ist in der App `capacitor:`, nicht `https:`. Die alte
Fassung ließ `redirectTo` dann weg — der Nutzer landete nach der Anmeldung auf
der *Website* statt in der App. Außerdem lehnt Google OAuth in eingebetteten
WebViews ausdrücklich ab („disallowed_useragent"), der Dialog muss in den
Systembrowser. Beides ist behoben; der Rückweg läuft über dieses URL-Schema,
das in `Info.plist` als `CFBundleURLTypes` steht.

---

## 2 · Produkte in App Store Connect

App Store Connect → deine App → **Abonnements** → eine Abo-Gruppe
(z. B. „METRICGYM") → vier Abos anlegen. Die Kennungen müssen **genau** so
heißen:

| Produkt-ID | Stufe | Laufzeit | Preis |
|---|---|---|---|
| `de.metricgym.pro.monthly` | PERFORMANCE | 1 Monat | 9,99 € |
| `de.metricgym.pro.yearly` | PERFORMANCE | 1 Jahr | 79,99 € |
| `de.metricgym.elite.monthly` | ELITE | 1 Monat | 19,99 € |
| `de.metricgym.elite.yearly` | ELITE | 1 Jahr | 159,99 € |

Dieselbe Liste steht an zwei Stellen im Code (`IAP_ID` in `index.html`,
`PRODUKTE` in `_shared/apple.ts`). Ein Test vergleicht beide — weicht eine
Kennung ab, wird er rot. Ein Produkt, das der Server nicht kennt, schaltet
**nichts** frei; das ist Absicht.

**Einführungsangebot „7 Tage gratis"** bei allen vier Abos anlegen. Die App
schaltet die Gratiszeit auf iOS nicht mehr selbst frei (das wäre ein Weg an
Apples Kasse vorbei) — sie überlässt sie Apple. Ohne dieses Angebot verschwindet
der Gratis-Test auf iOS stillschweigend.

**Small Business Program** eintragen (App Store Connect → Vereinbarungen):
15 % statt 26 %. Als neuer Entwickler qualifiziert, aber **eintragen musst du
dich selbst**.

### Apples Meldungen eintragen

App Store Connect → App → **Allgemeine Informationen** → „URL für
App-Store-Server-Benachrichtigungen (Version 2)":

```
https://<dein-projekt>.supabase.co/functions/v1/apple-notify
```

Produktion **und** Sandbox haben getrennte Felder — beide eintragen. Ohne das
behält ein gekündigtes oder zurückerstattetes Abo seinen Rang für immer.

---

## 3 · Bauen

```bash
cd metricgym-app
npm install
sudo gem install cocoapods        # oder: brew install cocoapods
./sync.sh                         # Web-Stand holen + pod install
npx cap open ios                  # öffnet App.xcworkspace
```

In Xcode: Ziel **App** → *Signing & Capabilities* → dein Team wählen. Dann
unter *+ Capability* ergänzen:

* **In-App Purchase**
* **Sign in with Apple**

Beide sind Pflicht — ohne sie schlägt der Kauf bzw. die Apple-Anmeldung zur
Laufzeit fehl, ohne dass der Code etwas falsch macht.

Dann *Product → Archive* → *Distribute App* → **App Store Connect**.

---

## 4 · Sandbox-Testkauf (nicht überspringen)

App Store Connect → Benutzer und Zugriff → **Sandbox** → Tester anlegen.
Auf dem iPhone: Einstellungen → App Store → Sandbox-Account.

Zu prüfen:

1. Abonnieren → Apples Dialog zeigt „7 Tage gratis" → Kauf → die App zeigt
   PERFORMANCE
2. App löschen, neu installieren, anmelden → **„Käufe wiederherstellen"** gibt
   die Stufe zurück
3. In den iPhone-Einstellungen kündigen → nach dem Ablauf (Sandbox: Minuten)
   fällt die Stufe auf FREE
4. In Supabase nachsehen: `select * from subscriptions where source='apple'`

Punkt 3 prüft die Kette bis `apple-notify`. Wenn der Rang bleibt, ist entweder
die Benachrichtigungs-URL nicht eingetragen oder die Function nicht mit
`--no-verify-jwt` deployt.

---

## 5 · Angaben für die Einreichung

### Datenschutz („App Privacy")

Deckungsgleich mit `ios/App/App/PrivacyInfo.xcprivacy` eintragen:

| Datenart | verknüpft | Tracking | Zweck |
|---|---|---|---|
| E-Mail-Adresse | ja | nein | App-Funktionalität |
| Name | ja | nein | App-Funktionalität |
| Gesundheit & Fitness | ja | nein | App-Funktionalität |
| Fotos | ja | nein | App-Funktionalität |
| Sonstige Nutzerinhalte | ja | nein | App-Funktionalität |
| Kaufhistorie | ja | nein | App-Funktionalität |

„Tracking" überall **nein**. Schaltest du später Sentry (`sentryDsn`) oder
Plausible (`plausibleDomain`) in `config.js` ein, musst du hier **und** im
Manifest nachtragen — sonst stimmen die Angaben nicht mehr.

### Altersfreigabe

4+. Keine Gewalt, kein Glücksspiel, keine Nutzergenerierung für andere.
METRICGYM gibt Trainings- und Ernährungsempfehlungen — **keine** medizinische
Diagnose oder Behandlung. Die App weist darauf selbst hin; lass die Formulierung
im Einreichungsformular dazu passen.

### Notizen für die Prüfung („App Review Information")

Vorschlag zum Kopieren:

> Die App funktioniert ohne Konto: „Erst reinschauen — Demo" auf dem Startbild
> zeigt die vollständige App mit Beispieldaten, ohne Anmeldung und ohne Kauf.
> Zum Prüfen des Abos: oben rechts Menü → Plan → Abo wählen.
> Ein Testkonto ist nicht nötig; falls gewünscht: <E-Mail> / <Passwort>.
> Trainingsplan, Wochenplan, Eintragen von Einheiten, Ernährung und Auswertung
> funktionieren vollständig offline und lokal.

Der letzte Satz ist der wichtigste — er beantwortet Richtlinie 4.2
(„nur eine Webseite") vorab.

---

## 5b · Vier Dinge, die heute noch blockieren (geprüft, nicht vermutet)

### 1 · Das Supabase-Projekt antwortet nicht

`curl https://nsdziafvhhzuuhrctozl.supabase.co/auth/v1/health` → **HTTP 000**,
also gar keine Verbindung. Folge, nachgestellt mit blockiertem Server:

> Prüfer öffnet die App → Demo läuft, Plan wird gebaut (die App ist
> local-first, das funktioniert) → Bezahlschranke erscheint → „Auf
> PERFORMANCE upgraden" → **„Konto nötig"** → „Anmelden" → Anmeldung
> schlägt fehl, weil der Server tot ist.

**Der Kauf ist damit nicht erreichbar.** Das ist eine Ablehnung nach
Richtlinie 2.1 („feature did not work"). Ohne Supabase gibt es außerdem
keinen KI-Coach (der Proxy liegt dort) und keine Synchronisierung.

### 2 · Impressum und Datenschutzerklärung sind nicht ausgefüllt

10 von 11 Feldern in `config.js → legal` sind leer. Was in der App steht:

> IMPRESSUM · Angaben gemäß § 5 DDG · **[bitte ausfüllen]** ·
> **[bitte ausfüllen]** · **[bitte ausfüllen]** · Deutschland ·
> E-Mail: **[bitte ausfüllen]** …

Fünfmal in der Impressumsseite, viermal in der Datenschutzerklärung. Apple
verlangt eine Datenschutzerklärung (Richtlinie 5.1.1); eine, die keinen
Verantwortlichen nennt, ist keine. In Deutschland ist ein leeres Impressum
zusätzlich abmahnfähig. **Das ist der billigste Blocker von allen** — zehn
Felder ausfüllen.

Die Texte selbst sind in Ordnung: der Gesundheitshinweis ist vorhanden und
deutlich, die AGB setzen ein Mindestalter von 16, die Datenschutzerklärung
behandelt Gesundheitsdaten als besondere Kategorie nach Art. 9 DSGVO.

### 3 · Es gibt keine öffentliche Adresse für die Datenschutzerklärung

App Store Connect verlangt eine **URL**, nicht nur den Text in der App.
`metricgym.netlify.app` liefert eine andere App („RECOMP.LAB v6"). Also:
erst das Netlify-Paket unter einer eigenen Adresse veröffentlichen, dann
diese Adresse eintragen.

### 4 · Die Gründerkonten stehen öffentlich in `config.js`

```
eliteAccounts: ["lovisstumpfe@icloud.com", "aerion.online@gmail.com"]
```

`config.js` wird beim Deploy **öffentlich ausgeliefert** und liegt zusätzlich
im öffentlichen GitHub-Repository. Zwei Dinge daran:

* **Zwei echte E-Mail-Adressen sind veröffentlicht.**
* **Freier ELITE-Zugang für jeden.** Nachgestellt: ein lokales Konto mit einer
  dieser Adressen anlegen — `applyAccountGrants()` setzt die Stufe ohne
  Passwort und ohne Server auf `elite`. Kein Kauf nötig.

Dein eigenes `schema.sql` sagt dazu schon: *„config.js → eliteAccounts wird
NICHT mehr gelesen (dort war es öffentlich einsehbar und damit keine echte
Absicherung)"* — der Code widerspricht also der eigenen Dokumentation. Die
Tabelle `elite_accounts` in der Datenbank macht dasselbe richtig, weil sie nur
mit angemeldetem Cloud-Konto greift.

**Die Behebung braucht eine Entscheidung von dir:** entfernt man die
clientseitige Liste, verlieren deine eigenen Geräte den ELITE-Zugang, bis
Block 4b aus `schema.sql` ausgeführt ist (dort gehören die Adressen hinein).
Sag Bescheid — es sind zwei kleine Änderungen.

---

## 6 · Zwei Dinge, die du bewusst entscheiden solltest

### Die Demo zeigt die Vollversion

„Erst reinschauen — Demo" setzt `S.devMode = true` und damit `S.tier = 'pro'` —
jeder bekommt ohne Kauf den vollen Umfang. Das hilft bei der Prüfung (der
Prüfer sieht die App), **unterläuft aber deine Bezahlschranke**: nicht nur auf
iOS, auch im Web und auf Android. Das ist kein neues Verhalten und keine
Ablehnungsgefahr, aber eine Entscheidung. Willst du es ändern, ist es eine
Zeile in `devUser()` (`S.tier = "pro"` → `"free"`).

### Der Willkommensbonus fehlt auf iOS

Wer einen Empfehlungscode einlöst, bekommt im Web 14 Tage PERFORMANCE. In der
iOS-App nicht: eine bezahlte Stufe über einen eigenen Code zu vergeben ist
genau der „eigene Mechanismus", den Richtlinie 3.1.1 untersagt. Die Werbung
wird weiterhin verbucht — der Werber bekommt sein Guthaben, sobald der
Geworbene abonniert. Den Bonus auch auf iOS zu geben ist möglich, aber über
**Angebotscodes** in App Store Connect; das ist ein eigenes Arbeitspaket.

Aus demselben Grund ist „Guthaben sofort als Pro-Zeit einlösen" in der iOS-App
ausgeblendet. Die **Barauszahlung** bleibt — Geld, das rausgeht, ist kein
Kaufvorgang und von Apples Regeln nicht betroffen.

---

## 7 · Wenn Apple ablehnt — die drei wahrscheinlichsten Gründe

| Ablehnung | Ursache | Abhilfe |
|---|---|---|
| **3.1.1** Bezahlweg außerhalb | ein Hinweis auf die Website, den ich übersehen habe | `node tests/ios-tests.mjs` nennt die Stelle |
| **4.2** nur eine Webseite | Prüfer hat Offline-Nutzen nicht gesehen | Prüfungsnotiz aus §5 verwenden |
| **2.1** Kauf schlägt fehl | Produkte noch nicht „Zur Abgabe bereit" oder Capability fehlt | App Store Connect + Xcode-Capabilities prüfen |

Richtlinie **5.1.1(v)** (Konto löschen in der App) ist erfüllt: Profil →
„Konto & Daten endgültig löschen" löscht auch serverseitig über die Function
`delete-account`.
