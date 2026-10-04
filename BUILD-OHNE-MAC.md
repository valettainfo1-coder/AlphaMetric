# iPhone-App bauen, ohne einen Mac zu besitzen

Stand: 04.10.2026.

## Warum überhaupt ein Mac im Spiel ist

Der Mac ist **nicht das Ziel** — er ist die Baumaschine. Apple lässt iOS-Apps
nur mit Xcode übersetzen, und Xcode gibt es nur für macOS. Die App selbst läuft
auf dem iPhone.

Du brauchst also keinen Mac zu *kaufen*, sondern nur einen zu *benutzen*. Das
übernimmt GitHub: macOS-Maschinen kosten für öffentliche Repositories nichts,
auf jedem Plan. Deins ist öffentlich (am 04.10.2026 über die GitHub-API
geprüft: `"visibility": "public"`).

**Du brauchst vier Angaben aus App Store Connect. Sonst nichts.** Kein
Zertifikat zum Hochladen, kein Bereitstellungsprofil, kein openssl.

---

## Warum das so kurz ist

Normalerweise ist der schmerzhafte Teil, ein Verteilungszertifikat zu erzeugen:
Schlüsselbundverwaltung öffnen, Signieranfrage exportieren, bei Apple
einreichen, Antwort herunterladen, in eine `.p12` packen — und das alles auf
einem Mac, den du nicht hast.

Seit Xcode 13 geht es anders. `xcodebuild` kann sich mit einem
App-Store-Connect-Schlüssel **selbst beim Entwicklerportal anmelden**
(`-authenticationKeyPath`) und fehlende Zertifikate und Profile **selbst
anlegen** (`-allowProvisioningUpdates`). Der private Schlüssel bleibt dabei in
Apples Cloud — ein *Cloud Managed Distribution Certificate*, genau dafür
gemacht, dass die Baumaschine bei jedem Lauf eine andere ist.

Der Workflow nutzt das. Deshalb vier Secrets statt sieben und null
Zertifikatsarbeit.

---

## Einrichtung

### 1 · Apple-Entwicklerprogramm

[developer.apple.com/programs](https://developer.apple.com/programs/) — 99 $/Jahr.
Freischaltung dauert meist Stunden, manchmal zwei Tage. **Damit anfangen**,
alles andere wartet darauf.

### 2 · App-ID anlegen

[developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers/list)
→ **+** → **App IDs** → **App** → Bundle ID **explicit**: `de.metricgym.app`

Dabei zwei Dienste anhaken — ohne sie scheitert die App später zur Laufzeit,
nicht beim Bauen:

* **In-App Purchase**
* **Sign in with Apple**

Ein Bereitstellungsprofil legst du **nicht** an. Das macht Xcode beim ersten
Lauf selbst.

### 3 · App in App Store Connect anlegen

[appstoreconnect.apple.com/apps](https://appstoreconnect.apple.com/apps) → **+**
→ **Neue App** → Bundle ID `de.metricgym.app`.

Danach die vier Abos anlegen, genau wie in `metricgym-app/SUBMIT-IOS.md` §2.

### 4 · API-Schlüssel erzeugen

[App Store Connect](https://appstoreconnect.apple.com) → **Benutzer und
Zugriff** → **Integrationen** → **App Store Connect API** → **+**

* Rolle: **App Manager** (weniger reicht nicht: der Schlüssel muss Zertifikate
  anlegen dürfen)
* Die `.p8` wird **nur einmal** zum Herunterladen angeboten — sofort sichern.
* Notiere **Key ID** und **Issuer ID**.

Dieser eine Schlüssel macht alles: anmelden, signieren, hochladen. Er kennt
kein 2FA, läuft nicht mit einem Passwortwechsel ab und lässt sich jederzeit
widerrufen.

### 5 · Vier Secrets in GitHub eintragen

Repository → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**:

| Name | Inhalt | woher |
|---|---|---|
| `APPLE_TEAM_ID` | 10 Zeichen, z. B. `A1B2C3D4E5` | Entwicklerportal, oben rechts unter deinem Namen |
| `APPSTORE_API_KEY_ID` | z. B. `2X9R4HXF34` | aus Schritt 4 |
| `APPSTORE_API_ISSUER_ID` | eine UUID | aus Schritt 4, steht über der Schlüsselliste |
| `APPSTORE_API_KEY_P8_BASE64` | die `.p8` als Base64 | `base64 -w0 AuthKey_XXXX.p8` |

Auf macOS heißt der letzte Befehl `base64 -i AuthKey_XXXX.p8`.

> **Ist das in einem öffentlichen Repository sicher?** Ja. GitHub verschlüsselt
> Secrets, schreibt sie nie ins Protokoll und gibt sie nicht an Forks weiter.
> Der Workflow läuft nur auf Knopfdruck. Und sollte doch etwas schiefgehen:
> den Schlüssel in App Store Connect widerrufen dauert zehn Sekunden — anders
> als bei einem verlorenen Zertifikat.

---

## Bauen

Repository → **Actions** → **iPhone-App bauen** → **Run workflow**.

Etwa 10–15 Minuten. Danach steht die Version in TestFlight. Auf deinem iPhone:
TestFlight aus dem App Store installieren, mit derselben Apple-ID anmelden,
METRICGYM installieren. **Fertig — die App läuft auf deinem Handy.**

Was der Workflow tut:

1. Weboberfläche in die App-Hülle kopieren (`sync.sh`)
2. **prüfen, dass das Kaufmodul mitgekommen ist** — fehlt
   `vendor/cdv-purchase.js`, bricht er ab, statt eine App hochzuladen, in der
   jeder Kaufversuch ein 404 wird
3. Baunummer auf die Lauf-Nummer setzen (jeder Upload braucht eine höhere)
4. archivieren — **hier legt Xcode Zertifikat und Profil selbst an**
5. `.ipa` ausgeben und als Artefakt sichern (30 Tage)
6. zu TestFlight hochladen
7. Schlüssel wieder löschen

Die `.ipa` liegt auch dann zum Download bereit, wenn der Upload scheitert.

---

## Vom TestFlight in den App Store

TestFlight ist noch nicht der Store. Wenn die Version auf deinem iPhone läuft
und der Sandbox-Testkauf durch ist (`SUBMIT-IOS.md` §4):

App Store Connect → deine App → **Version zur Prüfung einreichen** →
Screenshots, Beschreibung, Datenschutzangaben, Altersfreigabe → **Einreichen**.
Prüfung meist 1–3 Tage.

---

## Wenn der erste Lauf bricht

| Meldung | Ursache | Abhilfe |
|---|---|---|
| `No profiles for 'de.metricgym.app' were found` | App-ID aus Schritt 2 fehlt | anlegen, neu starten |
| `Authentication credentials are missing or invalid` | Key ID, Issuer ID oder `.p8` falsch kodiert | der Workflow prüft die `.p8` vorab und sagt es |
| `No signing certificate "Apple Distribution" found` | Schlüsselrolle zu niedrig | in App Store Connect auf **App Manager** heben |
| `The bundle version must be higher` | zweimal dieselbe Baunummer | passiert nicht — die Lauf-Nummer wächst von selbst |

---

## Was ich daran nicht testen konnte

**Den Workflow selbst.** Dafür bräuchte ich dein Apple-Entwicklerkonto.
Geprüft ist:

* Die YAML ist gültig, 13 Schritte, und jeder Pfad existiert im Repository.
* Der heikelste Teil — die JSON-Datei mit dem API-Schlüssel für den Upload —
  ist mit einem echten EC-Schlüssel durchgespielt: der PEM-Block kommt mit
  allen Zeilenumbrüchen korrekt an. Genau daran scheitern selbstgebaute
  Pipelines sonst.
* Der Export probiert `app-store-connect` und fällt auf `app-store` zurück
  (Xcode 15.3 hat den Wert umbenannt) — eine ganze Fehlerklasse weniger.

**Dabei habe ich im Xcode-Projekt einen Fehler gefunden und behoben:** die
Capacitor-Vorlage setzte `CODE_SIGN_IDENTITY = "iPhone Developer"` für *beide*
Konfigurationen. Das ist erstens ein Name, den Apple 2019 abgeschafft hat, und
zweitens hätte der Store-Build mit einer **Entwickler**-Identität signiert statt
mit einer Verteilungs-Identität. Jetzt: Debug → `Apple Development`,
Release → `Apple Distribution`.

**Der erste Lauf ist der eigentliche Test.** Bricht er, sagt das Protokoll in
welchem Schritt — schick mir die Zeilen.

---

## Falls du den Workflow nicht willst

Zwei Alternativen, beide ohne eigenen Mac:

* **Mac stundenweise mieten** — MacinCloud oder Scaleway Mac mini, ab ~1 €/Std
  bzw. ~30 €/Monat. Lohnt, wenn du genau einmal hochladen willst.
* **Codemagic** — Baudienst speziell für Capacitor/Ionic, 500 Freiminuten im
  Monat, nimmt denselben API-Schlüssel und signiert ebenfalls automatisch.

Beide brauchen dieselben Angaben aus Schritt 1–4. Der Unterschied ist nur, wer
die Maschine stellt.
