/* METRICGYM — Programmatischer SEO-Generator v3
   - Exaktes App-Design (Dark/Oura, Manrope+Fraunces, Blau-Gradient, Punkt-Logo)
   - Sauber zentriertes, responsives Layout
   - VIELE tiefenpsychologische CTAs + Sticky-CTA-Leiste → konsequent in die App / zum Abo
   - Interaktive Rechner (echte App-Formeln), Vergleichs- & Ratgeberseiten
   Rührt index.html / die App NICHT an. */
const fs = require("fs"); const path = require("path");
const ROOT = path.join(__dirname, "metricgym-netlify");
const DOMAIN = "https://metricgym.app";              // ← später echte Domain + neu generieren
const APP = "/";                                     // Ziel aller CTAs (die App)
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const FOODS = eval(html.match(/const FOODS=(\[[\s\S]*?\]);/)[1]);

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugify = s => String(s).toLowerCase().replace(/\(.*?\)/g, "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const r1 = n => Math.round(n * 10) / 10, ri = n => Math.round(n);
const mkdir = p => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
["kalorien", "rechner", "vergleich", "ratgeber"].forEach(d => mkdir(path.join(ROOT, d)));

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet">`;
const LOGO = `<svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><g fill="#C9D6EE"><circle cx="32" cy="32" r="3.2"/><circle cx="42" cy="32" r="3"/><circle cx="32" cy="42" r="2.6" opacity=".8"/><circle cx="22" cy="32" r="2.6" opacity=".7"/><circle cx="32" cy="22" r="2.8"/><circle cx="48" cy="32" r="2.4" fill="#90A8E4"/><circle cx="43" cy="43" r="2.4" fill="#AEC0E8"/><circle cx="32" cy="48" r="2.2" fill="#90A8E4" opacity=".7"/><circle cx="21" cy="43" r="2.2" fill="#AEC0E8" opacity=".6"/><circle cx="16" cy="32" r="2.2" fill="#90A8E4" opacity=".6"/><circle cx="21" cy="21" r="2.4" fill="#AEC0E8"/><circle cx="32" cy="16" r="2.4" fill="#C9D6EE"/><circle cx="43" cy="21" r="2.6" fill="#C9D6EE"/></g></svg>`;

const CSS = `
:root{--bg:#080A0F;--s2:#1A1D26;--s3:#262A36;--bd:rgba(255,255,255,.12);--hair:rgba(255,255,255,.07);
--t1:#EEF1F6;--t2:#9BA3B4;--t3:#646C7D;--accent:#4A6FD8;--hl:#9DB4F0;--good:#5BC48A;--warn:#E0A24A;
--surface:rgba(255,255,255,.045);--surface2:rgba(255,255,255,.08);
--fd:'Fraunces',Georgia,serif;--fu:'Manrope',system-ui,-apple-system,sans-serif;--es:cubic-bezier(.2,.8,.2,1)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:radial-gradient(130% 70% at 50% -8%,#141A2E,#0A0D16 58%,#080A0F);background-attachment:fixed;color:var(--t1);font-family:var(--fu);line-height:1.6;-webkit-font-smoothing:antialiased;padding-bottom:86px}
.wrap{max-width:560px;margin:0 auto;padding:24px 20px 40px}
a{color:var(--hl);text-decoration:none}
.brand{display:flex;align-items:center;justify-content:center;gap:9px;font-weight:800;letter-spacing:.5px;font-size:16px;margin:2px 0 26px}
.brand .w b{color:var(--hl)}
.crumb{font-size:12px;color:var(--t3);margin-bottom:14px;text-align:center}
h1{font-family:var(--fd);font-weight:600;font-size:30px;line-height:1.16;letter-spacing:-.01em;margin:0 0 12px;text-align:center}
h2{font-family:var(--fd);font-weight:600;font-size:21px;margin:36px 0 12px;text-align:center}
.sub{color:var(--t2);font-size:16px;margin:0 auto 20px;text-align:center;max-width:480px}
.tags{text-align:center;margin-bottom:18px}.tag{display:inline-block;background:var(--surface2);color:var(--hl);font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px;margin:0 4px 6px}
.big{display:flex;gap:12px;margin:0 auto 22px;max-width:420px}
.stat{flex:1;background:var(--surface);border:1px solid var(--bd);border-radius:18px;padding:16px 12px;text-align:center}
.stat .n{font-family:var(--fd);font-size:28px;font-weight:600}.stat.p .n{color:var(--hl)}.stat .l{font-size:12px;color:var(--t2);margin-top:3px}
table{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--bd);border-radius:18px;overflow:hidden;margin:0 0 20px}
th,td{padding:13px 18px;text-align:left;font-size:14.5px;border-bottom:1px solid var(--hair);word-break:break-word}
th{color:var(--t2);font-weight:600}td:last-child,th:last-child{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
tr:last-child td{border-bottom:none}
.note{color:var(--t2);font-size:15px;margin:0 auto 22px;text-align:center;max-width:500px}
.cta{display:block;text-align:center;background:linear-gradient(90deg,#9DB4F0,#4A6FD8);color:#0A0D16;font-weight:800;font-size:16px;padding:17px;border-radius:999px;margin:14px auto 8px;max-width:430px;box-shadow:0 12px 32px rgba(74,111,216,.42);transition:transform .15s}
.cta.ghost{background:transparent;color:var(--hl);border:1px solid var(--bd);box-shadow:none;font-size:15px;padding:14px}
.cta:active{transform:scale(.985)}
.cta-sub{text-align:center;color:var(--t3);font-size:12.5px;margin:0 auto 26px;max-width:430px}
.magic{position:relative;overflow:hidden;background:linear-gradient(160deg,rgba(157,180,240,.16),transparent 72%);border:1px solid rgba(157,180,240,.4);border-radius:22px;padding:24px 20px;margin:26px auto;max-width:470px;text-align:center}
.magic h3{font-family:var(--fd);font-weight:600;margin:0 0 10px;font-size:19px}.magic p{margin:0 0 8px;color:var(--t2);font-size:14.5px}
.orb{width:62px;height:62px;border-radius:50%;margin:0 auto 14px;background:radial-gradient(circle at 38% 30%,#C9D6EE,#4A6FD8 72%);box-shadow:0 8px 30px rgba(74,111,216,.55);animation:breathe 4.4s ease-in-out infinite}
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
.calc{background:var(--surface);border:1px solid var(--bd);border-radius:20px;padding:18px;margin:0 auto 16px;max-width:460px}
.fld{margin-bottom:14px}.fld label{display:block;font-size:13px;color:var(--t2);margin-bottom:6px;font-weight:600}
.calc input,.calc select{width:100%;padding:13px 14px;background:#0C0F18;border:1px solid var(--bd);border-radius:12px;color:var(--t1);font-size:15px;font-family:var(--fu)}
.seg{display:flex;gap:6px;flex-wrap:wrap}.seg button{flex:1;min-width:64px;padding:12px 8px;background:#0C0F18;border:1px solid var(--bd);border-radius:12px;color:var(--t1);font-size:14px;font-family:var(--fu);cursor:pointer}
.seg button.on{background:linear-gradient(90deg,#9DB4F0,#4A6FD8);color:#0A0D16;font-weight:800;border-color:transparent}
.res{display:none;background:linear-gradient(160deg,rgba(157,180,240,.14),transparent);border:1px solid rgba(157,180,240,.4);border-radius:18px;padding:22px 20px;margin:4px auto 16px;max-width:460px;text-align:center;animation:rise .5s var(--es) both}
.res.show{display:block}@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.res .hero-n{font-family:var(--fd);font-size:46px;font-weight:600;line-height:1;color:var(--hl)}
.res .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--hair);font-size:14px;text-align:left}.res .row:last-of-type{border:none}
.res table{margin:14px 0 0;text-align:left}
details{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:2px 18px;margin:0 auto 10px;max-width:520px}
summary{cursor:pointer;padding:13px 0;font-weight:600;font-size:15px;color:var(--t1)}details p{color:var(--t2);font-size:14px;margin:0 0 14px}
.foot{border-top:1px solid var(--hair);margin-top:34px;padding-top:18px;font-size:13px;color:var(--t3);text-align:center;max-width:520px;margin:34px auto 0}
.rel{columns:2;font-size:14px;max-width:520px;margin:0 auto}.rel a{display:block;padding:4px 0}
@media(max-width:430px){.rel{columns:1}h1{font-size:26px}}
.sticky{position:fixed;left:0;right:0;bottom:0;z-index:60;background:rgba(12,15,24,.9);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid var(--bd);padding:10px 14px calc(10px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:10px}
.sticky .t{flex:1;font-size:12.5px;color:var(--t2);line-height:1.32}.sticky .t b{color:var(--t1)}
.sticky a{flex-shrink:0;background:linear-gradient(90deg,#9DB4F0,#4A6FD8);color:#0A0D16;font-weight:800;font-size:14px;padding:12px 17px;border-radius:999px;white-space:nowrap}
@media(prefers-reduced-motion:reduce){.orb{animation:none}.res{animation:none}}
`;

// ---- Conversion-Bausteine (tiefenpsychologisch, ethisch) ----
const cta = (label, sub) => `<a class="cta" href="${APP}">${esc(label)}</a>${sub ? `<p class="cta-sub">${esc(sub)}</p>` : ""}`;
const topCTA = `<a class="cta" href="${APP}">Kostenlos starten — deine Vorhersage holen →</a><p class="cta-sub">In 60 Sek. startklar · kostenlos · Pro schaltet den vollen adaptiven Coach frei.</p>`;
const magicFuture = (line) => `<div class="magic"><div class="orb"></div>
  <h3>Dein Zukunfts-Ich — schon heute sichtbar</h3>
  <p>${line}</p>
  <p>METRICGYM ist kein Logbuch, sondern ein <b style="color:var(--t1)">adaptiver Coach</b>: der <b style="color:var(--t1)">Stoffwechsel-Zwilling</b> zeigt, wo du in 6 Wochen stehst, das <b style="color:var(--t1)">Kraft-Orakel</b> nennt das Datum deines nächsten Rekords.</p>
  <a class="cta" href="${APP}" style="margin-top:14px">Meinen Zwilling kostenlos aktivieren →</a></div>`;
const faqBlock = (items) => `<h2>Häufige Fragen</h2>` + items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("");
const faqLd = (items) => ({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": items.map(([q, a]) => ({ "@type": "Question", "name": q, "acceptedAnswer": { "@type": "Answer", "text": a.replace(/<[^>]+>/g, "") } })) });

function shell({ title, desc, canon, body, ld, js }) {
  const lds = [].concat(ld || []).filter(Boolean).map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("");
  return `<!doctype html><html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}"><meta property="og:image" content="${DOMAIN}/og-image.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${DOMAIN}/icon-192.png">${FONTS}${lds}
<style>${CSS}</style></head><body><div class="wrap">
<a class="brand" href="${APP}">${LOGO}<span class="w">METRIC<b>GYM</b></span></a>
${body}
<div class="foot"><p>Durchschnitts-/Schätzwerte, keine medizinische Beratung. Bei Vorerkrankungen ärztlich abklären. © METRICGYM</p>
<p style="margin-top:8px"><a href="/kalorien/">Kalorien-Datenbank</a> · <a href="/rechner/kalorienrechner.html">Kalorienrechner</a> · <a href="/rechner/proteinbedarf.html">Proteinbedarf</a> · <a href="/rechner/maximalkraft-rechner.html">1RM-Rechner</a> · <a href="/vergleich/myfitnesspal-alternative.html">MyFitnessPal-Alternative</a></p></div>
</div>
<div class="sticky"><div class="t"><b>Hol dir deine Vorhersage.</b> Zwilling & Kraft-Orakel — kostenlos.</div><a href="${APP}">App öffnen →</a></div>
${js ? `<script>${js}</script>` : ""}</body></html>`;
}

const pages = [];

// ================= LEBENSMITTEL-SEITEN =================
const seen = {};
const foods = FOODS.map(f => { let s = slugify(f[0]); if (seen[s]) s += "-" + (seen[f[0]] = (seen[f[0]] || 1) + 1); seen[s] = 1; return { f, s, name: f[0].replace(/\s*\(.*?\)\s*/g, "").trim() }; });
foods.forEach(({ f, s, name }) => {
  const [, ref, kcal, p, c, fat] = f;
  const k100 = ri(kcal * 100 / ref), p100 = r1(p * 100 / ref), c100 = r1(c * 100 / ref), f100 = r1(fat * 100 / ref);
  const ppk = k100 > 0 ? r1(p100 / k100 * 100) : 0;
  const canon = `${DOMAIN}/kalorien/${s}.html`;
  const title = `Kalorien & Protein in ${name} (pro 100 g) | METRICGYM`;
  const desc = `${name}: ${k100} kcal, ${p100} g Eiweiß, ${c100} g Kohlenhydrate, ${f100} g Fett pro 100 g. In 10 Sek. loggen mit METRICGYM.`;
  let insight = `100 g ${name} liefern <b>${k100} kcal</b> mit <b>${p100} g Eiweiß</b>, ${c100} g Kohlenhydraten und ${f100} g Fett.`;
  insight += ppk >= 12 ? ` Mit ${ppk} g Eiweiß je 100 kcal ist ${name} besonders <b>proteindicht</b> — top im Muskelaufbau und im Defizit.` : c100 >= 25 ? ` ${name} ist primär eine Kohlenhydrat-Quelle — ideal als Energie rund ums Training.` : f100 >= 17 ? ` ${name} ist fettreich und energiedicht — kleine Portionen genügen.` : ` Eine ausgewogene Wahl für viele Tagesziele.`;
  const faqs = [
    [`Wie viele Kalorien hat ${name}?`, `${name} hat etwa <b>${k100} kcal pro 100 g</b>.`],
    [`Wie viel Eiweiß hat ${name}?`, `${name} liefert rund <b>${p100} g Eiweiß pro 100 g</b> (${ppk} g je 100 kcal).`],
    [`Passt ${name} in meine Ernährung?`, `Das hängt von deinem Tagesziel ab. METRICGYM rechnet dein persönliches Kalorien- und Proteinziel und sagt dir in Echtzeit, ob ${name} heute reinpasst — kostenlos.`],
  ];
  const body = `<div class="crumb"><a href="/kalorien/">Kalorien-Datenbank</a> › ${esc(name)}</div>
<h1>Kalorien & Protein in ${esc(name)}</h1>
<p class="sub">Nährwerte pro 100 g — und die eigentliche Frage: <i>Passt das in dein Ziel?</i></p>
${topCTA}
<div class="big"><div class="stat"><div class="n">${k100}</div><div class="l">kcal / 100 g</div></div><div class="stat p"><div class="n">${p100} g</div><div class="l">Eiweiß / 100 g</div></div></div>
<table><tr><th>Nährwert (pro 100 g)</th><th>Menge</th></tr>
<tr><td>Kalorien</td><td>${k100} kcal</td></tr><tr><td>Eiweiß</td><td>${p100} g</td></tr><tr><td>Kohlenhydrate</td><td>${c100} g</td></tr><tr><td>Fett</td><td>${f100} g</td></tr><tr><td>Eiweiß je 100 kcal</td><td>${ppk} g</td></tr></table>
<p class="note">${insight}</p>
${cta(`${name} in 10 Sekunden loggen →`, "Sprich oder tippe — die Engine erkennt das Lebensmittel und rechnet Kalorien & Makros automatisch.")}
${magicFuture(`Du weißt jetzt, was 100 g ${esc(name)} liefern. Wichtiger: Wie viel brauchst <b style="color:var(--t1)">du</b> heute — und kommst du deinem Ziel näher?`)}
${faqBlock(faqs)}
<p style="text-align:center;margin-top:18px"><a href="/kalorien/">← Alle Lebensmittel</a></p>`;
  pages.push({ p: `kalorien/${s}.html`, html: shell({ title, desc, canon, body, ld: [{ "@context": "https://schema.org", "@type": "Article", "headline": `Kalorien & Protein in ${name}`, "description": desc, "mainEntityOfPage": canon, "publisher": { "@type": "Organization", "name": "METRICGYM" } }, faqLd(faqs)] }) });
});
const hubLinks = foods.slice().sort((a, b) => a.name.localeCompare(b.name, "de")).map(e => `<a href="/kalorien/${e.s}.html">${esc(e.name)}</a>`).join("");
pages.push({ p: `kalorien/index.html`, html: shell({ title: `Kalorien-Datenbank: ${foods.length} Lebensmittel | METRICGYM`, desc: `Kalorien, Eiweiß, Kohlenhydrate & Fett für ${foods.length} Lebensmittel pro 100 g. Schnell nachschlagen und in 10 Sek. loggen.`, canon: `${DOMAIN}/kalorien/`, body: `<h1>Kalorien-Datenbank</h1><p class="sub">Nährwerte von ${foods.length} Lebensmitteln pro 100 g.</p>${topCTA}<div class="rel">${hubLinks}</div>${cta("Adaptiven Coach kostenlos starten →", "Sprach-Logging, adaptives Kalorienziel & Stoffwechsel-Zwilling.")}` }) });

// ================= RECHNER =================
function calcPage(slug, title, desc, h1, sub, formHTML, resHTML, magicLine, ctaLabel, ctaSub, js, faqs) {
  const canon = `${DOMAIN}/rechner/${slug}.html`;
  const body = `<div class="crumb"><a href="/rechner/">Rechner</a> › ${esc(h1)}</div>
<h1>${esc(h1)}</h1><p class="sub">${esc(sub)}</p>
<div class="calc">${formHTML}<a class="cta" id="go" style="cursor:pointer;margin-top:4px">Jetzt berechnen</a></div>
<div class="res" id="res">${resHTML}<a class="cta" href="${APP}" style="margin-top:16px">${esc(ctaLabel)} →</a><p class="cta-sub" style="margin-bottom:0">${esc(ctaSub)}</p></div>
${magicFuture(magicLine)}
${cta(ctaLabel + " →", ctaSub)}
${faqBlock(faqs)}`;
  pages.push({ p: `rechner/${slug}.html`, html: shell({ title: title + " | METRICGYM", desc, canon, body, js, ld: faqLd(faqs) }) });
}

calcPage("kalorienrechner",
  "Kalorienrechner: Tagesbedarf & Abnehm-Kalorien berechnen", "Kostenloser Kalorienrechner (Mifflin-St Jeor): Erhaltungsbedarf, Abnehm- & Aufbau-Kalorien + Eiweißbedarf in 10 Sekunden. Ohne Anmeldung.",
  "Kalorienrechner: Dein Tagesbedarf in 10 Sekunden", "Erhaltungsbedarf, Abnehm- und Aufbau-Kalorien — wissenschaftlich (Mifflin-St Jeor), kostenlos.",
  `<div class="fld"><label>Geschlecht</label><div class="seg" id="sex"><button data-v="male" class="on">Männlich</button><button data-v="female">Weiblich</button></div></div>
   <div class="fld"><label>Alter</label><input id="age" type="number" inputmode="numeric" value="29"></div>
   <div class="fld"><label>Größe (cm)</label><input id="ht" type="number" inputmode="numeric" value="180"></div>
   <div class="fld"><label>Gewicht (kg)</label><input id="wt" type="number" inputmode="decimal" value="80"></div>
   <div class="fld"><label>Aktivität</label><select id="act"><option value="1.2">Sitzend (kaum Bewegung)</option><option value="1.3" selected>Leicht aktiv (1–2×/Woche)</option><option value="1.4">Moderat (3–4×/Woche)</option><option value="1.475">Aktiv (5–6×/Woche)</option><option value="1.55">Sehr aktiv</option></select></div>
   <div class="fld"><label>Ziel</label><div class="seg" id="goal"><button data-v="-0.2" class="on">Abnehmen</button><button data-v="0">Halten</button><button data-v="0.1">Aufbauen</button></div></div>`,
  `<p style="color:var(--t2);font-size:13px;margin:0 0 4px">Dein Tagesziel</p><div class="hero-n"><span id="rk">0</span> kcal</div>
   <div style="margin-top:14px;text-align:left"><div class="row"><span>Erhaltungsbedarf (TDEE)</span><span id="rm">0 kcal</span></div><div class="row"><span>Empfohlenes Eiweiß</span><span id="rp">0 g</span></div><div class="row"><span>Grundumsatz (BMR)</span><span id="rb">0 kcal</span></div></div>`,
  `Das ist dein <b style="color:var(--t1)">Startwert</b>. Sobald du loggst, lernt der Zwilling deinen <i>echten</i> Bedarf — und zeigt, wo du in 6 Wochen stehst.`,
  "Mein adaptives Ziel kostenlos aktivieren", "Der Rechner gibt den Durchschnitt. Die App gibt dir DEINEN Wert — und passt ihn automatisch an.",
  `(function(){var sx="male",gl=-0.2;function seg(id,cb){var w=document.getElementById(id);w.querySelectorAll("button").forEach(function(b){b.onclick=function(){w.querySelectorAll("button").forEach(function(x){x.classList.remove("on")});b.classList.add("on");cb(b.getAttribute("data-v"));};});}seg("sex",function(v){sx=v;});seg("goal",function(v){gl=parseFloat(v);});document.getElementById("go").onclick=function(){var age=+document.getElementById("age").value||29,h=+document.getElementById("ht").value||180,w=+document.getElementById("wt").value||80,act=+document.getElementById("act").value||1.3;var bmr=Math.round(10*w+6.25*h-5*age+(sx==="male"?5:-161));var tdee=Math.round(bmr*act);var target=Math.round(tdee*(1+gl));var prot=Math.round((gl<0?2.4:2.0)*w);document.getElementById("rb").textContent=bmr+" kcal";document.getElementById("rm").textContent=tdee+" kcal";document.getElementById("rp").textContent=prot+" g";document.getElementById("res").classList.add("show");var el=document.getElementById("rk"),t0=performance.now();(function tk(n){var k=Math.min(1,(n-t0)/700),e=1-Math.pow(1-k,3);el.textContent=Math.round(target*e);if(k<1)requestAnimationFrame(tk);})(t0);try{document.getElementById("res").scrollIntoView({behavior:"smooth",block:"center"});}catch(e){}};})();`,
  [["Wie genau ist der Kalorienrechner?", "Er nutzt die Mifflin-St-Jeor-Formel — ein sehr guter Startwert. Dein <b>echter</b> Bedarf hängt von Genetik & Anpassung ab. Genau hier kalibriert sich METRICGYM an deiner realen Gewichtskurve."], ["Wie viele Kalorien zum Abnehmen?", "Ein moderates Defizit von ~15–20 % unter Erhaltungsbedarf. Die App passt es automatisch an, wenn dein Gewicht sinkt."], ["Warum stagniere ich trotz Rechner?", "Weil ein statischer Wert deinen sinkenden Bedarf ignoriert. Adaptive Anpassung löst genau das."]]);

calcPage("proteinbedarf",
  "Proteinbedarf-Rechner: Wie viel Eiweiß pro Tag?", "Berechne deinen täglichen Proteinbedarf für Muskelaufbau, Cut oder Erhalt — wissenschaftlich, kostenlos, in 10 Sekunden.",
  "Proteinbedarf: Wie viel Eiweiß brauchst du?", "Dein täglicher Eiweißbedarf für Muskelaufbau, Definition oder Erhalt.",
  `<div class="fld"><label>Gewicht (kg)</label><input id="wt" type="number" inputmode="decimal" value="80"></div>
   <div class="fld"><label>Ziel</label><div class="seg" id="goal"><button data-v="2.0" class="on">Muskelaufbau</button><button data-v="2.4">Definition</button><button data-v="1.6">Erhalt</button></div></div>`,
  `<p style="color:var(--t2);font-size:13px;margin:0 0 4px">Dein Tagesbedarf</p><div class="hero-n"><span id="rp">0</span> g</div>
   <div style="margin-top:14px;text-align:left"><div class="row"><span>Pro Mahlzeit (4×)</span><span id="rm">0 g</span></div><div class="row"><span>Entspricht ca.</span><span id="re">–</span></div></div>`,
  `Den Wert kennst du jetzt. Die Kunst ist, ihn <b style="color:var(--t1)">jeden Tag</b> zu treffen — ohne Rechnen. Genau das macht METRICGYM: Mahlzeit einsprechen, Protein-Tracking läuft.`,
  "Protein automatisch tracken", "Magic-Log erkennt deine Mahlzeit und zeigt live, wie viel Eiweiß dir heute noch fehlt.",
  `(function(){var g=2.0;var w=document.getElementById("goal");w.querySelectorAll("button").forEach(function(b){b.onclick=function(){w.querySelectorAll("button").forEach(function(x){x.classList.remove("on")});b.classList.add("on");g=parseFloat(b.getAttribute("data-v"));};});document.getElementById("go").onclick=function(){var wt=+document.getElementById("wt").value||80;var prot=Math.round(g*wt);document.getElementById("rm").textContent=Math.round(prot/4)+" g";document.getElementById("re").textContent=Math.round(prot/31*100)+" g Hähnchenbrust";document.getElementById("res").classList.add("show");var el=document.getElementById("rp"),t0=performance.now();(function tk(n){var k=Math.min(1,(n-t0)/700),e=1-Math.pow(1-k,3);el.textContent=Math.round(prot*e);if(k<1)requestAnimationFrame(tk);})(t0);try{document.getElementById("res").scrollIntoView({behavior:"smooth",block:"center"});}catch(e){}};})();`,
  [["Wie viel Protein pro Tag?", "Für Muskelaufbau & im Defizit ca. <b>1,8–2,4 g pro kg Körpergewicht</b>."], ["Auf wie viele Mahlzeiten?", "20–40 g pro Mahlzeit, gleichmäßig verteilt (Morton et al., 2018). METRICGYM trackt das automatisch."], ["Zu viel Protein schädlich?", "Bei Gesunden unbedenklich. Bei Nierenerkrankungen vorher ärztlich abklären."]]);

calcPage("maximalkraft-rechner",
  "1RM-Rechner: Maximalkraft (One-Rep-Max) berechnen", "Berechne dein 1RM mit der Epley-Formel aus einem normalen Satz — plus Trainingsgewichte für 70–95 %. Kostenlos.",
  "1RM-Rechner: Deine Maximalkraft schätzen", "Berechne dein One-Rep-Max (Epley) aus einem normalen Satz — ohne Maximalversuch.",
  `<div class="fld"><label>Gewicht (kg)</label><input id="wt" type="number" inputmode="decimal" value="80"></div>
   <div class="fld"><label>Wiederholungen</label><input id="rp" type="number" inputmode="numeric" value="8"></div>`,
  `<p style="color:var(--t2);font-size:13px;margin:0 0 4px">Geschätztes 1RM</p><div class="hero-n"><span id="r1">0</span> kg</div>
   <table><tr><th>Intensität</th><th>Gewicht</th></tr><tr><td>95 %</td><td id="p95">–</td></tr><tr><td>90 %</td><td id="p90">–</td></tr><tr><td>80 %</td><td id="p80">–</td></tr><tr><td>70 %</td><td id="p70">–</td></tr></table>`,
  `Dein 1RM ist eine Momentaufnahme. METRICGYM verfolgt es bei <b style="color:var(--t1)">jedem</b> Satz automatisch — und das Kraft-Orakel nennt das <b style="color:var(--t1)">Datum</b> deines nächsten Rekords.`,
  "Kraftkurve automatisch tracken", "Kein Maximalversuch nötig — die App schätzt dein 1RM aus jedem Satz und feiert jeden Rekord.",
  `(function(){document.getElementById("go").onclick=function(){var w=+document.getElementById("wt").value||80,r=+document.getElementById("rp").value||8;var orm=w*(1+r/30);function P(x){return Math.round(orm*x/2.5)*2.5+" kg";}document.getElementById("p95").textContent=P(.95);document.getElementById("p90").textContent=P(.90);document.getElementById("p80").textContent=P(.80);document.getElementById("p70").textContent=P(.70);document.getElementById("res").classList.add("show");var el=document.getElementById("r1"),t=Math.round(orm),t0=performance.now();(function tk(n){var k=Math.min(1,(n-t0)/700),e=1-Math.pow(1-k,3);el.textContent=Math.round(t*e);if(k<1)requestAnimationFrame(tk);})(t0);try{document.getElementById("res").scrollIntoView({behavior:"smooth",block:"center"});}catch(e){}};})();`,
  [["Wie wird das 1RM berechnet?", "Epley-Formel: 1RM = Gewicht × (1 + Wdh ÷ 30)."], ["Wofür brauche ich mein 1RM?", "Um Gewichte prozentual zu steuern. METRICGYM berechnet es automatisch aus jedem Satz und nennt das Datum deines nächsten Rekords."], ["Wie oft 1RM testen?", "Nie nötig — die App schätzt es laufend aus normalen Sätzen."]]);

pages.push({ p: `rechner/index.html`, html: shell({ title: "Fitness-Rechner: Kalorien, Protein & 1RM | METRICGYM", desc: "Kostenlose Rechner für Kalorienbedarf, Proteinbedarf und Maximalkraft — wissenschaftlich, ohne Anmeldung.", canon: `${DOMAIN}/rechner/`, body: `<h1>Fitness-Rechner</h1><p class="sub">Wissenschaftlich, kostenlos, in 10 Sekunden.</p>${topCTA}<div class="rel"><a href="/rechner/kalorienrechner.html">Kalorienrechner (Tagesbedarf)</a><a href="/rechner/proteinbedarf.html">Proteinbedarf-Rechner</a><a href="/rechner/maximalkraft-rechner.html">1RM / Maximalkraft</a></div>` }) });

// ================= VERGLEICH =================
function altPage(slug, comp, title, desc, intro, rows) {
  const canon = `${DOMAIN}/vergleich/${slug}.html`;
  const faqs = [[`Ist METRICGYM eine gute ${comp}-Alternative?`, `Ja — besonders, wenn du mehr willst als ein Logbuch. METRICGYM <b>passt deinen Plan adaptiv an</b> und prognostiziert deinen Fortschritt.`], [`Ist METRICGYM kostenlos?`, `Der Kern ist kostenlos. Pro schaltet den vollen adaptiven Coach frei.`], [`Kann ich von ${comp} wechseln?`, `Ja, in 2 Minuten — Onboarding, dann sofort loggen.`]];
  const body = `<div class="crumb"><a href="/vergleich/${slug}.html">Vergleich</a> › ${esc(comp)}-Alternative</div>
<h1>${esc(title)}</h1><p class="sub">${esc(intro)}</p>${topCTA}
<table><tr><th>Funktion</th><th>${esc(comp)}</th><th>METRICGYM</th></tr>${rows.map(([f, a, b]) => `<tr><td>${esc(f)}</td><td>${esc(a)}</td><td style="color:var(--good);font-weight:700">${esc(b)}</td></tr>`).join("")}</table>
${cta("Kostenlos zu METRICGYM wechseln →", "In 2 Minuten startklar — adaptiver Coach statt reinem Logbuch.")}
${magicFuture(`Tracker zeigen dir die <b style="color:var(--t1)">Vergangenheit</b>. METRICGYM zeigt dir die <b style="color:var(--t1)">Zukunft</b>: wo du in 6 Wochen stehst und wann du deinen nächsten Rekord knackst.`)}
${faqBlock(faqs)}`;
  pages.push({ p: `vergleich/${slug}.html`, html: shell({ title: title + " | METRICGYM", desc, canon, body, ld: faqLd(faqs) }) });
}
altPage("myfitnesspal-alternative", "MyFitnessPal", "MyFitnessPal Alternative (kostenlos & adaptiv)", "Die beste MyFitnessPal-Alternative: adaptiver Coach statt reinem Tracker, Sprach-Logging & Fortschritts-Prognose. Kostenlos.", "Tracken wie bei MyFitnessPal — aber endlich Fortschritt sehen statt nur Zahlen? Genau dafür ist METRICGYM gebaut.", [["Ernährungs-Logging", "Ja", "Ja — per Sprache in 10 Sek."], ["Adaptives Kalorienziel", "Nein", "Ja — lernt deinen Stoffwechsel"], ["Adaptiver Trainingsplan", "Nein", "Ja"], ["Fortschritts-Prognose", "Nein", "Ja — Zwilling & Orakel"], ["Kernfunktionen kostenlos", "Eingeschränkt", "Ja"]]);
altPage("yazio-alternative", "Yazio", "Yazio Alternative: adaptiver Coach statt Kalorienzähler", "Die starke Yazio-Alternative: nicht nur Kalorien zählen, sondern ein adaptiver Trainings- & Ernährungs-Coach mit Prognose. Kostenlos starten.", "Yazio zählt Kalorien. METRICGYM macht daraus einen Coach, der Training, Ernährung & Fortschritt zusammendenkt.", [["Kalorien & Makros", "Ja", "Ja"], ["Sprach-/Schnell-Logging", "Teilweise", "Ja — Magic-Log"], ["Adaptiver Trainingsplan", "Nein", "Ja"], ["Stoffwechsel-Zwilling", "Nein", "Ja"], ["Kraft-Orakel (Rekord-Datum)", "Nein", "Ja"]]);

// ================= RATGEBER =================
{
  const slug = "wie-viel-protein-am-tag", canon = `${DOMAIN}/ratgeber/${slug}.html`;
  const faqs = [["Reicht pflanzliches Protein?", "Ja, mit etwas mehr Menge & Vielfalt. METRICGYM trackt die Quelle mit."], ["Brauche ich Shakes?", "Nein — sie sind nur bequem. Echte Lebensmittel reichen."]];
  const body = `<div class="crumb"><a href="/ratgeber/${slug}.html">Ratgeber</a> › Protein pro Tag</div>
<h1>Wie viel Protein am Tag brauchst du wirklich?</h1><p class="sub">Kurz: 1,6–2,2 g pro kg Körpergewicht — je nach Ziel. Hier die ehrliche Langversion.</p>${topCTA}
<h2>Empfehlung nach Ziel</h2><table><tr><th>Ziel</th><th>Protein pro kg</th></tr><tr><td>Muskelaufbau</td><td>1,8–2,2 g</td></tr><tr><td>Definition / Cut</td><td>2,2–2,4 g</td></tr><tr><td>Erhalt</td><td>1,4–1,6 g</td></tr></table>
<p class="note">Beispiel: 80 kg im Aufbau → ~160 g Eiweiß/Tag, auf 4 Mahlzeiten à ~40 g. Belege: Morton 2018; Helms 2014.</p>
${cta("Mein Proteinziel automatisch tracken →", "METRICGYM rechnet dein Ziel und zeigt live, wie viel dir heute noch fehlt.")}
${magicFuture(`Wissen ist Schritt 1. Umsetzung Schritt 2 — und genau da scheitern die meisten an fehlender Anpassung. METRICGYM nimmt dir das ab.`)}
${faqBlock(faqs)}`;
  pages.push({ p: `ratgeber/${slug}.html`, html: shell({ title: "Wie viel Protein am Tag? (Tabelle & Rechner) | METRICGYM", desc: "Wie viel Eiweiß pro Tag für Muskelaufbau & Abnehmen? Empfehlung pro kg + Beispiele + kostenloser Rechner.", canon, body, ld: faqLd(faqs) }) });
}

// ---- Schreiben ----
pages.forEach(pg => fs.writeFileSync(path.join(ROOT, pg.p), pg.html));
const urls = [`${DOMAIN}/`, ...pages.map(pg => `${DOMAIN}/${pg.p.replace(/index\.html$/, "")}`)];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(urls)].map(u => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${DOMAIN}/sitemap.xml\n`);
console.log(`✓ ${pages.length} Seiten (App-Design, zentriert, viele CTAs + Sticky-Bar) · sitemap ${[...new Set(urls)].length} URLs`);
