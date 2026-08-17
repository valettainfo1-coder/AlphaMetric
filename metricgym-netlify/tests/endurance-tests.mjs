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
    // Auf den Zustand warten statt auf eine feste Frist: vor dem Reveal läuft die
    // Genesis-Animation, und S.profile entsteht erst an ihrem Ende. S.profile wurde
    // oben gelöscht und ist damit das verlässliche Signal.
    (async () => {
      for (let i = 0; i < 150 && !(S.profile && S.profile.tg); i++) await new Promise(r => setTimeout(r, 100));
      S.a.mode = 'gym'; const gymSame = JSON.stringify(oblocks()) === JSON.stringify(OBLOCKS);
      resolve({ hasProfile: !!(S.profile && S.profile.tg), mode: S.profile && S.profile.a.mode, ftp: S.endur && S.endur.athlete.cycling.ftp, sport: S.endur && S.endur.sport, goals: S.profile && S.profile.a.goals, gymSame });
    })();
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
    // Zustand abwarten statt fester Frist — die Genesis läuft vor dem Reveal.
    (async () => {
      for (let i = 0; i < 150 && !(S.profile && S.profile.tg); i++) await new Promise(r => setTimeout(r, 100));
      resolve({ hasLossRate, hasPersona, goals: S.profile && S.profile.a.goals,
        deficit: S.profile && S.profile.tg.dir < 0,
        dNone, dMod, dEasy, dFast });
    })();
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

// ---------- Masterplan P1: Ausdauer-Athlet bekommt endurance-dominanten Plan (Audit K-1) ----------
const p1 = await page.evaluate(() => {
  const build = (mode) => {
    const a = { mode, sex: 'male', age: 40, height: 182, weight: 80, exp: 'intermediate', days: 4, sessionTime: 60, equipment: 'gym_full', act: 'moderate', goals: ['endurance'] };
    const o = generateOptimalSchedule(a);
    const cardio = o.schedule.filter(t => t === 'cardio').length;
    const strength = o.schedule.filter(t => t !== 'cardio' && t !== 'rest').length;
    return { cardio, strength, polar: /80\/20/.test(o.rationale) };
  };
  // Polarisierte Verteilung des Protokolls: 80 % locker
  let z2 = 0, hard = 0; for (let i = 0; i < 15; i++) { const p = cardioProtocol({ mode: 'cycling', goals: ['endurance'] }, i); if (p.key === 'zone2') z2++; else hard++; }
  // Gym-Pfad unverändert
  const gym = generateOptimalSchedule({ sex: 'male', age: 26, height: 180, weight: 78, goals: ['muscle_gain'], exp: 'novice', days: 4, sessionTime: 60, equipment: 'gym_full', act: 'light' });
  const gymCardio = gym.schedule.filter(t => t === 'cardio').length, gymStrength = gym.schedule.filter(t => t !== 'cardio' && t !== 'rest').length;
  return { cyc: build('cycling'), run: build('running'), z2, hard, gymStrength, gymCardio };
});
check('P1: Radfahrer endurance-dominant (≥4 Cardio, ≤2 Kraft, 80/20)', p1.cyc.cardio >= 4 && p1.cyc.strength <= 2 && p1.cyc.cardio > p1.cyc.strength && p1.cyc.polar, JSON.stringify(p1.cyc));
check('P1: Läufer endurance-dominant', p1.run.cardio >= 4 && p1.run.strength <= 2 && p1.run.cardio > p1.run.strength, JSON.stringify(p1.run));
check('P1: Protokoll polarisiert 80/20 (12 locker : 3 hart)', p1.z2 === 12 && p1.hard === 3, `z2=${p1.z2} hard=${p1.hard}`);
check('P1: Gym-Pfad bleibt kraft-dominant (unverändert)', p1.gymStrength >= 3, `strength=${p1.gymStrength}`);

// ---------- Masterplan P2: Ästhetik/Recomp folgt dem Körperfett (Audit M-1) ----------
const p2 = await page.evaluate(() => {
  const dir = (bf, sex) => calorieDirection({ sex, weight: 84, height: 182, bodyFat: bf, goals: ['muscle_gain', 'fat_loss'] }).dir;
  return { bale: dir(18, 'male'), figur: dir(26, 'female'), lean: dir(10, 'male'), fat: dir(28, 'male'),
    noBf: calorieDirection({ sex: 'male', weight: 84, height: 182, goals: ['muscle_gain', 'fat_loss'] }).dir };
});
check('P2: Lean-Wunsch bei mittlerem KF → kein Überschuss (Bale 18 %, Figur 26 %)', p2.bale <= 0 && p2.figur <= 0, JSON.stringify(p2));
check('P2: Wirklich schlank (10 % KF) darf Lean-Gain (Überschuss)', p2.lean > 0, `lean=${p2.lean}`);
check('P2: Hoher KF (28 %) → echtes Defizit', p2.fat <= -0.1, `fat=${p2.fat}`);
check('P2: Ohne KF-Wert bleibt BMI-Pfad (byte-identisch)', p2.noBf === 0.04, `noBf=${p2.noBf}`);

// ---------- Masterplan P3: Volumen nach Trainingsalter + A/B/A + exakte Tage (M-2, N-1) ----------
const p3 = await page.evaluate(() => {
  const beg = deficitScaledBands({ exp: 'beginner', weight: 68, height: 178, goals: ['muscle_gain'] });
  const int = deficitScaledBands({ exp: 'intermediate', weight: 80, height: 180, goals: ['muscle_gain'] });
  const adv = deficitScaledBands({ exp: 'advanced', weight: 88, height: 183, goals: ['muscle_gain'] });
  // A/B/A + exakte Tage: Einsteiger 3T Ganzkörper
  const o = generateOptimalSchedule({ sex: 'male', age: 22, height: 178, weight: 68, goals: ['muscle_gain'], exp: 'beginner', days: 3, sessionTime: 60, equipment: 'home_min', act: 'light' });
  const train = o.schedule.filter(t => t !== 'rest');
  const cardio = o.schedule.filter(t => t === 'cardio').length;
  return {
    begMevLower: beg.Brust[0] < int.Brust[0],           // Einsteiger-MEV niedriger
    advMrvHigher: adv.Brust[1] > int.Brust[1],          // Advanced-MRV höher
    schedule: o.schedule.join('/'), trainDays: train.length, cardio,
    aba: train.join(',') === 'fullA,fullB,fullA',       // A/B/A statt A/B/B
  };
});
check('P3: Einsteiger-MEV < Intermediate, Advanced-MRV > Intermediate', p3.begMevLower && p3.advMrvHigher, JSON.stringify({ begLower: p3.begMevLower, advHigher: p3.advMrvHigher }));
check('P3: Einsteiger-Ganzkörper ist A/B/A (nicht A/B/B)', p3.aba, p3.schedule);
check('P3: Reine Kraft/Muskel bei normalem BMI → exakte Tage, kein Extra-Cardio', p3.trainDays === 3 && p3.cardio === 0, `train=${p3.trainDays} cardio=${p3.cardio}`);

// ---------- Masterplan P4: Protein-Alters-Bonus + Fett im Cut (M-3, N-2) ----------
const p4 = await page.evaluate(() => {
  const mk = (age, dir) => { const a = { sex: 'male', age, weight: 80, height: 180, bodyFat: 20, goals: dir < 0 ? ['fat_loss'] : ['muscle_gain'], loss_rate: 'mod' }; const bmr = bmrCalc(a), td = tdeeCalc(bmr, 'light', effWeight(a), 60, 4); return multiTargets(a, bmr, td); };
  const young = mk(30, 0), old = mk(58, 0);              // Erhaltung, jung vs alt
  const cut = mk(30, -1);                                // echtes Defizit
  const maint = mk(30, 0);
  return { youngP: young.train.p, oldP: old.train.p, cutFatPerKg: +(cut.train.f / 80).toFixed(2), maintFatPerKg: +(maint.train.f / 80).toFixed(2) };
});
check('P4: Ü50 bekommt mehr Protein (anabole Resistenz)', p4.oldP > p4.youngP, `alt=${p4.oldP} jung=${p4.youngP}`);
check('P4: Fett im echten Cut knapper als bei Erhaltung', p4.cutFatPerKg < p4.maintFatPerKg, JSON.stringify(p4));

// ---------- HYPERPRINZIP: Grenzfall-Befunde G-1 bis G-7 (Kohorte-B-Audit) ----------
const hp = await page.evaluate(() => {
  // G-1: Prognose folgt dem ausgegebenen Plan (Kalorienboden greift)
  const tiny = { sex:'female', age:29, height:152, weight:45, bodyFat:22, goals:['fat_loss'], loss_rate:'mod',
    exp:'novice', days:4, act:'sedentary', len:45, focus:[], split:'auto' };
  const tb = bmrCalc(tiny), tt = tdeeCalc(tb, tiny.act, effWeight(tiny), 45, 4), ttg = multiTargets(tiny, tb, tt);
  const tproj = goalProjections(tiny, ttg, 5, 10, tt)[0];
  const realKg = ((tt.avg - (ttg.train.kcal*4 + ttg.rest.kcal*3)/7) * 84) / 7700;
  // Gegenprobe: normales Profil mit echtem Defizit -> Prognose muss substanziell bleiben
  const norm = { sex:'male', age:32, height:180, weight:95, bodyFat:28, goals:['fat_loss'], loss_rate:'mod',
    exp:'novice', days:4, act:'light', len:60, focus:[], split:'auto' };
  const nb = bmrCalc(norm), nt = tdeeCalc(nb, norm.act, effWeight(norm), 60, 4), ntg = multiTargets(norm, nb, nt);
  const nproj = goalProjections(norm, ntg, 5, 10, nt)[0];

  // G-2: Verletzung -> keine kontraindizierte Übung, auch nicht in Variante B
  const inj = { sex:'female', age:36, height:169, weight:74, bodyFat:31, goals:['fat_loss'], exp:'novice',
    days:4, act:'light', equipment:'gym_full', injuries:['knee','back'], focus:[], split:'auto',
    schedule_pref:'consistent', recovery_profile:'average' };
  S.profile = { a: inj }; S.plan = generateTrainingPlan({a:inj}); S.planB = generateTrainingPlan({a:inj}, 'B');
  S.schedule = generateOptimalSchedule(inj).schedule.slice(); S.exOverrides = {};
  let flagged = 0, total = 0;
  for (const t of S.schedule) { if (t==='rest'||t==='cardio') continue;
    for (const e of (sessionDef(t).main||[])) { total++; if (injuryWarn(e.n)) flagged++; } }

  // G-3: Kraft zuerst -> knappes Defizit statt vollem Cut
  const base = { sex:'male', weight:95, height:183, bodyFat:24 };
  const sFirst = calorieDirection({...base, goals:['strength','fat_loss']}).dir;
  const fFirst = calorieDirection({...base, goals:['fat_loss','strength']}).dir;

  // G-4: Fett folgt der fettfreien Masse, Kohlenhydrat-Boden greift
  const ob = { sex:'female', age:47, height:163, weight:109, bodyFat:47, goals:['fat_loss'], loss_rate:'fast',
    exp:'beginner', days:3, act:'sedentary', len:45 };
  const obb = bmrCalc(ob), obt = tdeeCalc(obb, ob.act, effWeight(ob), 45, 3), otg = multiTargets(ob, obb, obt);
  const fatPct = otg.train.f*9 / otg.train.kcal;
  // gleiches Gewicht, anderes Körperfett -> anderes Fettziel (FFM-basiert)
  const lean = {...ob, bodyFat:20}; const lb = bmrCalc(lean), lt = tdeeCalc(lb, lean.act, effWeight(lean), 45, 3);
  const ltg = multiTargets(lean, lb, lt);

  // G-5: Körperfett schlägt BMI (muskulöser Athlet bekommt kein Zwangs-Cardio)
  const ath = { sex:'male', age:31, height:200, weight:112, bodyFat:18, goals:['strength'], exp:'advanced',
    days:4, act:'moderate', equipment:'gym_full', focus:[], split:'auto', schedule_pref:'consistent', recovery_profile:'average' };
  const athSch = generateOptimalSchedule(ath).schedule;
  // G-6: Ausdauer + Abnehmen -> mindestens 2 Krafteinheiten
  const cyc = { sex:'male', age:44, height:178, weight:94, bodyFat:29, mode:'cycling', goals:['fat_loss'],
    exp:'intermediate', days:4, act:'light', focus:[], split:'auto', schedule_pref:'consistent', recovery_profile:'average' };
  const cycSch = generateOptimalSchedule(cyc).schedule;
  const cycStr = cycSch.filter(t=>t!=='rest'&&t!=='cardio').length;
  // G-7: Sportart + Kraftwunsch -> Hybrid, Kraft bleibt erhalten
  const w = parseWish('marathon laufen und gleichzeitig stark bleiben');

  return {
    g1: { promiseHi: tproj.hi, realKg: +realKg.toFixed(2), hasNote: !!tproj.note, normHi: nproj.hi },
    g2: { flagged, total },
    g3: { sFirst, fFirst },
    g4: { fatPct: +fatPct.toFixed(2), obFat: otg.train.f, leanFat: ltg.train.f, carbs: otg.train.c },
    g5: { athCardio: athSch.filter(t=>t==='cardio').length, athStrength: athSch.filter(t=>t!=='rest'&&t!=='cardio').length },
    g6: { cycStrength: cycStr, cycCardio: cycSch.filter(t=>t==='cardio').length },
    g7: { mode: w.mode, goals: w.goals },
  };
});
check('G-1: Prognose folgt dem gedeckelten Plan (kein Über-Versprechen)',
  hp.g1.promiseHi === null || hp.g1.promiseHi <= Math.max(0.5, hp.g1.realKg * 1.3), JSON.stringify(hp.g1));
check('G-1: Sicherheitsgrenze wird ehrlich erklärt (Hinweistext)', hp.g1.hasNote === true, JSON.stringify(hp.g1));
check('G-1: echtes Defizit liefert weiterhin substanzielle Prognose', hp.g1.normHi >= 2, `normHi=${hp.g1.normHi}`);
check('G-2: Verletzung → 0 kontraindizierte Übungen (auch Variante B)', hp.g2.flagged === 0 && hp.g2.total > 10, JSON.stringify(hp.g2));
check('G-3: Kraft zuerst → knapperes Defizit als Fett zuerst', hp.g3.sFirst > hp.g3.fFirst, JSON.stringify(hp.g3));
check('G-4: Fett bleibt unter 40 % der Energie, Carbs nicht kollabiert', hp.g4.fatPct < 0.40 && hp.g4.carbs > 100, JSON.stringify(hp.g4));
check('G-4: Fettziel folgt der fettfreien Masse (gleiches Gewicht, anderes KF)', hp.g4.obFat !== hp.g4.leanFat, JSON.stringify(hp.g4));
check('G-5: muskulöser Athlet bekommt kein BMI-Zwangs-Cardio', hp.g5.athCardio === 0 && hp.g5.athStrength === 4, JSON.stringify(hp.g5));
check('G-6: Ausdauer + Abnehmen → ≥2 Krafteinheiten (Muskelschutz)', hp.g6.cycStrength >= 2 && hp.g6.cycCardio >= 3, JSON.stringify(hp.g6));
check('G-7: Sportart + Kraftwunsch → Hybrid, Kraft erhalten', hp.g7.mode === 'hybrid' && hp.g7.goals.includes('endurance') && (hp.g7.goals.includes('strength')||hp.g7.goals.includes('muscle_gain')), JSON.stringify(hp.g7));

// ===================== AUSDAUER-PLAN (Neustrukturierung) =====================
// Ein Läufer ohne importierte Datei muss einen vollständigen Plan sehen:
// Einheit für heute mit Zielzonen, Wochenaufbau, Rampe bis zum Ziel.
const plan = await page.evaluate(() => {
  const mk = (over) => {
    S.profile = S.profile || { a: {} };
    S.profile.a = Object.assign({ sex: 'male', age: 34, height: 178, weight: 74, exp: 'novice',
      injuries: [], days: 4, act: 'light', schedule_pref: 'consistent', goals: ['endurance'] }, over);
    return endurCfg();
  };
  const st = window.ENDUR.st();
  // --- Läufer, Halbmarathon, Schwellen-Pace bekannt ---
  st.athlete.running.thrSet = false; st.athlete.cycling.ftpSet = false; st.athlete.cycling.ftpEst = false;
  const run = mk({ mode: 'running', run_goal: 'half', run_km: 30, run_pace: 315 });
  const runWeek = endurWeekPlan(run, 1);
  const runRamp = endurBuild(run);
  const runZones = endurZoneTable(run);
  const thr = endurSession(run, 'thr', 33);
  const long = endurSession(run, 'long', 33);
  // --- Läufer OHNE Schwellenwert → ehrlicher Sprechtempo-Fallback statt Startwert ---
  const noThr = mk({ mode: 'running', run_goal: 'endurance', run_km: 20 });
  const noThrZones = endurZoneTable(noThr), noThrTarget = endurTarget(noThr, 2);
  // --- Radfahrer, Gran Fondo, 5 Einheiten, erfahren → 2 harte Einheiten ---
  const cyc = mk({ mode: 'cycling', endur_disc: 'cycling', cyc_goal: 'gran_fondo', cyc_hours: 5, cyc_ftp: 240, days: 5, exp: 'intermediate' });
  const cycWeek = endurWeekPlan(cyc, 1);
  const cycRamp = endurBuild(cyc);
  const cycZones = endurZoneTable(cyc);
  // --- Entlastungswoche: höchstens eine harte Einheit ---
  const dlWeek = endurWeekPlan(cyc, 4);
  // --- Steigerungsraten über alle Ziele beider Disziplinen prüfen ---
  let maxJump = 0, allGoalsOk = true;
  for (const disc of ['running', 'cycling']) {
    for (const g of Object.keys(ENDUR_GOALS[disc])) {
      const c = mk(disc === 'running' ? { mode: 'running', run_goal: g, run_km: 20, run_pace: 315 }
        : { mode: 'cycling', endur_disc: 'cycling', cyc_goal: g, cyc_hours: 5, cyc_ftp: 240 });
      const b = endurBuild(c);
      if (b.length !== c.goal.weeks) allGoalsOk = false;
      // Zielwoche darf das geplante Maximum nicht überschreiten
      if (Math.max(...b.map(x => x.vol)) > c.peak * 1.02) allGoalsOk = false;
      for (let i = 1; i < b.length; i++) if (!b[i].deload && !b[i - 1].deload)
        maxJump = Math.max(maxJump, b[i].vol / b[i - 1].vol - 1);
      // Jede Einheitenart liefert einen vollständigen Bauplan mit Quelle
      for (const k of ['easy', 'long', 'thr', 'vo2', 'hiit', 'str', 'rest']) {
        const s = endurSession(c, k, b[0].vol);
        if (!s.headline || !s.steps.length || !s.why || !s.src) allGoalsOk = false;
      }
    }
  }
  const hardN = (w) => w.filter(k => ENDUR_KINDS[k].hard).length;
  return {
    runWeek, runLong: runWeek.filter(k => k === 'long').length, runHard: hardN(runWeek),
    runStr: runWeek.filter(k => k === 'str').length, runEasy: runWeek.filter(k => k === 'easy').length,
    runZoneN: runZones ? runZones.length : 0, runZ2: runZones && runZones[1].val,
    runLongKm: long.vol, thrSteps: thr.steps.length, thrHasZone: /\d:\d\d–\d:\d\d\/km/.test(thr.steps[1][1]),
    thrSrc: thr.src, rampStart: runRamp[0].vol, rampPeak: Math.max(...runRamp.map(x => x.vol)),
    rampWeeks: runRamp.length, deloads: runRamp.filter(x => x.deload).length,
    noThrZones, noThrTarget,
    cycWeek, cycHard: hardN(cycWeek),
    cycZ2: cycZones && cycZones[1].val, cycPeak: Math.max(...cycRamp.map(x => x.vol)), cycTarget: cyc.peak,
    dlHard: hardN(dlWeek),
    maxJump: +maxJump.toFixed(3), allGoalsOk,
    defaultView: window.ENDUR.defaults().view,
  };
});
check('Plan: Ausdauer startet im PLAN, nicht in der leeren Analyse',
  plan.defaultView === 'plan', plan.defaultView);
check('Plan: Läuferwoche ist polarisiert (1 lang, 1 hart, Rest locker, plus Kraft)',
  plan.runLong === 1 && plan.runHard === 1 && plan.runStr >= 1 && plan.runEasy === 2, plan.runWeek.join('|'));
check('Plan: Zielzonen stehen in echten Zahlen (Pace bzw. Watt)',
  plan.runZoneN === 5 && /\d:\d\d–\d:\d\d\/km/.test(plan.runZ2) && /\d+–\d+ W/.test(plan.cycZ2),
  JSON.stringify({ run: plan.runZ2, cyc: plan.cycZ2 }));
check('Plan: harte Einheit trägt Aufwärmen, Hauptteil mit Zielbereich, Auslaufen und Quelle',
  plan.thrSteps === 3 && plan.thrHasZone && /\d{4}/.test(plan.thrSrc), JSON.stringify({ n: plan.thrSteps, src: plan.thrSrc }));
check('Plan: Rampe läuft vom Ist-Volumen zum Ziel mit Entlastungswochen',
  plan.rampStart === 30 && plan.rampWeeks === 14 && plan.deloads === 3 && plan.rampPeak >= 45,
  JSON.stringify({ von: plan.rampStart, bis: plan.rampPeak, wochen: plan.rampWeeks, entlastung: plan.deloads }));
check('Plan: kein Volumensprung über 10 % pro Woche (Verletzungsschutz)',
  plan.maxJump <= 0.101, 'max=' + Math.round(plan.maxJump * 1000) / 10 + ' %');
check('Plan: alle Ziele beider Disziplinen liefern vollständige Einheiten mit Quelle',
  plan.allGoalsOk, '');
check('Plan: ohne eigenen Schwellenwert keine erfundenen Zonen, sondern Sprechtempo',
  plan.noThrZones === null && /Sprechtempo/.test(plan.noThrTarget), plan.noThrTarget);
check('Plan: 5 Einheiten + erfahren → zwei harte Einheiten',
  plan.cycHard === 2, plan.cycWeek.join('|'));
check('Plan: Entlastungswoche lässt höchstens eine harte Einheit stehen',
  plan.dlHard <= 1, 'hart=' + plan.dlHard);

check('Keine Seiten-Fehler', errs.length === 0, errs.join(' | '));

await browser.close();
console.log('');
if (fails.length) { console.log(`✗ ${fails.length} FEHLGESCHLAGEN: ${fails.join(', ')}`); process.exit(1); }
console.log('ALLE AUSDAUER-TESTS GRÜN');
