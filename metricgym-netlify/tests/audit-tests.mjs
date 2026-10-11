/* ============================================================================
   PLAN-PRÜFUNG — Verhaltensprobe
   ----------------------------------------------------------------------------
   Diese Funktion gibt einem Fremden ein Urteil über seinen Trainingsplan. Das
   ist die heikelste Aussage der ganzen App: sie trifft jemanden, der uns noch
   nichts geglaubt hat, und sie trifft ihn ohne Konto, ohne Verlauf, allein auf
   Grundlage eines eingefügten Textes.

   Die zwei wichtigsten Proben sind deshalb Negativkontrollen:

     Nr. 4  Unsinn im Text darf NICHT zu einem Befund führen. Ein Pruefer, der
            aus "asdf qwer" einen Korridor rechnet, ist ein Zufallsgenerator
            mit Diagramm.
     Nr. 11 Der EIGENE Plan der Engine muss durch die eigene Pruefung kommen.
            Sagt die Pruefung "Brust unter dem Mindestreiz" ueber einen Plan,
            den dieselbe Engine gerade als korrekt gebaut hat, ist eine der
            beiden Rechnungen falsch — und zwar genau die Art Widerspruch, die
            in dieser App schon fuenfmal in verschiedenen Zaehlweisen steckte.

   Lauf:
     npx http-server metricgym-netlify -p 8896 -s &
     NODE_PATH=/opt/node22/lib/node_modules CHROMIUM=/opt/pw-browsers/chromium \
       node metricgym-netlify/tests/audit-tests.mjs
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
await p.waitForFunction(() => typeof window.planAudit === "function" ||
  typeof planAudit === "function", { timeout: 15000 }).catch(() => {});

/* ── 0. Messgerät prüfen ──────────────────────────────────────────────────
   Bevor irgendetwas behauptet wird: sind die Funktionen ueberhaupt da? Eine
   Suite, die gegen `undefined` prueft, ist in dieser Sitzung schon zweimal
   gruen gewesen, ohne etwas zu messen. */
const vorhanden = await p.evaluate(() => ({
  parsen:   typeof planTextParsen === "function",
  zuordnen: typeof planZuordnen === "function",
  audit:    typeof planAudit === "function",
  sheet:    typeof showPlanAudit === "function",
  bands:    typeof deficitScaledBands === "function",
  anteile:  typeof satzAnteile === "function",
}));
ok(Object.values(vorhanden).every(Boolean),
  "Messgerät: alle sechs Funktionen erreichbar — " + JSON.stringify(vorhanden));

/* ── 1. Parser: die Formate, die Menschen wirklich einfügen ──────────────── */
const f1 = await p.evaluate(() => {
  const t = `Tag 1 — Oberkörper
Bankdrücken 4 × 6-8
Langhantelrudern 4 × 8-10
Schulterdrücken 3 x 10
Bizeps-Curls, 3 Sätze
Klimmzüge`;
  const r = planTextParsen(t);
  return { n: r.length, namen: r.map(x => x.name), saetze: r.map(x => x.saetze) };
});
ok(f1.n === 5, `Parser: 5 Übungen aus 6 Zeilen (Tagestitel übersprungen) — ${f1.n}`);
ok(JSON.stringify(f1.saetze) === JSON.stringify([4, 4, 3, 3, null]),
  `Parser: Satzzahlen 4·4·3·3·ohne — ${JSON.stringify(f1.saetze)}`);
ok(f1.namen[0] === "Bankdrücken" && f1.namen[4] === "Klimmzüge",
  `Parser: Namen bleiben sauber — "${f1.namen[0]}" … "${f1.namen[4]}"`);

/* ── 2. Parser: Mittelpunkt-Trennung (das Format aus dem Reel) ───────────── */
const f2 = await p.evaluate(() => {
  const r = planTextParsen("Bankdrücken 3 × 6–8 · Klimmzüge 3 × 6–10 · Seitheben 3 × 12–15");
  return { n: r.length, s: r.map(x => x.saetze) };
});
ok(f2.n === 3 && f2.s.every(x => x === 3),
  `Parser: Mittelpunkt-Liste → 3 Übungen à 3 Sätze — ${f2.n} / ${JSON.stringify(f2.s)}`);

/* ── 3. Zuordnung: gegen das KONKRETE Ziel, nicht gegen "irgendwas" ──────
   Die erste Fassung dieser Probe fragte nur `x.ex !== null` und war gruen,
   waehrend "leg curl" auf Bizeps-Curls zeigte, "hack squat" auf Kniebeuge
   und "incline bench press" auf die Flachbank. Eine Zuordnung, die ueberall
   irgendetwas trifft, ist kein Messgeraet. Hier steht jetzt neben jedem
   Eingabetext, was herauskommen MUSS. */
const PAARE = [
  ["bench press 4 × 8", "Bankdrücken"],
  ["incline bench press 3 × 10", "Schrägbankdrücken"],
  ["lat pulldown 3 × 10", "Latzug"],
  ["barbell row 4 × 8", "Langhantelrudern"],
  ["squat 4 × 6", "Kniebeuge"],
  ["hack squat 3 × 10", "Hackenschmidt-Beuge"],
  ["bulgarian split squat 3 × 10", "Bulgarian Split Squat"],
  ["leg press 3 × 12", "Beinpresse"],
  ["romanian deadlift 3 × 10", "Rumänisches Kreuzheben"],
  ["deadlift 3 × 5", "Kreuzheben"],
  ["leg curl 3 × 12", "Beinbeuger"],
  ["leg extension 3 × 15", "Beinstrecker"],
  ["hammer curl 3 × 12", "Bizeps-Curls"],
  ["triceps pushdown 3 × 12", "Trizepsdrücken"],
  ["overhead triceps extension 3 × 12", "Überkopf-Trizepsstrecken (Kabel)"],
  ["lateral raise 4 × 15", "Seitheben"],
  /* "Face Pull" steht so in EXDB — die exakte Zuordnung greift vor dem
     Synonym, und das ist richtig. Der Synonym-Eintrag faengt nur noch
     Schreibweisen wie "Facepull" und "rear delt". */
  ["face pull 3 × 15", "Face Pull"],
  ["rear delt fly 3 × 15", "Reverse Flys"],
  ["calf raise 4 × 15", "Wadenheben"],
  ["hanging leg raise 3 × 12", "Hängendes Beinheben"],
  ["cable crunch 3 × 15", "Kabel-Crunch"],
];
const f3 = await p.evaluate((paare) => paare.map(([txt, soll]) => {
  const r = planZuordnen(planTextParsen(txt))[0];
  return { txt, soll, ist: r ? r.ex : null, art: r ? r.zuordnung : null };
}), PAARE);
const f3bad = f3.filter(x => x.ist !== x.soll);
ok(f3bad.length === 0,
  `Zuordnung: ${f3.length} Eingaben treffen genau ihre Übung` +
  (f3bad.length ? "\n    " + f3bad.map(x => `"${x.txt}" → ${x.ist} (soll: ${x.soll})`).join("\n    ") : ""));

/* ── 3b. NEGATIVKONTROLLE zur Nr. 3: die Zuordnung darf nicht alles treffen ──
   Ohne diese Probe koennte Nr. 3 gruen sein, weil der Matcher grosszuegig
   irgendeine Uebung zurueckgibt. Diese Begriffe haben in EXDB keine
   Entsprechung und MUESSEN unzugeordnet bleiben. */
const f3n = await p.evaluate(() => ["Yoga Flow", "Trampolin", "Schach", "Sauna"]
  .map(t => { const r = planZuordnen(planTextParsen(t + " 3 × 10"))[0]; return [t, r ? r.ex : null]; }));
ok(f3n.every(([, ex]) => ex === null),
  `Negativkontrolle: Nicht-Übungen bleiben unzugeordnet — ${JSON.stringify(f3n)}`);

/* ── 4. NEGATIVKONTROLLE: Unsinn darf kein Urteil erzeugen ──────────────── */
const f4 = await p.evaluate(() => {
  const r = planAudit("asdf qwer\nzzzz yyyy\nlorem ipsum dolor", null);
  return { leer: !!(r && r.leer), null: r === null, hatZeilen: !!(r && r.zeilen) };
});
ok((f4.leer || f4.null) && !f4.hatZeilen,
  `Negativkontrolle: Unsinn → kein Korridor, kein Befund — ${JSON.stringify(f4)}`);

/* ── 5. NEGATIVKONTROLLE: leerer Text ───────────────────────────────────── */
const f5 = await p.evaluate(() => {
  const a = planAudit("", null), b = planAudit("   \n\n  ", null);
  return { a: a === null, b: b === null };
});
ok(f5.a && f5.b, `Negativkontrolle: leerer Text → null — ${JSON.stringify(f5)}`);

/* ── 6. Fraktionierte Zählung: Sekundärmuskeln werden gutgeschrieben ─────
   Ein Plan aus reinen Grundübungen hat keine einzige direkte Trizepsübung.
   Zaehlt die Pruefung nur Primaermuskeln, meldet sie "Trizeps fehlt ganz" —
   und das waere falsch, denn Bankdruecken laedt ihn. Genau dieser Fehler
   steckte im MRV-Deckel der Engine. */
const f6 = await p.evaluate(() => {
  const r = planAudit("Bankdrücken 5 × 6\nSchulterdrücken 4 × 8\nDips 3 × 10", null);
  const tri = r.zeilen.find(z => z.g === "Trizeps");
  const brust = r.zeilen.find(z => z.g === "Brust");
  return { tri: tri.tot, triSt: tri.st, brust: brust.tot };
});
ok(f6.tri > 0 && f6.triSt !== "fehlt",
  `Fraktioniert: Trizeps aus Drückübungen = ${f6.tri} Sätze, nicht "fehlt ganz"`);
ok(f6.brust > 0, `Fraktioniert: Brust = ${f6.brust} Sätze`);

/* ── 7. Höchstens drei Befunde, sortiert nach Wirkung ───────────────────── */
const f7 = await p.evaluate(() => {
  /* Ein absichtlich schiefer Plan: nur Druecken, keine Beine, kein Ruecken. */
  const r = planAudit("Bankdrücken 6 × 8\nSchrägbankdrücken 5 × 8\nKabel-Fliegende 4 × 12\nTrizepsdrücken 5 × 12", null);
  return { n: r.befunde.length, alle: r.alleBefunde.length,
    wirk: r.befunde.map(x => x.wirkung), arten: r.befunde.map(x => x.art),
    korridor: r.imKorridor };
});
ok(f7.n <= 3, `Befunde: höchstens drei gezeigt — ${f7.n} von ${f7.alle} gefunden`);
ok(f7.wirk.every((w, i) => i === 0 || w <= f7.wirk[i - 1]),
  `Befunde: absteigend nach Wirkung sortiert — ${JSON.stringify(f7.wirk)}`);
ok(f7.alle >= 4 && f7.korridor <= 3,
  `Schiefer Plan wird als schief erkannt: ${f7.korridor}/7 im Korridor, ${f7.alle} Befunde`);

/* ── 8. NEGATIVKONTROLLE zur Nr. 7: fehlende Gruppe wiegt mehr ──────────
   Ein Befund "fehlt ganz" muss ueber einem Befund "knapp unter MEV" stehen.
   Waere die Sortierung wirkungslos, fiele diese Probe gleich aus wie die
   vorige — deshalb wird hier gegen eine KONKRETE Reihenfolge geprueft. */
const f8 = await p.evaluate(() => {
  const r = planAudit("Bankdrücken 4 × 8\nLanghantelrudern 4 × 8\nSchulterdrücken 3 × 10\nBizeps-Curls 3 × 12\nTrizepsdrücken 3 × 12", null);
  const fehlt = r.alleBefunde.filter(x => x.art === "fehlt");
  const low = r.alleBefunde.filter(x => x.art === "low");
  return { fehlt: fehlt.map(x => [x.g, x.wirkung]), low: low.map(x => [x.g, x.wirkung]),
    erster: r.befunde[0] && r.befunde[0].art };
});
ok(f8.fehlt.length > 0 && f8.erster === "fehlt",
  `Sortierung: fehlende Gruppe steht vorn — fehlt=${JSON.stringify(f8.fehlt)} low=${JSON.stringify(f8.low)}`);

/* ── 9. Der Korridor kommt aus deficitScaledBands, nicht aus Festwerten ──
   Dieselbe Übungsliste muss im Defizit einen ANDEREN Korridor bekommen als
   im Aufbau. Fiele das gleich aus, waere eine siebte Baender-Tabelle im
   Spiel — und genau davon hatte diese App schon sechs. */
const f9 = await p.evaluate(() => {
  const basis = { sex: "male", age: 30, height: 180, weight: 90, bodyFat: 22,
    exp: "intermediate", injuries: [], days: 4, act: "light", sleep: 7,
    equipment: "gym_full", focus: [], recovery_profile: "average" };
  const txt = "Bankdrücken 4 × 8\nKniebeuge 4 × 8\nLatzug 4 × 10";
  const auf = planAudit(txt, { ...basis, goals: ["muscle_gain"] });
  const cut = planAudit(txt, { ...basis, goals: ["fat_loss"] });
  const g = (r, n) => { const z = r.zeilen.find(x => x.g === n); return [z.mev, z.mrv]; };
  return { aufBrust: g(auf, "Brust"), cutBrust: g(cut, "Brust"),
    aufBeine: g(auf, "Beine"), cutBeine: g(cut, "Beine") };
});
ok(JSON.stringify(f9.aufBrust) !== JSON.stringify(f9.cutBrust) ||
   JSON.stringify(f9.aufBeine) !== JSON.stringify(f9.cutBeine),
  `Korridor skaliert mit dem Ziel: Aufbau Brust ${JSON.stringify(f9.aufBrust)} vs. Defizit ${JSON.stringify(f9.cutBrust)}, ` +
  `Beine ${JSON.stringify(f9.aufBeine)} vs. ${JSON.stringify(f9.cutBeine)}`);

/* ── 10. Reiz und Grenznutzen folgen der Sättigungskurve ────────────────── */
const f10 = await p.evaluate(() => {
  const txt = (n) => `Bankdrücken ${n} × 8`;
  const r = [2, 6, 12, 20].map(n => {
    const a = planAudit(txt(n), null);
    const z = a.zeilen.find(x => x.g === "Brust");
    return { n, reiz: z.reiz, grenz: z.grenz };
  });
  return r;
});
ok(f10.every((x, i) => i === 0 || x.reiz > f10[i - 1].reiz),
  "Reiz steigt mit dem Volumen — " + f10.map(x => `${x.n}S:${x.reiz}%`).join(" "));
ok(f10.every((x, i) => i === 0 || x.grenz < f10[i - 1].grenz),
  "Grenznutzen fällt mit dem Volumen (Sättigung) — " + f10.map(x => x.grenz.toFixed(3)).join(" "));

/* ── 11. DIE WICHTIGSTE: der eigene Plan besteht die eigene Prüfung ──────
   Der Plan wird auf dem ECHTEN Weg gebaut (generateTrainingPlan +
   generateOptimalSchedule), dann als Text ausgegeben und durch dieselbe
   Pruefung geschickt, die ein fremder Plan durchlaeuft. Beide Rechnungen
   muessen zum selben Urteil kommen. */
const f11 = await p.evaluate(() => {
  const a = { sex: "male", age: 30, height: 180, weight: 80, bodyFat: 15,
    goals: ["muscle_gain"], exp: "intermediate", injuries: [], days: 4, act: "light",
    sleep: 7, equipment: "gym_full", focus: [], schedule_pref: "consistent",
    recovery_profile: "average", sessionTime: 60 };
  const plan = generateTrainingPlan({ a });
  const sch = generateOptimalSchedule(a).schedule.filter(x => x && x !== "rest" && x !== "cardio");
  /* Der Plan als Text — genau so, wie ein Nutzer ihn abschreiben wuerde. */
  const zeilen = [];
  for (const key of sch) {
    const base = parseTypeKey(key).base, d = plan[base]; if (!d) continue;
    for (const e of [...(d.main || []), ...(d.abs || [])]) zeilen.push(`${e.n} ${e.sets} × 8`);
  }
  const r = planAudit(zeilen.join("\n"), a);
  return { korridor: r.imKorridor, gruppen: r.gruppen, reiz: r.reiz,
    erkannt: r.erkannt, gesamt: r.gesamt,
    zeilen: r.zeilen.map(z => [z.g, z.tot, z.mev, z.mrv, z.st]),
    befunde: r.befunde.map(x => x.titel) };
});
ok(f11.erkannt === f11.gesamt,
  `Eigener Plan: alle ${f11.gesamt} Übungen wiedererkannt — ${f11.erkannt}`);
ok(f11.korridor >= 6,
  `Eigener Plan besteht die eigene Prüfung: ${f11.korridor}/${f11.gruppen} im Korridor, Ø ${f11.reiz} % Reiz` +
  (f11.korridor < 6 ? "\n    " + f11.zeilen.map(z => z.join("/")).join("\n    ") : ""));
ok(!f11.zeilen.some(z => z[4] === "fehlt"),
  "Eigener Plan: keine Gruppe fehlt — " + f11.zeilen.filter(z => z[4] !== "ok").map(z => `${z[0]}:${z[4]}`).join(" ") || "alle ok");

/* ── 12. Gegenprobe zur Nr. 11: ein echter fremder Plan fällt durch ──────
   Ohne diese Probe koennte Nr. 11 auch gruen sein, weil die Pruefung
   grundsaetzlich alles durchlaesst. Der Plan hier ist der aus dem Reel. */
const f12 = await p.evaluate(() => {
  const r = planAudit(`Bankdrücken 3 × 6-8
Klimmzüge 3 × 6-10
Schulterdrücken 3 × 8-10
Seitheben 3 × 12-15
Bizeps-Curls 3 × 10-12
Trizepsdrücken 3 × 10-12`, { sex: "male", age: 30, height: 180, weight: 80,
    goals: ["muscle_gain"], exp: "intermediate", days: 3, act: "light",
    equipment: "gym_full", injuries: [], focus: [] });
  return { korridor: r.imKorridor, gruppen: r.gruppen, befunde: r.befunde.length,
    beine: r.zeilen.find(z => z.g === "Beine").st };
});
ok(f12.korridor < 7 && f12.befunde > 0,
  `Gegenprobe: fremder Plan ohne Beine fällt durch — ${f12.korridor}/${f12.gruppen}, ${f12.befunde} Befunde, Beine="${f12.beine}"`);
ok(f12.beine === "fehlt",
  `Gegenprobe: fehlende Beine werden als "fehlt" gemeldet, nicht als "im Aufbau" — "${f12.beine}"`);

/* ── 13. corridorHTML: neue Zustände, altes Verhalten unverändert ───────── */
const f13 = await p.evaluate(() => {
  const mitSt = corridorHTML([{ g: "X", tot: 0, mev: 10, mrv: 20, st: "fehlt" },
                              { g: "Y", tot: 25, mev: 10, mrv: 20, st: "high" }]);
  const ohneSt = corridorHTML([{ g: "Z", tot: 16, mev: 10, mrv: 20 }]);
  return { fehlt: /corr-chip fehlt/.test(mitSt), high: /corr-chip high/.test(mitSt),
    altOk: /corr-chip (ok|max)/.test(ohneSt) && !/undefined/.test(ohneSt) };
});
ok(f13.fehlt && f13.high, `corridorHTML: "fehlt" und "über dem Limit" werden dargestellt — ${JSON.stringify(f13)}`);
ok(f13.altOk, "corridorHTML: Zeilen ohne `st` verhalten sich wie vorher (Landing unverändert)");

/* ── 14. importedPlanAnalysis liest jetzt denselben Korridor ────────────── */
const f14 = await p.evaluate(() => {
  const src = importedPlanAnalysis.toString();
  return { hartGetippt: /COARSE\s*=\s*\{\s*Brust:\s*\[\s*10\s*,/.test(src),
    nutztBands: /deficitScaledBands/.test(src) };
});
ok(!f14.hartGetippt && f14.nutztBands,
  `importedPlanAnalysis nutzt deficitScaledBands statt eigener Tabelle — ${JSON.stringify(f14)}`);

/* ── 15. Oberfläche: ohne Konto erreichbar, rechnet lokal ───────────────── */
await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await p.goto(BASE + "/index.html", { waitUntil: "load" });
await p.waitForFunction(() => typeof showPlanAudit === "function", { timeout: 15000 });
const f15 = await p.evaluate(() => ({
  landing: (S.screen || "landing") === "landing",
  keinKonto: S.currentUser == null,
  knopfDa: /showPlanAudit\(\)/.test(document.body.innerHTML),
}));
ok(f15.landing && f15.keinKonto && f15.knopfDa,
  `Oberfläche: Einstieg auf der Landing ohne Konto sichtbar — ${JSON.stringify(f15)}`);

const f16 = await p.evaluate(() => {
  showPlanAudit();
  const ta = document.getElementById("au-text");
  return { sheet: !!document.getElementById("au-sheet"), feld: !!ta,
    knopf: /A\.auditRun\(\)/.test(overlay.innerHTML) };
});
ok(f16.sheet && f16.feld && f16.knopf, `Oberfläche: Eingabe öffnet sich — ${JSON.stringify(f16)}`);

const f17 = await p.evaluate(() => {
  document.getElementById("au-text").value = AUDIT_BEISPIEL;
  A.auditRun();
  const h = overlay.innerHTML;
  return { hero: /au-hero/.test(h), korridor: (h.match(/class="corr"/g) || []).length,
    befunde: (h.match(/au-find/g) || []).length, vs: /au-vs/.test(h),
    grenzen: /Was diese Prüfung nicht sieht/.test(h),
    kaputt: /undefined|NaN|\[object/.test(h) };
});
ok(f17.hero && f17.korridor === 7 && f17.grenzen,
  `Oberfläche: Ergebnis mit Hero, 7 Korridor-Zeilen und Grenzen-Abschnitt — ${JSON.stringify(f17)}`);
ok(!f17.kaputt, "Oberfläche: kein undefined/NaN im Ergebnis");
ok(f17.vs, "Oberfläche: Gegenentwurf bei gleicher Zeit wird gezeigt (besteAufteilung)");

/* ── 18. Herleitung: echte Register-Einträge, keine erfundene Quelle ───── */
const f18 = await p.evaluate(() => {
  A.auditHerleitung("Brust");
  const h = overlay.innerHTML;
  return { offen: /Herleitung/.test(h), params: (h.match(/hl-p-n/g) || []).length,
    rechnung: /1 − e/.test(h), kaputt: /undefined|NaN/.test(h),
    schluessel: /vol\.band\.Brust\.mev/.test(h) };
});
ok(f18.offen && f18.params >= 3 && f18.schluessel,
  `Herleitung: ${f18.params} Register-Einträge, Schlüssel sichtbar — ${JSON.stringify(f18)}`);
ok(f18.rechnung && !f18.kaputt, "Herleitung: Sättigungsformel wird gezeigt, nichts undefined");

/* ── 19. Der Text verlässt das Gerät nicht ──────────────────────────────
   Die Landing verspricht "die Rechnung läuft auf deinem Gerät". Das ist eine
   pruefbare Aussage: waehrend der Pruefung darf kein Netzverkehr entstehen. */
const anfragen = [];
p.on("request", r => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith("data:")) anfragen.push(u); });
await p.evaluate(() => {
  A.auditReset();
  document.getElementById("au-text").value = AUDIT_BEISPIEL;
  A.auditRun();
});
await p.waitForTimeout(1200);
ok(anfragen.length === 0,
  `Lokal: während der Prüfung keine fremde Anfrage — ${anfragen.length ? anfragen.join(", ") : "0"}`);

/* ── 20. Kein Zustand in localStorage ──────────────────────────────────── */
const f20 = await p.evaluate(() => {
  let gefunden = [];
  try { for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i), v = localStorage.getItem(k) || "";
    if (v.includes("Langhantelrudern") && v.includes("Wadenheben")) gefunden.push(k);
  } } catch (e) {}
  return gefunden;
});
ok(f20.length === 0, `Lokal: der eingefügte Text landet nicht in localStorage — ${f20.join(", ") || "nichts"}`);

console.log("");
console.log(`${pass} Zusicherungen grün, ${fail} rot`);
await b.close();
if (fail) { console.log("✗ PLAN-PRÜFUNG ROT"); process.exit(1); }
console.log("ALLE PROBEN GRÜN — " + pass + " Zusicherungen");
