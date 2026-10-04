# iPhone-App bauen, ohne einen Mac zu besitzen

Stand: 04.10.2026.

## Warum überhaupt ein Mac im Spiel ist

Der Mac ist **nicht das Ziel** — er ist die Baumaschine. Apple lässt iOS-Apps
nur mit Xcode übersetzen, und Xcode gibt es nur für macOS. Die App selbst läuft
auf dem iPhone.

Du brauchst also keinen Mac zu *kaufen*, sondern nur einen zu *benutzen*. Dafür
gibt es drei Wege:

| Weg | Kosten | Aufwand | wann sinnvoll |
|---|---|---|---|
| **GitHub Actions** (hier beschrieben) | 0 € | einmalig ~1 Std einrichten | du willst es dauerhaft ohne Mac machen |
| Mac stundenweise mieten (MacinCloud, Scaleway) | ~1–30 €/Monat | ~1 Std | einmalig hochladen, dann nie wieder |
| Mac leihen | 0 € | ein Nachmittag | du kennst jemanden |

**GitHub Actions ist hier die richtige Wahl**, weil dein Repository öffentlich
ist: macOS-Maschinen kosten für öffentliche Repositories nichts, auf jedem
Plan. Geprüft am 04.10.2026 über die GitHub-API: `"visibility": "public"`.

Der Workflow liegt in `.github/workflows/ios-build.yml` und läuft **nur auf
Knopfdruck** — Actions → „iPhone-App bauen" → „Run workflow".

---

## Was du einmalig einrichten musst

Alles unten geht **ohne Mac**, mit `openssl` (auf Windows über Git Bash oder
WSL, auf Linux schon da).

### 1 · Apple-Entwicklerprogramm

[developer.apple.com/programs](https://developer.apple.com/programs/) — 99 $/Jahr.
Freischaltung dauert meist Stunden, manchmal zwei Tage. **Damit anfangen**,
alles andere wartet darauf.

### 2 · Verteilungszertifikat erzeugen

Auf einem Mac macht das die Schlüsselbundverwaltung. Ohne Mac macht es `openssl`
— das Ergebnis ist identisch, Apple sieht keinen Unterschied.

```bash
# a) Schlüssel + Signieranfrage erzeugen. Die .key-Datei NIE weitergeben.
openssl req -new -newkey rsa:2048 -nodes \
  -keyout ios_dist.key -out ios_dist.csr \
  -subj "/emailAddress=DEINE@MAIL.DE/CN=METRICGYM Distribution/C=DE"
```

Dann im Browser: [developer.apple.com/account/resources/certificates](https://developer.apple.com/account/resources/certificates/list)
→ **+** → **Apple Distribution** → `ios_dist.csr` hochladen → `distribution.cer`
herunterladen.

```bash
# b) Apples Antwort mit deinem Schlüssel zu einer .p12 verbinden
openssl x509 -inform DER -in distribution.cer -out distribution.pem
openssl pkcs12 -export -legacy \
  -inkey ios_dist.key -in distribution.pem \
  -out ios_dist.p12 -name "METRICGYM Distribution"
# → Passwort setzen und merken, das brauchst du als Secret
```

> `-legacy` ist bei OpenSSL 3 nötig, damit macOS die Datei später importieren
> kann. Ohne das Flag schlägt `security import` auf dem Runner fehl.

### 3 · App-ID und Bereitstellungsprofil

[Identifiers](https://developer.apple.com/account/resources/identifiers/list) →
**+** → **App IDs** → **App** → Bundle ID **explicit**: `de.metricgym.app`.
Dabei anhaken:

* **In-App Purchase** (sonst schlägt der Kauf zur Laufzeit fehl)
* **Sign in with Apple** (Richtlinie 4.8)

Dann [Profiles](https://developer.apple.com/account/resources/profiles/list) →
**+** → **App Store Connect** → die App-ID wählen → das Zertifikat aus
Schritt 2 → Namen geben (z. B. `METRICGYM AppStore`) → `*.mobileprovision`
herunterladen.

### 4 · App-Store-Connect-API-Schlüssel

[App Store Connect](https://appstoreconnect.apple.com) → **Benutzer und
Zugriff** → **Integrationen** → **App Store Connect API** → **+**

* Rolle: **App Manager**
* Die `.p8` wird **nur einmal** zum Herunterladen angeboten.
* Notiere dir **Key ID** und **Issuer ID**.

Dieser Schlüssel ersetzt Passwort und 2FA — deshalb ist er für eine
Baumaschine der richtige Weg.

### 5 · Die App in App Store Connect anlegen

[appstoreconnect.apple.com/apps](https://appstoreconnect.apple.com/apps) → **+**
→ **Neue App**. Bundle ID: `de.metricgym.app`. Danach die vier Abos anlegen —
genau wie in `metricgym-app/SUBMIT-IOS.md` §2 beschrieben.

### 6 · Secrets in GitHub eintragen

Repository → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**. Sieben Einträge:

| Name | Inhalt | so bekommst du den Wert |
|---|---|---|
| `IOS_DIST_P12_BASE64` | die `.p12` als Base64 | `base64 -w0 ios_dist.p12` |
| `IOS_DIST_P12_PASSWORD` | das Passwort aus Schritt 2b | — |
| `IOS_PROVISIONING_PROFILE_BASE64` | das Profil als Base64 | `base64 -w0 *.mobileprovision` |
| `APPLE_TEAM_ID` | 10 Zeichen, z. B. `A1B2C3D4E5` | steht oben rechts im Entwicklerportal |
| `APPSTORE_API_KEY_ID` | z. B. `2X9R4HXF34` | aus Schritt 4 |
| `APPSTORE_API_ISSUER_ID` | eine UUID | aus Schritt 4 |
| `APPSTORE_API_KEY_P8_BASE64` | die `.p8` als Base64 | `base64 -w0 AuthKey_*.p8` |

Auf macOS/BSD heißt es `base64 -i datei` statt `base64 -w0 datei`.

> **Ist das in einem öffentlichen Repository sicher?** Ja. GitHub verschlüsselt
> Secrets, schreibt sie nie ins Protokoll und gibt sie nicht an Forks weiter.
> Der Workflow läuft außerdem nur auf Knopfdruck, nicht bei jedem Push. Wenn du
> trotzdem unruhig bist: das Zertifikat lässt sich im Entwicklerportal jederzeit
> widerrufen und neu erzeugen.

---

## Bauen

Repository → **Actions** → **iPhone-App bauen** → **Run workflow**.

Dauer: etwa 10–15 Minuten. Danach steht die Version in TestFlight und du kannst
sie **auf deinem eigenen iPhone installieren** — die TestFlight-App aus dem App
Store, mit deiner Apple-ID anmelden, fertig.

Was der Workflow tut:

1. Weboberfläche in die App-Hülle kopieren (`sync.sh`)
2. **prüfen, dass das Kaufmodul wirklich mitgekommen ist** — fehlt
   `vendor/cdv-purchase.js`, bricht er ab, statt eine App hochzuladen, in der
   jeder Kaufversuch ein 404 wird
3. Zertifikat und Profil in einen Wegwerf-Schlüsselbund einspielen
4. Baunummer auf die Lauf-Nummer setzen (jeder Upload braucht eine höhere)
5. archivieren, `.ipa` ausgeben, als Artefakt sichern (30 Tage)
6. zu TestFlight hochladen
7. Schlüsselbund und Schlüssel wieder löschen

Die `.ipa` liegt auch dann als Download bereit, wenn der Upload scheitert —
dann kannst du sie von Hand über die Transporter-App hochladen.

---

## Vom TestFlight zur Veröffentlichung

TestFlight ist noch nicht der App Store. Wenn die Version auf deinem iPhone
läuft und der Sandbox-Testkauf durch ist (`SUBMIT-IOS.md` §4):

App Store Connect → deine App → **Version zur Prüfung einreichen** →
Screenshots, Beschreibung, Datenschutzangaben, Altersfreigabe → **Einreichen**.
Prüfung meist 1–3 Tage.

---

## Was ich daran nicht testen konnte

**Den Workflow selbst.** Dafür bräuchte ich dein Apple-Entwicklerkonto. Geprüft
ist:

* Die YAML ist gültig (13 Schritte, `macos-latest`).
* Jeder Pfad, auf den der Workflow zeigt, existiert im Repository.
* Der heikelste Teil — die JSON-Datei mit dem API-Schlüssel — ist mit einem
  echten EC-Schlüssel durchgespielt: der PEM-Block kommt mit allen
  Zeilenumbrüchen korrekt in der Datei an. Genau daran scheitern selbstgebaute
  Pipelines sonst.
* Der Export probiert `app-store-connect` und fällt bei Ablehnung auf
  `app-store` zurück (Xcode 15.3 hat den Wert umbenannt) — damit ist eine
  ganze Fehlerklasse weg.

**Der erste Lauf ist der eigentliche Test.** Wenn er bricht, sagt das Protokoll
in welchem Schritt; schick mir die Zeilen und ich sehe mir das an.
