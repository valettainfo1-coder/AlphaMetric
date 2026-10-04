/* Tests für die Apple-Belegprüfung.
 *
 * Was hier bewiesen wird: ein Beleg, den NICHT Apple signiert hat, schaltet
 * nichts frei. Dafür wird eine echte, aber FREMDE Zertifikatskette gebaut
 * (Wurzel P-384 selbstsigniert, Zwischenstelle und Blatt P-256, mit openssl)
 * und ein echtes JWS damit signiert. Die Prüfung muss das annehmen, wenn man
 * ihr diese Wurzel als vertraut übergibt — und ablehnen, sobald Apples echte
 * Wurzel verlangt wird. Nur so ist gezeigt, dass die Kette wirklich geprüft
 * wird und nicht bloß die Nutzlast dekodiert.
 *
 * Lauf:  node --experimental-strip-types apple.test.mjs [Pfad-zur-Kette]
 * Die Kette erzeugt ../../../tests/apple-kette.sh
 */
import fs from "node:fs";
import path from "node:path";

const KETTE = process.argv[2]
  || path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..", ".kette");
if (!fs.existsSync(path.join(KETTE, "leaf.der"))) {
  console.error(`✗ Testkette fehlt in ${KETTE}\n  Erst erzeugen: tests/apple-kette.sh "${KETTE}"`);
  process.exit(2);
}

/* Deno-Nachbau: die Bibliothek liest nur Deno.env. */
globalThis.Deno = { env: { get: (k) => process.env[k] } };

const { jwsPruefen, WURZEL, zeileAus, stufeVon, umgebungOk, statusAus } =
  await import("./apple.ts");

const lies = (n) => new Uint8Array(fs.readFileSync(path.join(KETTE, n)));
const b64 = (u8) => Buffer.from(u8).toString("base64");
const b64url = (u8) => b64(u8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const ROOT = lies("root.der"), MID = lies("mid.der"), LEAF = lies("leaf.der");
const LEAF_EVIL = lies("leaf-evil.der"), EVIL = lies("evil.der");

async function signierer(p8Datei) {
  const key = await crypto.subtle.importKey(
    "pkcs8", lies(p8Datei), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return async (daten) => new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, daten));
}

const NUTZLAST = {
  bundleId: "de.metricgym.app",
  productId: "de.metricgym.pro.monthly",
  transactionId: "2000000999888777",
  originalTransactionId: "2000000111222333",
  appAccountToken: "11111111-1111-1111-1111-111111111111",
  purchaseDate: Date.now() - 60_000,
  expiresDate: Date.now() + 30 * 86400_000,
  type: "Auto-Renewable Subscription",
  environment: "Production",
};

async function baueJWS({ kette = [LEAF, MID, ROOT], nutzlast = NUTZLAST, alg = "ES256",
  schluessel = "leaf.p8", kaputtmachen = null } = {}) {
  const kopf = { alg, x5c: kette.map(b64) };
  const k = b64url(new TextEncoder().encode(JSON.stringify(kopf)));
  const n = b64url(new TextEncoder().encode(JSON.stringify(nutzlast)));
  const sig = await (await signierer(schluessel))(new TextEncoder().encode(`${k}.${n}`));
  let jws = `${k}.${n}.${b64url(sig)}`;
  if (kaputtmachen) jws = kaputtmachen(jws, { k, n, sig });
  return jws;
}

let ok = 0, schlecht = 0;
const pruefe = (name, bedingung, zusatz = "") => {
  if (bedingung) { ok++; console.log(`✓ ${name}${zusatz ? " — " + zusatz : ""}`); }
  else { schlecht++; console.log(`✗ ${name}${zusatz ? " — " + zusatz : ""}`); }
};
async function wirftMit(name, fn, teilDerMeldung) {
  try { await fn(); pruefe(name, false, "kein Fehler geworfen — DURCHGELASSEN"); }
  catch (e) {
    pruefe(name, String(e.message).includes(teilDerMeldung),
      `"${String(e.message).slice(0, 72)}"`);
  }
}

console.log("── Kette wird wirklich geprüft ──");

/* 1 · Gültige Kette gegen DIESE Wurzel: muss durchgehen. Sonst beweist keiner
      der Ablehnungs-Tests etwas — sie könnten alle aus dem falschen Grund
      scheitern. */
const gut = await baueJWS();
let t = null;
try { t = await jwsPruefen(gut, ROOT); } catch (e) { console.log("  (Fehler: " + e.message + ")"); }
pruefe("gültige Kette + passende Wurzel wird angenommen",
  t && t.productId === "de.metricgym.pro.monthly", t ? `productId=${t.productId}` : "abgelehnt");

/* 2 · Dieselbe gültige Kette, aber Apples echte Wurzel verlangt. */
await wirftMit("dieselbe Kette gegen Apples echte Wurzel wird abgelehnt",
  () => jwsPruefen(gut), "fremdes Wurzelzertifikat");

/* 3 · Nutzlast nachträglich geändert, Signatur unverändert. */
const gefaelscht = b64url(new TextEncoder().encode(JSON.stringify(
  { ...NUTZLAST, productId: "de.metricgym.elite.yearly" })));
await wirftMit("veränderte Nutzlast wird abgelehnt",
  () => jwsPruefen(gut.split(".")[0] + "." + gefaelscht + "." + gut.split(".")[2], ROOT),
  "Signatur passt nicht");

/* 4 · Blatt von einer fremden CA signiert, Wurzel aber angehängt. */
await wirftMit("Blatt einer fremden CA wird abgelehnt",
  async () => jwsPruefen(await baueJWS({ kette: [LEAF_EVIL, EVIL, ROOT] }), ROOT), "Kette bricht");

/* 5 · Nur Blatt und Wurzel, Zwischenstelle weggelassen. */
await wirftMit("fehlende Zwischenstelle wird abgelehnt",
  async () => jwsPruefen(await baueJWS({ kette: [LEAF, ROOT] }), ROOT), "Kette bricht");

/* 6 · Signatur von einem anderen Schlüssel als dem im Blatt. */
await wirftMit("Signatur mit fremdem Schlüssel wird abgelehnt",
  async () => jwsPruefen(await baueJWS({ schluessel: "evil.p8" }), ROOT), "Signatur passt nicht");

/* 7 · "alg":"none" — der klassische JWT-Angriff. */
await wirftMit('"alg":"none" wird abgelehnt',
  async () => jwsPruefen(await baueJWS({ alg: "none" }), ROOT), "unerwartetes Verfahren");

/* 8 · Kette ganz weggelassen. */
await wirftMit("Beleg ohne Zertifikatskette wird abgelehnt",
  async () => jwsPruefen(await baueJWS({ kette: [] }), ROOT), "Zertifikatskette fehlt");

/* 9 · Zeitliche Gültigkeit: dieselbe Kette, aber die Uhr steht 2040. */
const echteZeit = Date.now;
Date.now = () => Date.UTC(2040, 0, 1);
await wirftMit("abgelaufenes Zertifikat wird abgelehnt",
  () => jwsPruefen(gut, ROOT), "zeitlich ungültig");
Date.now = echteZeit;

console.log("\n── Nutzlast wird richtig ausgewertet ──");

pruefe("unbekanntes Produkt schaltet nichts frei", stufeVon("de.fremd.app.pro") === null);
pruefe("bekannte Produkte ergeben die richtige Stufe",
  stufeVon("de.metricgym.pro.yearly") === "pro" && stufeVon("de.metricgym.elite.monthly") === "elite");

if (!t) { console.log("✗ Nutzlast-Tests übersprungen: die Prüfung hat den gültigen Beleg abgelehnt"); process.exit(1); }
const z = zeileAus(t, "11111111-1111-1111-1111-111111111111");
pruefe("laufendes Abo ergibt status=active", z.status === "active" && z.tier === "pro",
  `${z.tier}/${z.status}`);
pruefe("Apple-Kennung landet in der Zeile",
  z.apple_original_transaction_id === "2000000111222333" && z.source === "apple");

const zurueck = zeileAus({ ...t, revocationDate: Date.now() - 1000 }, "u");
pruefe("Rückerstattung beendet den Anspruch", zurueck.status === "canceled", zurueck.status);

const abgelaufen = zeileAus({ ...t, expiresDate: Date.now() - 1000 }, "u");
pruefe("abgelaufenes Abo beendet den Anspruch", abgelaufen.status === "canceled", abgelaufen.status);

let geworfen = false;
try { zeileAus({ ...t, productId: "de.fremd.app" }, "u"); } catch { geworfen = true; }
pruefe("fremdes Produkt wirft statt stillschweigend 'pro' zu geben", geworfen);

delete process.env.APPLE_ALLOW_SANDBOX;
pruefe("Sandbox-Beleg wird in Produktion abgelehnt", umgebungOk({ environment: "Sandbox" }) === false);
process.env.APPLE_ALLOW_SANDBOX = "1";
pruefe("Sandbox-Beleg mit APPLE_ALLOW_SANDBOX=1 erlaubt", umgebungOk({ environment: "Sandbox" }) === true);
delete process.env.APPLE_ALLOW_SANDBOX;
pruefe("Produktions-Beleg immer erlaubt", umgebungOk({ environment: "Production" }) === true);
pruefe("Beleg ohne Umgebungsangabe wird abgelehnt", umgebungOk({}) === false);

console.log("\n── Apples Meldungen werden richtig gedeutet ──");

for (const [typ, unter, basis, soll, warum] of [
  ["EXPIRED", "", "active", "canceled", "Laufzeit abgelaufen"],
  ["REFUND", "", "active", "canceled", "Geld zurück"],
  ["REVOKE", "", "active", "canceled", "Familienfreigabe entzogen"],
  ["DID_FAIL_TO_RENEW", "", "active", "past_due", "Zahlung fehlgeschlagen"],
  ["DID_FAIL_TO_RENEW", "GRACE_PERIOD", "active", "active", "Kulanzfrist läuft noch"],
  ["DID_RENEW", "", "active", "active", "verlängert"],
  ["DID_CHANGE_RENEWAL_STATUS", "AUTO_RENEW_DISABLED", "active", "active",
    "gekündigt, aber bezahlte Zeit läuft weiter"],
  ["CONSUMPTION_REQUEST", "", "active", "active", "nur Anfrage, keine Entscheidung"],
  ["SUBSCRIBED", "INITIAL_BUY", "active", "active", "Erstkauf"],
  ["EXPIRED", "", "canceled", "canceled", "bleibt beendet"],
]) {
  pruefe(`${typ}${unter ? "/" + unter : ""} → ${soll}`,
    statusAus(basis, typ, unter) === soll, warum);
}

/* Letzte Rückversicherung: Apples echte Wurzel ist die, die drinsteht. */
const fp = await crypto.subtle.digest("SHA-256", WURZEL.der);
const hex = [...new Uint8Array(fp)].map((b) => b.toString(16).padStart(2, "0")).join(":");
pruefe("eingebaute Wurzel ist Apple Root CA - G3",
  hex === "63:34:3a:bf:b8:9a:6a:03:eb:b5:7e:9b:3f:5f:a7:be:7c:4f:5c:75:6f:30:17:b3:a8:c4:88:c3:65:3e:91:79",
  hex.slice(0, 29) + "…");

console.log(`\n${schlecht === 0 ? "ALLE APPLE-BELEG-TESTS GRÜN" : "FEHLGESCHLAGEN"} — ${ok} grün, ${schlecht} rot`);
process.exit(schlecht === 0 ? 0 : 1);
