/* ============================================================================
   ZITATE GEGEN PUBMED PRUEFEN
   ----------------------------------------------------------------------------
   Diese App bewirbt auf der Startseite eine Zahl: "N wissenschaftliche Quellen
   — alle nachlesen". Das ist ihre wichtigste Behauptung. Eine falsche Angabe
   darin ist deshalb kein Schoenheitsfehler, sondern ein gebrochenes Versprechen.

   Der Anlass ist konkret: beim Einbau der Effizienz-Eichung waren DREI von
   sechs neu eingetragenen Zitaten falsch, alle aus dem Gedaechtnis geschrieben
   und alle plausibel aussehend —
     · "Nunes JP et al. J Appl Physiol 2024;136(2):421–431"
       → Erstautor ist Lixandrão ME, Seiten 421–429
     · "Within-individual design · Sports Med 2025"
       → Chaves TS et al., Front Sports Act Living 2025;7:1517190
     · "Spiering BA et al. Sports Med 2021"
       → J Strength Cond Res 2021;35(5):1449–1458
   Zusaetzlich zitierte die App durchgehend "Pelland et al. Sports Med 2025";
   die Arbeit ist in Sports Med 2026;56(2):481–505 erschienen. Haetten einige
   Eintraege 2025 und andere 2026 gesagt, haette quellenZahl() EINE Arbeit als
   ZWEI gezaehlt — und die oeffentlich beworbene Zahl waere zu hoch gewesen.

   ── WARUM DIESE FASSUNG ANDERS PRUEFT ALS DIE ERSTE ──────────────────────────
   Der erste Versuch war ein schlechtes Messgeraet, und zwar auf beide
   moeglichen Weisen:

   FALSCH GRUEN. Er suchte nur Nachname + Jahr und setzte ein Haekchen, sobald
   irgendwer dieses Namens in dem Jahr irgendetwas veroeffentlicht hatte. So
   bestaetigte er "Schoenfeld 2010" gegen Cancer Res, "Larsen 2025" gegen MIS
   Quarterly und "Holt 1995" gegen J Pediatr Surg. Ein Haekchen neben einem
   Krebsjournal fuer ein trainingswissenschaftliches Zitat ist schlimmer als
   keine Pruefung, weil es Pruefung VORTAEUSCHT.

   FALSCH ROT. Bei Morton 2018 (Br J Sports Med, korrekt im Register) fand die
   Suche unter 2018[Date - Publication] nichts — die Arbeit erschien online
   2017 — und das Werkzeug druckte daraufhin den erstbesten fremden "Morton A,
   Obstet Med 2020" als "laut PubMed". Eine solche Zeile bringt jemanden dazu,
   ein RICHTIGES Zitat zu "korrigieren".

   Diese Fassung macht deshalb drei Dinge anders:
     · Sie sucht ueber das Fachgebiet mit, nicht nur ueber Namen und Jahr, und
       akzeptiert einen Treffer nur, wenn Titel oder Journal fachlich passen.
     · Sie laesst ein Jahr Toleranz zu (online-first gegen Druckausgabe) und
       sagt es, wenn sie davon Gebrauch macht.
     · Sie behauptet nie, "PubMed sagt X", wenn sie die Arbeit nur nicht
       gefunden hat. Nicht gefunden ist ein eigener Ausgang, kein Befund.

   Drei Ausgaenge, klar getrennt:
     ✓ GEPRUEFT     Band/Heft/Seiten stimmen ueberein (nur wo das Register sie nennt)
     ~ PLAUSIBEL    fachlich passende Arbeit des Autors im Jahr gefunden, aber
                    das Register nennt keine Seiten — also nichts Hartes zu pruefen
     – OFFEN        nichts Passendes gefunden; von Hand ansehen
     ✗ ABWEICHEND   fachlich passende Arbeit gefunden, aber Band/Seiten weichen ab

   Nur ✗ setzt den Rueckgabewert. "Offen" ist kein Fehler: Buecher, Leitlinien
   und Formeln (Allen/Coggan, DGE-Referenzwert, Mifflin-St Jeor, Israetels
   Praxismodell) stehen nicht in PubMed.

   Laeuft NICHT im CI-Gate: die Pruefung braucht Netz, und ein Gate, das an
   einer fremden API haengt, blockiert irgendwann ein Deploy aus einem Grund,
   der nichts mit dem Code zu tun hat.

     node metricgym-netlify/tests/zitate-pruefen.mjs
     node metricgym-netlify/tests/zitate-pruefen.mjs Morton     (nur eine)
   ============================================================================ */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const hier = dirname(fileURLToPath(import.meta.url));
const quelle = readFileSync(join(hier, "..", "index.html"), "utf8");
const nurFilter = process.argv[2] || null;

const roh = quelle.match(/const QUELLEN=\[[\s\S]*?\n\];/);
if (!roh) { console.error("✗ QUELLEN-Register nicht gefunden"); process.exit(1); }
const QUELLEN = new Function("return " + roh[0].replace("const QUELLEN=", "") + ";")();

/* Fachlich passend heisst: Titel oder Journal traegt mindestens einen Begriff
   aus dem Gebiet, um das es hier geht. Das ist grob, aber es trennt zuverlaessig
   Cancer Res von Med Sci Sports Exerc — und genau dieser Fehler war das
   Problem der ersten Fassung. */
const FACH = /sport|exerc|train|muscl|muskul|strength|hypertroph|resistance|athlet|physiol|nutrit|protein|diet|obes|weight|endurance|cardio|appl physiol|kinesi|rehabil|orthop|metab|clin nutr|am j clin|performance|condition/i;
const fachlich = t =>
  FACH.test(String(t.title || "")) || FACH.test(String(t.source || "")) ||
  FACH.test(String(t.fulljournalname || ""));

/* Ein Zitat in pruefbare Teile zerlegen. Ein Eintrag kann mehrere Arbeiten
   nennen, getrennt durch "·". */
function zerlegen(cite) {
  const out = [];
  for (const teil of String(cite).split("·")) {
    const t = teil.trim();
    const jahre = t.match(/(19|20)\d{2}/g);
    if (!jahre) continue;
    const vorJahr = t.replace(/(19|20)\d{2}[\s\S]*$/, "").trim();
    const nm = vorJahr.match(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’-]{2,}/);
    if (!nm) continue;
    const bsp = t.match(/(\d{1,3})\s*\(\s*(\d{1,2})?\s*\)\s*:\s*(\d{1,4})\s*[–-]\s*(\d{1,4})/);
    const bandNur = !bsp && t.match(/;\s*(\d{1,3})\s*:\s*(\d{3,8})/);
    /* Journalname: alles zwischen den Autoren und der Jahreszahl. Die Autoren
       enden entweder auf "et al." oder auf den Punkt nach den Initialen des
       letzten Autors — in beiden Faellen steht danach das Journal.
       Geprueft an allen Formen, die im Register vorkommen:
         "Morton RW et al. Br J Sports Med 2018;..."        → Br J Sports Med
         "Bickel CS, Cross JM, Bamman MM. Med Sci ... 2011" → Med Sci Sports Exerc
         "Seiler S. Int J Sports Physiol Perform 2010;..."  → Int J Sports Physiol Perform
         "Monod H, Scherrer J. Ergonomics 1965;8:329–338"   → Ergonomics */
    let journal = null;
    const eta = vorJahr.lastIndexOf("et al.");
    if (eta >= 0) journal = vorJahr.slice(eta + 6).trim();
    else { const pkt = vorJahr.lastIndexOf(". "); if (pkt >= 0) journal = vorJahr.slice(pkt + 2).trim(); }
    if (journal) journal = journal.replace(/[.,;:]+$/, "").trim();
    if (journal && (journal.length < 3 || journal.length > 60)) journal = null;
    out.push({
      autor: nm[0], jahr: jahre[0], text: t, journal,
      band: bsp ? bsp[1] : (bandNur ? bandNur[1] : null),
      heft: bsp ? bsp[2] : null,
      von: bsp ? bsp[3] : (bandNur ? bandNur[2] : null), bis: bsp ? bsp[4] : null,
    });
  }
  return out;
}

const alle = [];
for (const grp of QUELLEN) for (const [was, cite] of grp.items)
  for (const z of zerlegen(cite)) alle.push({ ...z, gruppe: grp.g, was: was.slice(0, 55) });

/* Nach Autor+Jahr entdoppeln — genau wie quellenZahl() zaehlt. */
const einmalig = []; const gesehen = new Set();
for (const z of alle) {
  const k = z.autor.toLowerCase() + " " + z.jahr;
  if (gesehen.has(k)) continue;
  gesehen.add(k); einmalig.push(z);
}

const ziel = nurFilter
  ? einmalig.filter(z => z.autor.toLowerCase().includes(nurFilter.toLowerCase()))
  : einmalig;

console.log(`Register: ${alle.length} Nennungen, ${einmalig.length} eindeutige Arbeiten`
  + (nurFilter ? ` — gefiltert auf "${nurFilter}": ${ziel.length}` : ""));
console.log(`Gesucht wird Autor + Jahr (±1 fuer online-first) UND fachliche Passung.\n`);

const warte = ms => new Promise(r => setTimeout(r, ms));
const api = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const platt = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/* Eine Anfrage mit Wiederholung: PubMed antwortet unter Last mit 429, und ein
   429 ist keine Aussage ueber das Zitat. Die erste Fassung hat vier Arbeiten
   deswegen stillschweigend nicht geprueft. */
async function hole(url, versuche = 4) {
  for (let i = 0; i < versuche; i++) {
    const r = await fetch(url);
    if (r.ok) return r.json();
    if (r.status !== 429 && r.status < 500) throw new Error("HTTP " + r.status);
    await warte(1200 * (i + 1));
  }
  throw new Error("429 nach " + versuche + " Versuchen");
}

/* DER EXAKTE SCHLUESSEL. Fuer ein Zitat mit Journal, Band und Seite ist das
   eine Punktabfrage mit voller Trefferquote — Autorensuche ist es nicht.
   Genau daran ist die vorige Fassung gescheitert: "Morton[Author] AND 2017:2019"
   liefert bei einem haeufigen Nachnamen hunderte Arbeiten, die gesuchte war
   nicht unter den ersten sechzig, und das Werkzeug meldete vier KORREKTE
   Zitate als abweichend. Ein Werkzeug, dessen Nein man nicht glauben kann,
   ist schlimmer als keins: es verleitet dazu, Richtiges zu "korrigieren". */
async function exakt(z) {
  if (!z.journal || !z.band || !z.von) return null;
  const versuche = [
    `"${z.journal}"[ta] AND ${z.band}[vi] AND ${z.von}[pg]`,
    `"${z.journal}"[jour] AND ${z.band}[vi] AND ${z.von}[pg]`,
    `${z.band}[vi] AND ${z.von}[pg] AND ${platt(z.autor)}[Author]`,
  ];
  for (const term of versuche) {
    const s = await hole(`${api}/esearch.fcgi?db=pubmed&retmode=json&retmax=5&term=${encodeURIComponent(term)}`);
    const ids = s.esearchresult?.idlist || [];
    if (!ids.length) { await warte(350); continue; }
    await warte(350);
    const d = await hole(`${api}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`);
    const res = d.result || {};
    const liste = (res.uids || []).map(u => res[u]).filter(Boolean);
    /* Der Erstautor muss stimmen — sonst ist es eine andere Arbeit an
       derselben Stelle, und das waere ein Befund, kein Treffer. */
    const treffer = liste.find(t => {
      const a = (t.authors || [])[0]?.name || "";
      return platt(a).toLowerCase().startsWith(platt(z.autor).toLowerCase());
    });
    if (treffer) return { t: treffer, weg: term };
    if (liste.length) return { t: null, fremd: liste[0], weg: term };
  }
  return null;
}

async function pubmed(autor, jahr) {
  const j = parseInt(jahr, 10);
  /* Datumsbereich mit einem Jahr Luft: online-first und Druckausgabe fallen
     regelmaessig in verschiedene Jahre (Morton 2018 erschien online 2017). */
  const term = `${platt(autor)}[Author]+AND+("${j - 1}"[dp]:"${j + 1}"[dp])`;
  const s = await hole(`${api}/esearch.fcgi?db=pubmed&retmode=json&retmax=60&term=${term}`);
  const ids = s.esearchresult?.idlist || [];
  if (!ids.length) return [];
  await warte(400);
  const d = await hole(`${api}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`);
  const res = d.result || {};
  return (res.uids || []).map(u => res[u]).filter(Boolean);
}

let gepruft = 0, plausibel = 0;
const abweichend = [], offen = [], fehler = [];

for (const z of ziel) {
  /* Erst der exakte Schluessel. Nur wenn das Register keine Seite nennt oder
     die Arbeit nicht indexiert ist, geht es weiter zum weichen Weg. */
  if (z.journal && z.band && z.von) {
    let e = null;
    try { e = await exakt(z); }
    catch (err) {
      fehler.push({ z, grund: err.message });
      console.log(`  ! ${z.autor} ${z.jahr} — Abfrage fehlgeschlagen (${err.message}), NICHT geprueft`);
      await warte(500); continue;
    }
    if (e && e.t) {
      gepruft++;
      const t = e.t;
      const jahrAbw = String(t.pubdate).slice(0, 4) !== z.jahr;
      const seitenOk = !z.bis || (() => {
        const m = String(t.pages || "").match(/^(\d+)\s*[–-]\s*(\d+)/);
        return !m || z.bis === m[2] || z.bis.endsWith(m[2]);
      })();
      console.log(`  ${seitenOk ? "✓" : "✗"} ${z.autor} ${z.jahr} — `
        + `${(t.authors || [])[0]?.name} · ${t.source} ${String(t.pubdate).slice(0, 4)};`
        + `${t.volume}(${t.issue || ""}):${t.pages}`
        + (jahrAbw ? `  [Register ${z.jahr}, PubMed ${String(t.pubdate).slice(0, 4)} — online-first]` : ""));
      if (!seitenOk) { gepruft--; abweichend.push({ z, kandidaten: [`Endseite weicht ab: ${t.pages}`] }); }
      await warte(450); continue;
    }
    if (e && e.fremd) {
      abweichend.push({ z, kandidaten: [`an dieser Stelle steht: ${(e.fremd.authors||[])[0]?.name} · ${e.fremd.source} ${String(e.fremd.pubdate).slice(0,4)};${e.fremd.volume}:${e.fremd.pages}`] });
      console.log(`  ✗ ${z.autor} ${z.jahr} — Journal/Band/Seite existiert, aber mit anderem Erstautor`);
      console.log(`      Register:  ${z.text}`);
      console.log(`      PubMed:    ${(e.fremd.authors||[])[0]?.name} · ${e.fremd.source} ${String(e.fremd.pubdate).slice(0,4)};${e.fremd.volume}:${e.fremd.pages}`);
      await warte(450); continue;
    }
    /* Der exakte Schluessel hat nichts gefunden. Das kann ZWEI Dinge heissen,
       und sie duerfen nicht gleich aussehen:
         (a) die Arbeit ist nicht indexiert (alte Jahrgaenge, Buecher)
         (b) die SEITE im Register ist falsch — die Arbeit gibt es, nur woanders
       Eine Gegenprobe in der eigenen Pruefung hat genau das gezeigt: eine
       absichtlich verfaelschte Seitenzahl (115-130 → 999-1010) meldete
       "nicht indexiert" statt "abweichend". Das ist eine falsche Beruhigung.
       Deshalb jetzt eine zweite Abfrage ohne die Seite: findet sie die Arbeit
       bei diesem Autor in diesem Journal und Band, ist die SEITE falsch. */
    let zweit=null;
    try{
      const term=`"${z.journal}"[ta] AND ${z.band}[vi] AND ${platt(z.autor)}[Author]`;
      const s2=await hole(`${api}/esearch.fcgi?db=pubmed&retmode=json&retmax=5&term=${encodeURIComponent(term)}`);
      const ids2=s2.esearchresult?.idlist||[];
      if(ids2.length){ await warte(350);
        const d2=await hole(`${api}/esummary.fcgi?db=pubmed&retmode=json&id=${ids2.join(",")}`);
        const res2=d2.result||{};
        const liste2=(res2.uids||[]).map(u=>res2[u]).filter(Boolean);
        zweit=liste2.find(t=>{ const a=(t.authors||[])[0]?.name||"";
          return platt(a).toLowerCase().startsWith(platt(z.autor).toLowerCase()); })||null;
      }
    }catch(e){}
    if(zweit){
      abweichend.push({ z, kandidaten:[`dieselbe Arbeit steht bei ${zweit.pages}`] });
      console.log(`  ✗ ${z.autor} ${z.jahr} — SEITEN STIMMEN NICHT`);
      console.log(`      Register: ${z.journal} ${z.band}:${z.von} (${z.text})`);
      console.log(`      PubMed:   ${(zweit.authors||[])[0]?.name} · ${zweit.source} ${String(zweit.pubdate).slice(0,4)};${zweit.volume}(${zweit.issue||""}):${zweit.pages}`);
      await warte(450); continue;
    }
    offen.push(z);
    console.log(`  – ${z.autor} ${z.jahr} — ${z.journal} ${z.band}:${z.von} nicht in PubMed indexiert (auch nicht unter anderer Seite)`);
    await warte(450); continue;
  }

  let treffer;
  try { treffer = await pubmed(z.autor, z.jahr); }
  catch (e) {
    fehler.push({ z, grund: e.message });
    console.log(`  ! ${z.autor} ${z.jahr} — Abfrage fehlgeschlagen (${e.message}), NICHT geprueft`);
    await warte(500); continue;
  }

  const imFach = treffer.filter(fachlich);
  if (!imFach.length) {
    offen.push(z);
    console.log(`  – ${z.autor} ${z.jahr} — keine fachlich passende Arbeit gefunden`
      + (treffer.length ? ` (${treffer.length} Treffer des Namens, alle aus anderen Gebieten)` : " (kein Treffer)"));
    await warte(500); continue;
  }

  /* Band/Heft/Seiten vergleichen, soweit das Register sie nennt. */
  const passt = t => {
    if (String(t.volume || "") !== z.band) return false;
    if (z.heft && String(t.issue || "") !== z.heft) return false;
    if (z.von) {
      const m = String(t.pages || "").match(/^(\d+)\s*[–-]\s*(\d+)/);
      if (!m || m[1] !== z.von) return false;
      /* PubMed kuerzt die Endseite: "964-72" fuer 964–972. */
      if (z.bis !== m[2] && !z.bis.endsWith(m[2])) return false;
    }
    return true;
  };

  const zeig = t => `${(t.authors || [])[0]?.name || "?"} · ${t.source} `
    + `${String(t.pubdate).slice(0, 4)};${t.volume || ""}(${t.issue || ""}):${t.pages || ""}`;

  if (!z.band) {
    /* Ohne Band im Register gibt es nichts Hartes zu pruefen. Das ist KEIN
       Haekchen — nur die Feststellung, dass es den Autor im Fach gibt. */
    plausibel++;
    const t = imFach[0];
    const jahrAbw = String(t.pubdate).slice(0, 4) !== z.jahr;
    console.log(`  ~ ${z.autor} ${z.jahr} — ${imFach.length} fachliche Arbeit(en) gefunden;`
      + ` Register nennt keine Seiten, also nichts Hartes zu pruefen`
      + (jahrAbw ? ` (naechste: ${String(t.pubdate).slice(0, 4)})` : ""));
  } else {
    const genau = imFach.filter(passt);
    if (genau.length) {
      gepruft++;
      const t = genau[0];
      const jahrAbw = String(t.pubdate).slice(0, 4) !== z.jahr;
      console.log(`  ✓ ${z.autor} ${z.jahr} — ${t.source} ${String(t.pubdate).slice(0, 4)};`
        + `${t.volume}(${t.issue || ""}):${t.pages}`
        + (jahrAbw ? `  [Jahr im Register ${z.jahr}, PubMed ${String(t.pubdate).slice(0, 4)} — online-first?]` : ""));
    } else {
      abweichend.push({ z, kandidaten: imFach.slice(0, 3).map(zeig) });
      console.log(`  ✗ ${z.autor} ${z.jahr} — Band/Seiten stimmen mit keinem fachlichen Treffer`);
      console.log(`      Register:  ${z.text}`);
      for (const k of imFach.slice(0, 3)) console.log(`      PubMed:    ${zeig(k)}`);
      if (imFach.length > 3) console.log(`      ... und ${imFach.length - 3} weitere`);
    }
  }
  await warte(500);
}

console.log("\n────────────────────────────────────────────");
console.log(`  ✓ geprueft (Band/Seiten stimmen)   ${gepruft}`);
console.log(`  ~ plausibel (kein Band im Register) ${plausibel}`);
console.log(`  – offen (von Hand ansehen)          ${offen.length}`
  + (offen.length ? `  — ${offen.map(z => z.autor + " " + z.jahr).join(", ")}` : ""));
console.log(`  ✗ abweichend                        ${abweichend.length}`);
if (fehler.length) console.log(`  ! nicht geprueft (Abfragefehler)    ${fehler.length}`
  + `  — ${fehler.map(f => f.z.autor + " " + f.z.jahr).join(", ")}`);

if (abweichend.length) {
  console.log("\n  Nachsehen:");
  for (const a of abweichend) console.log(`    · ${a.z.autor} ${a.z.jahr} — ${a.z.text}`);
}
console.log('\n  Hinweis: "~" bestaetigt KEINE Seitenzahlen. Es heisst nur, dass das');
console.log('  Register dort keine nennt — es gab also nichts Hartes zu pruefen. Wer');
console.log('  ein Kurzzitat hart geprueft haben will, traegt Band und Seiten ein.');
process.exit(abweichend.length ? 1 : 0);
