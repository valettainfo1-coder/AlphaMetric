#!/bin/sh
# Web-Stand in die App-Huelle uebernehmen. Der Service Worker bleibt ABSICHTLICH
# draussen: in der App laedt alles aus dem Paket, eine zweite Cache-Schicht
# wuerde nach einem Update die alte Fassung ausliefern.
#
# Icons und Startbilder kommen NICHT von hier, sondern aus `node marke.mjs`
# (einmalig, bzw. wenn sich das Logo aendert).
set -e
cd "$(dirname "$0")"
mkdir -p www

QUELLE=../metricgym-netlify

# Im ausgelieferten ZIP gibt es den Nachbarordner nicht — dort liegt www/ schon
# fertig bei. Ohne diese Unterscheidung bricht der erste Befehl der Anleitung
# mit "No such file or directory" ab, und zwar bevor irgendetwas passiert ist.
if [ -f "$QUELLE/index.html" ]; then
  cp "$QUELLE/index.html" "$QUELLE/config.js" "$QUELLE/manifest.webmanifest" "$QUELLE"/*.png www/
  # vendor/ MUSS mit: dort liegt das Kaufmodul (cdv-purchase.js), das die App auf
  # iOS nachlaedt. Ohne diesen Ordner endet jeder Kaufversuch in einem 404 —
  # einmal passiert, deshalb steht es hier ausdruecklich.
  rm -rf www/vendor
  cp -r "$QUELLE/vendor" www/
  echo "· Web-Stand aus $QUELLE uebernommen"
else
  echo "· Kein Quellordner daneben — nehme das mitgelieferte www/"
  [ -f www/index.html ] || { echo "✗ www/index.html fehlt. Paket unvollstaendig."; exit 1; }
  [ -f www/vendor/cdv-purchase.js ] || { echo "✗ www/vendor/cdv-purchase.js fehlt — der Kauf wuerde in einem 404 enden."; exit 1; }
fi

npx cap sync
echo "✓ www/ aktualisiert und mit allen eingerichteten Plattformen synchronisiert"
