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

// ---------- 9) Audit-Fixes: Parser-Abdeckung + Paywall-Kappung ----------
const audit = await page.evaluate(() => {
  const P = (s) => parseWish(s);
  const cov = {
    mobility: P('beweglicher werden').goals[0] === 'mobility',
    general: P('einfach fit werden').goals[0] === 'general',
    hybrid: P('kraft und ausdauer zusammen').mode === 'hybrid' && P('kraft und ausdauer zusammen').goals.includes('endurance'),
    figur: P('bikini figur für den sommer').matched && P('bikini figur für den sommer').goals.includes('fat_loss'),
    stark: P('stark wie ein löwe werden').goals[0] === 'strength',
    gibberish: P('asdkfjalskdjf').matched === false,
  };
  // Paywall: Free-Tier bekommt nur 1 Ziel über das Wunsch-Fenster
  A.devModeMenu(); S.tier = 'free'; save();
  A.wishApply(parseWish('abnehmen aber muskeln halten'));
  const freeGoals = S.profile.tg.goals.length;
  // Pro-Tier darf mehrere Ziele
  A.devModeMenu(); S.tier = 'pro'; save();
  A.wishApply(parseWish('abnehmen aber muskeln halten'));
  const proGoals = S.profile.tg.goals.length;
  return { cov, freeGoals, proGoals };
});
check('Parser deckt Mobility/General/Hybrid/Figur/Stark ab (keine Sackgasse)',
  audit.cov.mobility && audit.cov.general && audit.cov.hybrid && audit.cov.figur && audit.cov.stark && audit.cov.gibberish, JSON.stringify(audit.cov));
check('Paywall: Free-Tier bekommt nur 1 Ziel über den Wunsch (multi_goal bleibt Pro)', audit.freeGoals === 1, 'free=' + audit.freeGoals);
check('Pro-Tier darf mehrere Ziele über den Wunsch', audit.proGoals >= 2, 'pro=' + audit.proGoals);

// ---------- 10) Aktivitäts-Profile: Interface-Switch + Isolation + geteilte Körperdaten ----------
const act = await page.evaluate(() => {
  // Deterministischer Start: frisches Gym-Profil, Aktivitäten-Liste zurücksetzen
  // (frühere Blöcke der Suite hinterlassen mode='cycling' aus den Wunsch-Tests).
  A.devModeMenu(); S.profile.a.mode = 'gym'; S.acts = null; S.actId = null; S.tab = 'train'; save(); render();
  // Skalare SOFORT festhalten: actList() liefert die Live-Referenz auf S.acts,
  // die sich beim Anlegen weiterer Profile mitverändern würde.
  const l0 = actList(); const l0len = l0.length, l0type = l0[0].type;
  const gymTabs = tabsFor().map(t => t[0]).join(',');
  const before = { goals: JSON.stringify(S.profile.tg.goals), kcal: S.profile.tg.train.kcal, days: S.profile.a.days, w: S.profile.a.weight };
  // Neue Rad-Aktivität anlegen und aktivieren
  A.actNew(); A.actField('name', 'Rennrad'); A.actField('days', 6); A.actSave();
  const cyc = { tab: S.tab, goals: JSON.stringify(S.profile.tg.goals), mode: S.profile.a.mode,
    sport: window.ENDUR && window.ENDUR.st().sport, tabs: tabsFor().map(t => t[0]).join(','),
    days: S.profile.a.days, w: S.profile.a.weight, n: actList().length };
  // Zurück auf das Kraft-Profil
  const gym = actList().find(x => x.type === 'gym'); A.actGo(gym.id);
  const back = { tab: S.tab, goals: JSON.stringify(S.profile.tg.goals), kcal: S.profile.tg.train.kcal,
    days: S.profile.a.days, tabs: tabsFor().map(t => t[0]).join(','), w: S.profile.a.weight };
  // Aufräumen: Rad-Profil wieder entfernen
  const c2 = actList().find(x => x.type === 'cycling'); if (c2) { A.actEdit(c2.id); A.actDelete(); }
  return { migrated: l0len === 1 && l0type === 'gym', gymTabs, before, cyc, back, finalN: actList().length };
});
check('Aktivitäten: bestehendes Setup wird migriert (kein Datenverlust)', act.migrated, JSON.stringify({ n: act.finalN }));
check('Aktivitäten: Rad-Profil schaltet auf Ausdauer-Interface um',
  act.cyc.tab === 'endurance' && act.cyc.tabs.includes('endurance') && !act.cyc.tabs.includes('train') && act.cyc.sport === 'cycling', JSON.stringify(act.cyc));
check('Aktivitäten: Wechsel rechnet Ziele & Plan neu', act.cyc.goals !== act.before.goals && act.cyc.mode === 'cycling', JSON.stringify({ b: act.before.goals, c: act.cyc.goals }));
check('Aktivitäten: Profile sind isoliert (6 vs 4 Tage)', act.cyc.days === 6 && act.back.days === act.before.days, JSON.stringify({ cyc: act.cyc.days, gym: act.back.days }));
check('Aktivitäten: Körperdaten bleiben geteilt (derselbe Mensch)', act.cyc.w === act.before.w && act.back.w === act.before.w, JSON.stringify({ w: act.before.w }));
check('Aktivitäten: Zurückschalten stellt Kraft-Interface & Ziele wieder her',
  act.back.tab === 'train' && act.back.tabs === act.gymTabs && act.back.goals === act.before.goals && act.back.days === act.before.days, JSON.stringify(act.back));

// ---------- 11) Persona-Mehrfachauswahl: mehrere Absichten gleichzeitig ----------
// „Muskeln & Kraft, ABER AUCH abnehmen oder radfahren" muss gemeinsam wählbar sein.
// Gleiche Disziplin verschmilzt zu EINEM Profil mit kombinierten Zielen (Rekomposition),
// eine andere Disziplin bekommt ein eigenes Profil mit eigener Oberfläche.
const multi = await page.evaluate(() => {
  S.tier = 'pro'; save();
  const fmt = (ms) => personaPlan(ms).map(x => `${x.type}:${x.goals.join('+')}`).join(' | ');
  const gymLoss = fmt(['gym', 'loss']), lossGym = fmt(['loss', 'gym']);
  const triple = personaPlan(['gym', 'loss', 'cycling']);
  const dedupe = personaPlan(['gym', 'gym', 'nix', 'loss']).length;
  S.tier = 'free'; const freeGoals = personaPlan(['gym', 'loss'])[0].goals.length; S.tier = 'pro'; save();
  // Kompletter Funnel mit drei Absichten
  localStorage.clear();
  S.currentUser = 't@t.de'; S.tier = 'pro'; S.screen = 'onboarding'; S.step = 0; S.a = {};
  S.profile = null; S.acts = null; S.actId = null; S.requiz = false; S.weightLog = [];
  S.calAdjust = 0; S.calAdjustAt = 0; S.tourDone = true; save(); render();
  A.togglePersona('gym'); A.togglePersona('loss'); A.togglePersona('cycling');
  const marks = document.querySelectorAll('.pg-card.on').length;
  const nums = [...document.querySelectorAll('.pg-n')].map(x => x.textContent).join('');
  const prevRows = document.querySelectorAll('.pg-prow').length;
  A.togglePersona('loss'); const afterOff = (S.a.modes || []).join(',');
  A.togglePersona('loss');
  A.personaGo();
  const seededGoals = JSON.stringify(S.a.goals);
  return { gymLoss, lossGym, tripleN: triple.length, tripleTypes: triple.map(x => x.type).join(','),
    dedupe, freeGoals, marks, nums, prevRows, afterOff, seededGoals, mode: S.a.mode,
    tabShortKombi: tabShort('Krafttraining & Abnehmen') };
});
check('Persona: mehrere Absichten gleichzeitig wählbar (3 Karten aktiv, nummeriert)',
  multi.marks === 3 && multi.nums === '123', JSON.stringify({ marks: multi.marks, nums: multi.nums }));
check('Persona: Kraft + Abnehmen = EIN Profil mit beiden Zielen in gewählter Reihenfolge',
  multi.gymLoss === 'gym:muscle_gain+fat_loss' && multi.lossGym === 'loss:fat_loss+muscle_gain',
  JSON.stringify({ a: multi.gymLoss, b: multi.lossGym }));
check('Persona: andere Disziplin bleibt eigenes Profil (Kraft+Abnehmen+Rad → 2)',
  multi.tripleN === 2 && multi.tripleTypes === 'gym,cycling' && multi.prevRows === 2, JSON.stringify(multi.tripleTypes));
check('Persona: Abwählen entfernt wieder, Doppelnennung wird entschärft',
  multi.afterOff === 'gym,cycling' && multi.dedupe === 1, JSON.stringify({ off: multi.afterOff, dedupe: multi.dedupe }));
check('Persona: Kombi-Absicht belegt die Zielfrage vor (Verknüpfung greift)',
  multi.seededGoals === '["muscle_gain","fat_loss"]' && multi.mode === 'gym', multi.seededGoals);
check('Persona: Free-Tier bekommt aus der Kombi nur das erstgenannte Ziel',
  multi.freeGoals === 1, 'free=' + multi.freeGoals);
check('Persona: Kombi-Tab zeigt die führende Absicht (nicht die zweite)',
  multi.tabShortKombi === 'Krafttraining', multi.tabShortKombi);

// Der Reveal muss aus der Auswahl auch wirklich mehrere umschaltbare Profile bauen.
const multiRev = await page.evaluate(async () => {
  Object.assign(S.a, { sex: 'male', age: 32, height: 180, weight: 88, bf: 22, exp: 'novice',
    injury: [], days: 4, time: 60, sessionTime: 60, split: 'auto', equipment: 'gym_full',
    act: 'light', focus: [], recovery_profile: 'average', schedule_pref: 'consistent' });
  // S.profile MUSS vorher weg: es trägt sonst den Stand aus einem früheren Block,
  // die Warteschleife liefe sofort durch und die Profile wären noch nicht gebaut.
  S.profile = null; S.acts = null; S.actId = null;
  S.step = oblocks().length + 1; save(); render();
  // Auf den Zustand warten, nicht auf eine Frist: vor dem Reveal läuft die Genesis.
  for (let i = 0; i < 150 && !S.profile; i++) await new Promise(r => setTimeout(r, 100));
  await new Promise(r => setTimeout(r, 120));
  // In die App wechseln, wie ein echter Nutzer es mit „Plan aktivieren" tut.
  // Bleibt S.screen auf „onboarding", zeigt JEDES spätere render() die Auswertung
  // statt des angeforderten Tabs — daran sind die folgenden Blöcke unregelmäßig
  // gescheitert, mit wechselnden Symptomen.
  S.screen = 'app'; save();
  const acts = (S.acts || []).map(x => ({ name: x.name, type: x.type, goals: (x.cfg.goals || []).join('+') }));
  const primary = { goals: JSON.stringify(S.profile.tg.goals), w: S.profile.a.weight };
  const cyc = (S.acts || []).find(x => x.type === 'cycling');
  A.actGo(cyc.id);
  const onCyc = { tab: S.tab, goals: JSON.stringify(S.profile.tg.goals), w: S.profile.a.weight,
    sport: window.ENDUR && window.ENDUR.st().sport };
  A.actGo(S.acts[0].id);
  const back = { tab: S.tab, goals: JSON.stringify(S.profile.tg.goals) };
  return { acts, primary, onCyc, back };
});
check('Persona: Reveal legt für jede Absicht ein umschaltbares Profil an',
  multiRev.acts.length === 2 && multiRev.acts[0].type === 'gym' && multiRev.acts[1].type === 'cycling'
  && multiRev.acts[0].goals === 'muscle_gain+fat_loss' && multiRev.acts[1].goals === 'endurance',
  JSON.stringify(multiRev.acts));
check('Persona: zweites Profil schaltet auf Ausdauer, erstes bleibt Rekomposition',
  multiRev.onCyc.tab === 'endurance' && multiRev.onCyc.sport === 'cycling'
  && multiRev.back.tab === 'train' && multiRev.back.goals === multiRev.primary.goals,
  JSON.stringify({ cyc: multiRev.onCyc, back: multiRev.back }));
check('Persona: Körperdaten bleiben über alle angelegten Profile identisch',
  multiRev.onCyc.w === multiRev.primary.w, 'kg=' + multiRev.primary.w);

// ---------- 12) Fokus-Empfehlung: gerechnet, zielabhängig, biochemisch begründet ----------
const frec = await page.evaluate(() => {
  const f = (a) => focusRec(a).picks;
  const head = (a) => focusRec(a).head.replace(/<[^>]+>/g, '');
  const base = { days: 4, split: 'auto', exp: 'novice', injuries: [] };
  const gain = f({ ...base, goals: ['muscle_gain'] });
  const cut = f({ ...base, goals: ['fat_loss', 'muscle_gain'] });
  const str = f({ ...base, split: 'ul', exp: 'intermediate', goals: ['strength'] });
  const run = f({ ...base, goals: ['endurance'], mode: 'running' });
  const cyc = f({ ...base, goals: ['endurance'], endur_disc: 'cycling' });
  const ppl = f({ ...base, days: 6, split: 'ppl', exp: 'advanced', goals: ['muscle_gain'] });
  const shoulder = f({ ...base, goals: ['muscle_gain'], injuries: ['shoulder'] });
  const backInj = f({ ...base, split: 'ul', exp: 'intermediate', goals: ['strength'], injuries: ['back'] });
  const beginner = f({ ...base, split: 'full', days: 3, exp: 'beginner', goals: ['muscle_gain'] });
  const BIG = ['Quadrizeps', 'Gesäß', 'Rücken', 'Latissimus', 'Beinbeuger', 'Brust'];
  // Alle Empfehlungen müssen eine Begründung UND eine Quelle tragen.
  const lines = focusRec({ ...base, goals: ['muscle_gain'] }).lines;
  const sourced = lines.every(([k, why, src]) => why && why.length > 40 && src && /\d{4}/.test(src));
  // Übernehmen-Handler setzt exakt die Empfehlung
  S.a = { ...base, goals: ['muscle_gain'], focus: [] }; A.focusRec();
  const applied = (S.a.focus || []).join(',');
  return { gain, cut, str, run, cyc, ppl, shoulder, backInj, beginner, sourced, applied,
    cutBig: cut.filter(k => BIG.includes(k)).length, cutHead: head({ ...base, goals: ['fat_loss'] }) };
});
check('Fokus: Empfehlung unterscheidet sich je nach gesetztem Ziel',
  frec.gain.join() !== frec.str.join() && frec.str.join() !== frec.run.join() && frec.gain.join() !== frec.cut.join(),
  JSON.stringify({ gain: frec.gain, str: frec.str, run: frec.run }));
check('Fokus: Laufen und Radfahren bekommen unterschiedliche Schwerpunkte',
  frec.run.join() !== frec.cyc.join(), JSON.stringify({ run: frec.run, cyc: frec.cyc }));
check('Fokus: Split mit viel direkter Armarbeit verschiebt die Empfehlung',
  frec.ppl.join() !== frec.gain.join(), JSON.stringify({ auto: frec.gain, ppl: frec.ppl }));
check('Fokus: Verletzungen schließen die betroffene Region aus',
  !frec.shoulder.includes('Seitl. Schulter') && !frec.shoulder.includes('Brust')
  && !frec.backInj.includes('Rücken') && !frec.backInj.includes('Beinbeuger'),
  JSON.stringify({ schulter: frec.shoulder, ruecken: frec.backInj }));
check('Fokus: Im Defizit stehen mindestens zwei große Muskelgruppen drin (Muskelschutz)',
  frec.cutBig >= 2 && /punktuelles Abnehmen gibt es nicht/.test(frec.cutHead), JSON.stringify(frec.cut));
check('Fokus: Einsteiger bekommen weniger Spezialisierung', frec.beginner.length === 2, JSON.stringify(frec.beginner));
check('Fokus: jede Empfehlung trägt Begründung UND Quelle mit Jahreszahl', frec.sourced, 'lines geprüft');
check('Fokus: „Übernehmen" setzt exakt die empfohlenen Gruppen',
  frec.applied === frec.gain.join(','), frec.applied);

// ---------- 13) Start-Übersicht auf Heute: To-do + sichtbare Wirkungskette ----------
const start = await page.evaluate(() => {
  A.devModeMenu();
  S.tab = 'home'; S.seenActs = false; S.seenCatalog = true; S.checkin = null;
  S.trainingHistory = []; S.nutritionLog = {}; S.weightLog = []; S.acts = null; S.actId = null;
  save(); render();
  const fresh = { steps: starterSteps().length, done: starterSteps().filter(x => x.done).length,
    card: /so arbeitet METRICGYM/i.test(document.body.innerText),
    flow: document.querySelectorAll('.sf-row').length,
    pills: document.querySelectorAll('.st-pill').length,
    everyStepUnlocks: starterSteps().every(x => x.un && x.un.length >= 2 && x.d && x.act) };
  // Sheet öffnen hakt den Aktivitäts-Schritt ab
  A.actSheet(); A.closeModal(); render();
  const afterSheet = starterSteps().find(x => /Aktivitäten kennen/.test(x.t)).done;
  // Alles erledigt → Karte klappt zu, bleibt aber erreichbar
  S.checkin = { sleep: 3, energy: 3, stress: 3, sore: 3, score: 70 };
  S.trainingHistory = [1, 2, 3].map(i => ({ date: '2026-08-0' + i, sets: 20, vol: 5000 }));
  S.nutritionLog = { '2026-08-01': { meals: [{ k: 500, p: 30 }, { k: 600, p: 40 }] } };
  S.weightLog = [{ t: Date.now() - 5 * 864e5, v: 84 }, { t: Date.now(), v: 83.4 }];
  save(); render();
  const d = [...document.querySelectorAll('details.acc-i')].find(x => /So hängt alles zusammen/.test(x.innerText));
  return { fresh, afterSheet, allDone: starterSteps().filter(x => x.done).length, collapsed: !!d };
});
check('Start-Übersicht: erscheint für neue Nutzer mit allen Schritten',
  start.fresh.card && start.fresh.steps === 6 && start.fresh.done === 0, JSON.stringify(start.fresh));
check('Start-Übersicht: jeder Schritt nennt, was er freischaltet (Zusammenhänge)',
  start.fresh.everyStepUnlocks && start.fresh.pills >= 12, 'pills=' + start.fresh.pills);
check('Start-Übersicht: Fluss-Bild zeigt Eingabe → Funktion für alle vier Datenquellen',
  start.fresh.flow === 4, 'rows=' + start.fresh.flow);
check('Start-Übersicht: Aktivitäts-Umschalter öffnen hakt den Schritt ab', start.afterSheet, '');
check('Start-Übersicht: komplett erledigt → eingeklappt, aber weiter erreichbar',
  start.allDone === 6 && start.collapsed, JSON.stringify({ done: start.allDone, collapsed: start.collapsed }));

// ---------- 14) Ausdauer-Profil: die ganze App spricht Ausdauer, nicht nur ein Tab ----------
const runUi = await page.evaluate(() => {
  A.devModeMenu();
  // Die Tages-Automatik wechselt beim Rendern EINMAL TÄGLICH das aktive Profil
  // (actAutoRun → actApply). In der App ist das gewollt und mit Rückgängig
  // versehen; hier zieht es dem Block das Profil unter den Füßen weg und war die
  // dritte Ursache der unregelmäßig roten Läufe. Dieser Block will ein festes
  // Profil, also bleibt die Automatik aus.
  S.actAuto = false; S.actAutoDay = todayKey();
  S.acts = null; S.actId = null; S.profile.a.mode = 'gym'; save();
  actList();
  // Laufprofil über die echten Handler anlegen und aktivieren
  A.actNew(); A.actField('type', 'running'); A.actField('name', 'Laufen'); A.actSave();
  A.closeModal();
  S.profile.a.run_goal = 'half'; S.profile.a.run_km = 30; S.profile.a.run_pace = 315;
  window.ENDUR.st().athlete.running.thrSet = true; window.ENDUR.st().athlete.running.thrPace = 315;
  S.endurStart = Date.now(); S.endurDone = {};
  S.tab = 'home'; S.checkin = null; S.trainingHistory = []; save(); render();
  // Seit §63 sind die erklärenden Heute-Abschnitte eingeklappt (Tiefe statt Länge).
  // Der Inhalt IST da, innerText sieht ihn nur nicht — zum Prüfen aufklappen.
  document.querySelectorAll('#root .an-grp').forEach(d => d.open = true);
  const home = document.body.innerText;
  const steps = starterSteps().map(x => x.t).join(' | ');
  const flow = systemFlow().map(x => x[1]).join(' | ');
  const daily = dailyChecklist().items.map(x => x.label).join(' | ');
  // Kraft-Tab existiert für dieses Profil nicht → Umleitung statt Kraft-Oberfläche
  S.tab = 'train'; save(); render();
  const redirected = S.tab;
  S.tab = 'endurance'; save(); render();
  const plan = document.body.innerText;
  return { home, steps, flow, daily, redirected, plan,
    tabs: tabsFor().map(t => t[0]).join(','),
    view: window.ENDUR.st().view };
});
check('Ausdauer-Profil: Start-Übersicht spricht Ausdauer statt Sätze/Player',
  /Erste Einheit aus dem Plan/.test(runUi.steps) && /Drei Aktivitäten importieren/.test(runUi.steps)
  && !/Sätze/.test(runUi.steps), runUi.steps);
check('Ausdauer-Profil: Fluss-Bild nennt importierte Dateien statt geloggter Sätze',
  /Importierte Dateien/.test(runUi.flow) && !/Eingetragene Sätze/.test(runUi.flow), runUi.flow);
check('Ausdauer-Profil: Tagesroutine bietet die Plan-Einheit statt „Training loggen"',
  !/Training eintragen/.test(runUi.daily), runUi.daily);
check('Ausdauer-Profil: Heute-Tab zeigt die echte Einheit, nicht „Cardio"',
  !/\bCardio\b/.test(runUi.home) && /Woche \d+ von \d+/.test(runUi.home), '');
check('Ausdauer-Profil: adaptive Karte erklärt Volumen & Entlastung statt Gewichte',
  /Zuwachs bleibt unter 10 %|Entlastung/.test(runUi.home) && !/passt Gewichte, Sätze/.test(runUi.home), '');
check('Ausdauer-Profil: Kraft-Tab leitet auf die Ausdauer-Ansicht um',
  runUi.redirected === 'endurance' && !runUi.tabs.includes('train'), JSON.stringify({ t: runUi.redirected, tabs: runUi.tabs }));
check('Ausdauer-Profil: Plan-Ansicht zeigt Einheit, Woche, Aufbau und Zonen',
  /heute ·/i.test(runUi.plan) && /Deine Woche/.test(runUi.plan) && /Aufbau bis zum Ziel/.test(runUi.plan)
  && /Deine Zonen/.test(runUi.plan) && /\d:\d\d–\d:\d\d\/km/.test(runUi.plan), '');

// ---------- 15) Kopfzeile läuft auf keiner Gerätebreite über ----------
const bar = await page.evaluate(async () => {
  A.devModeMenu(); actList();
  const out = [];
  for (const w of [320, 375, 390, 430]) {
    for (const nm of ['Kraft', 'Krafttraining', 'Ausdauer Radfahren Sommer 2026']) {
      S.acts[0].name = nm; S.tab = 'train'; save(); render();
      const inner = document.querySelector('.appbar-inner');
      // Breite simulieren: der Container ist auf 430 px gedeckelt, also direkt messen
      inner.style.width = w + 'px';
      const over = inner.scrollWidth - w;
      const kids = [...inner.children].filter(c => c.getBoundingClientRect().width > 0);
      out.push({ w, nm, over, n: kids.length });
      inner.style.width = '';
    }
  }
  return { out, max: Math.max(...out.map(x => x.over)), buttons: document.querySelectorAll('.appbar-inner .icon-btn').length };
});
check('Kopfzeile: kein Überlauf auf 320–430 px, auch mit langem Aktivitätsnamen',
  bar.max <= 0, 'max=' + bar.max + 'px');
check('Kopfzeile: nur zwei Aktionen neben dem Umschalter (Glocke liegt im Menü)',
  bar.buttons === 2, 'buttons=' + bar.buttons);

// ---------- 16) Palette: beim Öffnen scannbar, nicht als Wand ----------
const pal = await page.evaluate(() => {
  A.featureHub();
  const list = document.getElementById('fh-list');
  const visible = [...list.querySelectorAll('.fh-item, .fh-cat > summary')]
    .filter(e => e.checkVisibility ? e.checkVisibility() : e.getClientRects().length).length;
  const cats = list.querySelectorAll('.fh-cat').length;
  const allClosed = [...list.querySelectorAll('.fh-cat')].every(d => !d.open);
  // Aufklappen zeigt die Funktionen der Kategorie
  const first = list.querySelector('.fh-cat'); first.open = true;
  const rows = first.querySelectorAll('.fh-item').length;
  // Suche liefert Treffer + Coach-Ausweg
  A.fhFilter('kalor');
  const hits = document.getElementById('fh-list').querySelectorAll('.fh-item').length;
  const hasCoach = !!document.getElementById('fh-list').querySelector('.fh-coach');
  // Jede indizierte Funktion bleibt über die Kategorien erreichbar
  A.fhFilter('');
  const reachable = [...document.querySelectorAll('#fh-list .fh-cat .fh-item')].length;
  A.fhClose();
  return { visible, cats, allClosed, rows, hits, hasCoach, reachable, total: FEATURE_INDEX.length };
});
check('Palette: beim Öffnen höchstens 10 Elemente sichtbar (vorher über 30)',
  pal.visible <= 10 && pal.cats === 5 && pal.allClosed, JSON.stringify({ sichtbar: pal.visible, kategorien: pal.cats }));
check('Palette: keine Funktion geht verloren — alle bleiben über Kategorien erreichbar',
  pal.reachable === pal.total, pal.reachable + '/' + pal.total);
check('Palette: Aufklappen zeigt die Funktionen, Suche liefert Treffer + Coach-Ausweg',
  pal.rows >= 5 && pal.hits >= 1 && pal.hasCoach, JSON.stringify({ zeilen: pal.rows, treffer: pal.hits }));

// ---------- 17) Player: im Training nur das Nötige, Rest hinter einem Tipp ----------
const play = await page.evaluate(() => {
  const t = Object.keys(TYPES).find(k => k !== 'rest' && TYPES[k].ex && TYPES[k].ex.length);
  S.playerType = t; S.exIdx = 0; S.logged = []; S.tab = 'player'; save(); render();
  const card = document.querySelector('.card');
  const more = card.querySelector('.pl-more');
  const before = Math.round(card.getBoundingClientRect().height);
  const txt = card.innerText;
  // Kernbedienung muss ohne Aufklappen erreichbar sein
  const core = !!(document.getElementById('pw-in') && document.getElementById('pr-in')
    && document.getElementById('primary-cta') && card.querySelector('.scale') && card.querySelector('#setdots'));
  // Sekundäres liegt im Ausklapp
  // innerText liefert bei zugeklappten <details> leeren Text (content-visibility) — textContent nicht.
  const body = more ? more.querySelector('.pl-mbody').textContent : '';
  const hidden = /Satz für Satz/.test(body) && /Tempo|Startwert|Körpergewicht|vorausgefüllt/.test(body);
  // Loggen aktualisiert weiterhin in-place
  A.log();
  const after = { dots: document.querySelectorAll('#setdots .dot.full').length,
    cta: (document.getElementById('primary-cta') || {}).innerText,
    rows: document.querySelectorAll('#logged-list li').length };
  // Schnell-Eintrag öffnet den Bereich automatisch
  A.bulkToggle(true);
  const bulkOpen = !!document.querySelector('.pl-more[open]') && !!document.querySelector('.bulkgrid');
  A.bulkToggle(false);
  return { before, core, hidden, closed: more && !more.open, after, bulkOpen,
    noTempoUp: !/Tempo\s3-/.test(txt) };
});
check('Player: Kernbedienung (Gewicht, Reps, RPE, Sätze, Loggen) ohne Aufklappen da',
  play.core, '');
check('Player: Sekundäres liegt zugeklappt im Ausklapp-Bereich',
  play.closed && play.hidden && play.noTempoUp, JSON.stringify({ zu: play.closed, drin: play.hidden }));
check('Player: Karte passt in einen Bildschirm (unter 560 px)',
  play.before < 560, play.before + 'px');
check('Player: Loggen aktualisiert Punkte, Liste und Button weiterhin in-place',
  play.after.dots === 1 && play.after.rows === 1 && /Satz 2 von/.test(play.after.cta), JSON.stringify(play.after));
check('Player: Schnell-Eintrag klappt den Bereich automatisch auf', play.bulkOpen, '');

// ---------- 18) Analytics spricht die Sprache der aktiven Aktivität (R-2) ----------
const r2 = await page.evaluate(() => {
  A.devModeMenu(); S.tier = 'pro'; S.acts = null; S.actId = null; S.profile.a.mode = 'gym'; save(); actList();
  S.tab = 'analytics'; save(); render();
  // Die Analytics-Gruppen sind seit §62 standardmäßig eingeklappt (Tiefe statt
  // Länge). Der Inhalt IST da, innerText sieht ihn nur nicht — zum Prüfen also
  // alles aufklappen. Geprüft wird, was die Seite ANBIETET, nicht was ohne
  // Zutun gerade sichtbar ist.
  const alleAuf = () => document.querySelectorAll('.an-grp').forEach(d => d.open = true);
  alleAuf();
  const gym = document.body.innerText;
  A.actNew(); A.actField('type', 'running'); A.actField('name', 'Laufen'); A.actSave(); A.closeModal();
  S.profile.a.run_goal = 'half'; S.profile.a.run_km = 30; S.profile.a.run_pace = 315;
  window.ENDUR.st().athlete.running.thrSet = true; S.endurStart = Date.now();
  S.tab = 'analytics'; save(); render();
  alleAuf();
  const run = document.body.innerText;
  const has = (t, s) => new RegExp(t, 'i').test(s);
  return {
    gymVol: has('Trainingsvolumen', gym), gymHeat: has('Muskel-Heatmap', gym),
    runVol: has('Trainingsvolumen', run), runHeat: has('Muskel-Heatmap', run),
    runMev: has('MEV|MRV|Volumen-Korridor|Sätze/Woche', run),
    runUmfang: has('Wochenumfang', run), runVerteilung: has('Verteilung locker', run),
  };
});
check('Analytics: Kraft-Profil behält Trainingsvolumen und Muskel-Heatmap',
  r2.gymVol && r2.gymHeat, JSON.stringify({ vol: r2.gymVol, heat: r2.gymHeat }));
check('Analytics: Ausdauer-Profil sieht keine Sätze, kein MEV/MRV, keine Muskel-Heatmap',
  !r2.runVol && !r2.runHeat && !r2.runMev, JSON.stringify({ vol: r2.runVol, heat: r2.runHeat, mev: r2.runMev }));
check('Analytics: Ausdauer-Profil bekommt Wochenumfang und Verteilung locker/hart',
  r2.runUmfang && r2.runVerteilung, JSON.stringify({ umfang: r2.runUmfang, verteilung: r2.runVerteilung }));

// ---------- 19) Aktivitätsprofil-Übersicht + Paywall ----------
const ov = await page.evaluate(() => {
  // PRO: mehrere Profile, Übersicht listet sie mit ihrer je eigenen Kennzahl
  S.tier = 'pro'; save();
  // Nicht auf die Überreste des Nachbarblocks bauen: fehlt das Laufprofil, wird es
  // hier angelegt — VOR dem Zählen. Vorher erbte dieser Block es aus Block 18, mal
  // war es da, mal nicht, und die Suite brach unregelmäßig ab.
  if (!actList().some(x => x.type === 'running')) {
    A.actNew(); A.actField('type', 'running'); A.actField('name', 'Laufen'); A.actSave(); A.closeModal();
  }
  A.actOverview();
  const proMax = actMax(), cards = document.querySelectorAll('.ap-card').length;
  const addFree = !!document.querySelector('.ap-add:not(.locked)');
  const txt = document.body.innerText;
  const endurLine = /Woche \d+\/\d+/.test(txt);            // Ausdauer-Profil zeigt Zielwoche
  const gymLine = /Einheiten\/Woche/.test(txt);            // Kraft-Profil zeigt Einheiten
  // Wechsel direkt aus der Übersicht
  const r = actList().find(x => x.type === 'running'); A.actGo(r.id);
  const switched = { tab: S.tab, ui: actUi() };
  // FREE: gekappt, gesperrt, Paywall statt Editor
  S.tier = 'free'; S.acts = null; S.actId = null; S.profile.a.mode = 'gym'; save(); actList();
  A.actOverview();
  const freeMax = actMax(), lockedCard = !!document.querySelector('.ap-add.locked');
  const nBefore = actList().length;
  A.actNew();
  const paywallShown = /Aktivitäts-Profile/i.test(document.body.innerText) && !document.getElementById('act-name');
  const nAfter = actList().length;
  A.closeModal();
  // ELITE über Konto-Freischaltung
  S.tier = 'free'; S.users[S.currentUser].email = 'aerion.online@gmail.com';
  window.METRICGYM_CONFIG = Object.assign({}, window.METRICGYM_CONFIG, { eliteAccounts: ['aerion.online@gmail.com'] });
  S.tab = 'home'; save(); render();
  const granted = { tier: S.tier, max: actMax() };
  return { proMax, cards, addFree, endurLine, gymLine, switched, freeMax, lockedCard, nBefore, nAfter, paywallShown, granted };
});
check('Übersicht: listet alle Profile mit ihrer je eigenen Kennzahl',
  ov.cards === 2 && ov.endurLine && ov.gymLine, JSON.stringify({ karten: ov.cards, ausdauer: ov.endurLine, kraft: ov.gymLine }));
check('Übersicht: Wechsel direkt aus der Liste schaltet die Oberfläche um',
  ov.switched.tab === 'endurance' && ov.switched.ui === 'endur', JSON.stringify(ov.switched));
check('Paywall: kostenloser Zugang bekommt genau ein Profil',
  ov.freeMax === 1 && ov.lockedCard && ov.nBefore === 1, JSON.stringify({ max: ov.freeMax, gesperrt: ov.lockedCard }));
check('Paywall: „Aktivität hinzufügen" zeigt die Paywall statt des Editors — kein Profil entsteht',
  ov.paywallShown && ov.nAfter === ov.nBefore, JSON.stringify({ paywall: ov.paywallShown, vorher: ov.nBefore, nachher: ov.nAfter }));
check('Paywall: PERFORMANCE gibt 3 Plätze, freigeschaltetes Konto bekommt ELITE',
  ov.proMax === 3 && ov.granted.tier === 'elite' && ov.granted.max === 8, JSON.stringify({ pro: ov.proMax, konto: ov.granted }));

// ---------- 20) Übungs-Detail: Varianten wirken, nichts wird abgeschnitten ----------
const exd = await page.evaluate(() => {
  A.devModeMenu(); S.tab = 'train'; save(); render();
  // a) Kein Varianten-Chip läuft aus seinem Container
  let maxOver = 0, rows = 0;
  for (const n of Object.keys(GRIP_VARIANTS)) {
    exDetailModal(n);
    const row = document.querySelector('.pills-wrap'); if (!row) continue;
    rows++;
    const rb = row.getBoundingClientRect();
    for (const c of row.querySelectorAll('.pill')) {
      const b = c.getBoundingClientRect();
      maxOver = Math.max(maxOver, Math.round(b.right - rb.right), Math.round(rb.left - b.left));
    }
    A.closeModal();
  }
  // b) Jede Variante ändert Muskelangabe UND Körperkarte — sonst ist die Auswahl folgenlos
  const sig = (n, i) => { exDetailModal(n, i);
    const card = document.querySelector('.mg-mini').closest('.card');
    const svg = card.querySelector('svg');
    const fills = svg ? [...svg.querySelectorAll('[fill]')].map(e => e.getAttribute('fill')).join(',') : '';
    return { txt: card.innerText, fills }; };
  let allDiffer = true, mapDiffers = true;
  for (const n of Object.keys(GRIP_VARIANTS)) {
    const all = GRIP_VARIANTS[n].map((_, i) => sig(n, i));
    if (new Set(all.map(x => x.txt)).size !== all.length) allDiffer = false;
    if (new Set(all.map(x => x.fills)).size !== all.length) mapDiffers = false;
  }
  // c) Kniebeuge: Studio-Mythos raus, Beleg drin, kein leeres „SEKUNDÄR —"
  exDetailModal('Kniebeuge', 1);
  const sq = document.body.innerText;
  const myth = /Sweep|äußerer Quadrizeps/i.test(JSON.stringify(GRIP_VARIANTS));
  const sourced = Object.values(GRIP_VARIANTS).flat().filter(v => v.src).length;
  // d) Strichmännchen ist raus
  const stick = typeof patternAnim !== 'undefined' || document.querySelectorAll('#overlay animateTransform').length > 0;
  const emptySek = /SEKUNDÄR\s*\n\s*—/.test(sq);
  A.closeModal();
  return { rows, maxOver, allDiffer, mapDiffers, myth, sourced, stick, emptySek,
    sqVariants: GRIP_VARIANTS['Kniebeuge'].length, sqSrc: /Paoli|Kubo|Escamilla/.test(sq) };
});
check('Übungs-Detail: kein Varianten-Chip wird abgeschnitten',
  exd.maxOver <= 0 && exd.rows >= 10, JSON.stringify({ zeilen: exd.rows, ueberlauf: exd.maxOver }));
check('Übungs-Detail: jede Variante ändert Muskelangabe UND Körperkarte',
  exd.allDiffer && exd.mapDiffers, JSON.stringify({ text: exd.allDiffer, karte: exd.mapDiffers }));
check('Übungs-Detail: Kniebeuge ohne Studio-Mythos, mit Beleg',
  !exd.myth && exd.sqVariants === 2 && exd.sqSrc, JSON.stringify({ mythos: exd.myth, varianten: exd.sqVariants }));
check('Übungs-Detail: Varianten tragen Belege, kein leeres „SEKUNDÄR —"',
  exd.sourced >= 5 && !exd.emptySek, 'belegte Varianten=' + exd.sourced);
check('Übungs-Detail: animiertes Strichmännchen ist entfernt', !exd.stick, '');

// ---------- 21) Profilwechsel vernichtet keine Arbeit + Wochenplan-Automatik ----------
const keep = await page.evaluate(() => {
  A.devModeMenu(); S.tier = 'pro'; S.acts = null; S.actId = null; S.profile.a.mode = 'gym'; save(); actList();
  A.actNew(); A.actField('type', 'running'); A.actField('name', 'Laufen'); A.actSave(); A.closeModal();
  S.profile.a.exp = 'intermediate';
  const gym = actList().find(x => x.type === 'gym'); A.actGo(gym.id);
  if (!actList().some(x => x.type === 'running')) {
    A.actNew(); A.actField('type', 'running'); A.actField('name', 'Laufen'); A.actSave(); A.closeModal();
  }
  const run = actList().find(x => x.type === 'running');
  run.cfg.days = 5;                                  // nach dem Wechsel: actSyncBack ist durch
  // Nutzer richtet sein Kraft-Profil von Hand ein
  const key = Object.keys(TYPES).find(k => k !== 'rest' && TYPES[k].ex && TYPES[k].ex.length);
  S.exOverrides[key] = { 0: 'Kurzhantel-Bankdrücken' };
  S.schedule = ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'];
  S.currentWeek = 3; S.planMode = 'rotation'; S.rotationPos = 2; save();
  const before = { ov: JSON.stringify(S.exOverrides), sch: S.schedule.join(','), wk: S.currentWeek, mode: S.planMode, pos: S.rotationPos };
  A.actGo(run.id);
  const onRun = { wk: S.currentWeek, ov: JSON.stringify(S.exOverrides), sch: (S.schedule || []).join(','), mode: S.planMode };
  A.actGo(gym.id);
  const after = { ov: JSON.stringify(S.exOverrides), sch: (S.schedule || []).join(','), wk: S.currentWeek, mode: S.planMode, pos: S.rotationPos };
  // Strukturelle Änderung (Tage) muss den gespeicherten Plan verwerfen
  A.actEdit(gym.id); A.actField('days', 6); A.actSave(); A.closeModal();
  const rebuilt = (S.schedule || []).join(',') !== before.sch && S.profile.a.days === 6;
  // --- Automatik ---
  A.actGo(gym.id); S.schedule = ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']; actSyncBack();
  S.actAuto = false; S.actNagDay = null; S.actAutoDay = null; save();
  const sg = actSuggestToday();
  // Zwei Kandidaten → die App schweigt lieber
  A.actNew(); A.actField('type', 'cycling'); A.actField('name', 'Rad'); A.actSave(); A.closeModal();
  A.actGo(gym.id);
  actList().find(x => x.type === 'cycling').cfg.days = 5;   // damit heute auch dort etwas ansteht
  S.schedule = ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']; actSyncBack(); save();
  const many = actList().filter(x => x.id !== S.actId && actHasSessionToday(x)).length;
  const sgMany = actSuggestToday();
  return { before, onRun, after, rebuilt, sg, many, ambiguous: sgMany };
});
check('Wechsel: Übungs-Anpassungen und eigener Wochenplan überleben',
  keep.after.ov === keep.before.ov && keep.after.sch === keep.before.sch,
  JSON.stringify({ ov: keep.after.ov === keep.before.ov, sch: keep.after.sch === keep.before.sch }));
check('Wechsel: Deload-Zyklus, Plan-Modus und Rotation gehören zum Profil',
  keep.after.wk === 3 && keep.after.mode === 'rotation' && keep.after.pos === 2 && keep.onRun.wk === 1,
  JSON.stringify({ zurueck: keep.after.wk, aufLauf: keep.onRun.wk, mode: keep.after.mode }));
check('Wechsel: das andere Profil hat seinen EIGENEN Stand (keine Vermischung)',
  keep.onRun.ov === '{}' && keep.onRun.sch !== keep.before.sch && keep.onRun.mode === 'week',
  JSON.stringify(keep.onRun));
check('Wechsel: strukturelle Änderung (Tage) verwirft den veralteten Plan', keep.rebuilt, '');
check('Automatik: eindeutiger Fall wird vorgeschlagen',
  !!keep.sg && !!keep.sg.label, JSON.stringify(keep.sg));
check('Automatik: bei mehreren Kandidaten schweigt die App',
  keep.many >= 2 && keep.ambiguous === null, JSON.stringify({ kandidaten: keep.many, vorschlag: keep.ambiguous }));

/* Profil-IDs müssen eindeutig sein, auch wenn zwei Profile in derselben
   Millisekunde entstehen. Der alte Generator war "a"+Date.now().toString(36)
   ohne Zufallsanteil — als einziger der Datei. Zwei gleiche IDs bedeuten:
   actCurrent() findet das erste, der Nutzer legt "Laufen" an und bekommt
   "Krafttraining" aktiviert, und das Umschalten bleibt kaputt. Genau dieser
   Fall hat den Ausdauer-Block hier unregelmäßig rot gemacht — die Suite hat
   den Bug also gefunden, bevor ein Kunde ihn gefunden hat.
   Der Test friert die Uhr ein und erzwingt damit die Kollision. */
const kollision = await page.evaluate(() => {
  const echt = Date.now, t = echt(); Date.now = () => t;
  try {
    S.acts = null; S.actId = null; save();
    actList();                                   // Standardprofil
    A.actNew(); A.actField('type', 'running'); A.actField('name', 'Laufen'); A.actSave();
    try { A.closeModal(); } catch (e) {}
    const ids = S.acts.map(x => x.id);
    return { ids, eindeutig: new Set(ids).size === ids.length,
             aktiv: (actCurrent() || {}).type, anzahl: S.acts.length };
  } finally { Date.now = echt; }
});
check('Profile: zwei in derselben Millisekunde angelegte Profile haben verschiedene IDs',
  kollision.eindeutig && kollision.anzahl === 2, JSON.stringify(kollision.ids));
check('Profile: nach dem Anlegen ist das NEUE Profil aktiv, nicht das alte',
  kollision.aktiv === 'running', `aktiv=${kollision.aktiv}`);

check('Keine Seiten-Fehler während der Suite', errs.length === 0, errs.join(' | ').slice(0, 140));

await browser.close();
console.log(fails.length ? `\n${fails.length} TEST(S) ROT: ${fails.join(' · ')}` : '\nALLE APP-TESTS GRÜN');
process.exit(fails.length ? 1 : 0);
