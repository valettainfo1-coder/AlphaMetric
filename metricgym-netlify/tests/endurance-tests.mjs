/* METRICGYM — Ausdauer-Modul-Tests (Cycling & Running): Berechnungs-Engine gegen
   Referenzwerte (NP/IF/TSS/CP/PMC/Zonen) + GPX-Import-Roundtrip. CI-tauglich.

   Start:  npx http-server metricgym-netlify -p 8896 -s &
           node metricgym-netlify/tests/endurance-tests.mjs */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8896';
const EXE = process.env.CHROMIUM || undefined;
const fails = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push(name);
};
const near = (a, b, eps = 0.6) => Math.abs(a - b) <= eps;

// --- Synthetische GPX (15 min, Power/HR/GPS-Schleife) ---
function makeGpx() {
  const n = 900, t0 = Date.now() - 3600e3, cLat = 48.137, cLng = 11.575;
  let pts = '';
  for (let i = 0; i < n; i++) {
    const ph = i / n * Math.PI * 2;
    const lat = (cLat + 0.01 * Math.sin(ph)).toFixed(6);
    const lng = (cLng + 0.014 * Math.cos(ph)).toFixed(6);
    const ele = (520 + 40 * Math.sin(ph * 2)).toFixed(1);
    const power = Math.round(210 + 90 * Math.sin(i / 40) + (i % 120 < 30 ? 70 : 0));
    const hr = Math.round(135 + 22 * (i / n) + 8 * Math.sin(i / 50));
    const time = new Date(t0 + i * 1000).toISOString();
    pts += `<trkpt lat="${lat}" lon="${lng}"><ele>${ele}</ele><time>${time}</time>` +
      `<extensions><power>${power}</power><gpxtpx:TrackPointExtension><gpxtpx:hr>${hr}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>`;
  }
  return `<?xml version="1.0"?><gpx version="1.1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><trk><name>Testfahrt</name><trkseg>${pts}</trkseg></trk></gpx>`;
}

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'], colorScheme: 'dark' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 200)));

await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.ENDUR !== 'undefined' && window.ENDUR.eng, null, { timeout: 15000 });
check('ENDUR-Modul geladen (window.ENDUR)', true);

// ---------- Engine gegen Referenzwerte ----------
const eng = await page.evaluate(() => {
  const e = window.ENDUR.eng;
  const flat = new Array(3600).fill(200);
  const np = e.normalizedPower(flat), ifac = e.intensityFactor(np, 200);
  const cpPts = [180, 300, 600, 1200].map(t => ({ t, p: 250 + 20000 / t }));
  const cpm = e.criticalPower(cpPts);
  const est = e.estimateFtp({ 1200: 280, 480: 300 }, cpm);
  const pmc = e.pmc(Array.from({ length: 60 }, (_, i) => ({ date: i, tss: 100 })));
  const pz = e.powerZones(250);
  return {
    np, ifac, tss1h: e.tss(3600, np, ifac, 200),
    cp: cpm && cpm.cp, wPrime: cpm && cpm.wPrime, ftp: est && est.ftp,
    ctlLast: pmc[pmc.length - 1].ctl, tsbLast: pmc[pmc.length - 1].tsb,
    z4lo: pz[3].lo
  };
});
check('NP(konstant 200 W) = 200', near(eng.np, 200), eng.np);
check('IF(@FTP) = 1.0', near(eng.ifac, 1, 0.01), eng.ifac);
check('TSS(1 h @ FTP) = 100', near(eng.tss1h, 100), eng.tss1h);
check('CP-Modell: CP ≈ 250', near(eng.cp, 250, 2), eng.cp);
check("CP-Modell: W' ≈ 20000", near(eng.wPrime, 20000, 250), eng.wPrime);
check('FTP-Schätzung (95% v. 20 min) ≈ 266', near(eng.ftp, 266, 1), eng.ftp);
check('PMC: CTL nähert sich 100 bei Dauerlast', eng.ctlLast > 75 && eng.ctlLast <= 100, eng.ctlLast);
check('PMC: TSB negativ unter Dauerlast', eng.tsbLast < 5, eng.tsbLast);
check('Power-Zone 4 lo = 228 (0.91·FTP)', eng.z4lo === Math.round(0.91 * 250), eng.z4lo);

// ---------- GPX-Import-Roundtrip ----------
const imp = await page.evaluate(async (g) => {
  const s = await window.ENDUR.importText(g, 'Testfahrt.gpx');
  const streams = await window.ENDUR.EDB.get(s.id);
  return { sport: s.sport, dur: s.dur, distKm: Math.round(s.dist / 100) / 10, np: s.np, avgP: s.avgP,
    ifac: s.if, tss: s.tss, vi: s.vi, avgHr: s.avgHr, decoup: s.decoup, kj: s.kj,
    stored: window.ENDUR.st().activities.length, streamLen: streams ? streams.power.length : 0 };
}, makeGpx());
check('GPX-Import: als Radfahren erkannt', imp.sport === 'cycling', imp.sport);
check('GPX-Import: 900 s Dauer', imp.dur === 900, imp.dur);
check('GPX-Import: Distanz plausibel (>5 km)', imp.distKm > 5, imp.distKm + ' km');
check('GPX-Import: NP > Ø (variable Leistung)', imp.np > imp.avgP + 3, { np: imp.np, avg: imp.avgP });
check('GPX-Import: TSS berechnet (>0)', imp.tss > 0, imp.tss);
check('GPX-Import: VI > 1', imp.vi > 1, imp.vi);
check('GPX-Import: HF-Entkopplung positiv (Drift)', imp.decoup > 0, imp.decoup);
check('GPX-Import: Aktivität in IndexedDB gespeichert', imp.stored === 1 && imp.streamLen === 900, imp);

check('Keine Seiten-Fehler', errs.length === 0, errs.join(' | '));

await browser.close();
console.log('');
if (fails.length) { console.log(`✗ ${fails.length} FEHLGESCHLAGEN: ${fails.join(', ')}`); process.exit(1); }
console.log('ALLE AUSDAUER-TESTS GRÜN');
