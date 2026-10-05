/* ============================================================================
   EFFIZIENZ UND INDIVIDUELLE EICHUNG — Verhaltensprobe
   ----------------------------------------------------------------------------
   Die App behauptet im Plan-Editor "Auf dich geeicht". Das ist eine Aussage
   über eine Rechnung, und Aussagen über Rechnungen gehoeren geprueft.

   Die wichtigste Pruefung ist Nummer 2 und 3: eine Eichung, die aus reinem
   Rauschen einen Trend liest, ist ein Horoskop mit Fussnoten. Die Rauschgrenze
   kommt aus den eigenen Residuen der Regression — diese Suite fuettert
   deshalb Verlaeufe OHNE Trend und besteht darauf, dass sich nichts bewegt.

   Lauf:
     npx http-server metricgym-netlify -p 8896 -s &
     NODE_PATH=/opt/node22/lib/node_modules CHROMIUM=/opt/pw-browsers/chromium \
       node metricgym-netlify/tests/effizienz-tests.mjs
   ============================================================================ */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || "http://127.0.0.1:8896";
let pass = 0, fail = 0;
const ok = (b, m) => { b ? (pass++, console.log("✓ " + m)) : (fail++, console.log("✗ " + m)); };

const b = await chromium.launch({ executablePath: process.env.CHROMIUM });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on("pageerror", e => console.log("  [pageerror] " + e.message));
await p.goto(BASE + "/index.html", { waitUntil: "load" });
await p.waitForFunction(() => typeof window.kalibFaktoren === "function", { timeout: 15000 });

/* Ein Profil aufbauen — auf dem ECHTEN Weg der App (bmrCalc/tdeeCalc/
   generateTrainingPlan/generateOptimalSchedule), nicht auf einem erfundenen.
   Ein selbstgebautes Profil hat in dieser Sitzung schon zweimal eine Suite rot
   gemacht, ohne dass die App etwas falsch machte. */
const bauen = async (ziel, tage = 4) => p.evaluate(({ ziel, tage }) => {
  const a = { sex: "male", age: 30, height: 180, weight: 80, bodyFat: 15,
    goals: [ziel], exp: "intermediate", injuries: [], days: tage, act: "light",
    sleep: 7, equipment: "gym_full", focus: [], schedule_pref: "consistent",
    recovery_profile: "average" };
  const plan = generateTrainingPlan({ a });
  const ests = ["push", "pull", "legs", "upper", "lower"].map(k => plan[k] && plan[k].est).filter(Boolean);
  a.len = ests.length ? Math.round(ests.reduce((s, x) => s + x, 0) / ests.length) : 60;
  const bmr = bmrCalc(a), td = tdeeCalc(bmr, a.act, effWeight(a), a.len, a.days);
  S.profile = { a, bmr, td, tg: multiTargets(a, bmr, td) };
  S.plan = plan;
  S.planB = generateTrainingPlan({ a }, "B");
  S.schedule = generateOptimalSchedule(a).schedule.slice();
  S.currentWeek = 1; S.liftLog = {};
  save();
  return { tage: S.schedule.filter(k => k && k !== "rest").length };
}, { ziel, tage });

/* Log-Generator: eine Übung, n Wochen, 2 Einheiten je Woche.
   trendProzent = echter Anstieg je Woche, rauschen = Streuung je Messung. */
const logSetzen = (uebung, wochen, trendProzent, rauschen, startKg = 80) => p.evaluate(
  ({ uebung, wochen, trendProzent, rauschen, startKg }) => {
    // Deterministischer Pseudo-Zufall, damit die Probe wiederholbar ist
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const jetzt = Date.now(), tag = 86400000;
    S.liftLog = {};
    S.liftLog[uebung] = [];
    const n = wochen * 2;
    for (let i = 0; i < n; i++) {
      const w = i / 2;                                   // Woche
      const t = jetzt - (wochen * 7 - w * 7) * tag;
      const trend = startKg * Math.pow(1 + trendProzent / 100, w);
      const stoer = (rnd() * 2 - 1) * rauschen / 100 * startKg;
      S.liftLog[uebung].push({ t, w: Math.round((trend + stoer) * 10) / 10, reps: 8, rpe: 8 });
    }
    save();
    return S.liftLog[uebung].length;
  }, { uebung, wochen, trendProzent, rauschen, startKg });

const faktoren = () => p.evaluate(() => {
  const k = kalibFaktoren();
  return { faktoren: k.faktoren, gemessen: k.gemessen, individuell: k.individuell,
           belege: Object.fromEntries(Object.entries(k.belege).map(([m, v]) => [m, v.grund])) };
});

/* Welche Übung lädt die Brust primär, und wie viele Sätze hat sie in der Woche? */
await bauen("muscle_gain");
const brustInfo = await p.evaluate(() => {
  const { vol } = wochenVolumenFrakt();
  const kand = Object.keys(EXDB).filter(n => (satzAnteile(n) || {}).Brust >= 0.5);
  return { volBrust: Math.round((vol.Brust || 0) * 10) / 10, kandidat: kand[0], anzahl: kand.length,
           saett: saettigungFuer("muscle_gain", S.profile.a) };
});
console.log(`  Plan: Brust ${brustInfo.volBrust} fraktionierte Sätze/Woche, Sättigung ${brustInfo.saett}`);
console.log(`  Messübung: ${brustInfo.kandidat} (von ${brustInfo.anzahl} Brust-Übungen)`);

console.log("\n=== 1 · Ohne eigene Daten darf nichts geeicht werden ===");
await p.evaluate(() => { S.liftLog = {}; save(); });
let f = await faktoren();
ok(f.individuell === false, "ohne Log: nicht individuell");
ok(Object.values(f.faktoren).every(x => x === 1), "ohne Log: alle Faktoren genau 1");

console.log("\n=== 2 · REINES RAUSCHEN, kein Trend — der entscheidende Test ===");
await logSetzen(brustInfo.kandidat, 12, 0, 6);
f = await faktoren();
ok(f.faktoren.Brust === 1, `Rauschen (±6 %, 0 % Trend) verschiebt nichts — Faktor ${f.faktoren.Brust}`);
ok(/kein klarer Trend|zu wenig/.test(f.belege.Brust || ""), `Begründung nennt das Rauschen: "${f.belege.Brust}"`);

console.log("\n=== 3 · Starkes Rauschen, immer noch kein Trend ===");
await logSetzen(brustInfo.kandidat, 12, 0, 15);
f = await faktoren();
ok(f.faktoren.Brust === 1, `auch bei ±15 % Streuung keine Eichung — Faktor ${f.faktoren.Brust}`);

console.log("\n=== 4 · Zu kurzes Fenster darf nicht eichen ===");
await logSetzen(brustInfo.kandidat, 3, -2, 2);
f = await faktoren();
ok(f.faktoren.Brust === 1, `3 Wochen reichen nicht (Mindest ${await p.evaluate(() => KALIB_MIN_WOCHEN)} Wochen) — Faktor ${f.faktoren.Brust}`);

console.log("\n=== 5 · Echte Stagnation über 12 Wochen, Volumen unter Sättigung ===");
await logSetzen(brustInfo.kandidat, 12, -1.2, 1);
f = await faktoren();
ok(f.faktoren.Brust > 1, `Sättigungspunkt geht HOCH (Lixandrão 2024) — Faktor ${f.faktoren.Brust}`);
ok(/Stagnation/.test(f.belege.Brust || ""), `Begründung: "${f.belege.Brust}"`);

console.log("\n=== 6 · Deutlicher Fortschritt bei geringer Dosis ===");
await logSetzen(brustInfo.kandidat, 12, 2.5, 1);
f = await faktoren();
const antSaett = brustInfo.volBrust / brustInfo.saett;
console.log(`  (Brust liegt bei ${Math.round(antSaett * 100)} % der Sättigung)`);
if (antSaett < 0.6) ok(f.faktoren.Brust < 1, `Sättigungspunkt geht RUNTER — Faktor ${f.faktoren.Brust}`);
else ok(f.faktoren.Brust === 1, `über 60 % der Dosis → keine Senkung, Begründung "${f.belege.Brust}"`);

console.log("\n=== 7 · Die Dämpfung muss die gemessene sein ===");
const d = await p.evaluate(() => ({ v: KALIB_VERLAESSLICH, s: KALIB_SCHRITT, sp: KALIB_SPANNE }));
const erwartet = Math.round((1 + d.s * d.v) * 1000) / 1000;
await logSetzen(brustInfo.kandidat, 12, -1.2, 1);
f = await faktoren();
ok(Math.abs(f.faktoren.Brust - erwartet) < 0.001,
   `Schritt ${d.s} × Verlässlichkeit ${d.v.toFixed(3)} = ${erwartet} (gemessen ${f.faktoren.Brust})`);
ok(Math.abs(d.v - 6.5 * 6.5 / (9.7 * 9.7)) < 1e-9, "Verlässlichkeit ist 6,5²/9,7² aus der Arbeit, keine runde Zahl");

console.log("\n=== 8 · Die Spanne muss klemmen ===");
const geklemmt = await p.evaluate(() => {
  const r = [];
  for (const x of [0.1, 0.5, 1, 2, 9]) r.push(Math.max(KALIB_SPANNE[0], Math.min(KALIB_SPANNE[1], x)));
  return r;
});
ok(geklemmt[0] === d.sp[0] && geklemmt[4] === d.sp[1], `geklemmt auf [${d.sp[0]}, ${d.sp[1]}]`);

console.log("\n=== 9 · Der Bericht benutzt den geeichten Wert wirklich ===");
await logSetzen(brustInfo.kandidat, 12, -1.2, 1);
const ber = await p.evaluate(() => {
  const e = effizienzBericht();
  const g = e.gruppen.find(x => x.m === "Brust");
  return { kFaktor: g && g.kFaktor, saettigungM: g && g.saettigungM, saettPop: e.saettigung,
           reiz: g && g.reiz, hatKalib: !!e.kalib, indiv: e.kalib && e.kalib.individuell };
});
ok(ber.hatKalib && ber.indiv === true, "Bericht liefert die Eichung mit");
ok(ber.kFaktor > 1, `Brust-Faktor im Bericht ${ber.kFaktor}`);
ok(ber.saettigungM > ber.saettPop,
   `persönlicher Sättigungspunkt ${ber.saettigungM} > Bevölkerung ${ber.saettPop}`);

console.log("\n=== 10 · Höherer Sättigungspunkt muss den Reiz SENKEN (gleiche Sätze, flachere Kurve) ===");
const vgl = await p.evaluate(() => {
  const mit = effizienzBericht().gruppen.find(x => x.m === "Brust").reiz;
  const log = S.liftLog; S.liftLog = {};
  const ohne = effizienzBericht().gruppen.find(x => x.m === "Brust").reiz;
  S.liftLog = log;
  return { mit, ohne };
});
ok(vgl.mit < vgl.ohne,
   `mit Eichung ${vgl.mit} % < ohne ${vgl.ohne} % — dieselben Sätze reichen für diesen Menschen weniger weit`);

console.log("\n=== 11 · Das Panel sagt beide Zustände ehrlich ===");
const texte = await p.evaluate(() => {
  const log = S.liftLog;
  S.liftLog = {}; const ohne = effizienzHTML();
  S.liftLog = log; const mit = effizienzHTML();
  return { ohne, mit };
});
ok(/Noch nicht auf dich geeicht/.test(texte.ohne), "ohne Daten: 'Noch nicht auf dich geeicht'");
ok(/Hubal/.test(texte.ohne), "ohne Daten: nennt die Spannweite-Quelle");
ok(/Auf dich geeicht/.test(texte.mit), "mit Daten: 'Auf dich geeicht'");
ok(/Lixandrão/.test(texte.mit) && /9,7/.test(texte.mit), "mit Daten: nennt Richtung und Dämpfung mit Quelle");
ok(!/Non-Responder.{0,40}(du|dich|Sie)/i.test(texte.mit), "nennt den Nutzer NICHT Non-Responder");
ok(/▲/.test(texte.mit), "Zeichen für den verschobenen Punkt steht in der Tabelle");

console.log("\n=== 12 · Teilweises Pooling: Gruppen ohne eigene Daten erben den Faktor ===");
const pool = await p.evaluate(() => {
  const k = kalibFaktoren();
  const eigene = Object.keys(k.belege).filter(m => k.belege[m].faktor != null);
  const geerbt = Object.keys(k.faktoren).filter(m => !eigene.includes(m) && k.faktoren[m] !== 1);
  return { eigene, geerbt, global: k.global };
});
ok(pool.eigene.length >= 1, `${pool.eigene.length} Gruppe(n) mit eigenen Daten: ${pool.eigene.join(", ")}`);
ok(pool.global !== null && pool.geerbt.length >= 1,
   `${pool.geerbt.length} Gruppe(n) erben den gepoolten Faktor ${pool.global && pool.global.toFixed(3)}`);

console.log("\n=== 13 · Der Erhalt-Sättigungspunkt ist abgeleitet, nicht gesetzt ===");
const erh = await p.evaluate(() => ({
  wachstum: SAETTIGUNG_WACHSTUM, anteil: ERHALT_ANTEIL,
  fat: REIZ_SAETTIGUNG.fat_loss, gen: REIZ_SAETTIGUNG.general,
  jung: saettigungFuer("fat_loss", { age: 30 }), alt: saettigungFuer("fat_loss", { age: 62 }),
  jungM: saettigungFuer("muscle_gain", { age: 30 }), altM: saettigungFuer("muscle_gain", { age: 62 }),
}));
ok(erh.fat === Math.round(erh.wachstum * erh.anteil), `fat_loss ${erh.fat} = round(${erh.wachstum} × 1/3)`);
ok(erh.alt > erh.jung, `Alterszuschlag beim Erhalt: ${erh.jung} → ${erh.alt} ab 50 (Bickel 2011)`);
ok(erh.altM === erh.jungM, `kein Zuschlag beim Wachstumsziel: ${erh.jungM} bleibt ${erh.altM}`);

console.log("\n=== 14 · Bänder stimmen mit der zitierten Quelle ===");
const bands = await p.evaluate(() => VOL_BANDS);
ok(bands.Brust[0] === 10, `Brust MEV ${bands.Brust[0]} (Israetel 10)`);
ok(bands["Rücken"][0] === 10, `Rücken MEV ${bands["Rücken"][0]} (Israetel 10)`);
ok(bands.Trizeps[0] === 6 && bands.Trizeps[1] === 18, `Trizeps [${bands.Trizeps}] (Israetel 6–18)`);

console.log("\n=== 15 · Erholungsgrenze geht dem Grenznutzen vor ===");
/* Konstruiert: eine Gruppe über ihr MRV heben und pruefen, dass sie NICHT mehr
   als naechster Satz empfohlen wird — obwohl ihr Grenznutzen dann der hoechste
   waere. Ohne den Gegenfall misst die Pruefung nichts, deshalb wird derselbe
   Zustand einmal mit und einmal ohne die Ueberschreitung gemessen. */
await bauen("muscle_gain");
const sperre = await p.evaluate(() => {
  const ber = () => effizienzBericht();
  const vorher = ber();
  const ziel = vorher.naechster && vorher.naechster.m;
  if (!ziel) return { fehler: "kein Kandidat im Ausgangszustand" };
  /* Diese Gruppe kuenstlich ueber ihr MRV bringen: Saetze der Uebungen, die
     sie primaer laden, hochdrehen. */
  const bands = deficitScaledBands(S.profile.a);
  const mrv = bands[ziel] ? bands[ziel][1] : 20;
  let gesetzt = 0;
  for (const key of S.schedule.filter(k => k && k !== "rest" && k !== "cardio")) {
    for (const e of peExArr(key)) {
      if ((satzAnteile(e.n) || {})[ziel] === 1) { e.sets = 20; gesetzt++; }
    }
  }
  save();
  const nachher = ber();
  const g = nachher.gruppen.find(x => x.m === ziel);
  return { ziel, mrv, gesetzt, saetzeJetzt: g && g.saetze,
           grenzRang: nachher.gruppen.findIndex(x => x.m === ziel),
           neuerKandidat: nachher.naechster && nachher.naechster.m,
           amDeckel: (nachher.amDeckel || []).map(x => x.m),
           bandOben: g && g.band && g.band[1] };
});
if (sperre.fehler) { ok(false, sperre.fehler); }
else {
  console.log(`  ${sperre.ziel} von ~MEV auf ${sperre.saetzeJetzt} Sätze gehoben (MRV ${sperre.bandOben})`);
  ok(sperre.saetzeJetzt > sperre.bandOben, `Gruppe liegt jetzt über dem MRV (${sperre.saetzeJetzt} > ${sperre.bandOben})`);
  ok(sperre.neuerKandidat !== sperre.ziel,
     `wird NICHT mehr empfohlen (Vorschlag ist jetzt ${sperre.neuerKandidat || "keiner"})`);
}

console.log("\n=== 16 · Eichung verschiebt den Sättigungspunkt, NICHT das MRV ===");
/* Plan zuruecksetzen: Probe 15 hat die Brust absichtlich auf 40 Saetze gedreht.
   Ohne den Rueckbau liegt sie bei 129 % der Saettigung, und dort sagt das
   Modell voellig richtig "mehr Volumen ist hier nicht der Hebel" — die Eichung
   greift dann NICHT, und die Probe haette das Modell fuer einen Fehler
   gehalten, den mein eigener Messaufbau verursacht hat. */
await bauen("muscle_gain");
const getrennt = await p.evaluate(() => {
  const vorher = JSON.stringify(deficitScaledBands(S.profile.a));
  let seed = 999; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const jetzt = Date.now(), tag = 86400000;
  S.liftLog = { "Bankdrücken": [] };
  for (let i = 0; i < 24; i++) {
    S.liftLog["Bankdrücken"].push({ t: jetzt - (84 - i * 3.5) * tag, w: 80 - i * 0.4, reps: 8, rpe: 8 });
  }
  save();
  const k = kalibFaktoren();
  const nachher = JSON.stringify(deficitScaledBands(S.profile.a));
  const g = effizienzBericht().gruppen.find(x => x.m === "Brust");
  return { bandsGleich: vorher === nachher, faktor: k.faktoren.Brust,
           saettM: g && g.saettigungM, band: g && g.band };
});
ok(getrennt.faktor > 1, `Eichung greift (Faktor ${getrennt.faktor.toFixed(3)})`);
ok(getrennt.bandsGleich, "die MEV–MRV-Korridore bleiben unverändert — Erholung ist nicht Dosis-Wirkung");
ok(getrennt.saettM > getrennt.band[1],
   `persönlicher Sättigungspunkt ${getrennt.saettM} liegt über dem MRV ${getrennt.band[1]} — genau deshalb braucht es die Sperre aus Probe 15`);

console.log("\n=== 17 · Substratgrenze: Eiweiss deckelt den erreichbaren Reiz ===");
await bauen("muscle_gain");
const prot = await p.evaluate(() => {
  const setzen = (gJeKg, tage) => {
    S.nutritionLog = {};
    const kg = S.profile.a.weight;
    for (let i = 0; i < tage; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      S.nutritionLog[d] = { meals: [{ n: "x", g: 0, k: 2500, p: Math.round(gJeKg * kg), c: 250, f: 70 }], water: 2 };
    }
    save();
  };
  const ohne = (S.nutritionLog = {}, save(), effizienzBericht());
  setzen(0.8, 14); const knapp = effizienzBericht();
  setzen(2.2, 14); const satt = effizienzBericht();
  setzen(0.8, 3);  const zuWenigTage = effizienzBericht();
  return {
    ohneLog: { prot: ohne.protein, reiz: ohne.reiz },
    knapp: { jeKg: knapp.protein && knapp.protein.jeKg, faktor: knapp.protein && knapp.protein.faktor,
             knapp: knapp.protein && knapp.protein.knapp, reiz: knapp.reiz },
    satt: { jeKg: satt.protein && satt.protein.jeKg, faktor: satt.protein && satt.protein.faktor,
            knapp: satt.protein && satt.protein.knapp, reiz: satt.reiz },
    duenn: zuWenigTage.protein,
    plateau: PROTEIN_PLATEAU,
  };
});
ok(prot.ohneLog.prot === null, "ohne Ernährungslog behauptet die App nichts über die Zufuhr");
ok(prot.duenn === null, "unter 5 geloggten Tagen schweigt die Rechnung (kein Raten aus 3 Tagen)");
ok(prot.knapp.knapp === true, `0,8 g/kg gilt als knapp (gemessen ${prot.knapp.jeKg} g/kg)`);
ok(prot.satt.knapp === false, `2,2 g/kg gilt als gedeckt (${prot.satt.jeKg} g/kg)`);
ok(Math.abs(prot.satt.faktor - 1) < 1e-9, `am Plateau kein Abzug (Faktor ${prot.satt.faktor})`);
ok(Math.abs(prot.knapp.faktor - (0.8 + 0.2 * (0.8 / prot.plateau))) < 1e-9,
   `Deckel = 0,8 + 0,2 × Deckung = ${prot.knapp.faktor.toFixed(3)}`);
ok(prot.knapp.reiz < prot.satt.reiz,
   `knappes Eiweiss senkt den erreichbaren Reiz: ${prot.knapp.reiz} % < ${prot.satt.reiz} %`);
ok(prot.satt.faktor <= 1, "ueber dem Plateau gibt es KEINEN Bonus — genau das zeigt Morton 2018");

console.log("\n=== 18 · Bei knappem Eiweiss geht der Eiweiss-Rat dem Satz-Rat VOR ===");
const rang = await p.evaluate(() => {
  const kg = S.profile.a.weight;
  const setzen = (gJeKg) => {
    S.nutritionLog = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      S.nutritionLog[d] = { meals: [{ n: "x", g: 0, k: 2500, p: Math.round(gJeKg * kg), c: 250, f: 70 }], water: 2 };
    }
    save();
  };
  setzen(0.8); const knapp = effizienzHTML();
  setzen(2.2); const satt = effizienzHTML();
  S.nutritionLog = {}; save();
  /* Position der beiden Aussagen im gerenderten Text vergleichen. */
  const posEiweiss = knapp.indexOf("Eiweiß je kg");
  const posSatz = knapp.indexOf("die nächste Stelle");
  return { knapp, satt, posEiweiss, posSatz };
});
ok(/größte Hebel liegt gerade nicht im Training/.test(rang.knapp), "bei knappem Eiweiss steht das Eiweiss vorn");
ok(rang.posEiweiss >= 0 && rang.posSatz > rang.posEiweiss,
   `der Satz-Rat geht nicht verloren, er steht hinten an (Position ${rang.posEiweiss} vor ${rang.posSatz})`);
ok(/1,6/.test(rang.knapp), "das Plateau wird genannt, nicht nur behauptet");
ok(!/größte Hebel liegt gerade nicht im Training/.test(rang.satt),
   "bei gedecktem Eiweiss verschwindet der Hinweis wieder");
ok(/Morton/.test(rang.satt) && /Biochemisch/.test(rang.satt),
   "die biochemische Herleitung steht in jedem Fall im Erklaerblock");

console.log(`\n${fail ? "✗ " + fail + " FEHLGESCHLAGEN" : "ALLE PROBEN GRÜN"} — ${pass} Zusicherungen`);
await b.close();
process.exit(fail ? 1 : 0);
