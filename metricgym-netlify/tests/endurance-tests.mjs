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

// ---------- TCX-Import ----------
function makeTcx() {
  const n = 600, t0 = Date.now() - 7200e3; let tps = '';
  for (let i = 0; i < n; i++) {
    const ph = i / n * Math.PI * 2, time = new Date(t0 + i * 1000).toISOString();
    const lat = (48.2 + 0.008 * Math.sin(ph)).toFixed(6), lng = (11.6 + 0.01 * Math.cos(ph)).toFixed(6);
    const ele = (500 + 30 * Math.sin(ph * 2)).toFixed(1), dist = (i * 7).toFixed(1);
    const hr = Math.round(140 + 15 * (i / n)), power = Math.round(200 + 80 * Math.sin(i / 35) + (i % 100 < 25 ? 60 : 0));
    tps += `<Trackpoint><Time>${time}</Time><Position><LatitudeDegrees>${lat}</LatitudeDegrees><LongitudeDegrees>${lng}</LongitudeDegrees></Position><AltitudeMeters>${ele}</AltitudeMeters><DistanceMeters>${dist}</DistanceMeters><HeartRateBpm><Value>${hr}</Value></HeartRateBpm><Cadence>90</Cadence><Extensions><TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><Watts>${power}</Watts></TPX></Extensions></Trackpoint>`;
  }
  return `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Biking"><Lap><Track>${tps}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
}
const tcx = await page.evaluate(async (x) => { const s = await window.ENDUR.importText(x, 'ausfahrt.tcx'); return { sport: s.sport, dur: s.dur, np: s.np, tss: s.tss, avgHr: s.avgHr, stored: window.ENDUR.st().activities.length }; }, makeTcx());
check('TCX-Import: Sport=Biking → cycling', tcx.sport === 'cycling', tcx.sport);
check('TCX-Import: Dauer ~600 s', tcx.dur >= 595 && tcx.dur <= 601, tcx.dur);
check('TCX-Import: NP & TSS berechnet', tcx.np > 0 && tcx.tss > 0, { np: tcx.np, tss: tcx.tss });
check('TCX-Import: HF gelesen', tcx.avgHr > 140 && tcx.avgHr < 160, tcx.avgHr);
check('TCX-Import: 2 Aktivitäten insgesamt', tcx.stored === 2, tcx.stored);

// ---------- FIT-Import (Node baut eine minimale, gültige FIT-Binärdatei) ----------
function makeFit() {
  const FIT_EPOCH = 631065600, SC = Math.pow(2, 31) / 180, data = [];
  const u8 = v => data.push(v & 0xFF), u16 = v => { data.push(v & 0xFF); data.push((v >> 8) & 0xFF); };
  const u32 = v => { v = v >>> 0; data.push(v & 0xFF); data.push((v >> 8) & 0xFF); data.push((v >> 16) & 0xFF); data.push((v >> 24) & 0xFF); };
  u8(0x40); u8(0); u8(0); u16(20); u8(8); // record-Definition (local 0, global 20)
  [[253, 4, 0x86], [7, 2, 0x84], [3, 1, 0x02], [4, 1, 0x02], [5, 4, 0x86], [0, 4, 0x85], [1, 4, 0x85], [2, 2, 0x84]].forEach(f => { u8(f[0]); u8(f[1]); u8(f[2]); });
  const n = 300, startUnix = Math.floor(Date.now() / 1000) - 3600;
  for (let i = 0; i < n; i++) {
    const ph = i / n * Math.PI * 2; u8(0x00); // Daten-Message local 0
    u32(startUnix + i - FIT_EPOCH); u16(Math.round(210 + 85 * Math.sin(i / 40) + (i % 110 < 28 ? 65 : 0)));
    u8(Math.round(138 + 20 * (i / n))); u8(92); u32(Math.round(i * 7.5 * 100));
    u32(Math.round((48.15 + 0.009 * Math.sin(ph)) * SC)); u32(Math.round((11.58 + 0.012 * Math.cos(ph)) * SC));
    u16(Math.round((510 + 25 * Math.sin(ph * 2) + 500) * 5));
  }
  const out = [12, 0x10, 0, 0, data.length & 0xFF, (data.length >> 8) & 0xFF, (data.length >> 16) & 0xFF, (data.length >> 24) & 0xFF, 0x2E, 0x46, 0x49, 0x54];
  for (const b of data) out.push(b); out.push(0, 0); // CRC (Parser ignoriert)
  return out;
}
const fit = await page.evaluate(async (arr) => { const u = new Uint8Array(arr); const s = await window.ENDUR.importFit(u.buffer, 'fahrt.fit'); const streams = await window.ENDUR.EDB.get(s.id); return { sport: s.sport, dur: s.dur, np: s.np, avgP: s.avgP, tss: s.tss, vi: s.vi, avgHr: s.avgHr, distKm: Math.round(s.dist / 100) / 10, hasGps: streams.lat.some(x => x != null), stored: window.ENDUR.st().activities.length }; }, makeFit());
check('FIT-Import: als Radfahren erkannt', fit.sport === 'cycling', fit.sport);
check('FIT-Import: Dauer ~300 s', fit.dur >= 295 && fit.dur <= 301, fit.dur);
check('FIT-Import: NP > Ø (variable Leistung)', fit.np > fit.avgP + 2, { np: fit.np, avg: fit.avgP });
check('FIT-Import: TSS & VI berechnet', fit.tss > 0 && fit.vi > 1, { tss: fit.tss, vi: fit.vi });
check('FIT-Import: HF dekodiert', fit.avgHr > 135 && fit.avgHr < 165, fit.avgHr);
check('FIT-Import: GPS aus Semicircles dekodiert', fit.hasGps === true, fit.hasGps);
check('FIT-Import: Distanz plausibel', fit.distKm > 1, fit.distKm + ' km');
check('FIT-Import: 3 Aktivitäten insgesamt', fit.stored === 3, fit.stored);

// ---------- Integration / „Zahnräder" (Gym + Ausdauer greifen ineinander) ----------
const hub = await page.evaluate(() => {
  const E = window.ENDUR;
  const sl20 = E.strengthLoad({ sets: 20, avgRpe: 8, type: 'push' });
  const slRest = E.strengthLoad({ type: 'rest', sets: 0 });
  const today = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
  S.trainingHistory = [{ date: today, type: 'push', sets: 20, volume: 5000, avgRpe: 8 }];
  S.weightLog = [{ t: Date.now() - 86400000, v: 70 }, { t: Date.now(), v: 72.5 }];
  const uld = E.unifiedDailyLoad(), upmc = E.unifiedPMC();
  return { sl20, slRest, totalToday: uld.byDay[today], strToday: uld.br[today] ? uld.br[today].str : 0, endurToday: uld.br[today] ? uld.br[today].endur : 0, ctlLast: upmc.length ? upmc[upmc.length - 1].ctl : 0, bw: E.bodyWeight() };
});
check('Kraft-Last: 20 Sätze @ RPE8 → TSS-Äq (55–80)', hub.sl20 >= 55 && hub.sl20 <= 80, hub.sl20);
check('Kraft-Last: Ruhetag = 0', hub.slRest === 0, hub.slRest);
check('Zahnrad: Gym-Last fließt in gemeinsame Tages-Last', hub.strToday > 0 && hub.totalToday >= hub.strToday + hub.endurToday - 1, { str: hub.strToday, endur: hub.endurToday, total: hub.totalToday });
check('Zahnrad: Ausdauer-Last ist ebenfalls im selben Tag', hub.endurToday > 0, hub.endurToday);
check('Unified-PMC: Fitness reflektiert Gym+Ausdauer (CTL>0)', hub.ctlLast > 0, hub.ctlLast);
check('Zahnrad: eine Gewichtsquelle (letzter weightLog = 72.5)', hub.bw === 72.5, hub.bw);

// ---------- Energie-Naht: Ausdauer-kcal fürs Kalorienziel ----------
const energy = await page.evaluate(() => {
  const tk = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
  const dk = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const acts = window.ENDUR.st().activities || [];
  const expected = acts.filter(a => dk(a.start) === tk).reduce((s, a) => s + (a.kcal || 0), 0);
  return { burn: window.ENDUR.burnForDay(tk), expected };
});
check('Energie-Naht: burnForDay = Summe heutiger Ausdauer-kcal (>0)', energy.burn === energy.expected && energy.burn > 0, energy);

// ---------- Readiness-Naht: Gesamt-Last (Kraft+Ausdauer) senkt die Bereitschaft ----------
const rdy = await page.evaluate(() => {
  const tk = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
  S.checkin = { score: 80 }; S.checkinDate = tk;
  S.trainingHistory = []; window.ENDUR.st().activities = [];
  const r0 = readinessToday();
  const dk = (o) => { const d = new Date(Date.now() - o * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  S.trainingHistory = [0, 1, 2, 3, 4].map(o => ({ date: dk(o), type: 'push', sets: 26, volume: 9000, avgRpe: 9 }));
  const r1 = readinessToday();
  return { base: r0 ? r0.score : null, loaded: r1 ? r1.score : null, parts: r1 ? r1.parts : [] };
});
check('Readiness-Naht: Basis-Score aus Status-Check', rdy.base >= 70, rdy.base);
check('Readiness-Naht: hohe Gesamt-Last senkt die Bereitschaft', rdy.loaded != null && rdy.loaded < rdy.base, { base: rdy.base, loaded: rdy.loaded });
check('Readiness-Naht: Trainingslast als Grund ausgewiesen', rdy.parts.some(x => /Trainingslast/.test(x)), rdy.parts);

// ---------- Funnel-Persona: Cyclist-Onboarding befüllt das Ausdauer-Profil ----------
const funnel = await page.evaluate(async () => {
  return await new Promise((resolve) => {
    S.currentUser = 't@t'; S.users = [{ email: 't@t', username: 'test' }];
    S.a = { height: 180, weight: 76, sleep: 7, goals: [], mode: 'cycling', sex: 'male', age: 31, cyc_goal: 'ftp', exp: 'intermediate', cyc_ftp: 275, cyc_hours: 8, days: 4 };
    delete S.profile; delete S.requiz;
    const BLK = oblocks(); S.step = BLK.length + 1; S.screen = 'onboarding'; save(); render();
    setTimeout(() => {
      S.a.mode = 'gym'; const gymSame = JSON.stringify(oblocks()) === JSON.stringify(OBLOCKS);
      resolve({ hasProfile: !!(S.profile && S.profile.tg), mode: S.profile && S.profile.a.mode, ftp: S.endur && S.endur.athlete.cycling.ftp, sport: S.endur && S.endur.sport, goals: S.profile && S.profile.a.goals, gymSame });
    }, 1700);
  });
});
check('Funnel: Cyclist-Persona erzeugt valides Profil', funnel.hasProfile && funnel.mode === 'cycling', funnel.mode);
check('Funnel: FTP aus dem Quiz landet im Ausdauer-Profil', funnel.ftp === 275 && funnel.sport === 'cycling', { ftp: funnel.ftp, sport: funnel.sport });
check('Funnel: Ausdauer-Ziel gemappt (endurance)', Array.isArray(funnel.goals) && funnel.goals.includes('endurance'), funnel.goals);
check('Funnel: Gym-Pfad unverändert (OBLOCKS)', funnel.gymSame === true, funnel.gymSame);

// ---------- Funnel-Persona: Abnehmen → Fettabbau-Engine + Tempo-gekoppeltes Defizit ----------
const loss = await page.evaluate(async () => {
  return await new Promise((resolve) => {
    S.currentUser = 't@t'; S.users = [{ email: 't@t', username: 'test' }];
    S.a = { mode: 'loss', sex: 'male', age: 32, height: 182, weight: 92, bodyFat: 22, loss_rate: 'mod', exp: 'novice', days: 4, sessionTime: 60, equipment: 'gym_full', act: 'light', goals: [] };
    delete S.profile; delete S.requiz;
    const hasLossRate = oblocks().flat().includes('loss_rate');
    const hasPersona = typeof PERSONAS !== 'undefined' && PERSONAS.some((x) => x[0] === 'loss');
    // Defizit-Kopplung: mod == Default (App-Test-Pfad), easy sanfter, fast härter
    const dNone = calorieDirection({ ...S.a, loss_rate: undefined, goals: ['fat_loss'] }).dir;
    const dMod = calorieDirection({ ...S.a, loss_rate: 'mod', goals: ['fat_loss'] }).dir;
    const dEasy = calorieDirection({ ...S.a, loss_rate: 'easy', goals: ['fat_loss'] }).dir;
    const dFast = calorieDirection({ ...S.a, loss_rate: 'fast', goals: ['fat_loss'] }).dir;
    const BLK = oblocks(); S.step = BLK.length + 1; S.screen = 'onboarding'; save(); render();
    setTimeout(() => {
      resolve({ hasLossRate, hasPersona, goals: S.profile && S.profile.a.goals,
        deficit: S.profile && S.profile.tg.dir < 0,
        dNone, dMod, dEasy, dFast });
    }, 1700);
  });
});
check('Funnel: Abnehmen-Persona registriert (+ loss_rate-Frage)', loss.hasPersona && loss.hasLossRate, { p: loss.hasPersona, q: loss.hasLossRate });
check('Funnel: Abnehmen → goals=[fat_loss] + echtes Defizit', Array.isArray(loss.goals) && loss.goals.includes('fat_loss') && loss.deficit === true, loss.goals);
check('Defizit-Kopplung: mod == Default (App-Test-Pfad byte-identisch)', loss.dMod === loss.dNone, { dMod: loss.dMod, dNone: loss.dNone });
check('Defizit-Kopplung: easy sanfter, fast härter als moderat', loss.dEasy > loss.dMod && loss.dFast < loss.dMod, { easy: loss.dEasy, mod: loss.dMod, fast: loss.dFast });

// ---------- Wissenschaftliche Grundlage: nur reale, attribuierte Studien ----------
const sci = await page.evaluate(() => {
  const E = SCIENCE_REFS('endurance'), W = SCIENCE_REFS('weightloss');
  const allHaveSrc = (arr) => arr.length > 0 && arr.every((x) => x.h && x.b && x.src);
  return {
    nE: E.length, nW: W.length,
    endurReal: ['Coggan', 'Banister', 'Seiler', 'Monod', 'Daniels'].every((n) => E.some((x) => x.src.includes(n))),
    lossReal: ['Garthe', 'Helms', 'Longland', 'Fothergill', 'Wishnofsky'].every((n) => W.some((x) => x.src.includes(n))),
    honestCaveat: W.some((x) => /Näherung|überschätzt/.test(x.b)), // Wishnofsky ehrlich eingeordnet
    allSrc: allHaveSrc(E) && allHaveSrc(W),
    panelRenders: /details/.test(scienceRefsPanelHTML('weightloss', 'x')) && /details/.test(scienceRefsPanelHTML('endurance', 'x')),
  };
});
check('Studien: Ausdauer-Referenzen real & attribuiert', sci.nE >= 6 && sci.endurReal && sci.allSrc, { n: sci.nE, real: sci.endurReal });
check('Studien: Abnehmen-Referenzen real & attribuiert', sci.nW >= 5 && sci.lossReal, { n: sci.nW, real: sci.lossReal });
check('Studien: ~7700-kcal-Regel ehrlich eingeordnet (Metric-Prinzip)', sci.honestCaveat === true, sci.honestCaveat);
check('Studien: Panels rendern (details.acc-i)', sci.panelRenders === true, sci.panelRenders);

check('Keine Seiten-Fehler', errs.length === 0, errs.join(' | '));

await browser.close();
console.log('');
if (fails.length) { console.log(`✗ ${fails.length} FEHLGESCHLAGEN: ${fails.join(', ')}`); process.exit(1); }
console.log('ALLE AUSDAUER-TESTS GRÜN');
