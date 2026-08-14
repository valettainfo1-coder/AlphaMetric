/* METRICGYM — UI-WÄCHTER (D4): die Fehlerklassen, die Zustands-Tests systematisch
   verfehlen. Entstanden aus einer Sitzung, in der drei Suiten grün meldeten, während
   die Kopfzeile 154 px aus dem Bildschirm ragte und ein Varianten-Umschalter folgenlos war.

   Vier Blöcke:
     0) SELBSTTEST — jedes Messgerät zuerst gegen einen bekannt-wahren UND einen
        bekannt-falschen Fall prüfen. Ein kaputtes Messgerät ist schlimmer als keins;
        schlägt der Selbsttest fehl, bricht die Suite ab statt grün zu lügen.
     1) LAYOUT-INVARIANTEN — kein Element ragt aus seinem Container, keine Seite
        scrollt horizontal. Über alle Screens × Gerätebreiten 320–430 px.
     2) DIFFERENZ — wo es Optionen gibt, muss Auswahl B sichtbar anderes liefern als A.
        Sonst ist die Auswahl Dekoration.
     3) PERSONA-DURCHLÄUFE — jede Persona durch alle Tabs: kein leerer Screen, keine
        Fremdsprache (ein Läufer liest nie „Sätze" oder „MEV"), keine Roh-Artefakte.

   Start:  npx http-server metricgym-netlify -p 8896 -s &
           node metricgym-netlify/tests/ui-guard-tests.mjs */

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

await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof S !== 'undefined' && typeof render === 'function', null, { timeout: 20000 });

/* ============================ Werkzeuge in der Seite ============================ */
await page.addScriptTag({
  content: `
  window.UIG = {
    /* Sichtbarkeit: getClientRects() liefert bei zugeklappten <details> WEITERHIN Boxen
       (content-visibility) — nur checkVisibility() sagt die Wahrheit. Genau daran habe
       ich mich schon zweimal vermessen, deshalb steht es hier an einer Stelle. */
    visible(el) {
      if (!el || !el.getBoundingClientRect) return false;
      if (el.checkVisibility) return el.checkVisibility();
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    },
    /* Text, wie ein Mensch ihn sieht: innerText respektiert Rendering (versteckte
       <details>-Inhalte fallen raus), textContent nicht. Für „was steht auf dem
       Schirm" ist innerText das richtige Werkzeug. */
    seenText() { return (document.body.innerText || ''); },
    /* Der INHALTSBEREICH allein — ohne Kopfzeile, Tab-Leiste und schwebende Knöpfe.
       Misst man document.body, wirkt selbst ein völlig leerer Screen „voll", weil die
       Hülle schon Text mitbringt. Genau daran ist der erste Leer-Screen-Test gescheitert. */
    contentText() {
      const r = document.getElementById('root') || document.querySelector('.wrap');
      return r ? (r.innerText || '') : '';
    },

    /* Ragt ein Element aus seinem Container? Absichtliche Ausnahmen werden übersprungen:
       - Vorfahren, die scrollen ODER abschneiden (overflow-x != visible): dort entkommt
         optisch nichts nach außen
       - absolut/fix positionierte Deko sitzt bewusst außerhalb des Flusses
       - unsichtbare oder nulldimensionale Elemente
       Toleranz 2 px gegen Subpixel-Rundung. */
    overflows(tol, root) {
      tol = tol == null ? 2 : tol;
      const out = [];
      const scope = root || document.body;
      const all = scope.querySelectorAll('*');
      for (const el of all) {
        // SVG-Innereien haben eigene Koordinatensysteme (viewBox) — dort ist „ragt heraus"
        // bedeutungslos. Geprüft wird das <svg> selbst, nicht seine Pfade und Gruppen.
        if (el.ownerSVGElement) continue;
        if (!this.visible(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.position === 'absolute' || cs.position === 'fixed') continue;
        // Gedrehte/skalierte Elemente: die achsenparallele Hüllbox eines gedrehten
        // Quadrats ist zwangsläufig größer als das Quadrat. Das ist Geometrie, kein Fehler.
        if (cs.transform && cs.transform !== 'none') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        // nächsten Vorfahren finden, der wirklich begrenzt
        let par = el.parentElement, guard = 0;
        while (par && guard++ < 40) {
          const ps = getComputedStyle(par);
          // Alles, was nicht 'visible' ist, schneidet ab oder scrollt — in beiden Fällen
          // entkommt optisch nichts. Geprüft wird, was der Nutzer AUSSERHALB sieht.
          if (ps.overflowX !== 'visible') { par = null; break; }
          if (ps.display === 'contents') { par = par.parentElement; continue; }
          break;
        }
        if (!par || par === scope || par === document.body || par === document.documentElement) continue;
        const pr = par.getBoundingClientRect();
        if (pr.width < 1) continue;
        const over = Math.max(r.right - pr.right, pr.left - r.left);
        if (over > tol) {
          out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 40),
            txt: (el.innerText || el.textContent || '').slice(0, 28).replace(/\\n/g, ' '),
            over: Math.round(over), par: String(par.className || par.tagName).slice(0, 30),
            parTxt: (par.innerText || '').slice(0, 34).replace(/\\n/g, ' ') });
        }
      }
      return out;
    },
    /* Ein sichtbarer, bedienbarer Knopf mit Breite 0 ist immer ein Fehler — meist die
       Flex-Falle: ein Nachbar mit width:100% und flex:0 0 auto frisst die ganze Zeile,
       der flexible Knopf schrumpft auf nichts. Optisch fehlt er einfach. */
    collapsedControls() {
      const out = [];
      for (const el of document.querySelectorAll('button, a[href], input, select')) {
        if (!this.visible(el)) continue;
        if (el.disabled) continue;
        const r = el.getBoundingClientRect();
        const label = (el.innerText || el.getAttribute('aria-label') || el.value || '').trim();
        if (!label) continue;                       // reine Deko ohne Beschriftung
        if (r.width < 2 || r.height < 2) out.push({ txt: label.slice(0, 26), w: Math.round(r.width), h: Math.round(r.height) });
      }
      return out;
    },
    pageScrollsSideways() {
      return Math.round(document.documentElement.scrollWidth - window.innerWidth);
    },
    /* Roh-Artefakte, die niemals auf dem Schirm landen dürfen. */
    artifacts() {
      const t = this.seenText();
      const bad = ['undefined', 'NaN', '[object Object]', '§SEG:', 'Infinity'];
      return bad.filter(b => t.includes(b));
    }
  };`
});

/* ============================ 0) SELBSTTEST DES MESSGERÄTS ============================ */
const self = await page.evaluate(() => {
  const mk = (html) => { const d = document.createElement('div'); d.id = 'uig-probe'; d.innerHTML = html; document.body.appendChild(d); return d; };
  const kill = () => { const d = document.getElementById('uig-probe'); if (d) d.remove(); };

  // (a) bekannt-FALSCH: ein Kind, das klar aus seinem Container ragt → muss gefunden werden
  let probe = mk('<div style="width:100px;overflow:visible"><div id="uig-bad" style="width:400px;height:20px">x</div></div>');
  const found = UIG.overflows(2, probe).some(o => o.over > 200);
  // (b) bekannt-WAHR: brav im Container → darf NICHT gemeldet werden
  kill(); probe = mk('<div style="width:200px"><div style="width:100px;height:20px">x</div></div>');
  const clean = UIG.overflows(2, probe).length === 0;
  kill();

  // (c) Sichtbarkeit: zugeklapptes <details> ist NICHT sichtbar, aufgeklapptes schon
  const d = document.createElement('details'); d.id = 'uig-probe';
  d.innerHTML = '<summary>s</summary><p id="uig-inner">verborgen</p>';
  document.body.appendChild(d);
  const closedHidden = UIG.visible(document.getElementById('uig-inner')) === false;
  const closedTextGone = !UIG.seenText().includes('verborgen');
  d.open = true;
  const openVisible = UIG.visible(document.getElementById('uig-inner')) === true;
  kill();

  return { found, clean, closedHidden, closedTextGone, openVisible };
});
check('Selbsttest: Überlauf-Detektor findet einen echten Überlauf', self.found, '');
check('Selbsttest: Überlauf-Detektor meldet sauberes Layout NICHT', self.clean, '');
check('Selbsttest: Sichtbarkeit erkennt zugeklapptes <details> als unsichtbar',
  self.closedHidden && self.closedTextGone, '');
check('Selbsttest: Sichtbarkeit erkennt aufgeklapptes <details> als sichtbar', self.openVisible, '');
if (fails.length) {
  console.log('\n✗ MESSGERÄT DEFEKT — Suite abgebrochen. Ein kaputtes Messgerät lügt grün.');
  await browser.close();
  process.exit(1);
}

/* ---- Testkonto mit Demo-Historie, damit die Screens echte Daten zeigen ---- */
await page.evaluate(() => {
  localStorage.clear();
  S.currentUser = 'ui@guard.de';
  S.users = S.users || {}; S.users['ui@guard.de'] = { username: 'Wächter', email: 'ui@guard.de' };
  save();
});
await page.evaluate(() => { A.devMode(); });
await page.waitForTimeout(400);
await page.evaluate(() => { A.devModeMenu(); });
await page.waitForTimeout(2200);
await page.evaluate(() => { S.tier = 'elite'; S.tourDone = true; S.seenCatalog = true; S.seenHub = true; save(); });

/* ============================ 1) LAYOUT-INVARIANTEN ============================ */
const WIDTHS = [320, 375, 390, 430];
const SCREENS = [
  ['Heute', () => { S.tab = 'home'; }],
  ['Training', () => { S.tab = 'train'; }],
  ['Player', () => { const t = Object.keys(TYPES).find(k => k !== 'rest' && TYPES[k].ex && TYPES[k].ex.length); S.playerType = t; S.exIdx = 0; S.logged = []; S.tab = 'player'; }],
  ['Analytics', () => { S.tab = 'analytics'; }],
  ['Ernährung', () => { S.tab = 'nutrition'; }],
  ['Profil', () => { S.tab = 'profile'; }],
  ['Preise', () => { S.tab = 'pricing'; }],
  ['Funktionen', () => { S.tab = 'features'; }],
  ['Aktivitäten', () => { S.tab = 'activities'; }],
  ['Ausdauer-Plan', () => { window.ENDUR.st().view = 'plan'; S.tab = 'endurance'; }],
  ['Ausdauer-Form', () => { window.ENDUR.st().view = 'dashboard'; S.tab = 'endurance'; }],
  ['Ausdauer-Athlet', () => { window.ENDUR.st().view = 'athlete'; S.tab = 'endurance'; }],
];
const OVERLAYS = [
  ['Funktions-Palette', 'A.featureHub()'],
  ['Übungs-Detail', "exDetailModal('Kniebeuge')"],
  ['Wochenplan', 'openScheduleSheet()'],
  ['Aktivität bearbeiten', 'A.actEdit(actList()[0].id)'],
];

let layoutBad = [], sideways = [], collapsed = [];
for (const w of WIDTHS) {
  await page.setViewportSize({ width: w, height: 844 });
  for (const [label, fn] of SCREENS) {
    await page.evaluate((src) => { (new Function(src))(); save(); render(); }, '(' + fn.toString() + ')()');
    await page.waitForTimeout(120);
    const r = await page.evaluate(() => ({ ov: UIG.overflows(), side: UIG.pageScrollsSideways(), col: UIG.collapsedControls() }));
    if (r.ov.length) layoutBad.push({ w, label, items: r.ov.slice(0, 3) });
    if (r.side > 2) sideways.push({ w, label, px: r.side });
    if (r.col.length) collapsed.push({ w, label, items: r.col.slice(0, 3) });
  }
  for (const [label, call] of OVERLAYS) {
    await page.evaluate((c) => { try { (new Function(c))(); } catch (e) {} }, call);
    await page.waitForTimeout(140);
    const r = await page.evaluate(() => ({ ov: UIG.overflows(), side: UIG.pageScrollsSideways(), col: UIG.collapsedControls() }));
    if (r.ov.length) layoutBad.push({ w, label, items: r.ov.slice(0, 3) });
    if (r.side > 2) sideways.push({ w, label, px: r.side });
    if (r.col.length) collapsed.push({ w, label, items: r.col.slice(0, 3) });
    await page.evaluate(() => { A.closeModal(); overlay.innerHTML = ''; });
  }
}
check(`Layout: kein Element ragt aus seinem Container (${SCREENS.length + OVERLAYS.length} Screens × ${WIDTHS.length} Breiten)`,
  layoutBad.length === 0,
  layoutBad.length ? layoutBad.slice(0, 4).map(b => `${b.w}px/${b.label}: ` + b.items.map(i => `${i.tag}.${i.cls} in .${i.par}["${i.parTxt}"] +${i.over}px`).join(', ')).join(' | ') : '');
check('Layout: kein sichtbarer Knopf ist auf 0 px zusammengefallen',
  collapsed.length === 0,
  collapsed.length ? collapsed.slice(0, 4).map(c => `${c.w}px/${c.label}: ` + c.items.map(i => `"${i.txt}" ${i.w}×${i.h}`).join(', ')).join(' | ') : '');
check('Layout: keine Seite scrollt horizontal', sideways.length === 0,
  sideways.length ? sideways.slice(0, 4).map(s => `${s.w}px/${s.label} +${s.px}px`).join(' | ') : '');

await page.setViewportSize({ width: 390, height: 844 });

/* ============================ 2) DIFFERENZ-TESTS ============================ */
/* Wo der Nutzer wählen kann, MUSS die Wahl etwas ändern. Der Varianten-Bug fiel genau
   in diese Lücke: die Auswahl sah aus wie eine Auswahl und war doch folgenlos. */
const diff = await page.evaluate(() => {
  const res = {};

  /* a) Übungs-Varianten. Text UND Körperkarte werden GETRENNT geprüft: verschmilzt man
     beides zu einer Signatur, genügt eine der beiden Änderungen, um den Test zu bestehen —
     und ein stehengebliebener Text bleibt unentdeckt. Genau das ist beim Mutationstest
     dieser Suite aufgefallen. */
  const varTxtBad = [], varMapBad = [], varLoadBad = [];
  for (const n of Object.keys(GRIP_VARIANTS)) {
    const txts = [], maps = [];
    GRIP_VARIANTS[n].forEach((_, i) => {
      exDetailModal(n, i);
      /* Gemessen wird der MUSKELBLOCK, nicht die ganze Karte: die Variantenbeschreibung
         darunter ändert sich ohnehin immer und würde jeden Stillstand im Muskelblock
         zudecken. Auch das ist erst im Mutationstest aufgefallen. */
      const mini = document.querySelector('.mg-mini');
      txts.push(mini ? (mini.innerText || '') : '');
      maps.push(mini ? [...mini.querySelectorAll('svg [fill]')].map(e => e.getAttribute('fill')).join(',') : '');
    });
    /* Zwei ehrliche Sorten von Variante:
       - kind "muscle" (Standard): betont ANDERE Muskeln → Text und Karte müssen sich ändern
       - kind "load": dieselben Muskeln, andere Belastung (Länge, Gelenkbahn, ladbares
         Gewicht) → Karte bleibt zu Recht gleich, die App sagt das ausdrücklich
       Geprüft wird nur, was die Variante selbst behauptet. */
    const kinds = GRIP_VARIANTS[n].map(v => v.kind || 'muscle');
    const idx = kinds.map((k, i) => k === 'muscle' ? i : -1).filter(i => i >= 0);
    const mTxt = idx.map(i => txts[i]), mMap = idx.map(i => maps[i]);
    if (new Set(mTxt).size !== mTxt.length) varTxtBad.push(n);
    if (new Set(mMap).size !== mMap.length) varMapBad.push(n);
    // Und keine Variante darf ihr Etikett unbegründet tragen: „load" muss erklärt werden.
    GRIP_VARIANTS[n].forEach(v => { if (v.kind === 'load' && !/gleiche Muskulatur|Dieselbe Muskulatur|Bewegungsumfang|gelenkschonend|Dehnung|ladbar/i.test(v.why)) varLoadBad.push(n + '/' + v.n); });
    A.closeModal();
  }
  res.varTxtBad = varTxtBad; res.varMapBad = varMapBad; res.varLoadBad = varLoadBad; res.varN = Object.keys(GRIP_VARIANTS).length;

  // b) Ausdauer-Ansichten
  const views = ['plan', 'dashboard', 'activities', 'athlete'].map(v => {
    window.ENDUR.st().view = v; S.tab = 'endurance'; save(); render();
    return (document.querySelector('.wrap') || document.body).innerText.slice(0, 400);
  });
  res.viewsUnique = new Set(views).size;

  // c) Fokus-Empfehlung je Ziel
  const base = { days: 4, split: 'auto', exp: 'novice', injuries: [] };
  const picks = ['muscle_gain', 'fat_loss', 'strength', 'endurance'].map(g => focusRec({ ...base, goals: [g] }).picks.join(','));
  res.picksUnique = new Set(picks).size;

  // d) Persona-Kombinationen
  S.tier = 'pro';
  const plans = [['gym'], ['loss'], ['gym', 'loss'], ['gym', 'cycling']].map(m => personaPlan(m).map(x => x.type + ':' + x.goals.join('+')).join('|'));
  res.plansUnique = new Set(plans).size;

  // e) Aktivitätsprofile: Wechsel ändert Oberfläche und Ziele
  S.acts = null; S.actId = null; S.profile.a.mode = 'gym'; save(); actList();
  A.actNew(); A.actField('type', 'running'); A.actField('name', 'Laufen'); A.actSave(); A.closeModal();
  const gymId = actList().find(x => x.type === 'gym').id, runId = actList().find(x => x.type === 'running').id;
  A.actGo(gymId); const a1 = { ui: actUi(), tabs: tabsFor().map(t => t[0]).join(',') };
  A.actGo(runId); const a2 = { ui: actUi(), tabs: tabsFor().map(t => t[0]).join(',') };
  res.actDiffers = a1.ui !== a2.ui && a1.tabs !== a2.tabs;
  A.actGo(gymId);
  return res;
});
check('Differenz: jede Übungs-Variante ändert den TEXT (Muskelangabe)',
  diff.varTxtBad.length === 0, diff.varTxtBad.length ? 'Text bleibt gleich bei: ' + diff.varTxtBad.join(', ') : `${diff.varN} Übungen geprüft`);
check('Differenz: jede Übungs-Variante ändert die KÖRPERKARTE',
  diff.varMapBad.length === 0, diff.varMapBad.length ? 'Karte bleibt gleich bei: ' + diff.varMapBad.join(', ') : `${diff.varN} Übungen geprüft`);
check('Differenz: Varianten ohne Muskelwechsel begründen ihren Reiz-Unterschied',
  diff.varLoadBad.length === 0, diff.varLoadBad.join(', '));
check('Differenz: die vier Ausdauer-Ansichten zeigen Verschiedenes', diff.viewsUnique === 4, `${diff.viewsUnique}/4`);
check('Differenz: die Fokus-Empfehlung unterscheidet sich je Ziel', diff.picksUnique === 4, `${diff.picksUnique}/4`);
check('Differenz: Persona-Kombinationen ergeben verschiedene Profil-Pläne', diff.plansUnique === 4, `${diff.plansUnique}/4`);
check('Differenz: Profilwechsel ändert Oberfläche und Tab-Leiste', diff.actDiffers, '');

/* ============================ 3) PERSONA-DURCHLÄUFE ============================ */
/* Ein Läufer darf nirgends Kraft-Vokabular lesen und umgekehrt. Und kein Screen,
   den ein Tab anbietet, darf leer sein — der leere Ausdauer-Tab war genau das. */
const PERSONAS = [
  ['Kraft', { mode: 'gym', goals: ['muscle_gain'], days: 4, split: 'auto', equipment: 'gym_full' }],
  ['Abnehmen', { mode: 'loss', goals: ['fat_loss'], days: 4, loss_rate: 'mod', equipment: 'gym_full' }],
  ['Radfahren', { mode: 'cycling', endur_disc: 'cycling', goals: ['endurance'], cyc_goal: 'gran_fondo', cyc_hours: 5, days: 4 }],
  ['Laufen', { mode: 'running', endur_disc: 'running', goals: ['endurance'], run_goal: 'half', run_km: 30, days: 4 }],
  ['Hybrid', { mode: 'hybrid', endur_disc: 'running', goals: ['muscle_gain', 'endurance'], days: 5, equipment: 'gym_full' }],
];
// Vokabular, das in der jeweils anderen Welt nichts zu suchen hat.
const FORBIDDEN_ENDUR = ['MEV', 'MRV', 'Volumen-Korridor', 'Muskel-Heatmap', 'Sätze/Woche', 'Trainingsvolumen'];
const FORBIDDEN_GYM = ['Wochenumfang', 'Verteilung locker'];

const persona = [];
for (const [label, a] of PERSONAS) {
  const r = await page.evaluate(async ({ label, a, fe, fg }) => {
    localStorage.clear();
    S.currentUser = 'ui@guard.de';
    S.users = { 'ui@guard.de': { username: 'Wächter', email: 'ui@guard.de' } };
    S.tier = 'elite'; S.screen = 'onboarding'; S.step = 0; S.a = {};
    S.profile = null; S.acts = null; S.actId = null; S.requiz = false;
    S.tourDone = true; S.seenCatalog = true; S.seenHub = true;
    S.trainingHistory = []; S.nutritionLog = {}; S.weightLog = []; S.checkin = null;
    S.endurStart = null; S.endurDone = {};
    // Ein frischer Nutzer landet in der Standardansicht — sonst prüft der Durchlauf
    // zufällig die zuletzt offene Unteransicht und verfehlt die eigentliche Startseite.
    try { window.ENDUR.st().view = 'plan'; window.ENDUR.st().sel = null; } catch (e) {}
    Object.assign(S.a, { modes: [a.mode], sex: 'male', age: 32, height: 180, weight: 82, bf: 20,
      exp: 'novice', injuries: [], sessionTime: 60, act: 'light', focus: [],
      recovery_profile: 'average', schedule_pref: 'consistent' }, a);
    S.step = oblocks().length + 1; save(); render();
    await new Promise(r => setTimeout(r, 1900));
    A.startApp();
    await new Promise(r => setTimeout(r, 1500));

    const endur = actUi() === 'endur';
    const tabs = tabsFor().map(t => t[0]);
    const out = { label, endur, empty: [], forbidden: [], artifacts: [], plan: !!S.profile };
    for (const t of tabs) {
      S.tab = t; save(); render();
      await new Promise(r => setTimeout(r, 220));
      const txt = UIG.seenText();
      const body = UIG.contentText().trim();
      if (body.length < 120) out.empty.push(t + ' (' + body.length + ' Zeichen Inhalt)');
      const bad = (endur ? fe : fg).filter(w => txt.includes(w));
      if (bad.length) out.forbidden.push(t + ': ' + bad.join('/'));
      const art = UIG.artifacts();
      if (art.length) out.artifacts.push(t + ': ' + art.join('/'));
    }
    return out;
  }, { label, a, fe: FORBIDDEN_ENDUR, fg: FORBIDDEN_GYM });
  persona.push(r);
  console.log(`   · ${r.label.padEnd(11)} ${r.endur ? 'Ausdauer' : 'Kraft   '}  leer:${r.empty.length}  fremd:${r.forbidden.length}  artefakt:${r.artifacts.length}`);
}
const emptyAll = persona.flatMap(p => p.empty.map(e => p.label + '/' + e));
const forbAll = persona.flatMap(p => p.forbidden.map(e => p.label + '/' + e));
const artAll = persona.flatMap(p => p.artifacts.map(e => p.label + '/' + e));
check('Personas: jede Persona kommt durch das Onboarding zu einem Plan',
  persona.every(p => p.plan), persona.filter(p => !p.plan).map(p => p.label).join(', '));
check('Personas: kein Tab ist leer', emptyAll.length === 0, emptyAll.slice(0, 5).join(' | '));
check('Personas: keine Fremdsprache (Läufer liest kein Kraft-Vokabular und umgekehrt)',
  forbAll.length === 0, forbAll.slice(0, 5).join(' | '));
check('Personas: keine Roh-Artefakte (undefined/NaN/[object Object]/§SEG:)',
  artAll.length === 0, artAll.slice(0, 5).join(' | '));

check('Keine Seiten-Fehler während der Suite', errs.length === 0, errs.join(' | ').slice(0, 200));

await browser.close();
console.log('');
if (fails.length) { console.log(`✗ ${fails.length} FEHLGESCHLAGEN: ${fails.join(' · ')}`); process.exit(1); }
console.log('ALLE UI-WÄCHTER-TESTS GRÜN');
