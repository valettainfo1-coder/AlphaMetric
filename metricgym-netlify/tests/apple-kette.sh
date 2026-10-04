#!/bin/sh
# Erzeugt eine echte, aber FREMDE Zertifikatskette für die Belegprüfungs-Tests.
#
# Warum nicht Apples echte Belege? Die gibt es nur mit Apple-Entwicklerkonto und
# Sandbox-Gerät. Diese Kette ist kryptografisch genauso aufgebaut wie Apples
# (Wurzel P-384 selbstsigniert, Zwischenstelle und Blatt P-256), stammt aber
# erkennbar nicht von Apple. Damit lässt sich beides zeigen: dass die Prüfung
# eine korrekte Kette annimmt, UND dass sie dieselbe Kette ablehnt, sobald
# Apples echtes Wurzelzertifikat verlangt wird.
#
# Lauf:  tests/apple-kette.sh [Zielordner]      (Vorgabe: supabase/.kette)
set -eu
ZIEL="${1:-$(dirname "$0")/../supabase/.kette}"
mkdir -p "$ZIEL"
cd "$ZIEL"

fach() { openssl req -x509 -new -key "$1" -sha384 -days 3650 -out "$2" -subj "$3" 2>/dev/null; }

# Wurzel (P-384, selbstsigniert) — wie Apple Root CA - G3
openssl ecparam -name secp384r1 -genkey -noout -out root.key 2>/dev/null
fach root.key root.pem "/CN=Test Root CA/O=Testerei"

# Zwischenstelle (P-256, von der Wurzel signiert)
openssl ecparam -name prime256v1 -genkey -noout -out mid.key 2>/dev/null
openssl req -new -key mid.key -out mid.csr -subj "/CN=Test Intermediate/O=Testerei" 2>/dev/null
openssl x509 -req -in mid.csr -CA root.pem -CAkey root.key -sha384 -days 1800 -out mid.pem \
  -extfile /dev/stdin <<'EXT' 2>/dev/null
basicConstraints=critical,CA:TRUE
EXT

# Blatt (P-256, von der Zwischenstelle signiert) — signiert später das JWS
openssl ecparam -name prime256v1 -genkey -noout -out leaf.key 2>/dev/null
openssl req -new -key leaf.key -out leaf.csr -subj "/CN=Test Leaf Signing/O=Testerei" 2>/dev/null
openssl x509 -req -in leaf.csr -CA mid.pem -CAkey mid.key -sha256 -days 365 -out leaf.pem 2>/dev/null

# Fremde CA für den Angriffsfall: gültig aufgebaut, nur nicht in der Kette
openssl ecparam -name prime256v1 -genkey -noout -out evil.key 2>/dev/null
openssl req -x509 -new -key evil.key -sha256 -days 365 -out evil.pem -subj "/CN=Evil CA/O=Angreifer" 2>/dev/null
openssl x509 -req -in leaf.csr -CA evil.pem -CAkey evil.key -sha256 -days 365 -out leaf-evil.pem 2>/dev/null

for k in root mid leaf evil; do openssl pkcs8 -topk8 -nocrypt -outform DER -in $k.key -out $k.p8 2>/dev/null; done
for c in root mid leaf leaf-evil evil; do openssl x509 -in $c.pem -outform DER -out $c.der 2>/dev/null; done

openssl verify -CAfile root.pem -untrusted mid.pem leaf.pem
echo "✓ Testkette in $ZIEL"
