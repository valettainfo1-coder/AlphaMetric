#!/bin/sh
# ============================================================================
# METRICGYM — beide Auslieferungspakete bauen.
#
#   A  metricgym-netlify-vNN-JJJJ-MM-TT.zip   → Ordner bei Netlify reinziehen
#   B  METRICGYM-iOS-JJJJ-MM-TT.zip           → iPhone-App fuer den App Store
#
# Warum als Skript und nicht von Hand: "nach jedem Update beide Pakete" darf
# nicht vom Gedaechtnis abhaengen. Und beide Pakete sind schon einmal kaputt
# gewesen, ohne dass man es beim Packen gesehen haette:
#   · das Kaufmodul fehlte in www/  → jeder Kaufversuch ein 404
#   · sync.sh suchte einen Ordner, den es im ZIP nicht gibt
#   · ein Deploy-Paket hatte Testschluessel mitgenommen
# Deshalb prueft dieses Skript jedes Paket NACH dem Packen und bricht ab,
# wenn etwas fehlt oder etwas drin ist, das nicht hineingehoert.
#
# Lauf:  ./pakete.sh            (baut beide)
#        ./pakete.sh --ohne-tests   (ueberspringt die Suiten, schneller)
# ============================================================================
set -eu
cd "$(dirname "$0")"
WURZEL=$(pwd)
DATUM=$(date +%Y-%m-%d)
AUSGABE="$WURZEL"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}"; export NODE_PATH
CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"; export CHROMIUM

rot()  { printf '\033[31m✗ %s\033[0m\n' "$1"; exit 1; }
gruen(){ printf '\033[32m✓\033[0m %s\n' "$1"; }
kopf() { printf '\n\033[1m%s\033[0m\n' "$1"; }

VERSION=$(grep -o 'metricgym-v[0-9]*' metricgym-netlify/sw.js | head -1 | sed 's/metricgym-//')
[ -n "$VERSION" ] || rot "Version aus sw.js nicht lesbar"

# ───────────────────────── Tests ─────────────────────────
if [ "${1:-}" != "--ohne-tests" ]; then
  kopf "Tests"
  npx --yes http-server metricgym-netlify -p 8896 -s >"$TMP/srv.log" 2>&1 &
  SRV=$!
  trap 'kill $SRV 2>/dev/null || true; rm -rf "$TMP"' EXIT
  i=0; while [ $i -lt 30 ]; do
    curl -sf http://127.0.0.1:8896/index.html >/dev/null 2>&1 && break
    i=$((i+1)); sleep 1
  done

  GESAMT=0
  for T in app-tests endurance-tests ui-guard-tests dsgvo-tests ios-tests; do
    if OUT=$(node "metricgym-netlify/tests/$T.mjs" 2>&1); then
      N=$(printf '%s' "$OUT" | grep -c '^✓' || true)
      GESAMT=$((GESAMT+N))
      gruen "$T — $N Zusicherungen"
    else
      printf '%s\n' "$OUT" | grep '^✗' || true
      rot "$T ist rot — es wird nichts ausgeliefert"
    fi
  done

  metricgym-netlify/tests/apple-kette.sh metricgym-netlify/supabase/.kette >/dev/null 2>&1
  if OUT=$(cd metricgym-netlify/supabase/functions/_shared \
           && node --experimental-strip-types apple.test.mjs ../../.kette 2>&1); then
    N=$(printf '%s' "$OUT" | grep -c '^✓' || true)
    GESAMT=$((GESAMT+N))
    gruen "apple-belegpruefung — $N Zusicherungen"
  else
    printf '%s\n' "$OUT" | grep '^✗' || true
    rot "Belegpruefung ist rot"
  fi
  rm -rf metricgym-netlify/supabase/.kette
  kill $SRV 2>/dev/null || true
  gruen "zusammen $GESAMT Zusicherungen"
fi

# ───────────────────── A · Netlify ─────────────────────
kopf "A · Netlify-Paket"
A="$TMP/a/metricgym"; mkdir -p "$A"
cd metricgym-netlify
for f in index.html config.js manifest.webmanifest sw.js robots.txt *.png; do
  [ -f "$f" ] && cp "$f" "$A/"
done
[ -d vendor ] && cp -r vendor "$A/"
cd "$WURZEL"

# Muss drin sein
for f in index.html config.js sw.js manifest.webmanifest vendor/cdv-purchase.js; do
  [ -f "$A/$f" ] || rot "A: $f fehlt"
done
# Darf NICHT drin sein — der Betreiber-Kram und alles Geheime
for m in '*.md' '*.ts' '*.sql' '*.key' '*.p8' '*.pem'; do
  F=$(find "$A" -name "$m" | head -1); [ -z "$F" ] || rot "A: $F gehoert nicht ins Deploy"
done
for d in tests supabase compliance node_modules .kette; do
  [ ! -e "$A/$d" ] || rot "A: Ordner $d gehoert nicht ins Deploy"
done
# Keine Personendaten in der oeffentlich ausgelieferten config.js
if grep -qE '"[^"@[:space:]]+@[^"@[:space:]]+\.[a-z]{2,}"' "$A/config.js"; then
  rot "A: config.js enthaelt eine E-Mail-Adresse — die waere oeffentlich"
fi
ZIPA="$AUSGABE/A-metricgym-netlify-$VERSION-$DATUM.zip"
rm -f "$ZIPA"; (cd "$TMP/a" && zip -rq "$ZIPA" metricgym)
gruen "$(basename "$ZIPA") — $(find "$A" -type f | wc -l | tr -d ' ') Dateien, $(du -h "$ZIPA" | cut -f1)"

# ───────────────────── B · iOS ─────────────────────
kopf "B · iPhone-App-Paket"
cd metricgym-app
./sync.sh >/dev/null 2>&1 || rot "B: sync.sh ist gescheitert"
cd "$WURZEL"

B="$TMP/b/METRICGYM-iOS"; mkdir -p "$B/supabase" "$B/tests" "$B/.github/workflows"
cd metricgym-app
cp -r capacitor.config.json package.json package-lock.json sync.sh marke.mjs \
      README.md SUBMIT-IOS.md .gitignore ios android www "$B/"
cd "$WURZEL"
cp -r metricgym-netlify/supabase/functions "$B/supabase/"
cp metricgym-netlify/supabase/schema.sql "$B/supabase/"
cp metricgym-netlify/tests/ios-tests.mjs metricgym-netlify/tests/apple-kette.sh "$B/tests/"
cp metricgym-netlify/GO-LIVE.md BUILD-OHNE-MAC.md "$B/"
cp .github/workflows/ios-build.yml "$B/.github/workflows/"

rm -rf "$B/supabase/.kette" "$B/ios/App/Pods" "$B/ios/App/build" \
       "$B/android/app/build" "$B/android/build" "$B/android/.gradle" "$B/node_modules"
find "$B" \( -name '*.key' -o -name '*.p8' -o -name '*.pem' -o -name '*.der' \
          -o -name '*.keystore' -o -name '*.jks' -o -name '.DS_Store' \) -delete

# Muss drin sein — das Kaufmodul zuerst, daran ist es schon einmal gescheitert
for f in www/index.html www/vendor/cdv-purchase.js \
         ios/App/App/Info.plist ios/App/App/PrivacyInfo.xcprivacy ios/App/Podfile \
         ios/App/App.xcodeproj/project.pbxproj capacitor.config.json package.json \
         supabase/schema.sql supabase/functions/_shared/apple.ts \
         supabase/functions/apple-verify/index.ts supabase/functions/apple-notify/index.ts \
         SUBMIT-IOS.md BUILD-OHNE-MAC.md .github/workflows/ios-build.yml; do
  [ -f "$B/$f" ] || rot "B: $f fehlt"
done
# Keine Schluessel, keine Bauartefakte
for m in '*.key' '*.p8' '*.pem' '*.jks' '*.keystore'; do
  F=$(find "$B" -name "$m" | head -1); [ -z "$F" ] || rot "B: $F gehoert nicht ins Paket"
done
# Das Projekt muss intakt sein und mit der richtigen Identitaet signieren
python3 - "$B" <<'PY' || exit 1
import re, sys
p = sys.argv[1] + "/ios/App/App.xcodeproj/project.pbxproj"
s = open(p, encoding="utf-8").read()
d = set(re.findall(r'^\t\t([0-9A-F]{24}) ', s, re.M))
r = set(re.findall(r'\b([0-9A-F]{24})\b', s))
if r - d:            print("✗ B: Xcode-Projekt hat unaufloesbare Verweise"); sys.exit(1)
if s.count("{") != s.count("}"): print("✗ B: Xcode-Projekt hat unausgeglichene Klammern"); sys.exit(1)
if "iPhone Developer" in s:      print("✗ B: veraltete Signatur-Identitaet im Projekt"); sys.exit(1)
if "Apple Distribution" not in s:print("✗ B: Release signiert nicht mit Apple Distribution"); sys.exit(1)
PY
# Info.plist und Privatsphaere-Manifest muessen gueltiges XML sein
python3 - "$B" <<'PY' || exit 1
import plistlib, sys, glob
for p in glob.glob(sys.argv[1] + "/ios/**/*.plist", recursive=True) + \
         glob.glob(sys.argv[1] + "/ios/**/*.xcprivacy", recursive=True):
    try: plistlib.load(open(p, "rb"))
    except Exception as e: print(f"✗ B: {p} ist kaputt: {e}"); sys.exit(1)
PY
# App und Server muessen dieselben Produkt-Kennungen kennen
python3 - "$B" <<'PY' || exit 1
import re, sys
w = sys.argv[1]
app = sorted(set(re.findall(r'"(de\.metricgym\.(?:pro|elite)\.(?:monthly|yearly))"',
                            open(w + "/www/index.html", encoding="utf-8").read())))
srv = sorted(set(re.findall(r'"(de\.metricgym\.[a-z.]+)":\s*"(?:pro|elite)"',
                            open(w + "/supabase/functions/_shared/apple.ts", encoding="utf-8").read())))
if app != srv or len(app) != 4:
    print(f"✗ B: Produkt-Kennungen weichen ab — App {app}, Server {srv}"); sys.exit(1)
PY
ZIPB="$AUSGABE/B-METRICGYM-iOS-$DATUM.zip"
rm -f "$ZIPB"; (cd "$TMP/b" && zip -rq "$ZIPB" METRICGYM-iOS)
gruen "$(basename "$ZIPB") — $(find "$B" -type f | wc -l | tr -d ' ') Dateien, $(du -h "$ZIPB" | cut -f1)"

kopf "Fertig"
printf '  A  %s\n  B  %s\n' "$ZIPA" "$ZIPB"
