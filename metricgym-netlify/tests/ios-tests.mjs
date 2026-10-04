/* METRICGYM — IOS-WÄCHTER: was Apple ablehnen würde.
   ----------------------------------------------------------------------------
   Diese Suite kann den echten Kauf nicht testen — dafür braucht es einen Mac,
   ein Apple-Entwicklerkonto und ein Sandbox-Gerät. Testbar ist aber die
   Entscheidung DAVOR, und genau dort entstehen die Ablehnungen:

     · zeigt die App auf iOS einen Bezahlweg außerhalb Apples Kasse?
     · gibt es einen Weg, bezahlte Funktionen ohne Kauf freizuschalten?
     · ist „Käufe wiederherstellen" erreichbar, ohne vorher zu kaufen?
     · gibt es „Bei Apple anmelden", wo es Google-Login gibt (Richtlinie 4.8)?
     · wirbt die App in der App-Fassung für den Browser-Einbau?

   Dafür wird `window.Capacitor` nachgebaut, BEVOR die Seite ihre Skripte
   ausführt — die App hält sich dann für die iOS-App. Jeder Punkt wird in
   BEIDEN Fassungen geprüft: auf iOS muss er zutreffen, im Web darf er es
   nicht. Eine Prüfung, die in beiden Fällen gleich ausfällt, misst nichts.

   Start:  npx http-server metricgym-netlify -p 8896 -s &
           node metricgym-netlify/tests/ios-tests.mjs */

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

/* Nachbau der nativen Umgebung. `PurchasePlugin` protokolliert, was die App
   aufrufen WÜRDE — mehr braucht es nicht, um die Verzweigung zu prüfen. */
const CAPACITOR_STUB = `
window.__nativLog = [];
window.Capacitor = {
  getPlatform: () => 'ios',
  isNativePlatform: () => true,
  Plugins: {
    Preferences: {
      get: async ({key}) => ({ value: null }),
      set: async (o) => { window.__nativLog.push(['pref.set', o.key]); },
      remove: async () => {},
    },
    Browser: { open: async (o) => { window.__nativLog.push(['browser.open', o.url]); }, close: async () => {} },
    App: { addListener: () => ({remove(){}}), getLaunchUrl: async () => null },
    PurchasePlugin: {
      addListener: () => ({remove(){}}),
      init: async () => { window.__nativLog.push(['iap.init']); return {}; },
      load: async () => ({ products: [] }),
      purchase: async (o) => { window.__nativLog.push(['iap.purchase', o.productId]); },
      restore: async () => { window.__nativLog.push(['iap.restore']); },
      manageSubscriptions: async () => { window.__nativLog.push(['iap.manage']); },
      canMakePayments: async () => ({ canMakePayments: true }),
      finish: async () => {},
      getStorefront: async () => ({ countryCode: 'DEU' }),
      loadReceipts: async () => ({}),
    },
  },
};
`;

async function seiteOeffnen(browser, nativ) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  if (nativ) await page.addInitScript(CAPACITOR_STUB);
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof render === 'function',
    null, { timeout: 20000 });
  return { ctx, page, errs };
}

/* Bringt die App in den angemeldeten Zustand mit Cloud-Konto-Attrappe.
   WICHTIG und einmal teuer gelernt: `S.screen='app'` allein genügt nicht.
   Ohne `S.profile` rendert die App Onboarding, und dann steht von der
   Bezahlschranke kein Wort auf dem Schirm — alle Textprüfungen waren rot,
   obwohl die App nichts falsch machte. Der Demo-Aufbau erzeugt ein
   vollständiges Profil; danach wird der Demo-Modus wieder abgeschaltet, damit
   der echte Kauf-Zweig greift (bei S.devMode=true schaltet die App bewusst
   lokal frei). Außerdem existiert `A.redeem` erst, wenn das Profil gerendert
   wurde — die Handler werden dort definiert. */
const ALS_KUNDE = `
  (async () => {
    A.devModeMenu();                      // baut Profil, Plan, Wochenplan
    await new Promise(r => setTimeout(r, 1500));
    S.devMode = false; S.currentUser = 0;
    S.users = [{username:'Test', email:'kunde@test.de', pwHash:''}];
    S.tier = 'free'; S.trialUsed = false; S.installDismissed = false;
    SB.user = { id: '11111111-1111-1111-1111-111111111111', email: 'kunde@test.de', user_metadata:{} };
    SB.enabled = () => true;
    SB.syncTier = async () => {};
    S.screen = 'app'; S.tab = 'profile'; save(); render();   // definiert A.redeem
    await new Promise(r => setTimeout(r, 300));
    S.tab = 'pricing'; save(); render();
  })()
`;

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

/* ===================== 0 · SELBSTTEST DES MESSGERÄTS =====================
   Wenn die Attrappe nicht greift, hält sich die App für Web und ALLE
   iOS-Prüfungen fallen aus dem falschen Grund grün oder rot aus. */
{
  const a = await seiteOeffnen(browser, true);
  const nativ = await a.page.evaluate(() => ({ ios: IOS_APP(), iap: IAP.aktiv(), nativ: NATIV() }));
  await a.ctx.close();
  const b = await seiteOeffnen(browser, false);
  const web = await b.page.evaluate(() => ({ ios: IOS_APP(), iap: IAP.aktiv(), nativ: NATIV() }));
  await b.ctx.close();

  check('Selbsttest: Attrappe macht die App zur iOS-App',
    nativ.ios && nativ.iap && nativ.nativ, JSON.stringify(nativ));
  check('Selbsttest: ohne Attrappe hält sie sich für Web',
    !web.ios && !web.iap && !web.nativ, JSON.stringify(web));
  if (fails.length) {
    await browser.close();
    console.log('\n✗ Abbruch: das Messgerät funktioniert nicht, die Ergebnisse wären wertlos.');
    process.exit(1);
  }
}

/* ===================== 1 · KEIN BEZAHLWEG AUSSERHALB APPLES KASSE ===================== */
{
  const { ctx, page } = await seiteOeffnen(browser, true);
  await page.evaluate(ALS_KUNDE);
  await page.waitForTimeout(600);
  const t = await page.evaluate(() => document.body.innerText);

  check('iOS: Bezahlschranke nennt Stripe nicht', !/stripe/i.test(t),
    /stripe/i.test(t) ? t.match(/.{0,40}[Ss]tripe.{0,40}/)[0] : 'kein Treffer');
  check('iOS: Bezahlschranke nennt die Apple-ID als Zahlweg', /Apple-ID/.test(t));
  check('iOS: „Käufe wiederherstellen" ist OHNE Kauf erreichbar',
    /Käufe wiederherstellen/.test(t));
  check('iOS: Guthaben kann nicht in Pro-Zeit getauscht werden',
    !/als Pro-Zeit einlösen/.test(t));

  /* Der eigentliche Beweis: wohin führt der Kaufknopf?
     Erst habe ich hier auf `iap.init` in der Attrappe gewartet — das war
     falsch gemessen: `IAP.start()` läuft schon beim App-Start (damit
     liegengebliebene Käufe nachgeliefert werden), also wird beim Kauf nicht
     erneut initialisiert. Der Test war rot, obwohl die App richtig handelte.
     Geprüft wird deshalb die Verzweigung selbst: welcher der beiden
     Kaufwege wird gerufen. */
  const weg = await page.evaluate(async () => {
    let stripeVersucht = false, appleVersucht = null;   // __nativLog NICHT leeren: s. u.
    const echtStripe = A.startCheckout, echtApple = IAP.kaufen.bind(IAP);
    A.startCheckout = async () => { stripeVersucht = true; };
    IAP.kaufen = async (t, b) => { appleVersucht = t + '/' + b; };
    try { A.confirmUpgrade('pro'); } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
    A.startCheckout = echtStripe; IAP.kaufen = echtApple;
    return { stripeVersucht, appleVersucht, bereit: IAP.bereit, modul: !!window.CdvPurchase };
  });
  check('iOS: Kaufknopf geht zu Apple, nicht zu Stripe',
    !weg.stripeVersucht && weg.appleVersucht === 'pro/monthly',
    `Stripe=${weg.stripeVersucht} · Apple=${weg.appleVersucht}`);
  /* Dass das Modul BEIM START hochfährt, ist zeitabhängig und als Zusicherung
     wertlos — beim ersten Versuch war die Prüfung rot, weil der Startaufruf
     noch unterwegs war, nicht weil etwas fehlte. Deterministisch prüfbar ist:
     IAP.start() läuft durch und spricht wirklich mit dem nativen Plugin. */
  const hoch = await page.evaluate(async () => {
    const ok = await IAP.start();
    return { ok, bereit: IAP.bereit, init: window.__nativLog.some(x => x[0] === 'iap.init') };
  });
  check('iOS: IAP.start() fährt das native Kaufmodul hoch',
    hoch.ok === true && hoch.bereit === true && hoch.init === true,
    `start=${hoch.ok} bereit=${hoch.bereit} nativ-init=${hoch.init}`);

  /* Der Gratis-Test darf nicht lokal freischalten. */
  const test = await page.evaluate(async () => {
    S.tier = 'free'; S.trialUsed = false; save();
    let appleVersucht = null;
    const echt = IAP.kaufen.bind(IAP);
    IAP.kaufen = async (t, b) => { appleVersucht = t + '/' + b; };
    try { A.startTrial('pro'); } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
    IAP.kaufen = echt;
    return { tier: S.tier, trialUsed: S.trialUsed, appleVersucht };
  });
  check('iOS: Gratis-Test schaltet nicht lokal frei, sondern geht zu Apple',
    test.tier === 'free' && !test.trialUsed && test.appleVersucht === 'pro/monthly',
    `tier=${test.tier} trialUsed=${test.trialUsed} Apple=${test.appleVersucht}`);

  /* Abo verwalten muss zu Apple führen. */
  const verw = await page.evaluate(async () => {
    window.__nativLog = [];
    await A.manageSub();
    const txt = document.querySelector('#overlay, .modal, .sheet')?.innerText
      || document.body.innerText;
    return { txt: txt.slice(0, 400) };
  });
  check('iOS: „Abo verwalten" verweist auf die iPhone-Einstellungen',
    /Apple-ID/.test(verw.txt) && /Abonnements|Einstellungen/.test(verw.txt),
    verw.txt.replace(/\s+/g, ' ').slice(0, 90));

  await ctx.close();
}

/* ===================== 2 · DIESELBEN PUNKTE IM WEB (Gegenprobe) ===================== */
{
  const { ctx, page } = await seiteOeffnen(browser, false);
  await page.evaluate(ALS_KUNDE);
  await page.waitForTimeout(600);
  const t = await page.evaluate(() => document.body.innerText);

  check('Web: Bezahlschranke nennt weiterhin Stripe', /Stripe/.test(t));
  check('Web: kein Apple-ID-Hinweis', !/Apple-ID/.test(t));
  check('Web: kein „Käufe wiederherstellen"', !/Käufe wiederherstellen/.test(t));

  const weg = await page.evaluate(async () => {
    let stripeVersucht = false;
    const echt = A.startCheckout; A.startCheckout = async () => { stripeVersucht = true; };
    window.METRICGYM_CONFIG = Object.assign({}, window.METRICGYM_CONFIG, { stripeEnabled: true });
    try { A.confirmUpgrade('pro'); } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
    A.startCheckout = echt;
    return stripeVersucht;
  });
  check('Web: Kaufknopf geht weiterhin zu Stripe', weg === true);

  await ctx.close();
}

/* ===================== 3 · RICHTLINIE 4.8 — ANMELDEWEGE ===================== */
for (const nativ of [true, false]) {
  const { ctx, page } = await seiteOeffnen(browser, nativ);
  const r = await page.evaluate(() => {
    /* Cloud-Sync ist in config.js konfiguriert; oauthButtons() zeigt nur dann
       etwas. Für den Test wird das erzwungen. */
    SB.enabled = () => true;
    const html = oauthButtons();
    return {
      apple: /A\.oauth\('apple'\)/.test(html),
      google: /A\.oauth\('google'\)/.test(html),
      appleZuerst: html.indexOf("A.oauth('apple')") < html.indexOf("A.oauth('google')"),
    };
  });
  const wo = nativ ? 'iOS' : 'Web';
  check(`${wo}: „Bei Apple anmelden" ist vorhanden`, r.apple);
  check(`${wo}: Google bleibt daneben`, r.google);
  if (nativ) check('iOS: Apple steht vor Google', r.appleZuerst);
  else check('Web: Google steht vor Apple', !r.appleZuerst);
  await ctx.close();
}

/* ===================== 4 · KEINE WERBUNG FÜR DEN BROWSER-EINBAU ===================== */
for (const nativ of [true, false]) {
  const { ctx, page } = await seiteOeffnen(browser, nativ);
  const sichtbar = await page.evaluate(() => {
    S.installDismissed = false; save();
    return installCardHTML().length > 0;
  });
  if (nativ) check('iOS: kein Banner „auf dem Startbildschirm installieren"', !sichtbar);
  else check('Web: der Banner bleibt da, wo er hingehört', sichtbar);
  await ctx.close();
}

/* ===================== 5 · EMPFEHLUNGSCODE SCHALTET NICHTS FREI ===================== */
{
  const { ctx, page } = await seiteOeffnen(browser, true);
  await page.evaluate(ALS_KUNDE);
  await page.waitForTimeout(600);
  const r = await page.evaluate(async () => {
    S.tier = 'free'; S.refCode = 'MEINCODE'; S.invitedBy = null; S.proBonusUntil = 0; save();
    /* A.redeem liest das Feld #redeem-in. Es wird hier gesetzt, statt die
       Oberflaeche zu bedienen — geprueft wird die Entscheidung, nicht das Tippen. */
    document.body.insertAdjacentHTML('beforeend', '<input id="redeem-in" value="FREUNDXY">');
    const da = typeof A.redeem === 'function';
    try { A.redeem(); } catch (e) {}
    await new Promise(r => setTimeout(r, 300));
    return { da, tier: S.tier, invitedBy: S.invitedBy || null, bonus: S.proBonusUntil || 0 };
  });
  check('Selbsttest: A.redeem existiert überhaupt', r.da);
  check('iOS: Empfehlungscode gibt keine bezahlte Stufe',
    r.tier === 'free' && !r.bonus, `tier=${r.tier} bonus=${r.bonus}`);
  check('iOS: die Werbung wird trotzdem verbucht', !!r.invitedBy, `invitedBy=${r.invitedBy}`);
  await ctx.close();
}

/* ===================== 6 · PRODUKT-KENNUNGEN STIMMEN MIT DEM SERVER ===================== */
{
  const { ctx, page } = await seiteOeffnen(browser, true);
  const ids = await page.evaluate(() => Object.values(IAP_ID).flatMap(o => Object.values(o)).sort());
  await ctx.close();

  const fs = await import('node:fs');
  const url = new URL('../supabase/functions/_shared/apple.ts', import.meta.url);
  const serverQuelle = fs.readFileSync(url, 'utf8');
  const serverIds = [...serverQuelle.matchAll(/"(de\.metricgym\.[a-z.]+)":\s*"(pro|elite)"/g)]
    .map(m => m[1]).sort();

  check('Produkt-Kennungen in App und Server sind identisch',
    JSON.stringify(ids) === JSON.stringify(serverIds),
    `App ${ids.length} / Server ${serverIds.length}: ${ids.join(', ')}`);
  check('Es sind genau vier Produkte (zwei Stufen × Monat/Jahr)', ids.length === 4);
}

await browser.close();
console.log(`\n${fails.length === 0 ? 'ALLE IOS-TESTS GRÜN' : 'FEHLGESCHLAGEN: ' + fails.join(' · ')}`);
process.exit(fails.length === 0 ? 0 : 1);
