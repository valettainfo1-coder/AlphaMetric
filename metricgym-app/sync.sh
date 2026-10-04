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
cp ../metricgym-netlify/index.html ../metricgym-netlify/config.js \
   ../metricgym-netlify/manifest.webmanifest ../metricgym-netlify/*.png www/
# vendor/ MUSS mit: dort liegt das Kaufmodul (cdv-purchase.js), das die App auf
# iOS nachlaedt. Ohne diesen Ordner endet jeder Kaufversuch in einem 404 —
# einmal passiert, deshalb steht es hier ausdruecklich.
rm -rf www/vendor
cp -r ../metricgym-netlify/vendor www/
npx cap sync
echo "✓ www/ aktualisiert und mit allen eingerichteten Plattformen synchronisiert"
