/* METRICGYM — PARAMS-TOR (A1, Entscheidung 3.3)
   ---------------------------------------------------------------------------
   Jede Zahl, mit der die Engine ENTSCHEIDET, muss aus PARAMS kommen. Sonst
   wandert sie unbemerkt in eine Empfehlung, und der Claim "jede Zahl nennt
   ihre Quelle" ist wieder nur ein Satz.

   Der Auftrag sagt ausdruecklich: nur Entscheidungsfunktionen, Positivliste
   fuer 0, 1, Rundung (10/100) und Array-Indizes, jede weitere Ausnahme
   kommentiert. Eine woertliche Auslegung ("jede numerische Konstante") traefe
   auch `*10)/10` und `slice(-14)` und haette das Tor dauerhaft rot gehalten —
   dann prueft niemand mehr hin, und das ist schlimmer als kein Tor.

   Laeuft ohne Browser: reine Textanalyse von index.html.                   */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const hier = dirname(fileURLToPath(import.meta.url));
const QUELLE = join(hier, '..', 'index.html');
const src = readFileSync(QUELLE, 'utf8');
const zeilen = src.split('\n');

const fails = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push(name);
};

/* ── Die Entscheidungsfunktionen ──────────────────────────────────────────
   Nicht die ganze Engine: genau die Funktionen, deren Rueckgabe als Zahl
   oder Vorgabe beim Nutzer landet. Darstellung, Import, Zeichnen und
   Zustandsverwaltung sind bewusst draussen — dort sind Zahlen Geometrie,
   keine Empfehlung.                                                       */
const ENTSCHEIDER = [
  'calorieDirection', 'multiTargets', 'deficitFactor', 'expBandFactor',
  'deficitScaledBands', 'saettigungFuer', 'proteinDeckung', 'kalibFaktoren',
  'e1rm', 'statusScore', 'forecast12w', 'weekSets', 'progFor', 'tdeeCalc',
];

/* Positivliste aus dem Auftrag, plus die beiden Ausnahmen, die ohne Nutzen
   Laerm machen wuerden — jede hier benannt und begruendet. */
const ERLAUBT = new Set([
  '0', '1',          // neutrale Elemente, Flags, Indexstart
  '10', '100',       // Rundung und Prozentumrechnung
  '2',               // Zweierteilung (Haelfte, Quadrat, zwei Nachkommastellen)
  '4', '7',          // Wochentage und Wochen im Block — Kalender, keine Dosis
  '1000',            // Tausendertrennung
  '60',              // Sekunden/Minuten — Zeiteinheit, keine Stellgroesse
  /* Physikalische Konstanten, keine Stellgroessen: ein Gramm Eiweiss und ein
     Gramm Kohlenhydrat liefern 4 kcal, ein Gramm Fett 9 kcal (Atwater). Die
     stehen nicht zur Entscheidung und gehoeren nicht ins Register. */
  '9',
]);

/* Mehrzeilige Blockkommentare rauswerfen. Der erste Versuch strich nur
   einzeilige Kommentare — dadurch landeten Jahreszahlen und BMI-Werte aus
   Erklaertexten in der Verstossliste und verdeckten die echten Luecken. */
function ohneBlockKommentare(rows) {
  let drin = false;
  return rows.map(({ n, l }) => {
    let out = '', i = 0;
    while (i < l.length) {
      if (!drin && l.startsWith('/*', i)) { drin = true; i += 2; continue; }
      if (drin) {
        if (l.startsWith('*/', i)) { drin = false; i += 2; continue; }
        i++; continue;
      }
      out += l[i]; i++;
    }
    return { n, l: out };
  });
}

function koerperVon(name) {
  const start = zeilen.findIndex(l => new RegExp(`^(function|const)\\s+${name}\\b`).test(l.trim()));
  if (start < 0) return null;
  let tiefe = 0, begonnen = false, raus = [];
  for (let i = start; i < zeilen.length; i++) {
    const l = zeilen[i];
    raus.push({ n: i + 1, l });
    for (const ch of l) {
      if (ch === '{') { tiefe++; begonnen = true; }
      else if (ch === '}') tiefe--;
    }
    if (begonnen && tiefe <= 0) break;
    if (i - start > 400) break;
  }
  return raus;
}

/* Eine Zeile auf nackte Zahlen pruefen. Vorher entfernt: Kommentare,
   Zeichenketten, PARAMS-Zugriffe und Array-Indizes. */
function nackteZahlen(l) {
  let c = l.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');
  c = c.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''").replace(/`[^`]*`/g, '``');
  c = c.replace(/\bP\s*\(\s*""\s*\)/g, 'P()');      // P("…") ist der erlaubte Weg
  c = c.replace(/\[\s*\d+\s*\]/g, '[i]');           // Array-Index
  const m = c.match(/(?<![\w.$])\d+(?:\.\d+)?(?![\w.])/g) || [];
  return m.filter(z => !ERLAUBT.has(z));
}

console.log('── Entscheidungsfunktionen ──');
let geprueft = 0, verstoesse = [];
for (const fn of ENTSCHEIDER) {
  const k = koerperVon(fn);
  if (!k) { verstoesse.push(`${fn}: NICHT GEFUNDEN`); continue; }
  geprueft++;
  for (const { n, l } of ohneBlockKommentare(k)) {
    const z = nackteZahlen(l);
    if (z.length) verstoesse.push(`${fn} Z.${n}: ${[...new Set(z)].join(', ')}  →  ${l.trim().slice(0, 78)}`);
  }
}
check(`alle ${ENTSCHEIDER.length} Entscheidungsfunktionen gefunden`, geprueft === ENTSCHEIDER.length,
  `${geprueft} von ${ENTSCHEIDER.length}`);
check('keine nackte Zahl in einer Entscheidungsfunktion', verstoesse.length === 0,
  verstoesse.length ? '\n    ' + verstoesse.join('\n    ') : 'Positivliste: ' + [...ERLAUBT].join(' '));

/* ── Das Register selbst ────────────────────────────────────────────────── */
const i0 = src.indexOf('const PARAMS={');
const i1 = src.indexOf('\n};', i0);
let PARAMS = null;
try { PARAMS = new Function('return ' + src.slice(i0 + 13, i1 + 2))(); } catch (e) { /* unten gemeldet */ }

check('PARAMS ist auswertbar', !!PARAMS && typeof PARAMS === 'object',
  PARAMS ? `${Object.keys(PARAMS).length} Einträge` : 'Auswertung fehlgeschlagen');

if (PARAMS) {
  const K = Object.keys(PARAMS);
  const TYPEN = new Set(['beleg', 'modell', 'praxisregel', 'annahme', 'nutzerdaten']);

  check('jeder Eintrag hat einen gültigen Typ',
    K.every(k => TYPEN.has(PARAMS[k].typ)),
    K.filter(k => !TYPEN.has(PARAMS[k].typ)).join(', ') || [...TYPEN].join(' | '));

  check('jeder Eintrag hat wert und einheit',
    K.every(k => PARAMS[k].wert !== undefined && PARAMS[k].einheit),
    K.filter(k => PARAMS[k].wert === undefined || !PARAMS[k].einheit).join(', ') || `${K.length} geprüft`);

  check('jeder Eintrag hat eine Begründung',
    K.every(k => (PARAMS[k].begruendung || '').trim().length > 10),
    K.filter(k => (PARAMS[k].begruendung || '').trim().length <= 10).join(', ') || `${K.length} geprüft`);

  // Entscheidung 3.1: Annahmen brauchen Begruendung UND Sensitivitaet
  const ann = K.filter(k => PARAMS[k].typ === 'annahme');
  check('jede Annahme nennt ihre Sensitivität bei ±20 %',
    ann.every(k => (PARAMS[k].sensitivitaet || '').trim().length > 5),
    ann.filter(k => !(PARAMS[k].sensitivitaet || '').trim()).join(', ') || `${ann.length} Annahmen`);

  // beleg/praxisregel ohne Quelle waere eine leere Behauptung
  const mitQ = K.filter(k => ['beleg', 'praxisregel'].includes(PARAMS[k].typ));
  check('jeder Beleg und jede Praxisregel nennt eine Quelle',
    mitQ.every(k => (PARAMS[k].quelle || '').trim().length > 5),
    mitQ.filter(k => !(PARAMS[k].quelle || '').trim()).join(', ') || `${mitQ.length} geprüft`);

  // Entscheidung 3.2: der Korridor ist aufgeteilt
  check('Korridor: Untergrenzen und Obergrenzen sind getrennt geführt',
    K.some(k => /^vol\.band\..*\.mev$/.test(k)) && K.some(k => /^vol\.band\..*\.mrv$/.test(k)),
    `${K.filter(k => /\.mev$/.test(k)).length} MEV · ${K.filter(k => /\.mrv$/.test(k)).length} MRV`);

  // Entscheidung 3.4: die drei umstrittenen Quellen sind herabgestuft
  const herab = K.filter(k => /HERABGESTUFT|EINZELSTUDIE/.test(PARAMS[k].quelle || ''));
  check('die drei umstrittenen Quellen sind sichtbar herabgestuft',
    herab.length >= 3, herab.join(', '));

  // Keine erfundene Vollstaendigkeit: wer eine DOI nennt, muss sie auch haben
  check('kein Eintrag behauptet eine leere DOI',
    K.every(k => PARAMS[k].doi === undefined || String(PARAMS[k].doi).trim().length > 5),
    K.filter(k => PARAMS[k].doi !== undefined && !String(PARAMS[k].doi).trim()).join(', ') || 'keine leeren DOI-Felder');

  const bil = { gesamt: K.length };
  for (const k of K) bil[PARAMS[k].typ] = (bil[PARAMS[k].typ] || 0) + 1;
  console.log('\n── Bilanz ──');
  console.log(`   ${bil.gesamt} Stellgrößen · ${bil.beleg || 0} belegt · ${bil.praxisregel || 0} Praxisregel · ` +
              `${bil.modell || 0} Modell · ${bil.annahme || 0} offen deklarierte Annahme`);
  console.log(`   ${K.filter(k => PARAMS[k].sichtbar).length} davon sieht der Nutzer · ` +
              `${K.filter(k => PARAMS[k].unvollstaendig).length} mit unvollständiger Quellenangabe (Arbeitsvorrat)`);
}

console.log('');
if (fails.length) { console.log(`✗ ${fails.length} FEHLGESCHLAGEN: ${fails.join(' · ')}`); process.exit(1); }
console.log('PARAMS-TOR GRÜN');
