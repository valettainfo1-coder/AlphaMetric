/* METRICGYM — App-Regressionstests (D2): Auth, Training-Logging, Ernährung,
   Plan/Player, Paywall-Ehrlichkeit, CSV-Import. CI-tauglich (Exit-Code).

   Start:  npx http-server metricgym-netlify -p 8896 -s &
           node metricgym-netlify/tests/app-tests.mjs */

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

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'], colorScheme: 'dark' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 200)));

// ---------- 1) Landing rendert fehlerfrei ----------
await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);
const l1 = await page.evaluate(() => ({ screen: S.screen, height: document.body.scrollHeight }));
check('Landing rendert (scrollbar, ohne Fehler)', l1.screen === 'landing' && l1.height > 3000 && errs.length === 0);

// ---------- 2) Registrierung (Cloud offline → lokaler Fallback) ----------
await page.evaluate(() => { S.screen = 'register'; save(); render(); });
await page.waitForTimeout(400);
await page.evaluate(() => {
  document.getElementById('r-user').value = 'CI-Test';
  document.getElementById('r-mail').value = 'ci@example.org';
  document.getElementById('r-pw').value = 'SicherGenug123';
  document.getElementById('r-pw2').value = 'SicherGenug123';
  document.getElementById('c-tos').checked = true;
  document.getElementById('c-health').checked = true;
  A.register();
});
await page.waitForFunction(() => S.screen === 'onboarding', null, { timeout: 20000 }).catch(() => {});
check('Registrierung → Onboarding (Offline-Fallback)', await page.evaluate(() => S.screen === 'onboarding'));

// ---------- 3) Demo-Profil + Satz im Player loggen ----------
await page.evaluate(() => { A.devMode(); });
await page.waitForTimeout(300);
await page.evaluate(() => { A.devModeMenu(); });
await page.waitForTimeout(2200);
await page.evaluate(() => { S.tab = 'train'; save(); render(); }); // registriert A.startType
await page.waitForTimeout(700);
const t3 = await page.evaluate(() => {
  const k = Object.keys(TYPES).find(x => TYPES[x].ex && TYPES[x].ex.length && (EXDB[TYPES[x].ex[0][0]] || {}).m !== 'Herz');
  A.startType(k); return k;
});
await page.waitForTimeout(900);
const before = await page.evaluate(() => { const n = TYPES[S.playerType].ex[S.exIdx][0]; return { n, len: (S.liftLog[n] || []).length }; });
await page.evaluate(() => { A.setW(50); A.log(); });
await page.waitForTimeout(500);
const after = await page.evaluate(n => (S.liftLog[n] || []).length, before.n);
check('Player: Satz geloggt landet im Kraft-Log', after === before.len + 1, `${before.n}: ${before.len}→${after}`);

// ---------- 4) Ernährung: Datenbank-Log + Voice-Parser ----------
await page.evaluate(() => { clearTimeout(window._adv); window._adv = null; S.tab = 'nutrition'; S.restEnd = null; save(); render(); });
await page.waitForTimeout(800);
const n4 = await page.evaluate(() => {
  const b = nlogToday().meals.length;
  const e = addFood(FOODS.find(f => f[0] === 'Magerquark') || FOODS[0], 250);
  const parsed = parseNutrition('500 g Hähnchen und 2 Scheiben Vollkornbrot');
  return { added: nlogToday().meals.length - b, kcal: e.k, voice: parsed.filter(i => i.food).length };
});
check('Ernährung: Log + Voice-Parser (2 Posten)', n4.added === 1 && n4.voice === 2, JSON.stringify(n4));

// ---------- 5) CSV-Import (Hevy, 300 Zeilen) + Duplikat-Schutz ----------
const i5 = await page.evaluate(async () => {
  const head = 'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe';
  const rows = [head];
  for (let w = 0; w < 25; w++) {
    const ds = `2025-02-${String(3 + w).padStart(2, '0')} 18:00:00`;
    for (const ex of ['Bench Press (Barbell)', 'Squat (Barbell)', 'Lat Pulldown (Cable)']) {
      for (let s = 0; s < 4; s++) rows.push(`"W",${ds},,,"${ex}",,,${s},normal,${50 + w},8,,,8`);
    }
  }
  const csv = rows.join('\n');
  const beforeB = (S.liftLog['Bankdrücken'] || []).length;
  A.importText(csv); await new Promise(r => setTimeout(r, 400));
  A.importRun(); await new Promise(r => setTimeout(r, 1500));
  const afterOnce = (S.liftLog['Bankdrücken'] || []).length;
  A.closeModal(); A.importText(csv); await new Promise(r => setTimeout(r, 400));
  A.importRun(); await new Promise(r => setTimeout(r, 1500));
  const afterTwice = (S.liftLog['Bankdrücken'] || []).length;
  return { added: afterOnce - beforeB, dupAdded: afterTwice - afterOnce };
});
check('Import: 100 Bankdrücken-Sätze übernommen', i5.added === 100, JSON.stringify(i5));
check('Import: zweiter Lauf = 0 Duplikate', i5.dupAdded === 0);

// ---------- 6) Paywall ehrlich: Fake-Kauf schaltet nichts frei ----------
await page.evaluate(() => { A.closeModal(); });
const p6 = await page.evaluate(() => {
  S.tier = 'free'; SB.user = { id: 'u-ci' }; S.devMode = false; save();
  const before = S.tier;
  try { A.confirmUpgrade && A.confirmUpgrade('elite'); } catch (e) {}
  return { before, after: S.tier };
});
check('Paywall: Upgrade ohne Zahlungsanbieter bleibt free (Cloud-Konto)', p6.after === 'free', JSON.stringify(p6));

// ---------- 7) Wunsch-Fenster: Freitext → Intent → alle Zahnräder passen sich an ----------
const wish = await page.evaluate(() => {
  // Freitext-Klassifikation (die drei Nutzer-Beispiele + Kanten)
  const P = (s) => parseWish(s);
  const recomp = P('abnehmen bei muskelerhalt');
  const cyc = P('maximale Ausdauer bei radfahren');
  const bale = P('muskelaufbau um auszusehen wie Christian Bale in american psycho');
  const strg = P('einfach stärker werden');
  // "lauf" darf NICHT in "muskelaufbau" matchen
  const noRun = bale.mode !== 'running' && bale.mode !== 'cycling';
  return {
    recompOk: JSON.stringify(recomp.goals) === '["fat_loss","muscle_gain"]' && recomp.mode === 'loss',
    cycOk: cyc.mode === 'cycling' && recomp && Array.isArray(cyc.goals) && cyc.goals.includes('endurance'),
    baleOk: (bale.tags || [])[0] === 'aesthetic' && bale.goals.includes('muscle_gain') && bale.goals.includes('fat_loss') && bale.focus.length > 0 && noRun,
    strengthOk: strg.goals[0] === 'strength',
    empty: parseWish('asdf qwer').matched === false,
  };
});
check('Wunsch: „abnehmen bei Muskelerhalt" → Recomp/loss', wish.recompOk, JSON.stringify(wish));
check('Wunsch: „maximale Ausdauer Rad" → cycling/endurance', wish.cycOk);
check('Wunsch: „aussehen wie Bale" → ästhetisch (kein „lauf"-Fehlgriff)', wish.baleOk);
check('Wunsch: unklarer Text matcht nicht (kein Blindschuss)', wish.empty);

const wishApply = await page.evaluate(() => {
  A.devModeMenu(); // frisches Gym-Profil
  const before = { goals: JSON.stringify(S.profile.tg.goals), kcal: S.profile.tg.train.kcal, prot: S.profile.tg.train.p };
  A.wishApply(parseWish('abnehmen bei muskelerhalt'));
  const after = { goals: JSON.stringify(S.profile.tg.goals), kcal: S.profile.tg.train.kcal, prot: S.profile.tg.train.p, mode: S.profile.a.mode, deficit: S.profile.tg.dir < 0 };
  // Ausdauer-Wunsch vermascht das ENDUR-Athletprofil
  A.wishApply(parseWish('maximale ausdauer beim radfahren'));
  const sport = window.ENDUR && window.ENDUR.st().sport;
  return { before, after, sport, planExists: !!(S.plan && (S.plan.push || S.plan.upper || S.plan.full)) };
});
check('Wunsch anwenden: Ziele + Defizit + Protein rechnen neu (Zahnräder)',
  wishApply.after.goals !== wishApply.before.goals && wishApply.after.deficit && wishApply.after.prot >= wishApply.before.prot && wishApply.planExists,
  JSON.stringify(wishApply));
check('Wunsch anwenden: Ausdauer-Wunsch setzt ENDUR-Sport', wishApply.sport === 'cycling', wishApply.sport);

// ---------- 8) KI-Coach: Experten-Analyse validiert STRIKT + ist XSS-sicher ----------
const aiWish = await page.evaluate(async () => {
  // gültige KI-Antwort → wird gemergt
  window.aiJSON = async () => ({ goals: ['fat_loss', 'muscle_gain'], mode: 'loss', loss_rate: 'easy', focus: ['Bizeps', 'Core'], days: 4, split: 'ul', title: 'Recomp', rationale: 'Moderat + Protein schützt Muskeln.', coachNote: 'Geduld schlägt Hunger.' });
  const g = await wishAnalyzeAI('abnehmen aber muskeln halten');
  // böse KI-Antwort → strikt saniert
  window.aiJSON = async () => ({ goals: ['hack', 'fat_loss', 'muscle_gain', 'strength', 'endurance'], mode: 'evil', loss_rate: 'instant', focus: ['DROP TABLE', 'Bizeps'], days: 99, split: 'x', rationale: 'y'.repeat(999) });
  const e = await wishAnalyzeAI('stärker werden');
  // KI wirft → lokaler Fallback in A.wishAnalyze (kein Crash)
  window.aiActive = () => true; window.aiJSON = async () => { throw new Error('429'); };
  S.tab = 'train'; render(); A.wishOpen();
  const el = document.getElementById('wish-in'); el.value = 'muskeln aufbauen'; A.wishType(el);
  let threw = false; try { await A.wishAnalyze(); } catch (x) { threw = true; }
  // CSS macht "Verstanden" zu Großbuchstaben → case-insensitiv prüfen; kein .ai = lokaler Fallback
  const fellBack = !!(document.getElementById('wish-out') && /verstanden|muskelaufbau/i.test(document.body.innerText) && _wishIntent && !_wishIntent.ai);
  // XSS: bösartiger KI-Text darf nicht als HTML ausgeführt werden
  window.aiJSON = async () => ({ goals: ['muscle_gain'], mode: 'gym', title: '<b id=xss1>x</b>', rationale: "<img src=x onerror='window.__pwn=1'>", coachNote: 'ok' });
  el.value = 'muskeln aufbauen'; A.wishType(el); await A.wishAnalyze();
  return {
    goodOk: JSON.stringify(g.goals) === '["fat_loss","muscle_gain"]' && g.loss_rate === 'easy' && g.split === 'ul' && g.ai === true && !!g.aiRationale,
    evilGoalsClean: g && e.goals.every(x => ['muscle_gain', 'fat_loss', 'strength', 'endurance', 'general', 'mobility'].includes(x)) && e.goals.length <= 3,
    evilModeRejected: e.mode !== 'evil',
    evilRateRejected: !e.loss_rate || ['easy', 'mod', 'fast'].includes(e.loss_rate),
    evilFocusClean: JSON.stringify(e.focus) === '["Bizeps"]',
    evilDaysClamped: e.days <= 6,
    evilRatCapped: (e.aiRationale || '').length <= 420,
    fellBack, threw,
    xssSafe: !window.__pwn && !document.getElementById('xss1'),
  };
});
check('KI-Coach: gültige Experten-Antwort wird gemergt (goals/split/rationale)', aiWish.goodOk, JSON.stringify(aiWish));
check('KI-Coach: ungültige Werte werden STRIKT saniert (goals/mode/rate/focus/days)',
  aiWish.evilGoalsClean && aiWish.evilModeRejected && aiWish.evilRateRejected && aiWish.evilFocusClean && aiWish.evilDaysClamped && aiWish.evilRatCapped, JSON.stringify(aiWish));
check('KI-Coach: Ausfall fällt sauber auf lokale Analyse zurück (kein Crash)', aiWish.fellBack && !aiWish.threw);
check('KI-Coach: bösartiger KI-Text wird escaped (kein HTML-Inject)', aiWish.xssSafe);

check('Keine Seiten-Fehler während der Suite', errs.length === 0, errs.join(' | ').slice(0, 140));

await browser.close();
console.log(fails.length ? `\n${fails.length} TEST(S) ROT: ${fails.join(' · ')}` : '\nALLE APP-TESTS GRÜN');
process.exit(fails.length ? 1 : 0);
