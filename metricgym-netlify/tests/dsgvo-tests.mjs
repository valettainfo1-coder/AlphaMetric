/* METRICGYM — DSGVO-Regressionstests (C8).
   Standalone-Playwright-Suite, CI-tauglich (Exit-Code ≠ 0 bei Rot).

   Start:
     npx http-server metricgym-netlify -p 8896 -s &
     node metricgym-netlify/tests/dsgvo-tests.mjs
   Optional: BASE_URL=http://localhost:8896 CHROMIUM=/pfad/zu/chromium */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// CommonJS-Auflösung honoriert NODE_PATH — so findet die Suite auch global
// installierte Playwright-Pakete (CI: NODE_PATH aufs globale node_modules).
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
await page.waitForTimeout(3000);

// ---------- 1) Consent-Pflicht: ohne Häkchen keine Registrierung ----------
await page.evaluate(() => { S.screen = 'register'; save(); render(); });
await page.waitForTimeout(500);
await page.evaluate(() => {
  document.getElementById('r-user').value = 'Testa';
  document.getElementById('r-mail').value = 'testa@example.org';
  document.getElementById('r-pw').value = 'SicherGenug123';
  document.getElementById('r-pw2').value = 'SicherGenug123';
  A.register();
});
await page.waitForTimeout(400);
const c1 = await page.evaluate(() => ({
  err: (document.getElementById('r-err') || {}).textContent || '',
  user: S.currentUser,
}));
check('Consent-Pflicht: Registrierung ohne Häkchen blockiert',
  c1.user === null && /akzeptieren|Einwilligung/i.test(c1.err), c1.err.slice(0, 60));

// Mit Häkchen (offline → lokaler Fallback) klappt es und Consent ist prüffest:
await page.evaluate(() => {
  document.getElementById('c-tos').checked = true;
  document.getElementById('c-health').checked = true;
  A.register();
});
// Cloud nicht erreichbar → nach Timeout fällt die App auf das lokale Konto zurück
await page.waitForFunction(() => S.screen === 'onboarding', null, { timeout: 20000 }).catch(() => {});
const c1b = await page.evaluate(() => ({
  screen: S.screen,
  consent: S.consent && S.consent.tos && S.consent.tos.ver != null && S.consent.health && !!S.consent.health.at,
}));
check('Consent wird prüffest gespeichert (Version + Zeitstempel)', c1b.consent && c1b.screen === 'onboarding');

// ---------- 2) Re-Consent bei Version-Bump ----------
await page.evaluate(() => {
  S.screen = 'app'; S.tab = 'home'; save();
  S.consent.tos.ver = 0; window._reconsentShown = false; showReConsent();
});
await page.waitForTimeout(400);
const c2 = await page.evaluate(() => /Aktualisierte Bedingungen/.test((document.getElementById('overlay') || {}).textContent || ''));
check('Re-Consent-Sheet erscheint bei Version-Bump', c2);
await page.evaluate(() => A.reConsentOk());
await page.waitForTimeout(300);
const c2b = await page.evaluate(() => !consentOutdated() && S.consent.tos.ver >= 1);
check('Re-Consent: Zustimmen hebt Version an', c2b);

// ---------- 3) Widerruf blockt Sync nachweislich ----------
const c3 = await page.evaluate(async () => {
  let upserts = 0;
  SB.user = { id: 'u-test' };
  SB.client = {
    from: () => ({ upsert: async () => { upserts++; return {}; }, delete: () => ({ eq: async () => ({}) }), insert: async () => ({}) }),
    functions: { invoke: async () => ({ data: { ok: true }, error: null }) },
    auth: { signOut: async () => ({}) },
  };
  SB.push(); await new Promise(r => setTimeout(r, 1700));
  const before = upserts;
  A.revokeHealth(); A.revokeKeep();
  SB.push(); await new Promise(r => setTimeout(r, 1700));
  return { before, after: upserts - before, revoked: !!(S.consent.health && S.consent.health.revoked), ai: aiActive() };
});
check('Widerruf: Sync vorher aktiv', c3.before === 1);
check('Widerruf: Sync danach blockiert (Netzwerk still)', c3.after === 0);
check('Widerruf: revoked_at gesetzt + KI-Coach aus', c3.revoked && !c3.ai);
await page.evaluate(() => A.regrantHealth());

// ---------- 4) Export enthält Stichproben-Keys ----------
// Export-Handler leben im Profil-Tab → Demo-Profil laden und Profil rendern.
await page.evaluate(() => { A.devMode(); });
await page.waitForTimeout(300);
await page.evaluate(() => { A.devModeMenu(); });
await page.waitForTimeout(2200);
await page.evaluate(() => { S.tab = 'profile'; S.screen = 'app'; save(); render(); });
await page.waitForTimeout(700);
const downloads = [];
page.on('download', d => downloads.push(d));
await page.evaluate(() => A.exportData());
await page.waitForTimeout(1500);
const names = downloads.map(d => d.suggestedFilename()).join(', ');
check('Export liefert JSON + HTML-Bericht', /json/.test(names) && /html/.test(names), names);
let jsonHasKeys = false;
for (const d of downloads) {
  if (!/\.json$/.test(d.suggestedFilename())) continue;
  const path = await d.path();
  const txt = (await import('fs')).readFileSync(path, 'utf8');
  jsonHasKeys = ['"consent"', '"liftLog"', '"nutritionLog"', '"format": 2'].every(k => txt.includes(k));
}
check('Export-JSON enthält Consent + Trainings- + Ernährungsdaten', jsonHasKeys);

// ---------- 5) Lösch-Flow bis Abschieds-Screen ----------
await page.evaluate(() => A.wipe());
await page.waitForTimeout(300);
const gateClosed = await page.evaluate(() => document.getElementById('wipe-go').disabled);
check('Löschung: Button ohne Tipp-Bestätigung gesperrt', gateClosed === true);
await page.fill('#wipe-in', 'LÖSCHEN');
await page.waitForTimeout(200);
await page.evaluate(() => A.wipeConfirm());
await page.waitForTimeout(1300);
const c5 = await page.evaluate(() => ({
  screen: S.screen, users: S.users.length, lift: Object.keys(S.liftLog).length,
  bye: /Alles gelöscht/.test((document.getElementById('overlay') || {}).textContent || ''),
}));
check('Löschung: lokal leer + Abschieds-Screen', c5.screen === 'landing' && c5.users === 0 && c5.lift === 0 && c5.bye);

check('Keine Seiten-Fehler während der Suite', errs.length === 0, errs.join(' | ').slice(0, 120));

await browser.close();
console.log(fails.length ? `\n${fails.length} TEST(S) ROT: ${fails.join(' · ')}` : '\nALLE DSGVO-TESTS GRÜN');
process.exit(fails.length ? 1 : 0);
