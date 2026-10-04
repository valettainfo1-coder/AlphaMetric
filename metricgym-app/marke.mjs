/* Store-Icons und Startbilder aus dem ECHTEN Markenlogo erzeugen.
 *
 * Warum dieses Skript existiert: `npx cap add` legt seine eigenen Platzhalter
 * ab — das hellblaue Capacitor-Kreuz. Wer das uebersieht, laedt eine App
 * namens METRICGYM mit fremdem Logo in den Store. Statt die Bilder einmal von
 * Hand zu bauen, rendert dieses Skript sie aus `logoSVG()` in
 * ../metricgym-netlify/index.html — derselben Funktion, die das Logo in der
 * App zeichnet. Das Icon kann damit nicht vom Logo abweichen.
 *
 * Lauf:  node marke.mjs
 * Braucht: Chromium (Playwright). Danach ./sync.sh und neu bauen.
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const QUELLE = path.join(HIER, "..", "metricgym-netlify", "index.html");

/* ---------- 1 · Markencode aus der App holen (keine zweite Kopie) ---------- */
function markenCode() {
  const html = fs.readFileSync(QUELLE, "utf8");
  const von = html.indexOf("function spherePoints(");
  const bis = html.indexOf("function logoMark(");
  if (von < 0 || bis < 0 || bis <= von) {
    throw new Error("logoSVG/spherePoints in index.html nicht gefunden — Anker geaendert?");
  }
  const code = html.slice(von, bis);
  for (const noetig of ["spherePoints", "LOGO_RAMP", "logoSVG"]) {
    if (!code.includes(noetig)) throw new Error(`${noetig} fehlt im ausgeschnittenen Block`);
  }
  return code;
}

/* ---------- 2 · Winzige PNG-Werkzeuge ----------
   Apple weist Icons mit Alphakanal ab — auch wenn jedes Pixel deckend ist.
   Chromium liefert immer RGBA, also wird hier umgeschrieben.               */
function pngLesen(buf) {
  let i = 8, idat = [], w, h, ct, bd;
  while (i < buf.length) {
    const ln = buf.readUInt32BE(i), typ = buf.toString("latin1", i + 4, i + 8);
    if (typ === "IHDR") { w = buf.readUInt32BE(i + 8); h = buf.readUInt32BE(i + 12); bd = buf[i + 16]; ct = buf[i + 17]; }
    else if (typ === "IDAT") idat.push(buf.subarray(i + 8, i + 8 + ln));
    else if (typ === "IEND") break;
    i += 12 + ln;
  }
  if (bd !== 8) throw new Error("nur 8 bit je Kanal erwartet, bekam " + bd);
  const kan = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
  if (!kan) throw new Error("Farbtyp " + ct + " nicht unterstuetzt");
  const roh = zlib.inflateSync(Buffer.concat(idat));
  const bpp = kan, breite = w * bpp, px = Buffer.alloc(w * h * kan);
  let pos = 0, vor = Buffer.alloc(breite);
  for (let y = 0; y < h; y++) {
    const f = roh[pos++], z = Buffer.from(roh.subarray(pos, pos + breite)); pos += breite;
    for (let x = 0; x < breite; x++) {
      const a = x >= bpp ? z[x - bpp] : 0, b = vor[x], c = x >= bpp ? vor[x - bpp] : 0;
      if (f === 1) z[x] = (z[x] + a) & 255;
      else if (f === 2) z[x] = (z[x] + b) & 255;
      else if (f === 3) z[x] = (z[x] + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        z[x] = (z[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    z.copy(px, y * breite); vor = z;
  }
  return { w, h, kan, px };
}

function pngSchreiben(w, h, kan, px) {
  const ct = kan === 3 ? 2 : kan === 4 ? 6 : 0, breite = w * kan;
  const roh = Buffer.alloc(h * (breite + 1));
  for (let y = 0; y < h; y++) {               /* Filter 0: unverandert */
    roh[y * (breite + 1)] = 0;
    px.copy(roh, y * (breite + 1) + 1, y * breite, (y + 1) * breite);
  }
  const chunk = (typ, dat) => {
    const c = Buffer.concat([Buffer.from(typ, "latin1"), dat]);
    const out = Buffer.alloc(c.length + 8);
    out.writeUInt32BE(dat.length, 0); c.copy(out, 4);
    out.writeUInt32BE(zlib.crc32(c) >>> 0, c.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = ct;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(roh, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const alphaWeg = (buf) => {                    /* RGBA -> RGB, auf Schwarz gelegt */
  const { w, h, kan, px } = pngLesen(buf);
  if (kan === 3) return buf;
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0, o = 0; i < px.length; i += kan, o += 3) {
    const a = px[i + 3] / 255;
    out[o] = Math.round(px[i] * a); out[o + 1] = Math.round(px[i + 1] * a); out[o + 2] = Math.round(px[i + 2] * a);
  }
  return pngSchreiben(w, h, 3, out);
};

/* Misst, wie viel Prozent der Breite das Motiv einnimmt — damit die Groesse
   nachgewiesen und nicht geschaetzt ist. */
function motivAnteil(buf, schwelle = 90) {
  const { w, h, kan, px } = pngLesen(buf);
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * kan;
    const a = kan === 4 ? px[o + 3] / 255 : 1;
    const l = ((px[o] * 299 + px[o + 1] * 587 + px[o + 2] * 114) / 1000) * a;
    if (l > schwelle) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? 0 : ((x1 - x0 + 1) / w) * 100;
}

/* ---------- 3 · Bildaufbau ---------- */
const DUNKEL = "#070910";
const GRUND = `radial-gradient(circle at 46% 38%, #1B2537 0%, #0D1119 52%, ${DUNKEL} 100%)`;
const SCHEIN = (d) => `radial-gradient(circle, rgba(143,184,220,.30) 0%, rgba(90,107,180,.12) 45%, transparent 70%) center/${d}px ${d}px no-repeat`;

/* Punktzahl. Entschieden an gerenderten Mustern in den Groessen, in denen das
   Icon wirklich erscheint (60 / 90 / 140 px auf dem Startbildschirm), nicht an
   der 1024er Vorschau: 160 reisst bei 140 px Loecher in die Kugel, 200 wirkt
   in der Mitte hohl, 280 bleibt bei 60 px geschlossen und zeigt bei 140 px
   noch einzelne Punkte. Unter 120 px SVG-Kante wuerden 280 Punkte zu Brei —
   dort sind es 160. */
const punkte = (svgPx) => (svgPx < 120 ? 160 : 280);

/* Die Perspektive in spherePoints (persp = 1/(1.85 - z*0.55)) staucht die
   Kugel: ihre Silhouette ist nur ~55 % der viewBox, nicht 91 %, wie der Radius
   R = V*0.455 vermuten laesst. Wer die SVG auf 65 % der Flaeche setzt, bekommt
   also eine 36-%-Kugel. Dieser Faktor rechnet gewuenschte Kugelgroesse in
   SVG-Groesse um — gemessen, nicht geschaetzt. */
const SILHOUETTE = 0.55;
const svgGroesse = (flaeche, anteil) => Math.round((flaeche * anteil) / SILHOUETTE);

function seite({ breite, hoehe, kugel, grund, maske, schein, code }) {
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${breite}px;height:${hoehe}px;overflow:hidden;background:transparent}
    .platte{position:relative;width:${breite}px;height:${hoehe}px;display:grid;place-items:center;
      background:${grund};${maske ? maske : ""}}
    .schein{position:absolute;inset:0;background:${schein ? SCHEIN(schein) : "none"}}
    svg{position:relative;display:block;width:${kugel}px;height:${kugel}px}
  </style><div class="platte"><div class="schein"></div><i id="z"></i></div>
  <script>${code}</script>
  <script>
    document.getElementById("z").outerHTML=logoSVG(${kugel},${punkte(kugel)});
    /* Die gedrehte Kugel liegt nicht exakt mittig in ihrer viewBox. Statt den
       Versatz zu schaetzen, wird er gemessen und ausgeglichen — sonst sitzt
       das Icon sichtbar schief im Quadrat. */
    (function(){
      var v=document.querySelector(".platte svg"), p=document.querySelector(".platte").getBoundingClientRect();
      var x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
      v.querySelectorAll("circle").forEach(function(c,i){
        if(i===0 && c.getAttribute("fill").indexOf("url(")===0) return;   /* Glow-Kreis ueberspringen */
        var r=c.getBoundingClientRect();
        if(r.left<x0)x0=r.left; if(r.right>x1)x1=r.right;
        if(r.top<y0)y0=r.top;  if(r.bottom>y1)y1=r.bottom;
      });
      var dx=(p.left+p.width/2)-(x0+x1)/2, dy=(p.top+p.height/2)-(y0+y1)/2;
      v.style.transform="translate("+dx.toFixed(2)+"px,"+dy.toFixed(2)+"px)";
      window.__kugelBreite=(x1-x0)/p.width;
    })();
  </script>`;
}

/* ---------- 4 · Alle Ziele ---------- */
const IOS = path.join(HIER, "ios", "App", "App", "Assets.xcassets");
const DRO = path.join(HIER, "android", "app", "src", "main", "res");

/* Android-Startbilder: Breite x Hoehe je Ordner, wie von Capacitor angelegt. */
const SPLASH_DRO = [
  ["drawable", 480, 320], ["drawable-port-mdpi", 320, 480], ["drawable-port-hdpi", 480, 800],
  ["drawable-port-xhdpi", 720, 1280], ["drawable-port-xxhdpi", 960, 1600], ["drawable-port-xxxhdpi", 1280, 1920],
  ["drawable-land-mdpi", 480, 320], ["drawable-land-hdpi", 800, 480], ["drawable-land-xhdpi", 1280, 720],
  ["drawable-land-xxhdpi", 1600, 960], ["drawable-land-xxxhdpi", 1920, 1280],
];
const MIPMAP = [["mdpi", 48, 108], ["hdpi", 72, 162], ["xhdpi", 96, 216], ["xxhdpi", 144, 324], ["xxxhdpi", 192, 432]];

const lauf = async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const seiteObj = await browser.newPage();
  const code = markenCode();

  async function schuss({ datei, breite, hoehe, kugel, grund, maske, schein, ohneAlpha, messen }) {
    await seiteObj.setViewportSize({ width: breite, height: hoehe });
    await seiteObj.setContent(seite({ breite, hoehe, kugel, grund, maske, schein, code }), { waitUntil: "load" });
    const gezeichnet = await seiteObj.evaluate(() => document.querySelectorAll(".platte svg circle").length);
    if (gezeichnet < 50) throw new Error(`nur ${gezeichnet} Punkte gezeichnet — logoSVG hat nicht geliefert`);
    const kugelAnteil = await seiteObj.evaluate(() => window.__kugelBreite);
    let buf = await seiteObj.screenshot({ omitBackground: true, type: "png" });
    if (ohneAlpha) buf = alphaWeg(buf);
    fs.mkdirSync(path.dirname(datei), { recursive: true });
    fs.writeFileSync(datei, buf);
    const anteil = messen ? ` · Kugel ${(kugelAnteil * 100).toFixed(0)} % der Breite` : "";
    console.log(`  ${String(breite).padStart(4)}x${String(hoehe).padEnd(4)} ${path.relative(HIER, datei)}${anteil}`);
    return buf;
  }

  /* --- iOS App-Icon: randlos, deckend, OHNE Alphakanal --- */
  console.log("iOS App-Icon");
  await schuss({
    datei: path.join(IOS, "AppIcon.appiconset", "AppIcon-512@2x.png"),
    breite: 1024, hoehe: 1024, kugel: svgGroesse(1024, 0.65),
    grund: GRUND, schein: Math.round(1024 * 0.95), ohneAlpha: true, messen: true,
  });

  /* --- iOS Startbild ---
     Das Asset-Verzeichnis kennt 1x, 2x und 3x. Capacitors Vorlage legt in alle
     drei dasselbe 2732er Bild — 3 x 2,8 MB fuer ein Bild, das eine Zehntel-
     sekunde zu sehen ist. Richtig sind drei echte Groessen; die App wird damit
     rund 6 MB kleiner, ohne dass man auf irgendeinem Geraet einen Unterschied
     sieht (dunkler Verlauf mit kleiner Kugel). */
  console.log("iOS Startbild");
  for (const [datei, kante] of [
    ["splash-2732x2732-2.png", 911],    // 1x
    ["splash-2732x2732-1.png", 1366],   // 2x
    ["splash-2732x2732.png", 2732],     // 3x
  ]) {
    await schuss({
      datei: path.join(IOS, "Splash.imageset", datei),
      breite: kante, hoehe: kante, kugel: svgGroesse(kante, 0.26),
      grund: GRUND, schein: Math.round(kante * 0.6), ohneAlpha: true,
      messen: kante === 2732,
    });
  }

  /* --- Android: klassische Icons (vor API 26) --- */
  console.log("Android Icons");
  for (const [dichte, px] of MIPMAP) {
    const r = Math.round(px * 0.22);           /* abgerundetes Quadrat */
    await schuss({
      datei: path.join(DRO, `mipmap-${dichte}`, "ic_launcher.png"),
      breite: px, hoehe: px, kugel: svgGroesse(px, 0.65),
      grund: GRUND, schein: Math.round(px * 0.95), maske: `border-radius:${r}px;`,
    });
    await schuss({
      datei: path.join(DRO, `mipmap-${dichte}`, "ic_launcher_round.png"),
      breite: px, hoehe: px, kugel: svgGroesse(px, 0.65),
      grund: GRUND, schein: Math.round(px * 0.95), maske: "border-radius:50%;",
    });
  }

  /* --- Android: adaptives Vordergrundbild ---
     Die 108-dp-Flaeche wird vom System auf die mittleren 72 dp beschnitten
     (66 %). Die Kugel liegt bei 44 % der Gesamtflaeche, also sicher innen.
     Der Hintergrund ist eine eigene Ebene (@color/ic_launcher_background). */
  console.log("Android adaptives Vordergrundbild");
  for (const [dichte, , fg] of MIPMAP) {
    await schuss({
      datei: path.join(DRO, `mipmap-${dichte}`, "ic_launcher_foreground.png"),
      breite: fg, hoehe: fg, kugel: svgGroesse(fg, 0.44),
      grund: "transparent", schein: Math.round(fg * 0.85), messen: dichte === "xxxhdpi",
    });
  }

  /* --- Android Startbilder --- */
  console.log("Android Startbilder");
  for (const [ordner, b, h] of SPLASH_DRO) {
    await schuss({
      datei: path.join(DRO, ordner, "splash.png"),
      breite: b, hoehe: h, kugel: svgGroesse(Math.min(b, h), 0.26),
      grund: GRUND, schein: Math.round(Math.min(b, h) * 0.75), ohneAlpha: true,
    });
  }

  await browser.close();
  console.log("\n✓ fertig — jetzt ./sync.sh und neu bauen");
};

lauf().catch((e) => { console.error("✗", e.message); process.exit(1); });
