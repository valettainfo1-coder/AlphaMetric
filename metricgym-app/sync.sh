#!/bin/sh
# Web-Stand in die App-Huelle uebernehmen. Der Service Worker bleibt ABSICHTLICH
# draussen: in der App laedt alles aus dem Paket, eine zweite Cache-Schicht
# wuerde nach einem Update die alte Fassung ausliefern.
set -e
cd "$(dirname "$0")"
cp ../metricgym-netlify/index.html ../metricgym-netlify/config.js \
   ../metricgym-netlify/manifest.webmanifest ../metricgym-netlify/*.png www/
npx cap sync
echo "✓ www/ aktualisiert und mit Android synchronisiert"
