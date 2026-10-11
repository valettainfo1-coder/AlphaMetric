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

/* ── 15. Tagesstruktur: Überschriften öffnen Tage, Übungen gewinnen ──────
   Die erste Fassung verwarf Tagesüberschriften. Damit zählte die Frequenz
   ÜBUNGEN statt EINHEITEN, und der Frequenz-Befund konnte für genau den Fall,
   für den er da ist (drei Brustübungen an einem Tag), nie auslösen. */
const f15 = await p.evaluate(() => {
  const mitKopf = planTextParsen("Montag\nBankdrücken 3 × 8\nKabel-Fliegende 3 × 12\n\nDonnerstag\nKniebeuge 3 × 8");
  const ohneKopf = planTextParsen("Bankdrücken 3 × 8\n\nKniebeuge 3 × 8");
  const flach = planTextParsen("Bankdrücken 3 × 8\nKniebeuge 3 × 8");
  /* Eine Übung ohne Satzangabe darf NICHT als Überschrift verschwinden —
     verlorenes Volumen fällt niemandem auf. "Pull-ups" beginnt mit "pull". */
  const falle = planTextParsen("Push-ups\nPull-ups\nLegs Day\nKniebeuge 3 × 8");
  return {
    kopfTage: [...new Set(mitKopf.map(x => x.tag))].length,
    kopfNamen: [...new Set(mitKopf.map(x => x.tagName))],
    leerzeileTage: [...new Set(ohneKopf.map(x => x.tag))].length,
    flachTage: [...new Set(flach.map(x => x.tag))].length,
    falle: falle.map(x => [x.name, x.ex, x.tagName]),
  };
});
ok(f15.kopfTage === 2 && f15.kopfNamen.length === 2 && /Montag/.test(f15.kopfNamen[0]),
  `Tage: zwei Überschriften → zwei Einheiten, benannt — ${JSON.stringify(f15.kopfNamen)}`);
ok(f15.leerzeileTage === 2 && f15.flachTage === 1,
  `Tage: Leerzeile trennt (${f15.leerzeileTage}), fortlaufende Zeilen nicht (${f15.flachTage})`);
/* Gelesen wird aus der ABBILDUNG [name, ex, tagName] — die erste Fassung
   fragte x.ex auf einem Array und war deshalb rot, obwohl alles stimmte. */
ok(f15.falle.filter(x => x[1]).length === 3 && f15.falle[2][2] === "Legs Day",
  `Tage: "Push-ups"/"Pull-ups" bleiben Übungen, nur "Legs Day" ist Überschrift — ` +
  JSON.stringify(f15.falle));

/* ── 15b. Der Vergleichssatz vergleicht nicht mit sich selbst ───────────
   "Der Grenznutzen bei null Sätzen ist 1,0-mal so hoch wie beim besten
   anderen" stand wörtlich in der App: das Maximum lief über ALLE Zeilen,
   die fehlende Gruppe eingeschlossen — die bei null immer den höchsten
   Grenznutzen hat. Ein Satz, der sich selbst widerlegt. */
const f15b = await p.evaluate(() => {
  const hol = (txt) => { const r = planAudit(txt, null);
    const b = r.alleBefunde.find(f => f.art === "fehlt");
    const m = b && b.text.match(/(\d+[.,]\d+)-mal/);
    return { faktor: m ? parseFloat(m[1].replace(",", ".")) : null,
      komma: m ? m[1].includes(",") : null, text: b ? b.text : null }; };
  /* Zwei Lagen, damit sich zeigt, dass der Faktor MITGEHT: einmal sind die
     anderen Gruppen selbst mager, einmal nahe der Sättigung. Käme beide Male
     dasselbe heraus, würde die Probe nichts messen. */
  return { mager: hol("Tag 1\nBankdrücken 4 × 8\nLanghantelrudern 4 × 8\nKniebeuge 4 × 8"),
           satt:  hol("Tag 1\nBankdrücken 10 × 8\nLanghantelrudern 10 × 8\nKniebeuge 12 × 8\nSeitheben 8 × 15\nBizeps-Curls 8 × 12") };
});
ok(f15b.mager.faktor > 1 && f15b.satt.faktor > 1,
  `Vergleich: nie gegen sich selbst (vorher immer exakt 1,0) — ${f15b.mager.faktor} / ${f15b.satt.faktor}`);
/* Streng groesser — nicht "um Faktor x groesser". Die Eigenschaft ist, DASS
   der Wert mitgeht; wie weit, ist Messergebnis und keine Anforderung, die
   ich mir ausdenke. */
ok(f15b.satt.faktor > f15b.mager.faktor,
  `Vergleich geht mit den Daten mit: magere Umgebung ${f15b.mager.faktor}×, gesättigte ${f15b.satt.faktor}×`);
ok(f15b.mager.komma === true,
  `Vergleich: deutsches Dezimalkomma statt Punkt`);

/* ── 16. Frequenz zählt Einheiten, nicht Übungen ─────────────────────────
   Mit NEGATIVKONTROLLE: dasselbe Volumen auf zwei Tage darf den Befund NICHT
   auslösen. Fiele beides gleich aus, würde die Probe nichts messen. */
const f16 = await p.evaluate(() => {
  const a = { sex: "male", age: 30, height: 180, weight: 80, goals: ["muscle_gain"],
    exp: "intermediate", days: 3, sessionTime: 60, equipment: "gym_full", injuries: [], focus: [] };
  const rest = "\nKniebeuge 4 × 8\nLatzug 4 × 10\nSeitheben 3 × 15\nBizeps-Curls 3 × 12\nTrizepsdrücken 3 × 12\nKabel-Crunch 3 × 15";
  const einTag = planAudit("Tag 1\nBankdrücken 4 × 8\nSchrägbankdrücken 4 × 8\nKabel-Fliegende 4 × 12\n\nTag 2" + rest, a);
  const zweiTage = planAudit("Tag 1\nBankdrücken 4 × 8\nSchrägbankdrücken 4 × 8\n\nTag 2\nKabel-Fliegende 4 × 12" + rest, a);
  const z = (r) => { const b = r.zeilen.find(x => x.g === "Brust");
    return { tot: b.tot, tage: b.tage, uebungen: b.uebungen,
      befund: !!r.alleBefunde.find(f => f.art === "freq" && f.g === "Brust") }; };
  return { einTag: z(einTag), zweiTage: z(zweiTage) };
});
ok(f16.einTag.tage === 1 && f16.einTag.uebungen === 3 && f16.einTag.befund,
  `Frequenz: 12 Sätze Brust an EINEM Tag aus 3 Übungen → Befund — ${JSON.stringify(f16.einTag)}`);
ok(f16.zweiTage.tage === 2 && !f16.zweiTage.befund,
  `Negativkontrolle: dasselbe Volumen auf ZWEI Tage → kein Befund — ${JSON.stringify(f16.zweiTage)}`);

/* ── 17. Das Profil wirkt — vier Profile, vier Ergebnisse ────────────────
   Vorher waren Verletzung, Ausstattung und Schwerpunkt wirkungslos: vier
   Profile, identische Befunde. Der eigene Planbauer ist dort vorsichtig. */
const f17 = await p.evaluate(() => {
  const basis = { sex: "male", age: 30, height: 180, weight: 80, goals: ["muscle_gain"],
    exp: "intermediate", days: 3, sessionTime: 60, equipment: "gym_full", injuries: [], focus: [] };
  const txt = "Tag 1\nKniebeuge 4 × 6\nBankdrücken 4 × 8\n\nTag 2\nLanghantelrudern 4 × 8\nSchulterdrücken 3 × 10";
  const ohne = planAudit(txt, basis);
  const knie = planAudit(txt, { ...basis, injuries: ["knee"] });
  const koerper = planAudit(txt, { ...basis, equipment: "bodyweight" });
  const fok = planAudit(txt, { ...basis, focus: ["Core"] });
  return {
    ohne: ohne.sicherheit.length,
    knie: knie.sicherheit.filter(s => s.art === "risiko").map(s => s.ex),
    knieRat: (knie.sicherheit.find(s => s.art === "risiko") || {}).rat,
    koerper: koerper.sicherheit.filter(s => s.art === "geraet").length,
    fokusZeile: (fok.zeilen.find(z => z.g === "Core") || {}).fokus,
    fokusMarkiert: fok.befunde.some(b => b.fokus),
  };
});
ok(f17.ohne === 0 && f17.knie.includes("Kniebeuge") && /Beinpresse|Box-Squat/.test(f17.knieRat || ""),
  `Profil: ohne Angabe 0 Hinweise, mit Knie-Angabe "${f17.knie.join(", ")}" → ${f17.knieRat}`);
ok(f17.koerper >= 2,
  `Profil: mit "bodyweight" werden fehlende Geräte benannt — ${f17.koerper} Hinweise`);
ok(f17.fokusZeile === true && f17.fokusMarkiert,
  `Profil: ein Schwerpunkt wird in Zeile und Befund markiert — ${JSON.stringify(f17)}`);

/* ── 18. Sicherheit trägt KEINE Reizpunkte ──────────────────────────────
   Einem Verletzungshinweis eine Wirkungszahl zu geben, nur damit er sich in
   die Reizbefunde einsortieren lässt, wäre eine erfundene Vergleichbarkeit. */
const f18 = await p.evaluate(() => {
  const r = planAudit("Tag 1\nKniebeuge 4 × 6\nBankdrücken 4 × 8", { sex: "male", age: 30,
    height: 180, weight: 80, goals: ["muscle_gain"], exp: "intermediate", days: 3,
    equipment: "gym_full", injuries: ["knee"], focus: [] });
  return { sicher: r.sicherheit.length,
    mitWirkung: r.sicherheit.filter(s => s.wirkung !== undefined).length,
    inBefunden: r.alleBefunde.filter(b => b.art === "risiko" || b.art === "geraet").length };
});
ok(f18.sicher > 0 && f18.mitWirkung === 0 && f18.inBefunden === 0,
  `Sicherheit: ${f18.sicher} Hinweise, keiner mit Reizpunkten, keiner in den Reizbefunden`);

/* ══ DIE REPARATUR ══════════════════════════════════════════════════════ */

const REEL = `Tag 1 — Push
Bankdrücken 3 × 6-8
Schulterdrücken 3 × 8-10
Seitheben 3 × 12-15
Trizepsdrücken 3 × 10-12

Tag 2 — Pull
Klimmzüge 3 × 6-10
Langhantelrudern 3 × 8-10
Bizeps-Curls 3 × 10-12`;
const PROFIL = { sex: "male", age: 30, height: 180, weight: 80, goals: ["muscle_gain"],
  exp: "intermediate", days: 3, sessionTime: 60, act: "light", equipment: "gym_full",
  injuries: [], focus: [] };

/* ── 19. Die Reparatur verbessert MESSBAR — geprüft mit derselben Prüfung ── */
const f19 = await p.evaluate(({ REEL, PROFIL }) => {
  const x = planReparieren(REEL, PROFIL);
  return { besser: x.besser, vorK: x.vor.imKorridor, nachK: x.nach.imKorridor,
    vorR: x.vor.reiz, nachR: x.nach.reiz, n: x.edits.length,
    edits: x.edits.map(e => `${e.art} ${e.sets}× ${e.ex} → ${e.tagName}`) };
}, { REEL, PROFIL });
ok(f19.besser && f19.nachK > f19.vorK,
  `Reparatur: ${f19.vorK}/7 → ${f19.nachK}/7 im Korridor, Ø ${f19.vorR} → ${f19.nachR} % Reiz ` +
  `durch ${f19.n} Änderungen`);

/* ── 20. NEGATIVKONTROLLE: am eigenen Plan ist nichts zu reparieren ─────
   Die wichtigste Probe des ganzen Pakets. Schlägt die Reparatur am Plan der
   eigenen Engine Änderungen vor, widersprechen sich zwei Rechnungen, die
   dieselben Größen benutzen sollen. */
const f20 = await p.evaluate(() => {
  const a = { sex: "male", age: 30, height: 180, weight: 80, bodyFat: 15,
    goals: ["muscle_gain"], exp: "intermediate", injuries: [], days: 4, act: "light",
    sleep: 7, equipment: "gym_full", focus: [], recovery_profile: "average", sessionTime: 60 };
  const plan = generateTrainingPlan({ a });
  const sch = generateOptimalSchedule(a).schedule.filter(x => x && x !== "rest" && x !== "cardio");
  const zz = []; let i = 0;
  for (const key of sch) { const d = plan[parseTypeKey(key).base]; if (!d) continue;
    zz.push(`Tag ${++i}`);
    for (const e of [...(d.main || []), ...(d.abs || [])]) zz.push(`${e.n} ${e.sets} × 8`);
    zz.push(""); }
  const x = planReparieren(zz.join("\n"), a);
  return { edits: x.edits.length, grund: x.grund, korridor: x.vor.imKorridor,
    tage: (x.tageNach || []).map(t => t.min) };
});
ok(f20.edits === 0 && f20.korridor === 7,
  `Negativkontrolle: eigener Plan 7/7, ${f20.edits} Änderungen vorgeschlagen — "${f20.grund}"`);
ok(Math.max(...f20.tage) - Math.min(...f20.tage) <= 10,
  `Eigener Plan: Einheiten gleich lang (${f20.tage.join("/")} Min.)`);

/* ── 21. Keine Ergänzung schiebt eine Gruppe über ihr MRV ───────────────── */
const f21 = await p.evaluate(({ REEL, PROFIL }) => {
  const faelle = [PROFIL, { ...PROFIL, injuries: ["knee"] }, { ...PROFIL, injuries: ["shoulder"] },
    { ...PROFIL, equipment: "home_full" }, { ...PROFIL, equipment: "bodyweight" },
    { ...PROFIL, goals: ["fat_loss"] }, { ...PROFIL, exp: "beginner" }];
  const schlecht = [];
  for (const a of faelle) {
    const x = planReparieren(REEL, a); if (!x || !x.besser) continue;
    for (const z of x.nach.zeilen) if (z.tot > z.mrv)
      schlecht.push(`${a.equipment}/${a.injuries.join("+") || "—"}: ${z.g} ${z.tot} > MRV ${z.mrv}`);
  }
  return { n: faelle.length, schlecht };
}, { REEL, PROFIL });
ok(f21.schlecht.length === 0,
  `MRV-Garantie über ${f21.n} Profile: keine Gruppe über ihrer Obergrenze` +
  (f21.schlecht.length ? "\n    " + f21.schlecht.join("\n    ") : ""));

/* ── 22. Keine Kürzung zieht eine Gruppe unter ihr MEV ──────────────────
   Symmetrisch zu Nr. 21. Ohne diese Regel löste die Reparatur ein Problem und
   schuf ein neues: acht Sätze Brust weniger nahmen dem Trizeps vier mit. */
const f22 = await p.evaluate(({ PROFIL }) => {
  const txt = "Tag 1\nBankdrücken 10 × 8\nSchrägbankdrücken 10 × 8\nKabel-Fliegende 8 × 12";
  const x = planReparieren(txt, PROFIL);
  const kaputt = [];
  for (const z of x.nach.zeilen) {
    const v = x.vor.zeilen.find(q => q.g === z.g);
    if (v.st === "ok" && z.st === "low") kaputt.push(`${z.g}: ${v.tot} → ${z.tot} (MEV ${z.mev})`);
  }
  return { cuts: x.edits.filter(e => e.art === "cut").length,
    verteilt: [...new Set(x.edits.filter(e => e.art === "cut").map(e => e.ex))].length,
    kaputt, brustVor: x.vor.zeilen.find(z => z.g === "Brust").tot,
    brustNach: x.nach.zeilen.find(z => z.g === "Brust").tot };
}, { PROFIL });
ok(f22.kaputt.length === 0,
  `Kürzung bricht keine andere Gruppe: Brust ${f22.brustVor} → ${f22.brustNach}` +
  (f22.kaputt.length ? "\n    " + f22.kaputt.join("\n    ") : ""));
ok(f22.verteilt >= 2,
  `Kürzung verteilt sich auf ${f22.verteilt} Übungen statt eine auszubluten`);

/* ── 23. Verletzung und Ausstattung binden die Reparatur ────────────────
   Mit NEGATIVKONTROLLE: ohne Angabe DÜRFEN dieselben Übungen vorkommen. */
const f23 = await p.evaluate(({ REEL, PROFIL }) => {
  const knie = planReparieren(REEL, { ...PROFIL, injuries: ["knee"] });
  const ohne = planReparieren(REEL, PROFIL);
  const koerper = planReparieren(REEL, { ...PROFIL, equipment: "bodyweight" });
  const erlaubtBody = EQ_ALLOWED.bodyweight;
  return {
    knieRiskant: knie.edits.filter(e => INJURY_RISK.knee.includes(e.ex)).map(e => e.ex),
    ohneRiskant: ohne.edits.filter(e => INJURY_RISK.knee.includes(e.ex)).map(e => e.ex),
    bodyFremd: koerper.edits.filter(e => e.art === "add" &&
      !erlaubtBody.includes((EXDB[e.ex] || {}).eq)).map(e => `${e.ex}(${(EXDB[e.ex] || {}).eq})`),
    gymCalis: ohne.edits.filter(e => e.art === "add" && isCalisthenic(e.ex)).map(e => e.ex),
  };
}, { REEL, PROFIL });
ok(f23.knieRiskant.length === 0,
  `Reparatur: bei Knie-Angabe keine riskante Übung vorgeschlagen`);
ok(f23.ohneRiskant.length > 0,
  `Negativkontrolle: ohne Angabe sind dieselben Übungen erlaubt — ${f23.ohneRiskant.join(", ")}`);
ok(f23.bodyFremd.length === 0,
  `Reparatur: mit "bodyweight" nur Körpergewichts-Übungen` +
  (f23.bodyFremd.length ? " — " + f23.bodyFremd.join(", ") : ""));
ok(f23.gymCalis.length === 0,
  `Reparatur: mit voller Ausstattung kein Körpergewichts-Ersatz` +
  (f23.gymCalis.length ? " — " + f23.gymCalis.join(", ") : ""));

/* ── 24. Höchstens eine Übung je BEWEGUNG ───────────────────────────────
   Die erste Fassung schlug bei Knie-Einschränkung "Wadenheben", "Sitzendes
   Wadenheben" UND "Stehendes Wadenheben (Maschine)" vor: zwölf Sätze Waden
   für eine Oberschenkel-Lücke, als drei verschiedene "Muster" gezählt. */
const f24 = await p.evaluate(({ REEL, PROFIL }) => {
  const faelle = [PROFIL, { ...PROFIL, injuries: ["knee"] }, { ...PROFIL, injuries: ["back"] },
    { ...PROFIL, equipment: "home_full" }];
  const doppelt = [];
  for (const a of faelle) {
    const x = planReparieren(REEL, a); if (!x) continue;
    const alle = [...x.items.filter(i => i.ex).map(i => i.ex)];
    const w = alle.map(bewegungsWurzel);
    const zaehl = {}; w.forEach(k => zaehl[k] = (zaehl[k] || 0) + 1);
    for (const [k, n] of Object.entries(zaehl)) if (n > 1)
      doppelt.push(`${a.injuries.join("+") || a.equipment}: ${k} ${n}×`);
  }
  return { n: faelle.length, doppelt,
    wurzelProbe: ["Wadenheben", "Sitzendes Wadenheben", "Stehendes Wadenheben (Maschine)"]
      .map(bewegungsWurzel) };
}, { REEL, PROFIL });
ok(new Set(f24.wurzelProbe).size === 1,
  `Bewegungs-Wurzel: drei Waden-Varianten → eine Wurzel "${f24.wurzelProbe[0]}"`);
ok(f24.doppelt.length === 0,
  `Keine Bewegung doppelt über ${f24.n} Profile` +
  (f24.doppelt.length ? "\n    " + f24.doppelt.join("\n    ") : ""));

/* ── 25. Zeitbudget: Woche UND Einheit ──────────────────────────────────
   Das Wochenbudget allein ließ neun Ergänzungen auf einen Tag zu: 123 Minuten
   in einer Sitzung, formal innerhalb von 3×60. */
const f25 = await p.evaluate(({ REEL, PROFIL }) => {
  const x = planReparieren(REEL, PROFIL);
  const eng = planReparieren(REEL, { ...PROFIL, days: 2, sessionTime: 40 });
  return {
    woche: { genutzt: x.minutenNach, budget: x.budget, quelle: x.budgetQuelle },
    tage: (x.tageNach || []).map(t => t.min), tagBudget: x.tagBudget,
    engWoche: { genutzt: eng.minutenNach, budget: eng.budget },
    engTage: (eng.tageNach || []).map(t => t.min), engTagBudget: eng.tagBudget,
    engOffen: eng.offen.map(o => o.warum),
  };
}, { REEL, PROFIL });
ok(f25.woche.genutzt <= f25.woche.budget,
  `Zeit: ${f25.woche.genutzt} von ${f25.woche.budget} Min./Woche (${f25.woche.quelle})`);
ok(Math.max(...f25.tage) <= f25.tagBudget,
  `Zeit: längste Einheit ${Math.max(...f25.tage)} ≤ ${f25.tagBudget} Min. (${f25.tage.join("/")})`);
ok(f25.engWoche.genutzt <= f25.engWoche.budget && Math.max(...f25.engTage) <= f25.engTagBudget,
  `Negativkontrolle: engeres Budget bindet auch — ${f25.engWoche.genutzt}/${f25.engWoche.budget} Min., ` +
  `Einheiten ${f25.engTage.join("/")} ≤ ${f25.engTagBudget}`);
ok(f25.engWoche.genutzt < f25.woche.genutzt,
  `Negativkontrolle: 2×40 ergibt weniger als 3×60 — ${f25.engWoche.genutzt} < ${f25.woche.genutzt}`);

/* ── 26. Offene Lücken werden benannt, nicht gefüllt ───────────────────── */
const f26 = await p.evaluate(({ PROFIL }) => {
  const x = planReparieren("Tag 1\nBankdrücken 10 × 8\nSchrägbankdrücken 10 × 8\nKabel-Fliegende 8 × 12",
    { ...PROFIL, days: 1, sessionTime: 50 });
  return { offen: x.offen.map(o => ({ g: o.g, warum: o.warum, hatGrund: (o.grund || "").length > 20 })),
    besser: x.besser, grund: x.grund };
}, { PROFIL });
ok(f26.offen.length > 0 && f26.offen.every(o => o.warum && o.hatGrund),
  `Offene Lücken tragen einen gemessenen Grund — ${JSON.stringify(f26.offen)}`);

/* ── 27. Kein Vorschlag ohne messbaren Gewinn ───────────────────────────
   Ein Umbau, der den Durchschnittsreiz um einen Prozentpunkt hebt, liegt in
   der Unsicherheit der fraktionierten Zählung und ist kein Rat. */
const f27 = await p.evaluate(() => ({
  schwelle: P("reparatur.besser.schwelle"),
  puffer: P("reparatur.mrv.puffer"),
  maxSatz: P("reparatur.satz.max"),
  aufschlag: P("reparatur.zeit.aufschlag"),
}));
ok(f27.schwelle >= 2 && f27.puffer >= 1 && f27.maxSatz >= 2 && f27.aufschlag > 0,
  `Dosis-Zahlen der Reparatur kommen aus PARAMS — Schwelle ${f27.schwelle}, Puffer ${f27.puffer}, ` +
  `max ${f27.maxSatz} Sätze, Aufschlag ${f27.aufschlag}`);

/* ══ OBERFLÄCHE ═════════════════════════════════════════════════════════ */

await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await p.goto(BASE + "/index.html", { waitUntil: "load" });
await p.waitForFunction(() => typeof showPlanAudit === "function", { timeout: 15000 });

/* ── 28. Ohne Konto erreichbar ──────────────────────────────────────────── */
const f28 = await p.evaluate(() => ({
  landing: (S.screen || "landing") === "landing",
  keinKonto: S.currentUser == null,
  knopfDa: /showPlanAudit\(\)/.test(document.body.innerHTML),
}));
ok(f28.landing && f28.keinKonto && f28.knopfDa,
  `Oberfläche: Einstieg auf der Landing ohne Konto — ${JSON.stringify(f28)}`);

const f29 = await p.evaluate(() => {
  showPlanAudit();
  return { sheet: !!document.getElementById("au-sheet"), feld: !!document.getElementById("au-text"),
    knopf: /A\.auditRun\(\)/.test(overlay.innerHTML), profilHinweis: /Dein Profil/.test(overlay.innerHTML) };
});
ok(f29.sheet && f29.feld && f29.knopf && f29.profilHinweis,
  `Oberfläche: Eingabe mit Erklärung öffnet sich — ${JSON.stringify(f29)}`);

/* ── 30. Gestufte Enthüllung zeigt echte Zahlen ─────────────────────────
   Kein Fortschrittsbalken, der nur Zeit vergehen lässt: jede Stufe trägt die
   Zahl, die sie gerade gemessen hat. */
const f30 = await p.evaluate(() => {
  document.getElementById("au-text").value = AUDIT_BEISPIEL;
  A.auditRun();
  const h = overlay.innerHTML;
  const soll = planAudit(AUDIT_BEISPIEL, null);
  return { stufen: (h.match(/au-step/g) || []).length,
    zahlDrin: h.includes(`${soll.erkannt}/${soll.gesamt}`),
    kaputt: /undefined|NaN/.test(h) };
});
ok(f30.stufen >= 5 && f30.zahlDrin && !f30.kaputt,
  `Enthüllung: ${f30.stufen} Stufen mit gemessenen Zahlen — ${JSON.stringify(f30)}`);

await p.waitForTimeout(1500);
const f31 = await p.evaluate(() => {
  const h = overlay.innerHTML;
  return { ring: /au-ring/.test(h), ringWert: /class="mid"/.test(h),
    satz: /au-verdict/.test(h), korridor: (h.match(/class="corr"/g) || []).length,
    befunde: (h.match(/au-find/g) || []).length, reparatur: /Die Reparatur/.test(h),
    tagGenannt: /au-day-h/.test(h), grenzen: /Was diese Prüfung nicht sieht/.test(h),
    vergleich: /ganz neu gebaut/.test(h), kaputt: /undefined|NaN|\[object/.test(h) };
});
ok(f31.ring && f31.ringWert && f31.satz,
  `Oberfläche: Ring und ein Satz, der sagt was zu tun ist — ${JSON.stringify(f31)}`);
ok(f31.korridor === 7 && f31.grenzen && f31.vergleich,
  `Oberfläche: 7 Korridor-Zeilen, Grenzen und Vergleich — ${JSON.stringify(f31)}`);
ok(f31.reparatur && f31.tagGenannt,
  `Oberfläche: Reparatur nach Tagen gruppiert — ${JSON.stringify(f31)}`);
ok(!f31.kaputt, "Oberfläche: kein undefined/NaN im Ergebnis");

/* ── 32. Der Korridor zeigt Vorher und Nachher in einer Zeile ───────────── */
const f32 = await p.evaluate(() => {
  const h = overlay.innerHTML;
  return { ghost: (h.match(/au-ghost/g) || []).length, delta: (h.match(/au-delta/g) || []).length };
});
ok(f32.ghost > 0 && f32.delta > 0,
  `Korridor: ${f32.ghost} Vorher-Marken und ${f32.delta} Differenzen eingezeichnet`);

/* ── 33. Herleitung: echte Register-Einträge ────────────────────────────── */
const f33 = await p.evaluate(() => {
  A.auditHerleitung("Brust");
  const h = overlay.innerHTML;
  return { params: (h.match(/hl-p-n/g) || []).length, rechnung: /1 − e/.test(h),
    schluessel: /vol\.band\.Brust\.mev/.test(h), tage: /an \d+ Tag/.test(h),
    kaputt: /undefined|NaN/.test(h) };
});
ok(f33.params >= 4 && f33.schluessel && f33.rechnung && f33.tage && !f33.kaputt,
  `Herleitung: ${f33.params} Register-Einträge, Formel und Tageszahl — ${JSON.stringify(f33)}`);
await p.evaluate(() => A.auditZurueck());

/* ── 34. Reparierter Plan als Text ─────────────────────────────────────── */
const f34 = await p.evaluate(() => {
  const rep = planReparieren(AUDIT_BEISPIEL, null);
  if (!rep || !rep.besser) return { uebersprungen: true };
  const t = auditRepText(rep);
  return { zeilen: t.split("\n").length, neu: (t.match(/\(neu\)/g) || []).length,
    tage: (t.match(/^Tag|^Einheit/gm) || []).length, bilanz: /im Wachstums-Korridor/.test(t),
    kaputt: /undefined|NaN/.test(t) };
});
ok(f34.uebersprungen || (f34.neu > 0 && f34.bilanz && !f34.kaputt),
  `Textausgabe: ${f34.neu} Ergänzungen markiert, Bilanz dabei — ${JSON.stringify(f34)}`);

/* ── 35. Der eingefügte TEXT verlässt das Gerät nicht ───────────────────
   Die Landing verspricht genau das. Gespeichert wird nur das Ergebnis. */
const anfragen = [];
p.on("request", r => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith("data:")) anfragen.push(u); });
await p.evaluate(() => {
  A.auditReset();
  document.getElementById("au-text").value = AUDIT_BEISPIEL;
  A.auditRun();
});
await p.waitForTimeout(1600);
ok(anfragen.length === 0,
  `Lokal: während der Prüfung keine fremde Anfrage — ${anfragen.length ? anfragen.join(", ") : "0"}`);

const f36 = await p.evaluate(() => {
  let roh = [], derived = false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const v = localStorage.getItem(localStorage.key(i)) || "";
      /* Der VERBATIM eingefügte Text — Tagestitel mit Gedankenstrich plus
         Satzschreibweise — darf nirgends stehen. */
      if (v.includes("Tag 1 — Oberkörper") || v.includes("4 × 6-8")) roh.push(localStorage.key(i));
      if (v.includes("auditLetzte")) derived = true;
    }
  } catch (e) {}
  return { roh, derived, gespeichert: S.auditLetzte ? Object.keys(S.auditLetzte) : null };
});
ok(f36.roh.length === 0,
  `Lokal: der eingefügte Text wird nicht gespeichert — ${f36.roh.join(", ") || "nichts"}`);
ok(f36.derived && f36.gespeichert && f36.gespeichert.includes("imKorridor"),
  `Lokal: nur das Ergebnis wird gemerkt — ${JSON.stringify(f36.gespeichert)}`);

/* ── 36b. Übernahme rührt den EIGENEN Plan nicht an ─────────────────────
   "In der App merken" legt den reparierten fremden Plan in dieselbe Ablage
   wie der Bild-Import. Der eigene METRICGYM-Plan ist Nutzerdaten und wird
   nicht überschrieben; und derselbe Plan darf nicht ein zweites Mal, gröber,
   bewertet werden. */
const f36b = await p.evaluate(() => {
  const a = { sex: "male", age: 30, height: 180, weight: 80, bodyFat: 15,
    goals: ["muscle_gain"], exp: "intermediate", injuries: [], days: 3, act: "light",
    sleep: 7, equipment: "gym_full", focus: [], recovery_profile: "average", sessionTime: 60 };
  const bmr = bmrCalc(a), td = tdeeCalc(bmr, a.act, effWeight(a), 60, a.days);
  S.profile = { a, bmr, td, tg: multiTargets(a, bmr, td) };
  S.plan = generateTrainingPlan({ a }); S.currentUser = "probe";
  const vorher = JSON.stringify(S.plan) + JSON.stringify(S.exOverrides || {});
  showPlanAudit();
  document.getElementById("au-text").value = AUDIT_BEISPIEL;
  A.auditRun();
  if (!_auditRep || !_auditRep.rep || !_auditRep.rep.besser) return { uebersprungen: true };
  A.auditSpeichern();
  const nachher = JSON.stringify(S.plan) + JSON.stringify(S.exOverrides || {});
  showImportedPlan();
  const h = overlay.innerHTML;
  return { planUnveraendert: vorher === nachher,
    abgelegt: !!(S.importedPlan && S.importedPlan.days && S.importedPlan.days.length),
    quelle: S.importedPlan && S.importedPlan.quelle,
    zweiteBewertung: /dein alter Plan/.test(h),
    hinweis: /bereits geprüft und repariert/.test(h), kaputt: /undefined|NaN/.test(h) };
});
ok(f36b.uebersprungen || (f36b.planUnveraendert && f36b.abgelegt),
  `Übernahme: eigener Plan unberührt, fremder abgelegt — ${JSON.stringify(f36b)}`);
ok(f36b.uebersprungen || (!f36b.zweiteBewertung && f36b.hinweis && !f36b.kaputt),
  `Übernahme: keine zweite, gröbere Bewertung desselben Plans`);

/* ── 37. Letzte Prüfung ist wieder abrufbar ────────────────────────────── */
const f37 = await p.evaluate(() => {
  A.auditLetzte();
  const h = overlay.innerHTML;
  return { offen: /Letzte Prüfung/.test(h), korridor: (h.match(/class="corr"/g) || []).length,
    hinweis: /wird nicht aufbewahrt/.test(h), kaputt: /undefined|NaN/.test(h) };
});
ok(f37.offen && f37.korridor === 7 && f37.hinweis && !f37.kaputt,
  `Wiedervorlage: letzte Prüfung abrufbar, mit Hinweis was gespeichert ist — ${JSON.stringify(f37)}`);


console.log("");
console.log(`${pass} Zusicherungen grün, ${fail} rot`);
await b.close();
if (fail) { console.log("✗ PLAN-PRÜFUNG ROT"); process.exit(1); }
console.log("ALLE PROBEN GRÜN — " + pass + " Zusicherungen");
