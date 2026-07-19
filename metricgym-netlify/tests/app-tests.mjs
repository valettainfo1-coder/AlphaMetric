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

check('Keine Seiten-Fehler während der Suite', errs.length === 0, errs.join(' | ').slice(0, 140));

await browser.close();
console.log(fails.length ? `\n${fails.length} TEST(S) ROT: ${fails.join(' · ')}` : '\nALLE APP-TESTS GRÜN');
process.exit(fails.length ? 1 : 0);
